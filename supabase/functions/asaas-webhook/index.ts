import { CheckoutError, hash } from "../_shared/checkout.ts";
import { database, failure, json, readBody, required } from "../_shared/runtime.ts";

export async function handler(request: Request): Promise<Response> {
  try {
    if (request.method !== "POST") throw new CheckoutError(405, "Método não permitido.");
    const supplied = request.headers.get("asaas-access-token") || "";
    if (!supplied || await hash(supplied) !== await hash(required("ASAAS_WEBHOOK_TOKEN"))) {
      throw new CheckoutError(401, "Webhook não autorizado.");
    }
    const body = await readBody(request, 262_144);
    if (typeof body?.id !== "string" || typeof body?.event !== "string") throw new CheckoutError(400, "Evento inválido.");
    const { data, error } = await database().rpc("process_asaas_event", { event_payload: body });
    // Erro transacional retorna não-2xx, permitindo reentrega pelo Asaas.
    if (error || data?.retry) throw new CheckoutError(503, "Não foi possível processar o evento. Reenvie mais tarde.");
    return json({ received: true });
  } catch (error) { return failure(error); }
}

if (import.meta.main) Deno.serve(handler);
