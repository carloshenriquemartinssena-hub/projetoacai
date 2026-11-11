(() => {
    "use strict";

    function safeAsset(value) {
        const url = String(value || "").trim();
        if (/^https:\/\//i.test(url)) return url;
        if (/^[\wÀ-ÿ./ ()_-]+$/.test(url) && !url.includes("..")) return url;
        return "";
    }

    function node(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function render() {
        const publication = window.STORE_PUBLICATION?.content;
        const id = new URLSearchParams(location.search).get("pagina");
        const page = publication?.pages?.find(item =>
            item.id === id && item.active !== false
        );
        const title = document.getElementById("published-page-title");
        const message = document.getElementById("published-page-message");
        if (!page) {
            title.textContent = "Página não encontrada";
            message.textContent = "Esta página pode estar desativada ou não publicada.";
            document.getElementById("published-page-banners").hidden = true;
            document.getElementById("published-page-products").hidden = true;
            return;
        }

        title.textContent = page.title;
        document.title = `${page.title} | Açaí Zero Grau`;
        const banners = (publication.banners || []).filter(banner =>
            banner.active && safeAsset(banner.image)
        );
        const bannerList = document.getElementById("published-page-banners");
        bannerList.replaceChildren();
        banners.forEach(banner => {
            const card = node("article", "published-page-banner");
            const image = node("img");
            image.src = safeAsset(banner.image);
            image.alt = banner.title || "";
            const copy = node("div");
            copy.append(
                node("strong", "", banner.title),
                node("span", "", banner.subtitle || "")
            );
            card.append(image, copy);
            bannerList.appendChild(card);
        });

        const productList = document.getElementById("published-page-products");
        productList.replaceChildren();
        const products = (publication.products || []).filter(product => {
            if (product.active === false) return false;
            const end = product.endsAt ? new Date(product.endsAt).getTime() : null;
            const start = product.startsAt ? new Date(product.startsAt).getTime() : null;
            if (start && start > Date.now()) return false;
            if (end && end < Date.now()) return false;
            return page.template !== "promotional" || Number(product.discount) > 0;
        });
        if (["showcase", "promotional"].includes(page.template)) {
            products.forEach(product => {
                const card = node("a", "published-page-product");
                card.href = `produtopage.html?produto=${encodeURIComponent(product.id)}`;
                const imageSource = safeAsset(product.image);
                if (imageSource) {
                    const image = node("img");
                    image.src = imageSource;
                    image.alt = product.name || "";
                    card.appendChild(image);
                }
                const firstSize = product.sizes?.[0];
                const price = Number(firstSize?.price) *
                    (1 - Number(product.discount || 0) / 100);
                const copy = node("div");
                copy.append(
                    node("strong", "", product.name),
                    node("span", "", Number.isFinite(price)
                        ? `A partir de ${price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                        : "Consulte o preço")
                );
                card.appendChild(copy);
                productList.appendChild(card);
            });
        } else {
            productList.hidden = true;
            message.textContent = page.template === "story"
                ? "Conheça os banners e novidades da loja."
                : "Esta página foi criada como uma página em branco.";
        }
    }

    document.addEventListener("DOMContentLoaded", async () => {
        await (window.STORE_PUBLICATION_READY || Promise.resolve(null));
        render();
    });
})();
