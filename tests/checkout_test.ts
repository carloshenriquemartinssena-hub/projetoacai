import { CheckoutError, hash, paymentUrl, priceItems, validateRequest } from "../supabase/functions/_shared/checkout.ts";
import { handler as createCheckout } from "../supabase/functions/create-checkout/index.ts";
import { handler as webhook } from "../supabase/functions/asaas-webhook/index.ts";
import { handler as checkoutStatus } from "../supabase/functions/checkout-status/index.ts";

function assert(value: unknown, message = "Assertion failed"): asserts value { if (!value) throw new Error(message); }
const productId = "7fba538e-2989-4b41-93fd-f957ffd083f6";
const orderId = "11111111-1111-4111-8111-111111111111";
const token = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";
const product = { id: productId, name: "Açaí Teste 300ml", size_label: "300ml", price_cents: 100, is_active: true };
const input = () => ({ requestId, token, items: [{ productId, quantity: 2, size: "300ml" }], billingType: "PIX",
  customer: { name: "Cliente Teste", email: "teste@example.com", phone: "11999999999", cpfCnpj: "12345678909",
    address: "Rua Teste", number: "1", postalCode: "01001000" } });

Deno.test("preço vem do banco, rejeita adulteração de tamanho, adicionais e produto inativo", () => {
  const body: any = input(); body.items[0].price_cents = 1; body.total = 1;
  const valid = validateRequest(body);
  assert(priceItems(valid.items, [product]).total === 200);
  for (const bad of [{ ...product, is_active: false }, { ...product, size_label: "500ml" }, { ...product, price_cents: 0 }]) {
    let rejected = false; try { priceItems(valid.items, [bad]); } catch { rejected = true; } assert(rejected);
  }
  body.items[0].adicionais = [{ nome: "Banana", valor: 0 }];
  let rejected = false; try { validateRequest(body); } catch (e) { rejected = e instanceof CheckoutError; } assert(rejected);
});

Deno.test("rejeita quantidade inválida, CPF ausente e URLs fora do sandbox", () => {
  for (const quantity of [0, -1, 100, 1.5, "1"]) {
    const body: any = input(); body.items[0].quantity = quantity;
    let rejected = false; try { validateRequest(body); } catch { rejected = true; } assert(rejected);
  }
  for (const url of ["https://asaas.com/i/test", "https://sandbox.asaas.com.evil.test/i/a", "javascript:alert(1)"]) {
    let rejected = false; try { paymentUrl(url); } catch { rejected = true; } assert(rejected);
  }
  assert(paymentUrl("https://sandbox.asaas.com/i/test").includes("/i/test"));
  const body = input(); body.customer.cpfCnpj = "";
  let rejected = false; try { validateRequest(body); } catch { rejected = true; } assert(rejected);
});

// Exercita os handlers reais; apenas Supabase e Asaas são simulados.
Deno.test("checkout cria cobrança com preço autoritativo; repetição reutiliza; status exige token", async () => {
  Deno.env.set("SUPABASE_URL", "https://db.example.com");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key-for-test");
  Deno.env.set("SITE_URL", "https://loja.example.com/acai/");
  Deno.env.set("ASAAS_BASE_URL", "https://api-sandbox.asaas.com/v3");
  Deno.env.set("ASAAS_API_KEY", "fake-sandbox-key-for-test");
  const checkoutInput = () => { const body = input(); body.items[0].quantity = 5; return body; };
  const original = globalThis.fetch;
  let order: any = null; let payments = 0;
  globalThis.fetch = (async (target: any, options?: RequestInit) => {
    const url = new URL(typeof target === "string" ? target : target.url || target.toString());
    const body = options?.body ? JSON.parse(String(options.body)) : null;
    const reply = (data: any, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }));
    if (url.pathname.endsWith("/products")) return reply([product]);
    if (url.pathname.endsWith("/orders")) {
      if (options?.method === "POST") { assert(!("total_cents" in body), "Do not write the generated total_cents column"); order = { ...body, total_cents: body.subtotal_cents + body.delivery_fee_cents, id: orderId, payment_status: "pending", status: "pending_payment" }; return reply(order, 201); }
      if (options?.method === "PATCH") { Object.assign(order, body); return reply(null); }
      const expectedHash = url.searchParams.get("checkout_token_hash");
      return reply(order && (!expectedHash || expectedHash === `eq.${order.checkout_token_hash}`) ? order : null);
    }
    if (url.pathname.endsWith("/customers")) return reply({ id: "cus_test" });
    if (url.pathname.endsWith("/payments")) {
      payments++; assert(body.value === 5); assert(body.externalReference === orderId);
      assert(body.callback.successUrl === "https://loja.example.com/acai/pagamento.html");
      assert(body.billingType === "PIX");
      return reply({ id: "pay_test", invoiceUrl: "https://sandbox.asaas.com/i/test" });
    }
    throw new Error(`Unexpected test URL: ${url.pathname}`);
  }) as typeof fetch;
  const request = (body: any) => new Request("https://functions.example.com", { method: "POST", headers: { origin: "https://loja.example.com", "Content-Type": "application/json" }, body: JSON.stringify(body) });
  try {
    const tooSmall = await createCheckout(request(input()));
    assert(tooSmall.status === 400);
    assert((await tooSmall.json()).error.includes("R$ 5,00"));
    assert(order === null && Number(payments) === 0, "Minimum must be checked before inserting order or contacting Asaas");
    const response = await createCheckout(request(checkoutInput()));
    assert(response.status === 200, await response.clone().text());
    const data = await response.json(); assert(data.totalCents === 500 && data.orderId === orderId);
    assert(order.fulfillment_type === "pickup" && order.total_cents === 500 && !JSON.stringify(order).includes("12345678909"));
    assert((await createCheckout(request(checkoutInput()))).status === 200); assert(payments === 1);
    const changed = checkoutInput(); changed.items[0].quantity = 3;
    assert((await createCheckout(request(changed))).status === 409); assert(payments === 1);
    assert((await checkoutStatus(request({ orderId, token }))).status === 200);
    assert((await checkoutStatus(request({ orderId, token: requestId }))).status === 404);
    const badOrigin = request(checkoutInput()); badOrigin.headers.set("origin", "https://evil.example.com");
    assert((await createCheckout(badOrigin)).status === 403);
    order.payment_url = null;
    assert((await createCheckout(request(checkoutInput()))).status === 409); assert(payments === 1);
    assert(order.checkout_token_hash === await hash(token));
  } finally { globalThis.fetch = original; }
});

Deno.test("webhook rejeita token errado e propaga falha transacional como erro para reentrega", async () => {
  Deno.env.set("ASAAS_WEBHOOK_TOKEN", "fake-webhook-token");
  const original = globalThis.fetch; let calls = 0; let fail = false;
  globalThis.fetch = (async () => {
    calls++;
    return new Response(JSON.stringify(fail ? { message: "db error", code: "P0001" } : { processed: true }), {
      status: fail ? 400 : 200, headers: { "Content-Type": "application/json" }
    });
  }) as typeof fetch;
  const request = (token: string) => new Request("https://functions.example.com", { method: "POST", headers: { "asaas-access-token": token }, body: JSON.stringify({ id: "evt_1", event: "PAYMENT_RECEIVED", payment: { id: "pay_test" } }) });
  try {
    assert((await webhook(request("wrong"))).status === 401); assert(calls === 0);
    assert((await webhook(request("fake-webhook-token"))).status === 200);
    fail = true; assert((await webhook(request("fake-webhook-token"))).status === 503);
  } finally { globalThis.fetch = original; }
});
