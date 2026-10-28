import { CheckoutError, hash, paymentUrl, priceItems, validateRequest } from "../_shared/checkout.ts";
import { asaas, cors, database, failure, json, readBody, siteUrl } from "../_shared/runtime.ts";

export async function handler(request: Request): Promise<Response> {
  let headers: Record<string, string> = {};
  try {
    headers = cors(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") throw new CheckoutError(405, "Método não permitido.");
    const input = validateRequest(await readBody(request));
    const db = database();
    const tokenHash = await hash(input.token);
    const requestHash = await hash(JSON.stringify({ items: input.items, customer: input.customer, billingType: input.billingType }));
    const { data: existing, error: readError } = await db.from("orders").select("*").eq("checkout_request_id", input.requestId).maybeSingle();
    if (readError) throw new Error("Falha ao consultar pedido.");
    if (existing) {
      if (existing.checkout_token_hash !== tokenHash || existing.checkout_request_hash !== requestHash) {
        throw new CheckoutError(409, "Este checkout já foi usado para outro pedido.");
      }
      if (existing.payment_url) return json({ orderId: existing.id, paymentUrl: paymentUrl(existing.payment_url), totalCents: existing.total_cents }, 200, headers);
      throw new CheckoutError(409, "O pedido está em processamento ou precisa de verificação pela loja. Não crie outra cobrança.");
    }
    const { data: products, error: productError } = await db.from("products").select("id,name,size_label,price_cents,is_active")
      .in("id", input.items.map((item: any) => item.productId));
    if (productError) throw new Error("Falha ao consultar produtos.");
    const priced = priceItems(input.items, products || []);
    // Sem frete configurado, o fluxo online oferece retirada. Nenhuma taxa é aceita do navegador.
    const { data: order, error: insertError } = await db.from("orders").insert({
      customer_name: input.customer.name, customer_phone: input.customer.phone, customer_email: input.customer.email,
      fulfillment_type: "pickup", delivery_address: null,
      items: priced.items, subtotal_cents: priced.total, delivery_fee_cents: 0, total_cents: priced.total,
      checkout_request_id: input.requestId, checkout_token_hash: tokenHash, checkout_request_hash: requestHash,
      checkout_billing_type: input.billingType, checkout_state: "creating",
    }).select("*").single();
    if (insertError) {
      if (insertError.code === "23505") throw new CheckoutError(409, "Checkout em processamento. Aguarde e tente consultar novamente.");
      throw new Error("Falha ao registrar pedido.");
    }
    try {
      const customer = await asaas("customers", {
        name: input.customer.name, email: input.customer.email, mobilePhone: input.customer.phone,
        cpfCnpj: input.customer.cpfCnpj, notificationDisabled: true, externalReference: order.id,
      });
      if (typeof customer.id !== "string") throw new Error("Resposta inválida do cliente Asaas.");
      const returnUrl = new URL("pagamento.html", siteUrl());
      const payment = await asaas("payments", {
        customer: customer.id, billingType: input.billingType, value: priced.total / 100,
        dueDate: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
        description: `Açaí Zero Grau — pedido ${order.id} — retirada na loja`, externalReference: order.id,
        callback: { successUrl: returnUrl.href, autoRedirect: true },
      });
      const url = paymentUrl(payment.invoiceUrl);
      if (typeof payment.id !== "string") throw new Error("Resposta inválida da cobrança Asaas.");
      const { error } = await db.from("orders").update({ asaas_payment_id: payment.id, payment_url: url,
        checkout_state: "ready", updated_at: new Date().toISOString() }).eq("id", order.id);
      if (error) throw new Error("Falha ao salvar cobrança.");
      return json({ orderId: order.id, paymentUrl: url, totalCents: priced.total }, 200, headers);
    } catch (error) {
      // Timeout pode ocorrer DEPOIS de o Asaas criar a cobrança. Nunca repetir POST automaticamente.
      await db.from("orders").update({ checkout_state: "needs_review", updated_at: new Date().toISOString() }).eq("id", order.id);
      throw error;
    }
  } catch (error) { return failure(error, headers); }
}

if (import.meta.main) Deno.serve(handler);
