const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const { webcrypto } = require("node:crypto");

function setup() {
    const requests = [], storage = new Map();
    const window = { PAYMENT_BACKEND_CONFIG: { url: "https://project.example.com" } };
    runInNewContext(readFileSync("asaas-checkout.js", "utf8"), {
        window, crypto: webcrypto, URL, AbortController, setTimeout, clearTimeout,
        sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
        fetch: async (url, options) => {
            requests.push(JSON.parse(options.body));
            return { ok: true, json: async () => ({ orderId: "order-test", totalCents: 100, paymentUrl: "https://sandbox.asaas.com/i/test" }) };
        }
    });
    const customer = { nome: "Cliente Teste", email: "teste@example.com", whatsapp: "11999999999", cpf: "12345678909",
        endereco: "Rua Teste", numero: "1", complemento: "", cep: "01001000", pagamento: "Pix" };
    const items = [{ id: "7fba538e-2989-4b41-93fd-f957ffd083f6", quantidade: 1, tamanho: "300ml" }];
    return { create: values => window.AsaasCheckout.create(items, { ...customer, ...values }), requests, storage };
}

test("informa cada campo inválido sem enviar requisição ou criar chave de pedido", async () => {
    for (const [values, field] of [
        [{ nome: "ab" }, "Nome:"], [{ email: "sem-dominio" }, "E-mail:"],
        [{ whatsapp: "123" }, "WhatsApp:"], [{ cpf: "123" }, "CPF/CNPJ:"],
        [{ endereco: " " }, "Endereço:"], [{ numero: " " }, "Número do endereço:"], [{ cep: "123" }, "CEP:"]
    ]) {
        const subject = setup();
        await assert.rejects(subject.create(values), error => error.message.includes(field));
        assert.equal(subject.requests.length, 0);
        assert.equal(subject.storage.size, 0);
    }
});

test("aceita telefone com +55, CPF e CEP formatados; preserva repetição", async () => {
    const subject = setup();
    const values = { whatsapp: "+55 (11) 99999-9999", cpf: "123.456.789-09", cep: "01001-000" };
    await subject.create(values);
    await subject.create(values);
    assert.equal(subject.requests[0].customer.phone, "11999999999");
    assert.equal(subject.requests[0].requestId, subject.requests[1].requestId);
    assert.equal(subject.requests[0].token, subject.requests[1].token);
});

test("não remove DDD 55 de um telefone nacional válido", async () => {
    const subject = setup();
    await subject.create({ whatsapp: "55999999999", numero: "s/n" });
    assert.equal(subject.requests[0].customer.phone, "55999999999");
});

test("dados válidos já aceitos mantêm o formato anterior do payload", async () => {
    const subject = setup();
    await subject.create({ whatsapp: "(11) 99999-9999" });
    assert.equal(subject.requests[0].customer.phone, "(11) 99999-9999");
});
