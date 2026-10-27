(() => {
    "use strict";

    const header = `
        <header class="site-header">
            <a class="site-logo" href="index.html" aria-label="Página inicial">
                <img src="logoaçai.png" alt="Açaí Zero Grau">
            </a>
            <button class="site-menu-toggle" type="button" aria-label="Abrir menu"
                aria-expanded="false" aria-controls="menu-principal">
                <span></span><span></span><span></span>
            </button>
            <nav class="site-nav" id="menu-principal" aria-label="Navegação principal">
                <div class="input-container site-search">
                    <div class="input">
                        <img class="icon" src="icon-pesquisar.png" alt="">
                        <input class="campo" type="search" id="campo-pesquisa"
                            placeholder="Pesquisar Açaí" autocomplete="off">
                    </div>
                </div>
                <a href="mais-pedidos.html">Mais pedidos</a>
                <a href="combos.html">Combos</a>
                <a href="epocas.html">Épocas</a>
                <a class="site-cart-link" href="carrinho.html" aria-label="Carrinho">
                    <img class="site-cart-icon" src="carrinho-icon.png" alt="">
                    <span>Carrinho</span>
                    <span class="site-cart-count" id="contador-carrinho">0</span>
                </a>
            </nav>
        </header>
    `;

    const footer = `
        <footer class="site-footer">
            <div class="site-footer-inner">
                <section>
                    <h2>Informações</h2>
                    <ul>
                        <li><a href="termos-privacidade.html">Termos de Uso / Privacidade</a></li>
                        <li><a href="entrega-reembolso.html">Políticas de Entrega &amp; Reembolso</a></li>
                        <li><a href="empresa.html">Razão Social &amp; CNPJ</a></li>
                        <li><a href="pagamentos.html">Formas de Pagamento</a></li>
                    </ul>
                </section>
                <section>
                    <h2>Contato</h2>
                    <ul>
                        <li><a href="https://wa.me/5511974665034" target="_blank" rel="noopener noreferrer">WhatsApp: 11 97466-5034</a></li>
                        <li><a href="https://www.instagram.com/acaizg/" target="_blank" rel="noopener noreferrer">Instagram: @acaizg</a></li>
                        <li><a href="mailto:acaizerograusoficial@gmail.com">acaizerograusoficial@gmail.com</a></li>
                    </ul>
                </section>
                <section>
                    <h2>Açaí Zero Grau</h2>
                    <p>Cardápio e pedidos de açaí preparados sob encomenda. Consulte a disponibilidade e a área de entrega antes de concluir.</p>
                </section>
            </div>
            <p class="site-footer-copy">© Açaí Zero Grau — Todos os direitos reservados.</p>
        </footer>
    `;

    function renderizar() {
        const headerMount = document.querySelector("[data-store-header]");
        const footerMount = document.querySelector("[data-store-footer]");
        if (headerMount) headerMount.outerHTML = header;
        else if (!document.querySelector(".site-header")) {
            document.body.insertAdjacentHTML("afterbegin", header);
        }
        if (footerMount) footerMount.outerHTML = footer;
        else if (!document.querySelector(".site-footer")) {
            document.body.insertAdjacentHTML("beforeend", footer);
        }

        if (!document.getElementById("resultados-pesquisa")) {
            document.body.insertAdjacentHTML(
                "beforeend",
                '<div id="resultados-pesquisa" role="listbox" aria-label="Resultados da pesquisa"></div>'
            );
        }

        const menuButton = document.querySelector(".site-menu-toggle");
        const menu = document.getElementById("menu-principal");
        const headerElement = document.querySelector(".site-header");
        const setMenuOpen = open => {
            menuButton?.setAttribute("aria-expanded", String(open));
            menuButton?.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
            menu?.classList.toggle("site-nav-open", open);
        };

        menuButton?.addEventListener("click", () => {
            const open = menuButton.getAttribute("aria-expanded") !== "true";
            setMenuOpen(open);
        });
        menu?.querySelectorAll("a[href]").forEach(link => {
            link.addEventListener("click", () => setMenuOpen(false));
        });
        document.addEventListener("click", event => {
            if (
                menuButton?.getAttribute("aria-expanded") === "true" &&
                !headerElement?.contains(event.target)
            ) {
                setMenuOpen(false);
            }
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && menuButton?.getAttribute("aria-expanded") === "true") {
                setMenuOpen(false);
                menuButton.focus();
            }
        });
        window.addEventListener("resize", () => {
            if (window.innerWidth > 900) setMenuOpen(false);
        });

        const currentFile = location.pathname.split("/").pop() || "index.html";
        document.querySelectorAll(".site-nav > a[href]").forEach(link => {
            if (link.getAttribute("href") === currentFile) {
                link.setAttribute("aria-current", "page");
            }
        });

        const updateCartCount = () => {
            const count = document.getElementById("contador-carrinho");
            if (!count) return;
            try {
                const cart = JSON.parse(localStorage.getItem("acaiZeroGrauCarrinho") || "[]");
                count.textContent = String(
                    Array.isArray(cart)
                        ? cart.reduce((sum, item) => sum + Math.max(0, Number(item.quantidade) || 0), 0)
                        : 0
                );
            } catch (error) {
                console.error("Não foi possível atualizar o contador do carrinho.", error);
                count.textContent = "0";
            }
        };
        updateCartCount();
        window.addEventListener("storage", updateCartCount);
        window.addEventListener("cart:updated", updateCartCount);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderizar, { once: true });
    } else {
        renderizar();
    }
})();
