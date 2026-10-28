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

export async function authenticateOrder(db: ReturnType<typeof database>, id: string, token: string) {
  const { data, error } = await db.from("orders").select("*").eq("id", id).eq("checkout_token_hash", await hash(token)).maybeSingle();
  if (error) throw new Error("Falha ao consultar pedido.");
  if (!data) throw new CheckoutError(404, "Pedido não encontrado.");
  return data;
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
    const body = await readBody(request, 1024);
    if (!uuid.test(body?.orderId) || !uuid.test(body?.token)) throw new CheckoutError(400, "Identificação inválida.");
    const order = await authenticateOrder(database(), body.orderId, body.token.toLowerCase());
    return json({ orderId: order.id, status: order.status, paymentStatus: order.payment_status, totalCents: order.total_cents }, 200, headers);
  } catch (error) { return failure(error, headers); }
}

Deno.serve(handler);
