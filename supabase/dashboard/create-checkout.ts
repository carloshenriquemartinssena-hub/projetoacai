// Arquivo único para publicar pelo editor do Supabase. Não inserir segredos aqui.
export class CheckoutError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (value: unknown, max = 200) => typeof value === "string" ? value.trim().slice(0, max) : "";
const digits = (value: unknown) => text(value).replace(/\D/g, "");

export function validateRequest(body: any) {
  if (!uuid.test(body?.requestId) || !uuid.test(body?.token)) {
    throw new CheckoutError(400, "Identificação do checkout inválida.");
  }
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30) {
    throw new CheckoutError(400, "Selecione entre 1 e 30 itens.");
  }
  const items = body.items.map((item: any) => {
    if (!uuid.test(item?.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new CheckoutError(400, "Produto ou quantidade inválidos. Atualize o carrinho.");
    }
    if (item.adicionais?.length) throw new CheckoutError(400, "Adicionais ainda não estão disponíveis para pagamento online.");
    return { productId: item.productId, quantity: item.quantity, size: text(item.size, 40), notes: text(item.notes, 500) };
  });
  const c = body.customer || {};
  const customer = {
    name: text(c.name, 120), email: text(c.email, 254), phone: digits(c.phone), cpfCnpj: digits(c.cpfCnpj),
    address: text(c.address), number: text(c.number, 30), complement: text(c.complement, 100), postalCode: digits(c.postalCode),
  };
  if (customer.name.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) ||
      !/^\d{10,11}$/.test(customer.phone) || !/^\d{11}$|^\d{14}$/.test(customer.cpfCnpj) ||
      !customer.address || !customer.number || !/^\d{8}$/.test(customer.postalCode)) {
    throw new CheckoutError(400, "Confira nome, e-mail, telefone, CPF/CNPJ e endereço.");
  }
  if (!["PIX", "CREDIT_CARD"].includes(body.billingType)) throw new CheckoutError(400, "Escolha Pix ou cartão.");
  return { requestId: body.requestId.toLowerCase(), token: body.token.toLowerCase(), items, customer, billingType: body.billingType };
}

export function priceItems(items: any[], products: any[]) {
  let total = 0;
  const priced = items.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product?.is_active || !Number.isSafeInteger(product.price_cents) || product.price_cents <= 0 ||
        (item.size && item.size.replace(/\s/g, "").toLowerCase() !== (product.size_label || "").replace(/\s/g, "").toLowerCase())) {
      throw new CheckoutError(400, "Um produto ou tamanho não está disponível para pagamento. Atualize o carrinho.");
    }
    const subtotal = product.price_cents * item.quantity;
    total += subtotal;
    return { product_id: product.id, name: product.name, size_label: product.size_label, quantity: item.quantity,
      unit_price_cents: product.price_cents, subtotal_cents: subtotal, notes: item.notes };
  });
  if (!Number.isSafeInteger(total) || total < 1 || total > 1_000_000) throw new CheckoutError(400, "Total fora do limite permitido.");
  return { items: priced, total };
}

export async function hash(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}

export function paymentUrl(value: unknown) {
  const url = new URL(String(value));
  if (url.protocol !== "https:" || url.hostname !== "sandbox.asaas.com" || url.username || url.password || url.port) {
    throw new CheckoutError(502, "O provedor retornou um endereço de pagamento inválido.");
  }
  return url.href;
}

import { createClient } from "npm:@supabase/supabase-js@2.118.0";

export function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Configuração ausente: ${name}`);
  return value;
}

export const database = () => createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function siteUrl() {
  const url = new URL(required("SITE_URL"));
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("SITE_URL deve usar HTTPS (HTTP permitido somente para desenvolvimento local).");
  }
  if (url.search || url.hash || url.username || url.password) throw new Error("SITE_URL inválida.");
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}

export function cors(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = siteUrl().origin;
  if (origin && origin !== allowed) throw new CheckoutError(403, "Origem não autorizada.");
  return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin", "Cache-Control": "no-store" };
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function readBody(request: Request, max = 32_768) {
  const reader = request.body?.getReader();
  if (!reader) throw new CheckoutError(400, "Corpo da requisição ausente.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) { await reader.cancel(); throw new CheckoutError(413, "Requisição muito grande."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new CheckoutError(400, "JSON inválido."); }
}

export async function asaas(path: string, body: unknown) {
  const base = new URL(required("ASAAS_BASE_URL").replace(/\/$/, "") + "/");
  if (base.origin !== "https://api-sandbox.asaas.com" || base.pathname !== "/v3/" || base.search || base.hash) {
    throw new Error("ASAAS_BASE_URL deve ser https://api-sandbox.asaas.com/v3 nesta integração sandbox.");
  }
  const response = await fetch(new URL(path, base), {
    method: "POST", signal: AbortSignal.timeout(20_000), redirect: "error",
    headers: { "Content-Type": "application/json", "access_token": required("ASAAS_API_KEY"), "User-Agent": "AcaiZeroGrau-Sandbox/1.0" },
    body: JSON.stringify(body),
  });
  // Não registrar respostas do provedor: podem conter dados pessoais.
  if (!response.ok) throw new CheckoutError(502, "O Asaas não concluiu a solicitação. Consulte o pedido antes de tentar novamente.");
  return await response.json();
}


export function failure(error: unknown, headers: Record<string, string> = {}) {
  return json({ error: error instanceof CheckoutError ? error.message : "Não foi possível concluir a operação. Tente novamente mais tarde." },
    error instanceof CheckoutError ? error.status : 500, headers);
}


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
      items: priced.items, subtotal_cents: priced.total, delivery_fee_cents: 0,
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

Deno.serve(handler);
