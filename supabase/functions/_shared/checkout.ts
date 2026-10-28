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
