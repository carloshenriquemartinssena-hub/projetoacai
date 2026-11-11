(() => {
    "use strict";

    const STATUS_LABELS = {
        creating: "Criando pagamento",
        pending: "Aguardando pagamento",
        awaiting_payment: "Aguardando pagamento",
        awaiting_confirmation: "Aguardando confirmação no WhatsApp",
        paid: "Pagamento confirmado",
        received: "Pedido recebido",
        confirmed: "Pedido confirmado",
        preparing: "Em preparo",
        out_for_delivery: "Saiu para entrega",
        delivered: "Entregue",
        canceled: "Cancelado",
        expired: "Pagamento expirado",
        creation_failed: "Falha ao criar pagamento"
    };
    const STATUS_OPTIONS = [
        ["awaiting_payment", "Aguardando pagamento"],
        ["awaiting_confirmation", "Aguardando confirmação no WhatsApp"],
        ["paid", "Pagamento confirmado"],
        ["received", "Pedido recebido"],
        ["confirmed", "Pedido confirmado"],
        ["preparing", "Em preparo"],
        ["out_for_delivery", "Saiu para entrega"],
        ["delivered", "Entregue"],
        ["canceled", "Cancelado"]
    ];
    const PAGE_SIZE = 50;
    const money = cents => (Number(cents || 0) / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    let client;
    let orderOffset = 0;
    let hasMoreOrders = false;
    let loadingOrders = false;
    let refreshTimer;
    const orders = new Map();
    const histories = new Map();

    function element(id) {
        return document.getElementById(id);
    }

    function node(tag, className, text) {
        const result = document.createElement(tag);
        if (className) result.className = className;
        if (text !== undefined) result.textContent = text;
        return result;
    }

    function setMessage(id, text, isError = true) {
        const message = element(id);
        message.textContent = text;
        message.classList.toggle("orders-message-success", !isError && Boolean(text));
    }

    function displayStatus(status) {
        return STATUS_LABELS[status] || status || "Status não informado";
    }

    function orderMatchesFilter(order, filter) {
        if (filter === "all") return true;
        if (filter === "waiting") {
            return ["creating", "pending", "awaiting_payment", "awaiting_confirmation"].includes(order.status);
        }
        if (filter === "preparing") {
            return ["received", "confirmed", "paid", "preparing"].includes(order.status);
        }
        if (filter === "delivery") return order.status === "out_for_delivery";
        if (filter === "delivered") return order.status === "delivered";
        if (filter === "canceled") {
            return ["canceled", "expired", "creation_failed"].includes(order.status);
        }
        return true;
    }

    function updateSummary() {
        const loadedOrders = [...orders.values()];
        element("orders-count").textContent = String(loadedOrders.length);
        element("orders-waiting-count").textContent = String(loadedOrders.filter(order =>
            ["creating", "pending", "awaiting_payment", "awaiting_confirmation"].includes(order.status)
        ).length);
        element("orders-preparing-count").textContent = String(loadedOrders.filter(order =>
            ["received", "confirmed", "paid", "preparing"].includes(order.status)
        ).length);
        element("orders-delivery-count").textContent = String(loadedOrders.filter(order =>
            order.status === "out_for_delivery"
        ).length);
    }

    function customerAddress(customer) {
        return [
            customer.address,
            customer.addressNumber && `nº ${customer.addressNumber}`,
            customer.complement,
            customer.postalCode && `CEP ${customer.postalCode}`
        ].filter(Boolean).join(", ") || "Endereço não informado";
    }

    function createOrderItem(item) {
        const row = node("article", "order-item");
        const image = node("img");
        const product = window.CATALOGO_PRODUTOS?.[item.productId];
        image.src = product?.imagens?.[0] || item.image || "fotoexemplo.png";
        image.alt = "";
        image.loading = "lazy";
        image.addEventListener("error", () => {
            image.onerror = null;
            image.src = "fotoexemplo.png";
        });

        const details = node("div");
        details.appendChild(node("strong", "", item.name || product?.nome || "Produto"));
        details.appendChild(node(
            "small",
            "",
            `${Number(item.quantity) || 0} × ${item.size || "Tamanho não informado"}`
        ));
        if (Array.isArray(item.extras) && item.extras.length) {
            details.appendChild(node("small", "", `Adicionais: ${item.extras.join(", ")}`));
        }
        if (item.observation) {
            details.appendChild(node("small", "", `Observação: ${item.observation}`));
        }
        const subtotalCents = Number.isFinite(Number(item.subtotalCents))
            ? Number(item.subtotalCents)
            : Number.isFinite(Number(item.unitPriceCents))
                ? Number(item.unitPriceCents) * Number(item.quantity || 0)
                : null;
        details.appendChild(node(
            "small",
            "",
            subtotalCents === null ? "Subtotal incluído no total do pedido" : money(subtotalCents)
        ));
        row.append(image, details);
        return row;
    }

    function createOrderCard(order) {
        const card = node("article", "order-card");
        const header = node("header", "order-card-header");
        const heading = node("div");
        heading.appendChild(node("h3", "", order.customer?.name || "Cliente"));
        const created = new Date(order.created_at);
        heading.appendChild(node(
            "p",
            "",
            Number.isNaN(created.getTime()) ? "Data não informada" : created.toLocaleString("pt-BR")
        ));
        const source = node(
            "span",
            "order-source",
            order.source === "whatsapp" ? "WhatsApp" : "Asaas"
        );
        header.append(heading, source);

        const body = node("div", "order-card-body");
        const itemsContainer = node("div", "order-items");
        (Array.isArray(order.items) ? order.items : []).forEach(item => {
            itemsContainer.appendChild(createOrderItem(item));
        });

        const customer = order.customer || {};
        const contact = node("div", "order-customer");
        contact.appendChild(node("strong", "", customer.email || "E-mail não informado"));
        contact.appendChild(node("p", "", customerAddress(customer)));
        if (customer.phone) contact.appendChild(node("p", "", `WhatsApp: ${customer.phone}`));
        if (customer.cpfCnpj) contact.appendChild(node("small", "", `CPF/CNPJ: ${customer.cpfCnpj}`));
        contact.appendChild(node(
            "small",
            "",
            `Pagamento: ${order.payment_method || "Não informado"}`
        ));

        const controls = node("div", "order-status-controls");
        controls.appendChild(node("span", "order-status-label", `Status: ${displayStatus(order.status)}`));
        const select = document.createElement("select");
        select.className = "order-status-select";
        select.setAttribute("aria-label", `Atualizar pedido de ${customer.name || "cliente"}`);
        const options = [...STATUS_OPTIONS];
        if (!options.some(([value]) => value === order.status) && STATUS_LABELS[order.status]) {
            options.unshift([order.status, STATUS_LABELS[order.status]]);
        }
        options.forEach(([value, label]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            option.selected = value === order.status ||
                (order.status === "pending" && value === "awaiting_payment");
            select.appendChild(option);
        });
        const save = node("button", "orders-primary-button order-save-status", "Salvar status");
        save.type = "button";
        save.addEventListener("click", () => saveOrderStatus(order, select, save));
        controls.appendChild(select);
        controls.appendChild(save);
        controls.appendChild(node("strong", "order-total", money(order.total_cents)));
        body.append(itemsContainer, contact, controls);

        const history = node("details", "order-history");
        history.appendChild(node("summary", "", "Histórico de status"));
        const historyList = document.createElement("ol");
        (histories.get(order.id) || []).forEach(event => {
            const changedAt = new Date(event.changed_at);
            const timestamp = Number.isNaN(changedAt.getTime())
                ? ""
                : `${changedAt.toLocaleString("pt-BR")} — `;
            historyList.appendChild(node(
                "li",
                "",
                `${timestamp}${displayStatus(event.previous_status || "Pedido registrado")} → ${displayStatus(event.status)}`
            ));
        });
        history.appendChild(historyList);
        card.append(header, body, history);
        return card;
    }

    function renderOrders() {
        const filter = element("orders-filter").value;
        const displayed = [...orders.values()]
            .filter(order => orderMatchesFilter(order, filter))
            .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
        const list = element("orders-list");
        list.replaceChildren();
        if (!displayed.length) {
            list.appendChild(node("p", "orders-empty", "Nenhum pedido encontrado para este filtro."));
        } else {
            displayed.forEach(order => list.appendChild(createOrderCard(order)));
        }
        updateSummary();
        element("orders-load-more").hidden = !hasMoreOrders;
    }

    async function loadOrders(loadMore = false) {
        if (loadingOrders || !client) return;
        if (loadMore && !hasMoreOrders) return;
        loadingOrders = true;
        element("orders-refresh").disabled = true;
        element("orders-load-more").disabled = true;
        setMessage("orders-message", "Carregando pedidos...", false);
        const start = loadMore ? orderOffset : 0;

        try {
            const { data, error } = await client
                .from("checkout_orders")
                .select("id,source,status,total_cents,items,customer,payment_method,created_at,updated_at,external_reference")
                .order("created_at", { ascending: false })
                .range(start, start + PAGE_SIZE - 1);
            if (error) throw error;

            (data || []).forEach(order => orders.set(order.id, order));
            if (loadMore) {
                orderOffset += (data || []).length;
            } else if (orderOffset === 0) {
                orderOffset = (data || []).length;
            }
            hasMoreOrders = (data || []).length === PAGE_SIZE;

            const ids = (data || []).map(order => order.id);
            if (ids.length) {
                const { data: history, error: historyError } = await client
                    .from("checkout_order_status_history")
                    .select("order_id,previous_status,status,changed_at")
                    .in("order_id", ids)
                    .order("changed_at", { ascending: true });
                if (historyError) throw historyError;
                (history || []).forEach(event => {
                    if (!histories.has(event.order_id)) histories.set(event.order_id, []);
                    const orderHistory = histories.get(event.order_id);
                    if (!orderHistory.some(entry =>
                        entry.status === event.status && entry.changed_at === event.changed_at
                    )) {
                        orderHistory.push(event);
                    }
                });
            }

            setMessage(
                "orders-message",
                orders.size ? `${orders.size} pedido(s) carregado(s).` : "Ainda não há pedidos registrados.",
                false
            );
            renderOrders();
        } catch (error) {
            console.error("Não foi possível carregar os pedidos.", error);
            setMessage(
                "orders-message",
                "Não foi possível carregar os pedidos. Verifique a conexão e tente atualizar novamente."
            );
        } finally {
            loadingOrders = false;
            element("orders-refresh").disabled = false;
            element("orders-load-more").disabled = false;
        }
    }

    async function saveOrderStatus(order, select, button) {
        const status = select.value;
        button.disabled = true;
        button.textContent = "Salvando...";
        setMessage("orders-message", "");
        try {
            const { data, error } = await client
                .from("checkout_orders")
                .update({ status })
                .eq("id", order.id)
                .select("id,source,status,total_cents,items,customer,payment_method,created_at,updated_at,external_reference")
                .single();
            if (error) throw error;
            orders.set(data.id, data);
            setMessage("orders-message", "Status atualizado e registrado no histórico.", false);
            renderOrders();
            await loadOrders();
        } catch (error) {
            console.error("Não foi possível atualizar o status do pedido.", error);
            setMessage(
                "orders-message",
                "Não foi possível atualizar o status. Confira sua sessão e tente novamente."
            );
            button.disabled = false;
            button.textContent = "Salvar status";
        }
    }

    async function verifyAdminAndLoad() {
        const { data, error } = await client.rpc("is_store_admin");
        if (error) {
            console.error("Não foi possível verificar o acesso administrativo.", error);
            throw new Error("Não foi possível validar seu acesso. Confirme se a configuração do painel foi aplicada.");
        }
        if (data !== true) {
            await client.auth.signOut();
            throw new Error("Este e-mail não está autorizado a acessar o painel.");
        }

        element("orders-login").hidden = true;
        element("orders-dashboard").hidden = false;
        if (window.initializeStoreEditor) {
            await window.initializeStoreEditor(client);
        }
        element("show-orders").click();
        await loadOrders();
        window.clearInterval(refreshTimer);
        refreshTimer = window.setInterval(() => loadOrders(), 30_000);
    }

    async function initialize() {
        const config = window.PAYMENT_BACKEND_CONFIG;
        if (!config?.url || !config?.publishableKey || !window.supabase?.createClient) {
            setMessage("orders-login-message", "Não foi possível inicializar o serviço de autenticação.");
            return;
        }

        client = window.supabase.createClient(config.url, config.publishableKey);
        element("orders-login-form").addEventListener("submit", async event => {
            event.preventDefault();
            const button = event.currentTarget.querySelector("button[type='submit']");
            button.disabled = true;
            setMessage("orders-login-message", "Validando acesso...", false);
            try {
                const formData = new FormData(event.currentTarget);
                const { error } = await client.auth.signInWithPassword({
                    email: String(formData.get("email") || "").trim(),
                    password: String(formData.get("password") || "")
                });
                if (error) throw error;
                await verifyAdminAndLoad();
                setMessage("orders-login-message", "");
            } catch (error) {
                console.error("Falha no acesso ao painel.", error);
                setMessage(
                    "orders-login-message",
                    error instanceof Error && error.message.includes("autorizado")
                        ? error.message
                        : "Não foi possível entrar. Verifique o e-mail, a senha e a configuração do painel."
                );
            } finally {
                button.disabled = false;
            }
        });

        element("orders-sign-out").addEventListener("click", async () => {
            window.clearInterval(refreshTimer);
            const { error } = await client.auth.signOut();
            if (error) {
                console.error("Não foi possível encerrar a sessão administrativa.", error);
                setMessage("orders-message", "Não foi possível encerrar a sessão.");
                return;
            }
            orders.clear();
            histories.clear();
            orderOffset = 0;
            hasMoreOrders = false;
            element("orders-dashboard").hidden = true;
            element("orders-login").hidden = false;
            element("orders-view").hidden = false;
            element("site-editor-view").hidden = true;
            setMessage("orders-login-message", "Sessão encerrada.", false);
        });

        element("orders-refresh").addEventListener("click", () => loadOrders());
        element("orders-load-more").addEventListener("click", () => loadOrders(true));
        element("orders-filter").addEventListener("change", renderOrders);

        const { data: { session }, error } = await client.auth.getSession();
        if (error) {
            console.error("Não foi possível recuperar a sessão administrativa.", error);
            setMessage("orders-login-message", "Não foi possível recuperar a sessão. Entre novamente.");
            return;
        }
        if (session) {
            try {
                await verifyAdminAndLoad();
            } catch (sessionError) {
                console.error("A sessão existente não tem acesso ao painel.", sessionError);
                setMessage("orders-login-message", "Entre com uma conta de administrador autorizada.");
            }
        }
    }

    document.addEventListener("DOMContentLoaded", initialize);
})();
