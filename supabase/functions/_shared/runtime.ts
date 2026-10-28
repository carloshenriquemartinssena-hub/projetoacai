import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { CheckoutError, hash } from "./checkout.ts";

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
