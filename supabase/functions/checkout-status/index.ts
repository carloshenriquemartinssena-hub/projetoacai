import { CheckoutError, uuid } from "../_shared/checkout.ts";
import { authenticateOrder, cors, database, failure, json, readBody } from "../_shared/runtime.ts";

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

if (import.meta.main) Deno.serve(handler);
