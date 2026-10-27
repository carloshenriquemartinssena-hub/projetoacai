(() => {
    "use strict";

    const ORDER_KEY = "produtoSessao";
    const CART_KEY = "acaiZeroGrauCarrinho";
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

    function ensureAuthenticated(onReady) {
        window.AuthLoja.exigirLogin(onReady);
    }

    function fillCustomerForm(user) {
        const form = document.getElementById("form-cliente");
        if (!form) return;
        const profile = window.AuthLoja.carregarPerfil() || {};
        const saved = readJson(CUSTOMER_KEY);
        const customer = saved?.userId === user.id ? saved : profile;
        const fullName = user.user_metadata?.full_name ||
            user.user_metadata?.name || "";
        const values = {
            nome: customer.nome || fullName,
            email: customer.email || user.email || "",
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

    function startCustomerForm(user) {
        const items = orderItems();
        const message = document.getElementById("checkout-message");
        if (!items.length) {
            message.textContent = "Seu pedido está vazio. Volte ao cardápio para escolher produtos.";
            document.getElementById("form-cliente").hidden = true;
            return;
        }
        fillCustomerForm(user);
        document.getElementById("form-cliente").addEventListener("submit", event => {
            event.preventDefault();
            const form = event.currentTarget;
            if (!form.reportValidity()) return;
            const customer = Object.fromEntries(new FormData(form).entries());
            customer.userId = user.id;
            try {
                localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
                if (!window.AuthLoja.salvarPerfil(customer)) {
                    throw new Error("Os dados do perfil não puderam ser salvos.");
                }
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

    function startConfirmation(user) {
        const items = orderItems();
        const customer = readJson(CUSTOMER_KEY);
        const message = document.getElementById("checkout-message");
        if (!items.length) {
            message.textContent = "Seu pedido está vazio. Volte ao cardápio para escolher produtos.";
            document.getElementById("finalizar-pedido").disabled = true;
            return;
        }
        if (!customer || customer.userId !== user.id) {
            window.location.replace("cadastro.html");
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
            node("p", "", customer.email || user.email || ""),
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
                `E-mail: ${customer.email || user.email || ""}`,
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
    }

    document.addEventListener("DOMContentLoaded", () => {
        const page = document.body.dataset.checkoutPage;
        ensureAuthenticated(user => {
            if (page === "customer") startCustomerForm(user);
            if (page === "confirmation") startConfirmation(user);
        });
    });
})();
