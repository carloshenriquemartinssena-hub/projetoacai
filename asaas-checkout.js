(() => {
    "use strict";
    const STORAGE_KEY = "acai-asaas-checkout-v1";

    function read() {
        try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null"); }
        catch { return null; }
    }

    function validateCustomer(customer) {
        const text = (value, max = 200) => typeof value === "string" ? value.trim().slice(0, max) : "";
        const digits = value => text(value).replace(/\D/g, "");
        const errors = [];
        let phone = digits(customer.phone);
        // Aceita o código brasileiro sem remover um DDD 55 de um número nacional.
        const hasCountryCode = /^55\d{10,11}$/.test(phone);
        if (hasCountryCode) phone = phone.slice(2);
        if (text(customer.name, 120).length < 3) errors.push("Nome: informe pelo menos 3 caracteres.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(customer.email, 254))) errors.push("E-mail: confira o formato, como nome@exemplo.com.");
        if (!/^\d{10,11}$/.test(phone)) errors.push("WhatsApp: informe DDD e número, com 10 ou 11 dígitos (o +55 é aceito).");
        if (!/^(\d{11}|\d{14})$/.test(digits(customer.cpfCnpj))) errors.push("CPF/CNPJ: informe 11 dígitos para CPF ou 14 para CNPJ.");
        if (!text(customer.address)) errors.push("Endereço: informe a rua ou avenida.");
        if (!text(customer.number, 30)) errors.push("Número do endereço: preencha o campo Número; se não houver, informe s/n.");
        if (!/^\d{8}$/.test(digits(customer.postalCode))) errors.push("CEP: informe os 8 dígitos.");
        if (errors.length) throw new Error(errors.join(" "));
        // Mantém o payload anterior para pedidos válidos e preserva a chave de repetição.
        return hasCountryCode ? { ...customer, phone } : customer;
    }

    async function invoke(name, body) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 50000);
        try {
            const config = window.PAYMENT_BACKEND_CONFIG;
            if (!config?.url) throw new Error("O serviço de checkout não está configurado.");
            const response = await fetch(`${config.url}/functions/v1/${name}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body), signal: controller.signal
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Não foi possível consultar o pagamento.");
            return data;
        } catch (error) {
            if (error instanceof TypeError || error.name === "AbortError") {
                throw new Error("A conexão foi interrompida. Tente novamente para consultar o mesmo pedido, sem criar outra cobrança.");
            }
            throw error;
        } finally { clearTimeout(timer); }
    }

    async function create(items, customer) {
        const billingType = { Pix: "PIX", "Cartão": "CREDIT_CARD" }[customer.pagamento];
        if (!billingType) throw new Error("Escolha Pix ou cartão nos dados do pedido.");
        const payload = {
            items: items.map(item => ({ productId: item.productId || item.id, quantity: Number(item.quantidade) || 1,
                size: item.tamanho || "", adicionais: item.adicionais || [], notes: item.observacao || "" })),
            customer: { name: customer.nome, email: customer.email, phone: customer.whatsapp, cpfCnpj: customer.cpf,
                address: customer.endereco, number: customer.numero, complement: customer.complemento || "", postalCode: customer.cep },
            billingType
        };
        payload.customer = validateCustomer(payload.customer);
        const fingerprint = JSON.stringify(payload);
        let saved = read();
        if (!saved || saved.fingerprint !== fingerprint) {
            saved = { fingerprint, requestId: crypto.randomUUID(), token: crypto.randomUUID() };
            // Salvar ANTES de enviar: um timeout não pode perder a chave de repetição.
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        }
        const result = await invoke("create-checkout", { ...payload, requestId: saved.requestId, token: saved.token });
        const url = new URL(result.paymentUrl);
        if (url.protocol !== "https:" || url.hostname !== "sandbox.asaas.com" || url.username || url.password || url.port) {
            throw new Error("O endereço de pagamento recebido é inválido.");
        }
        saved.orderId = result.orderId;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        return result;
    }

    async function status() {
        const saved = read();
        if (!saved?.orderId || !saved.token) throw new Error("Abra esta página na mesma aba usada para iniciar o pagamento. Se necessário, peça à loja para consultar o pedido.");
        return invoke("checkout-status", { orderId: saved.orderId, token: saved.token });
    }

    window.AsaasCheckout = { create, status };
})();
