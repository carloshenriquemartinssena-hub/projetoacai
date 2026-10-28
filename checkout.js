(() => {
    "use strict";

    const ORDER_KEY = "produtoSessao";
    const CUSTOMER_KEY = "dadosCliente";
    const WHATSAPP_LOJA = "5511974665034";
    const FALLBACK_IMAGE = "fotoexemplo.png";
    const money = value => Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    function readJson(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || "null");
        } catch (error) {
            console.error(`Não foi possível ler ${key}.`, error);
            return null;
        }
    }

    function orderItems() {
        const order = readJson(ORDER_KEY);
        if (Array.isArray(order)) return order;
        if (Array.isArray(order?.itens)) return order.itens;
        return order && typeof order === "object" ? [order] : [];
    }

    function subtotal(item) {
        const quantity = Math.max(1, Number(item.quantidade) || 1);
        const unit = Number(item.precoUnitario);
        const storedSubtotal = Number(item.subtotal);
        if (Number.isFinite(storedSubtotal) && storedSubtotal >= 0) {
            return storedSubtotal;
        }
        return (Number.isFinite(unit) ? unit : Number(item.valor) || 0) * quantity;
    }

    function total(items) {
        return items.reduce((sum, item) => sum + subtotal(item), 0);
    }

    function node(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function fillCustomerForm() {
        const form = document.getElementById("form-cliente");
        if (!form) return;
        const profile = readJson("aiz-perfil") || {};
        const saved = readJson(CUSTOMER_KEY);
        const customer = saved || profile;
        const values = {
            nome: customer.nome || "",
            email: customer.email || "",
            cpf: customer.cpf || "",
            cep: customer.cep || "",
            endereco: customer.endereco || "",
            numero: customer.numero || "",
            complemento: customer.complemento || "",
            whatsapp: customer.whatsapp || "",
            pagamento: customer.pagamento || "Pix"
        };
        Object.entries(values).forEach(([id, value]) => {
            const field = document.getElementById(id);
            if (field) field.value = value;
        });
    }

    function startCustomerForm() {
        const items = orderItems();
        const message = document.getElementById("checkout-message");
        if (!items.length) {
            message.textContent = "Seu pedido está vazio. Volte ao cardápio para escolher produtos.";
            document.querySelector("#form-cliente button[type='submit']").disabled = true;
            return;
        }
        fillCustomerForm();
        document.getElementById("form-cliente").addEventListener("submit", event => {
            event.preventDefault();
            const form = event.currentTarget;
            if (!form.reportValidity()) return;
            const customer = Object.fromEntries(new FormData(form).entries());
            delete customer.aceiteTermos;
            try {
                localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
                localStorage.setItem("aiz-perfil", JSON.stringify(customer));
                window.location.href = "confirmarpedidio.html";
            } catch (error) {
                console.error("Não foi possível guardar os dados do cliente.", error);
                message.textContent = "Não foi possível salvar seus dados. Tente novamente.";
            }
        });
    }

    function renderItems(items) {
        const container = document.getElementById("checkout-products");
        container.replaceChildren();
        items.forEach(item => {
            const card = node("article", "checkout-product");
            const image = node("img");
            image.src = item.imagem || item.foto || FALLBACK_IMAGE;
            image.alt = item.nome || "Produto selecionado";
            image.loading = "lazy";
            image.addEventListener("error", () => {
                image.onerror = null;
                image.src = FALLBACK_IMAGE;
            });

            const details = node("div");
            details.appendChild(node("h3", "", item.nome || "Produto"));
            details.appendChild(node(
                "p",
                "",
                `Tamanho: ${item.tamanho || "Não informado"} · Quantidade: ${Math.max(1, Number(item.quantidade) || 1)}`
            ));

            if (Array.isArray(item.adicionais) && item.adicionais.length) {
                details.appendChild(node(
                    "p",
                    "",
                    `Adicionais: ${item.adicionais.map(extra =>
                        typeof extra === "string" ? extra : extra.nome
                    ).filter(Boolean).join(", ")}`
                ));
            }
            if (item.observacao) {
                details.appendChild(node("p", "", `Observação: ${item.observacao}`));
            }
            details.appendChild(node("p", "", money(subtotal(item))));
            card.append(image, details);
            container.appendChild(card);
        });
    }

    function startConfirmation() {
        const items = orderItems();
        const customer = readJson(CUSTOMER_KEY);
        const message = document.getElementById("checkout-message");
        if (!items.length) {
            message.textContent = "Seu pedido está vazio. Volte ao cardápio para escolher produtos.";
            document.getElementById("finalizar-pedido").disabled = true;
            return;
        }
        if (!customer || typeof customer !== "object") {
            window.location.replace("dados-entrega.html");
            return;
        }

        renderItems(items);
        document.getElementById("resumo-total").textContent = money(total(items));
        const address = [
            customer.endereco,
            customer.numero && `nº ${customer.numero}`,
            customer.complemento && `compl. ${customer.complemento}`,
            customer.cep && `CEP ${customer.cep}`
        ].filter(Boolean).join(", ");
        const details = document.getElementById("dados-cliente");
        details.replaceChildren(
            node("p", "", customer.nome),
            node("p", "", customer.email || ""),
            node("p", "", `WhatsApp: ${customer.whatsapp}`),
            node("p", "", address),
            node("p", "", `CPF: ${customer.cpf}`),
            node("p", "", `Pagamento: ${customer.pagamento}`)
        );

        document.getElementById("finalizar-pedido").addEventListener("click", () => {
            const button = document.getElementById("finalizar-pedido");
            const lines = [
                "Olá! Gostaria de confirmar este pedido:",
                "",
                ...items.flatMap(item => {
                    const quantity = Math.max(1, Number(item.quantidade) || 1);
                    const extras = Array.isArray(item.adicionais)
                        ? item.adicionais.map(extra =>
                            typeof extra === "string" ? extra : extra.nome
                        ).filter(Boolean).join(", ")
                        : "";
                    return [
                        `${quantity}x ${item.nome || "Produto"} (${item.tamanho || "tamanho não informado"})`,
                        extras ? `Adicionais: ${extras}` : "",
                        item.observacao ? `Observação: ${item.observacao}` : "",
                        `Subtotal: ${money(subtotal(item))}`,
                        ""
                    ].filter(line => line !== "");
                }),
                `Total: ${money(total(items))}`,
                "",
                `Cliente: ${customer.nome}`,
                `E-mail: ${customer.email || ""}`,
                `CPF: ${customer.cpf}`,
                `WhatsApp: ${customer.whatsapp}`,
                `Endereço: ${address}`,
                `Forma de pagamento: ${customer.pagamento}`
            ];
            const url = `https://wa.me/${WHATSAPP_LOJA}?text=${encodeURIComponent(lines.join("\n"))}`;
            const whatsapp = window.open(url, "_blank");
            if (!whatsapp) {
                message.textContent = "Permita a abertura de janelas para enviar seu pedido pelo WhatsApp.";
                return;
            }
            whatsapp.opener = null;
            button.disabled = true;
            button.textContent = "Pedido preparado no WhatsApp";
        });

        const asaasButton = document.getElementById("pagar-asaas");
        if (customer.pagamento === "Dinheiro") {
            asaasButton.disabled = true;
            asaasButton.title = "Dinheiro está disponível somente pelo WhatsApp.";
        }
        asaasButton.addEventListener("click", async () => {
            asaasButton.disabled = true;
            message.textContent = "Preparando o pagamento de teste…";
            try {
                const result = await window.AsaasCheckout.create(items, customer);
                document.getElementById("resumo-total").textContent = money(result.totalCents / 100);
                message.textContent = "Confira o total confirmado pela loja. Pagamento online com retirada, sem frete.";
                const link = document.getElementById("abrir-pagamento");
                link.href = result.paymentUrl;
                link.textContent = `Pagar ${money(result.totalCents / 100)} no Asaas`;
                link.hidden = false;
                asaasButton.hidden = true;
            } catch (error) {
                message.textContent = error.message || "Não foi possível preparar o pagamento.";
            } finally { asaasButton.disabled = false; }
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        const page = document.body.dataset.checkoutPage;
        if (page === "customer") startCustomerForm();
        if (page === "confirmation") startConfirmation();
    });
})();
