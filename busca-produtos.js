(() => {
    "use strict";

    const input = document.getElementById("campo-pesquisa");
    const resultados = document.getElementById("resultados-pesquisa");
    const campo = document.querySelector(".input");
    const container = document.querySelector(".input-container");
    if (!input || !resultados || !campo || !container) return;

    let temporizador;
    input.setAttribute("aria-controls", "resultados-pesquisa");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("role", "combobox");

    function esconder() {
        resultados.classList.remove("mostrar-resultados");
        resultados.replaceChildren();
        input.setAttribute("aria-expanded", "false");
    }

    function posicionar() {
        if (!resultados.classList.contains("mostrar-resultados")) return;
        const caixa = campo.getBoundingClientRect();
        resultados.style.top = `${caixa.bottom + 4}px`;
        resultados.style.left = `${caixa.left}px`;
        resultados.style.width = `${caixa.width}px`;
    }

    function normalizar(texto) {
        return texto.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("pt-BR");
    }

    function pesquisar(consulta) {
        const termo = normalizar(consulta);
        const produtos = Object.entries(window.CATALOGO_PRODUTOS || {})
            .filter(([, produto]) =>
                normalizar(`${produto.nome} ${produto.descricao || ""}`)
                    .includes(termo)
            );
        resultados.replaceChildren();

        if (produtos.length === 0) {
            const vazio = document.createElement("div");
            vazio.className = "resultado-item resultado-vazio";
            vazio.textContent = "Nenhum produto encontrado.";
            resultados.appendChild(vazio);
        } else {
            produtos.forEach(([slug, produto]) => {
                const item = document.createElement("a");
                item.className = "resultado-item";
                item.href =
                    `produtopage.html?produto=${encodeURIComponent(slug)}`;
                item.textContent = produto.nome;
                item.setAttribute("role", "option");
                resultados.appendChild(item);
            });
        }

        resultados.classList.add("mostrar-resultados");
        input.setAttribute("aria-expanded", "true");
        posicionar();
    }

    input.addEventListener("input", () => {
        window.clearTimeout(temporizador);
        const consulta = input.value.trim();
        if (!consulta) {
            esconder();
            return;
        }
        esconder();
        temporizador = window.setTimeout(() => pesquisar(consulta), 180);
    });

    input.addEventListener("focus", () => {
        if (input.value.trim()) pesquisar(input.value.trim());
    });

    document.addEventListener("click", event => {
        if (!container.contains(event.target) && !resultados.contains(event.target)) {
            window.clearTimeout(temporizador);
            esconder();
        }
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            window.clearTimeout(temporizador);
            esconder();
            input.blur();
        }
    });
    window.addEventListener("resize", posicionar);
    window.addEventListener("scroll", posicionar, true);
})();
