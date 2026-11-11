(() => {
    "use strict";

    const imagemReserva = "fotoexemplo.png";
    const moeda = valor => Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    function embaralhar(lista) {
        const resultado = [...lista];
        for (let indice = resultado.length - 1; indice > 0; indice -= 1) {
            const aleatorio = Math.floor(Math.random() * (indice + 1));
            [resultado[indice], resultado[aleatorio]] =
                [resultado[aleatorio], resultado[indice]];
        }
        return resultado;
    }

    function menorPreco(produto) {
        const precos = (produto.tamanhos || [])
            .map(tamanho => window.precoPromocional
                ? window.precoPromocional(produto, Number(tamanho.valor))
                : Number(tamanho.valor))
            .filter(Number.isFinite);
        return precos.length ? Math.min(...precos) : null;
    }

    function criarCard(slug, produto) {
        const card = document.createElement("article");
        card.className = "product-tile";

        const linkProduto = document.createElement("a");
        linkProduto.href =
            `produtopage.html?produto=${encodeURIComponent(slug)}`;
        linkProduto.setAttribute("aria-label", `Ver ${produto.nome}`);

        const imagem = document.createElement("img");
        imagem.src = produto.imagens?.[0] || imagemReserva;
        imagem.alt = produto.nome;
        imagem.loading = "lazy";
        linkProduto.appendChild(imagem);

        const conteudo = document.createElement("div");
        conteudo.className = "product-tile-content";

        const titulo = document.createElement("h2");
        titulo.textContent = produto.nome;

        const descricao = document.createElement("p");
        descricao.textContent = produto.descricao || "";

        const preco = document.createElement("p");
        preco.className = "tile-price";
        const valor = menorPreco(produto);
        preco.textContent = valor === null
            ? "Consulte o preço"
            : `A partir de ${moeda(valor)}`;
        if (produto.promocao?.ativa === true) {
            const desconto = document.createElement("span");
            desconto.className = "tile-discount";
            desconto.textContent =
                `${Number(produto.promocao.descontoPercentual)}% OFF`;
            preco.append(" ", desconto);
        }

        const botao = document.createElement("a");
        botao.className = "tile-link";
        botao.href = linkProduto.href;
        botao.textContent = "Ver produto";

        conteudo.append(titulo, descricao, preco, botao);
        card.append(linkProduto, conteudo);
        return card;
    }

    function renderizarLista(container, produtos, mensagemVazia) {
        container.replaceChildren();
        if (produtos.length === 0) {
            const mensagem = document.createElement("p");
            mensagem.className = "empty-list";
            mensagem.textContent = mensagemVazia;
            container.appendChild(mensagem);
            return;
        }
        produtos.forEach(([slug, produto]) => {
            container.appendChild(criarCard(slug, produto));
        });
    }

    async function iniciar() {
        await (window.STORE_PUBLICATION_READY || Promise.resolve(null));
        const catalogo = window.CATALOGO_PRODUTOS || {};
        const todosProdutos = Object.entries(catalogo);
        const modo = document.body.dataset.vitrine;

        if (modo === "destaques") {
            const novidades = todosProdutos.filter(([, produto]) => produto.novo === true);
            const destaques = embaralhar(novidades).slice(0, 3);
            const produtosDaPaginaInicial = embaralhar(novidades);
            document.querySelectorAll("[data-featured-products]").forEach(container => {
                renderizarLista(
                    container,
                    destaques,
                    "Novos produtos em breve."
                );
            });
            document.querySelectorAll("[data-home-products]").forEach(container => {
                const produtos = container.dataset.homeProducts === "weekly"
                    ? produtosDaPaginaInicial.slice(0, 3)
                    : produtosDaPaginaInicial.slice(3, 6);
                renderizarLista(
                    container,
                    produtos,
                    "Novos produtos em breve."
                );
            });
            return;
        }

        if (modo === "epocas") {
            document.querySelectorAll("[data-estacao]").forEach(secao => {
                const estacao = secao.dataset.estacao;
                const produtosDaEstacao = todosProdutos.filter(([, produto]) =>
                    produto.estacoes?.includes(estacao)
                );
                const produtosDisponiveis = produtosDaEstacao.length
                    ? produtosDaEstacao
                    : todosProdutos;
                const produtosAleatorios = embaralhar(produtosDisponiveis).slice(0, 15);
                renderizarLista(
                    secao.querySelector(".product-grid"),
                    produtosAleatorios,
                    "Ainda não há produtos cadastrados nesta estação."
                );
            });
            return;
        }

        const produtos = modo === "combos"
            ? todosProdutos.filter(([, produto]) => produto.combo === true)
            : todosProdutos;
        const listaProdutos = document.getElementById("lista-produtos");
        if (!listaProdutos) return;
        renderizarLista(
            listaProdutos,
            produtos,
            modo === "combos"
                ? "Nenhum produto foi marcado como Combo. Marque combo: true no produto.js para incluí-lo automaticamente."
                : "Ainda não há produtos cadastrados."
        );
    }

    document.addEventListener("DOMContentLoaded", iniciar);
})();
