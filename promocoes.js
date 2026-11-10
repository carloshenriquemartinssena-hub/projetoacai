(() => {
    "use strict";

    const catalogo = window.CATALOGO_PRODUTOS || {};
    const promocoes = Object.entries(catalogo)
        .filter(([, produto]) =>
            produto.promocao?.ativa === true &&
            Number.isFinite(Number(produto.promocao.descontoPercentual))
        )
        .sort(([, produtoA], [, produtoB]) =>
            Number(produtoB.promocao.descontoPercentual) -
            Number(produtoA.promocao.descontoPercentual)
        );
    const money = value => Number(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    let activeIndex = 0;
    let updateTimer;

    function promotionalPrice(product, price) {
        return window.precoPromocional
            ? window.precoPromocional(product, price)
            : price;
    }

    function renderThumbnails() {
        const container = document.getElementById("promo-thumbnails");
        container.replaceChildren();

        promocoes.forEach(([slug, product], index) => {
            const button = document.createElement("button");
            button.className = "promo-thumbnail";
            button.type = "button";
            button.setAttribute("aria-label", `${product.nome}, ${product.promocao.descontoPercentual}% de desconto`);
            button.setAttribute("aria-pressed", String(index === activeIndex));

            const image = document.createElement("img");
            image.src = product.imagens?.[0] || "fotoexemplo.png";
            image.alt = "";
            image.loading = "lazy";

            const details = document.createElement("span");
            details.className = "promo-thumbnail-details";
            const name = document.createElement("strong");
            name.textContent = product.nome;
            const discount = document.createElement("span");
            discount.textContent = `${product.promocao.descontoPercentual}% OFF`;

            details.append(name, discount);
            button.append(image, details);
            button.addEventListener("click", () => selectPromotion(index));
            container.appendChild(button);
        });
    }

    function selectPromotion(index) {
        if (!promocoes.length) return;
        activeIndex = (index + promocoes.length) % promocoes.length;

        const [slug, product] = promocoes[activeIndex];
        const copy = document.getElementById("promo-copy");
        const image = document.getElementById("promo-image");
        const firstSize = product.tamanhos[0];
        const oldPrice = Number(firstSize.valor);
        const price = promotionalPrice(product, oldPrice);

        copy.classList.add("is-changing");
        image.classList.add("is-changing");
        window.clearTimeout(updateTimer);
        updateTimer = window.setTimeout(() => {
            document.getElementById("promo-discount").textContent =
                `${product.promocao.descontoPercentual}% OFF`;
            document.getElementById("promo-title").textContent = product.nome;
            document.getElementById("promo-description").textContent =
                product.descricao || "Aproveite esta oferta especial por tempo limitado.";
            document.getElementById("promo-original").textContent = money(oldPrice);
            document.getElementById("promo-price").textContent = money(price);
            document.getElementById("promo-buy").href =
                `produtopage.html?produto=${encodeURIComponent(slug)}`;
            image.src = product.imagens?.[0] || "fotoexemplo.png";
            image.alt = product.nome;

            document.querySelectorAll(".promo-thumbnail").forEach((button, buttonIndex) => {
                button.setAttribute("aria-pressed", String(buttonIndex === activeIndex));
            });
            copy.classList.remove("is-changing");
            image.classList.remove("is-changing");
        }, 120);
    }

    function initialize() {
        if (!promocoes.length) {
            document.querySelector(".promo-showcase").textContent =
                "Novas promoções estarão disponíveis em breve.";
            document.querySelector(".promo-products").hidden = true;
            return;
        }

        renderThumbnails();
        document.getElementById("promo-previous").addEventListener("click", () =>
            selectPromotion(activeIndex - 1)
        );
        document.getElementById("promo-next").addEventListener("click", () =>
            selectPromotion(activeIndex + 1)
        );
        selectPromotion(activeIndex);
    }

    document.addEventListener("DOMContentLoaded", initialize);
})();
