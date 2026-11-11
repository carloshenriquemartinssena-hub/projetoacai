(() => {
    "use strict";

    const TABLE = "website_editor_drafts";
    const PUBLICATIONS_TABLE = "website_editor_publications";
    const DRAFT_ID = "main";
    const TEMPLATE_LABELS = {
        showcase: "Vitrine de produtos",
        promotional: "Página promocional",
        story: "Nossa história",
        blank: "Página em branco"
    };
    const state = {
        client: null,
        content: null,
        canSave: false,
        dirty: false,
        saving: false,
        publishing: false,
        publishedAt: null,
        initialized: false
    };

    const byId = id => document.getElementById(id);
    const formData = form => Object.fromEntries(new FormData(form).entries());
    const uid = () => window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    function seedDraft() {
        const catalog = window.CATALOGO_PRODUTOS || {};
        const products = Object.entries(catalog).map(([id, product]) => ({
            id,
            name: product.nome,
            description: product.descricao || "",
            image: product.imagens?.[0] || "",
            sizes: (product.tamanhos || []).map(size => ({
                name: size.nome,
                price: Number(size.valor) || 0
            })),
            discount: Number(product.promocao?.descontoPercentual) || 0,
            active: true,
            startsAt: "",
            endsAt: ""
        }));

        return {
            products,
            banners: [
                { id: uid(), title: "Açaí Zero Grau", subtitle: "Feito com carinho para você", image: "banner.DK.png", link: "", active: true },
                { id: uid(), title: "Novidades da semana", subtitle: "Descubra novos sabores", image: "banner PROMOCIONAL_ sextou novos lançamentos.png", link: "", active: true },
                { id: uid(), title: "Uma oferta especial para você", subtitle: "Confira as novidades", image: "banner PROMOCIONAL_ novos seguidores ganham desconto!.png", link: "", active: true }
            ],
            pages: [
                { id: "home", title: "Início", template: "showcase", active: true },
                { id: "promotions", title: "Promoções", template: "promotional", active: true },
                { id: "our-story", title: "Nossa história", template: "story", active: true }
            ],
            content: {
                videoUrl: "",
                videoEnabled: false,
                contactType: "whatsapp",
                contactValue: "",
                contactLabel: "Fale com a gente",
                contactEnabled: false
            },
            appearance: {
                primaryColor: "#4b0082",
                accentColor: "#a53d9c",
                cardStyle: "soft"
            }
        };
    }

    function setSaveState(message, isError = false) {
        const status = byId("editor-save-state");
        status.textContent = message;
        status.classList.toggle("is-error", isError);
        status.classList.toggle("is-saved", !isError && !state.dirty);
        updatePublishButton();
    }

    function markDirty() {
        state.dirty = true;
        setSaveState("Há alterações não salvas.");
        renderAll();
    }

    function updatePublishButton() {
        const button = byId("editor-publish");
        if (button) button.disabled =
            !state.canSave || state.dirty || state.saving || state.publishing;
    }

    function setPublicationState(message, isError = false) {
        const status = byId("editor-publication-state");
        status.textContent = message;
        status.classList.toggle("is-error", isError);
    }

    function cleanText(value) {
        return String(value || "").trim();
    }

    function safeMediaUrl(value) {
        const url = cleanText(value);
        if (/^https?:\/\//i.test(url)) return url;
        if (/^[\wÀ-ÿ./ ()_-]+$/.test(url) && !url.includes("..")) return url;
        return "";
    }

    function formatPrice(value) {
        return Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function productIsAvailable(product) {
        const now = Date.now();
        const startsAt = product.startsAt ? new Date(product.startsAt).getTime() : null;
        const endsAt = product.endsAt ? new Date(product.endsAt).getTime() : null;
        return product.active !== false &&
            (!startsAt || !Number.isFinite(startsAt) || startsAt <= now) &&
            (!endsAt || !Number.isFinite(endsAt) || endsAt >= now);
    }

    function element(tag, className, text) {
        const result = document.createElement(tag);
        if (className) result.className = className;
        if (text !== undefined) result.textContent = text;
        return result;
    }

    function makeItemCard(title, detail, status, id, type, image) {
        const card = element("article", "editor-item-card");
        if (image && safeMediaUrl(image)) {
            const picture = element("img", "editor-item-image");
            picture.src = safeMediaUrl(image);
            picture.alt = "";
            picture.loading = "lazy";
            picture.addEventListener("error", () => picture.remove());
            card.appendChild(picture);
        }
        const copy = element("div", "editor-item-copy");
        copy.append(element("strong", "", title), element("span", "", detail), element("small", "", status));
        const actions = element("div", "editor-item-actions");
        const edit = element("button", "orders-secondary-button", "Editar");
        edit.type = "button";
        edit.dataset.editorAction = "edit";
        edit.dataset.editorType = type;
        edit.dataset.editorId = id;
        const remove = element("button", "editor-remove-button", "Remover");
        remove.type = "button";
        remove.dataset.editorAction = "remove";
        remove.dataset.editorType = type;
        remove.dataset.editorId = id;
        actions.append(edit, remove);
        card.append(copy, actions);
        return card;
    }

    function renderProducts() {
        const list = byId("editor-product-list");
        list.replaceChildren();
        state.content.products.forEach(product => {
            const discount = Number(product.discount) > 0
                ? ` · ${Number(product.discount)}% de desconto`
                : "";
            const ends = product.endsAt
                ? ` · até ${new Date(product.endsAt).toLocaleString("pt-BR")}`
                : "";
            const sizes = Array.isArray(product.sizes) && product.sizes.length
                ? product.sizes
                : [{ name: "Único", price: Number(product.price) || 0 }];
            const sizeDetails = sizes.map(size =>
                `${size.name}: ${formatPrice(Number(size.price) * (1 - Number(product.discount || 0) / 100))}`
            ).join(" · ");
            list.appendChild(makeItemCard(
                product.name,
                `${sizeDetails}${discount}`,
                productIsAvailable(product) ? `Disponível${ends}` : "Pausado ou fora do período",
                product.id,
                "product",
                product.image
            ));
        });
        if (!state.content.products.length) {
            list.appendChild(element("p", "editor-empty", "Nenhum produto neste rascunho. Use “Novo produto” para começar."));
        }
    }

    function renderBanners() {
        const list = byId("editor-banner-list");
        list.replaceChildren();
        state.content.banners.forEach(banner => {
            list.appendChild(makeItemCard(
                banner.title,
                banner.subtitle || banner.image,
                banner.active ? "Visível no rascunho" : "Oculto no rascunho",
                banner.id,
                "banner",
                banner.image
            ));
        });
        if (!state.content.banners.length) {
            list.appendChild(element("p", "editor-empty", "Nenhum banner. Adicione uma imagem para criar o primeiro."));
        }
    }

    function renderPages() {
        const list = byId("editor-page-list");
        list.replaceChildren();
        state.content.pages.forEach(page => {
            const card = makeItemCard(
                page.title,
                TEMPLATE_LABELS[page.template] || TEMPLATE_LABELS.blank,
                page.active ? "Página ativa no rascunho" : "Página oculta no rascunho",
                page.id,
                "page"
            );
            if (page.id === "home") card.querySelector('[data-editor-action="remove"]').disabled = true;
            list.appendChild(card);
        });
        if (!state.content.pages.length) {
            list.appendChild(element("p", "editor-empty", "Não há páginas configuradas."));
        }
    }

    function renderSettings() {
        const contentForm = byId("editor-content-form");
        const appearanceForm = byId("editor-appearance-form");
        Object.entries(state.content.content).forEach(([name, value]) => {
            const field = contentForm.elements.namedItem(name);
            if (field) {
                if (field.type === "checkbox") field.checked = Boolean(value);
                else field.value = value;
            }
        });
        Object.entries(state.content.appearance).forEach(([name, value]) => {
            const field = appearanceForm.elements.namedItem(name);
            if (field) field.value = value;
        });
    }

    function renderPreview() {
        const preview = byId("editor-preview");
        const { appearance, banners, products, pages, content } = state.content;
        const primary = /^#[\da-f]{6}$/i.test(appearance.primaryColor)
            ? appearance.primaryColor
            : "#4b0082";
        const accent = /^#[\da-f]{6}$/i.test(appearance.accentColor)
            ? appearance.accentColor
            : "#a53d9c";
        preview.replaceChildren();
        preview.style.setProperty("--preview-primary", primary);
        preview.style.setProperty("--preview-accent", accent);

        const topbar = element("div", "preview-topbar", "Açaí Zero Grau · Prévia");
        const nav = element("div", "preview-page-links");
        pages.filter(page => page.active).forEach(page =>
            nav.appendChild(element("span", "", page.title))
        );
        preview.append(topbar, nav);

        const banner = banners.find(item => item.active);
        if (banner) {
            const hero = element("div", "preview-hero");
            if (safeMediaUrl(banner.image)) {
                const image = element("img", "preview-hero-image");
                image.src = safeMediaUrl(banner.image);
                image.alt = "";
                image.addEventListener("error", () => image.remove());
                hero.appendChild(image);
            }
            const overlay = element("div", "preview-hero-copy");
            overlay.append(element("strong", "", banner.title), element("span", "", banner.subtitle));
            hero.appendChild(overlay);
            preview.appendChild(hero);
        } else {
            preview.appendChild(element("div", "preview-placeholder", "Adicione um banner para ver a chamada da loja."));
        }

        preview.appendChild(element("h4", "preview-products-title", "Produtos em destaque"));
        const grid = element("div", "preview-product-grid");
        products.filter(productIsAvailable).slice(0, 4).forEach(product => {
            const card = element("article", `preview-product-card card-${appearance.cardStyle}`);
            if (safeMediaUrl(product.image)) {
                const image = element("img");
                image.src = safeMediaUrl(product.image);
                image.alt = "";
                image.addEventListener("error", () => image.remove());
                card.appendChild(image);
            }
            const firstSize = product.sizes?.[0] || { price: product.price };
            const price = Number(firstSize.price) * (1 - Number(product.discount || 0) / 100);
            const priceLabel = Number(product.discount) > 0
                ? `${formatPrice(price)} · ${Number(product.discount)}% OFF`
                : `A partir de ${formatPrice(price)}`;
            card.append(element("strong", "", product.name), element("span", "", priceLabel));
            grid.appendChild(card);
        });
        preview.appendChild(grid);

        if (content.videoEnabled && content.videoUrl) {
            preview.appendChild(element("div", "preview-content-note", "Seção de vídeo: " + content.videoUrl));
        }
        if (content.contactEnabled && content.contactValue) {
            preview.appendChild(element(
                "div",
                "preview-contact",
                content.contactLabel || (content.contactType === "chat" ? "Abrir chat" : "Fale com a gente")
            ));
        }
    }

    function renderAll() {
        if (!state.content) return;
        byId("editor-product-count").textContent = String(state.content.products.length);
        byId("editor-banner-count").textContent = String(state.content.banners.length);
        byId("editor-page-count").textContent = String(state.content.pages.length);
        renderProducts();
        renderBanners();
        renderPages();
        renderSettings();
        renderPreview();
    }

    function setForm(form, values) {
        form.reset();
        Object.entries(values).forEach(([name, value]) => {
            const field = form.elements.namedItem(name);
            if (!field) return;
            if (field.type === "checkbox") field.checked = Boolean(value);
            else field.value = value ?? "";
        });
        form.hidden = false;
        form.scrollIntoView({ behavior: "smooth", block: "nearest" });
        form.querySelector("input:not([type='hidden']), textarea, select")?.focus();
    }

    function closeForm(form) {
        form.reset();
        form.hidden = true;
    }

    function renderSizeFields(sizes) {
        const container = byId("editor-product-sizes");
        container.replaceChildren();
        sizes.forEach(size => {
            const row = element("div", "editor-size-row");
            const nameLabel = element("label", "", "Tamanho");
            const nameInput = document.createElement("input");
            nameInput.dataset.sizeName = "";
            nameInput.value = size.name || "";
            nameInput.maxLength = 30;
            nameInput.required = true;
            nameLabel.appendChild(nameInput);

            const priceLabel = element("label", "", "Preço (R$)");
            const priceInput = document.createElement("input");
            priceInput.dataset.sizePrice = "";
            priceInput.type = "number";
            priceInput.min = "0.01";
            priceInput.step = "0.01";
            priceInput.value = size.price ?? "";
            priceInput.required = true;
            priceLabel.appendChild(priceInput);

            const remove = element("button", "editor-remove-button", "Remover");
            remove.type = "button";
            remove.dataset.removeSize = "";
            row.append(nameLabel, priceLabel, remove);
            container.appendChild(row);
        });
    }

    function editItem(type, id) {
        const collection = type === "product"
            ? state.content.products
            : type === "banner"
                ? state.content.banners
                : state.content.pages;
        const item = collection.find(entry => entry.id === id);
        if (!item) return;
        const form = byId(`editor-${type}-form`);
        byId(`editor-${type}-form-title`).textContent = type === "product"
            ? "Editar produto"
            : type === "banner" ? "Editar banner" : "Editar página";
        setForm(form, item);
        if (type === "product") {
            renderSizeFields(Array.isArray(item.sizes) && item.sizes.length
                ? item.sizes
                : [{ name: "Único", price: item.price ?? "" }]);
        }
    }

    function deleteItem(type, id) {
        if (type === "page" && id === "home") return;
        const names = { product: "produto", banner: "banner", page: "página" };
        if (!window.confirm(`Remover este ${names[type]} do rascunho?`)) return;
        const key = type === "product" ? "products" : type === "banner" ? "banners" : "pages";
        state.content[key] = state.content[key].filter(item => item.id !== id);
        markDirty();
    }

    function saveItem(type, values) {
        const key = type === "product" ? "products" : type === "banner" ? "banners" : "pages";
        const form = byId(`editor-${type}-form`);
        const id = cleanText(values.id) || uid();
        const previousIndex = state.content[key].findIndex(item => item.id === id);
        let item;
        if (type === "product") {
            const sizes = [...byId("editor-product-sizes").querySelectorAll(".editor-size-row")].map(row => ({
                name: cleanText(row.querySelector("[data-size-name]").value),
                price: Number(row.querySelector("[data-size-price]").value)
            }));
            const discount = Number(values.discount || 0);
            if (
                !sizes.length ||
                sizes.some(size => !size.name || !Number.isFinite(size.price) || size.price <= 0) ||
                !Number.isFinite(discount) || discount < 0 || discount > 99
            ) {
                setSaveState("Confira os tamanhos, preços e desconto informados.", true);
                return;
            }
            if (
                values.startsAt && values.endsAt &&
                new Date(values.endsAt).getTime() < new Date(values.startsAt).getTime()
            ) {
                setSaveState("A data final precisa ser posterior à data inicial.", true);
                return;
            }
            item = {
                id,
                name: cleanText(values.name),
                description: cleanText(values.description),
                image: cleanText(values.image),
                sizes,
                price: sizes[0].price,
                discount,
                active: values.active === "on",
                startsAt: cleanText(values.startsAt),
                endsAt: cleanText(values.endsAt)
            };
        } else if (type === "banner") {
            item = {
                id,
                title: cleanText(values.title),
                subtitle: cleanText(values.subtitle),
                image: cleanText(values.image),
                link: cleanText(values.link),
                active: values.active === "on"
            };
        } else {
            item = {
                id,
                title: cleanText(values.title),
                template: values.template,
                active: values.active === "on"
            };
        }
        if (previousIndex >= 0) state.content[key][previousIndex] = item;
        else state.content[key].push(item);
        closeForm(form);
        markDirty();
    }

    function configureNavigation() {
        document.querySelectorAll("[data-editor-tab]").forEach(button => {
            button.addEventListener("click", () => {
                document.querySelectorAll("[data-editor-tab]").forEach(tab => {
                    const selected = tab === button;
                    tab.classList.toggle("is-active", selected);
                    tab.setAttribute("aria-current", selected ? "page" : "false");
                });
                document.querySelectorAll("[data-editor-panel]").forEach(panel => {
                    panel.hidden = panel.dataset.editorPanel !== button.dataset.editorTab;
                });
            });
        });

        byId("show-orders").addEventListener("click", () => switchPanel("orders"));
        byId("show-site-editor").addEventListener("click", () => switchPanel("editor"));
    }

    function switchPanel(panel) {
        const showEditor = panel === "editor";
        byId("orders-view").hidden = showEditor;
        byId("site-editor-view").hidden = !showEditor;
        byId("orders-title").textContent = showEditor ? "Editor do site" : "Pedidos recebidos";
        byId("orders-title-description").textContent = showEditor
            ? "Monte uma nova versão do site sem alterar a loja atual."
            : "Pedidos do Asaas e solicitações enviadas pelo WhatsApp.";
        byId("orders-refresh").hidden = showEditor;
        byId("show-orders").classList.toggle("is-active", !showEditor);
        byId("show-site-editor").classList.toggle("is-active", showEditor);
        byId("show-orders").setAttribute("aria-current", showEditor ? "false" : "page");
        byId("show-site-editor").setAttribute("aria-current", showEditor ? "page" : "false");
    }

    function bindForms() {
        [
            ["product", "editor-product-form"],
            ["banner", "editor-banner-form"],
            ["page", "editor-page-form"]
        ].forEach(([type, id]) => {
            const form = byId(id);
            form.addEventListener("submit", event => {
                event.preventDefault();
                saveItem(type, formData(form));
            });
            byId(`editor-new-${type}`).addEventListener("click", () => {
                byId(`editor-${type}-form-title`).textContent = type === "product"
                    ? "Novo produto" : type === "banner" ? "Novo banner" : "Nova página";
                const initialValues = type === "product"
                    ? { active: true, discount: 0, sizes: [{ name: "Único", price: "" }] }
                    : type === "page" ? { active: true, template: "showcase" } : { active: true };
                setForm(form, initialValues);
                if (type === "product") renderSizeFields(initialValues.sizes);
            });
            byId(`editor-cancel-${type}`).addEventListener("click", () => closeForm(form));
        });

        byId("editor-product-list").addEventListener("click", handleItemAction);
        byId("editor-banner-list").addEventListener("click", handleItemAction);
        byId("editor-page-list").addEventListener("click", handleItemAction);
        byId("editor-add-size").addEventListener("click", () => {
            const sizes = [...byId("editor-product-sizes").querySelectorAll(".editor-size-row")].map(row => ({
                name: row.querySelector("[data-size-name]").value,
                price: row.querySelector("[data-size-price]").value
            }));
            sizes.push({ name: "", price: "" });
            renderSizeFields(sizes);
        });
        byId("editor-product-sizes").addEventListener("click", event => {
            if (!event.target.closest("[data-remove-size]")) return;
            const rows = [...byId("editor-product-sizes").querySelectorAll(".editor-size-row")];
            if (rows.length === 1) {
                setSaveState("Mantenha pelo menos um tamanho e preço.", true);
                return;
            }
            event.target.closest(".editor-size-row").remove();
        });

        byId("editor-content-form").addEventListener("submit", event => {
            event.preventDefault();
            const values = formData(event.currentTarget);
            state.content.content = {
                videoUrl: cleanText(values.videoUrl),
                videoEnabled: values.videoEnabled === "on",
                contactType: values.contactType,
                contactValue: cleanText(values.contactValue),
                contactLabel: cleanText(values.contactLabel),
                contactEnabled: values.contactEnabled === "on"
            };
            markDirty();
        });
        byId("editor-appearance-form").addEventListener("submit", event => {
            event.preventDefault();
            state.content.appearance = formData(event.currentTarget);
            markDirty();
        });
        byId("editor-save").addEventListener("click", saveDraft);
        byId("editor-publish").addEventListener("click", publishDraft);
    }

    function handleItemAction(event) {
        const button = event.target.closest("[data-editor-action]");
        if (!button || button.disabled) return;
        if (button.dataset.editorAction === "edit") editItem(button.dataset.editorType, button.dataset.editorId);
        else deleteItem(button.dataset.editorType, button.dataset.editorId);
    }

    async function saveDraft() {
        if (!state.canSave || !state.client || !state.content) return;
        const button = byId("editor-save");
        state.saving = true;
        button.disabled = true;
        updatePublishButton();
        setSaveState("Salvando rascunho...");
        try {
            const { error } = await state.client
                .from(TABLE)
                .upsert({
                    id: DRAFT_ID,
                    content: state.content,
                    updated_at: new Date().toISOString()
                }, { onConflict: "id" });
            if (error) throw error;
            state.dirty = false;
            setSaveState(`Salvo em ${new Date().toLocaleString("pt-BR")}.`);
        } catch (error) {
            console.error("Não foi possível salvar o rascunho do site.", error);
            setSaveState("Falha ao salvar. Confira a conexão e se a migração do editor foi aplicada.", true);
        } finally {
            state.saving = false;
            button.disabled = false;
            updatePublishButton();
        }
    }

    async function loadPublication() {
        const { data, error } = await state.client
            .from(PUBLICATIONS_TABLE)
            .select("published_at")
            .eq("id", DRAFT_ID)
            .maybeSingle();
        if (error) throw error;

        state.publishedAt = data?.published_at || null;
        setPublicationState(state.publishedAt
            ? `Última versão publicada no Supabase em ${new Date(state.publishedAt).toLocaleString("pt-BR")}.`
            : "Ainda não há uma versão publicada.");
    }

    async function publishDraft() {
        if (!state.canSave || state.dirty || !state.client) {
            setPublicationState("Salve o rascunho antes de publicar.", true);
            return;
        }
        if (!window.confirm(
            "Publicar uma cópia deste rascunho no Supabase? Isso não altera nem substitui o site atual."
        )) return;

        const button = byId("editor-publish");
        state.publishing = true;
        button.disabled = true;
        setPublicationState("Publicando uma cópia da nova versão...");
        try {
            const { data, error } = await state.client.rpc("publish_website_draft");
            if (error) throw error;
            state.publishedAt = data || new Date().toISOString();
            setPublicationState(
                `Versão publicada no Supabase em ${new Date(state.publishedAt).toLocaleString("pt-BR")}.`
            );
        } catch (error) {
            console.error("Não foi possível publicar o rascunho do site.", error);
            setPublicationState(
                "Falha ao publicar. Confira o script SQL e tente novamente.",
                true
            );
        } finally {
            state.publishing = false;
            updatePublishButton();
        }
    }

    async function initialize(client) {
        state.client = client;
        if (!state.initialized) {
            configureNavigation();
            bindForms();
            state.initialized = true;
        }
        byId("editor-save").disabled = true;
        try {
            const { data, error } = await client
                .from(TABLE)
                .select("content,updated_at")
                .eq("id", DRAFT_ID)
                .maybeSingle();
            if (error) throw error;
            state.content = data?.content || seedDraft();
            state.canSave = true;
            byId("editor-save").disabled = false;
            state.dirty = !data;
            renderAll();
            setSaveState(data
                ? `Rascunho carregado · ${new Date(data.updated_at).toLocaleString("pt-BR")}.`
                : "Novo rascunho: salve para compartilhar com a equipe.");
            await loadPublication();
        } catch (error) {
            console.error("Não foi possível carregar o rascunho do editor.", error);
            if (!state.content) state.content = seedDraft();
            renderAll();
            if (!state.canSave) {
                setSaveState("Não foi possível carregar. Verifique o script SQL e tente novamente.", true);
            } else {
                setPublicationState("Não foi possível consultar a versão publicada.", true);
            }
        }
    }

    window.initializeStoreEditor = initialize;
})();
