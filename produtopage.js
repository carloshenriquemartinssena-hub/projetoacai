
(() => {
    "use strict";

    const WHATSAPP_LOJA = "5511974665034";
    const IMAGEM_RESERVA = "fotoexemplo.png";

    const catalogo = window.CATALOGO_PRODUTOS || {};

    const elemento = (id) =>
        document.getElementById(id);


    // Formata os preços em reais
    function dinheiro(valor) {
        return Number(valor).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }


    // Descobre qual produto foi solicitado na URL
    function produtoAtual() {
        const parametros =
            new URLSearchParams(window.location.search);

        const slug =
            parametros.get("produto") || "acai-especial";

        return catalogo[slug] || null;
    }


    // Exibe mensagens para o cliente
    function definirMensagem(texto, alvo = "mensagem-carrinho") {
        const campo = elemento(alvo);

        if (campo) {
            campo.textContent = texto;
        }
    }


    // Carrega os dados do produto na página
    function carregarProduto(produto) {
        document.title =
            `${produto.nome} | Açaí Zero Grau`;

        elemento("produto-titulo").textContent =
            produto.nome;

        elemento("produto-descricao").textContent =
            produto.descricao;

        const imagemPrincipal =
            elemento("imagem-produto-principal");

        imagemPrincipal.src =
            produto.imagens?.[0] || IMAGEM_RESERVA;

        imagemPrincipal.alt = produto.nome;

        renderizarMiniaturas(produto);
        renderizarTamanhos(produto);
        renderizarAdicionais(produto);
        renderizarRelacionados(produto);
        atualizarPreco(produto);
    }


    // Cria a galeria de imagens
    function renderizarMiniaturas(produto) {
        const container =
            elemento("imagens-miniaturas");

        container.replaceChildren();

        const imagens =
            produto.imagens?.length
                ? produto.imagens
                : [IMAGEM_RESERVA];

        imagens.forEach((src, indice) => {
            const img = document.createElement("img");

            img.src = src;
            img.alt = `Foto ${indice + 1} de ${produto.nome}`;
            img.className =
                `miniatura${indice === 0 ? " ativa" : ""}`;

            img.tabIndex = 0;
            img.setAttribute("role", "button");

            img.addEventListener("click", () => {
                selecionarMiniatura(img);
            });

            img.addEventListener("keydown", (evento) => {
                if (
                    evento.key === "Enter" ||
                    evento.key === " "
                ) {
                    evento.preventDefault();
                    selecionarMiniatura(img);
                }
            });

            container.appendChild(img);
        });
    }


    // Troca a foto principal ao clicar na miniatura
    function selecionarMiniatura(miniatura) {
        const principal =
            elemento("imagem-produto-principal");

        principal.src = miniatura.src;
        principal.alt = miniatura.alt;

        document
            .querySelectorAll(".miniatura")
            .forEach((img) => {
                img.classList.remove("ativa");
            });

        miniatura.classList.add("ativa");
    }


    // Cria os botões de tamanho
    function renderizarTamanhos(produto) {
        const container =
            elemento("tamanhos-botoes");

        container.replaceChildren();

        produto.tamanhos.forEach((tamanho, indice) => {
            const label =
                document.createElement("label");

            label.className = "tamanho-item";

            const radio =
                document.createElement("input");

            radio.type = "radio";
            radio.name = "tamanho";
            radio.value = tamanho.nome;

            radio.dataset.preco =
                String(tamanho.valor);

            radio.checked = indice === 0;

            radio.addEventListener("change", () => {
                atualizarPreco(produto);
            });

            const span =
                document.createElement("span");

            span.textContent = tamanho.nome;

            label.append(radio, span);
            container.appendChild(label);
        });
    }


    // Cria os adicionais e seus respectivos preços
    function renderizarAdicionais(produto) {
        const container =
            elemento("adicionais-produto");

        container.replaceChildren();

        (produto.adicionais || []).forEach((adicional) => {
            const label =
                document.createElement("label");

            label.className = "adicional-item";

            const checkbox =
                document.createElement("input");

            checkbox.type = "checkbox";
            checkbox.name = "adicional";
            checkbox.value = adicional.nome;

            checkbox.dataset.preco =
                String(adicional.valor);

            checkbox.addEventListener("change", () => {
                atualizarPreco(produto);
            });

            const texto = document.createTextNode(
                ` ${adicional.nome} (+${dinheiro(adicional.valor)})`
            );

            label.append(checkbox, texto);
            container.appendChild(label);
        });
    }


    // Calcula o preço do tamanho escolhido e dos adicionais
    function precoSelecionado(produto) {
        const tamanhoSelecionado =
            document.querySelector(
                'input[name="tamanho"]:checked'
            );

        const precoBase = tamanhoSelecionado
            ? Number(tamanhoSelecionado.dataset.preco)
            : produto.tamanhos[0].valor;

        const precoAdicionais = [
            ...document.querySelectorAll(
                'input[name="adicional"]:checked'
            )
        ].reduce((total, adicional) => {
            return total + Number(adicional.dataset.preco);
        }, 0);

        return precoBase + precoAdicionais;
    }


    // Atualiza o preço exibido
    function atualizarPreco(produto) {
        elemento("produto-preco").textContent =
            dinheiro(precoSelecionado(produto));
    }


    // Exibe os produtos semelhantes automaticamente
    function renderizarRelacionados(produto) {
        const container =
            elemento("grid-semelhantes");

        container.replaceChildren();

        (produto.relacionados || [])
            .map((id) => catalogo[id])
            .filter(Boolean)
            .forEach((relacionado) => {

                const card =
                    document.createElement("article");

                card.className = "card-produto";

                const img =
                    document.createElement("img");

                img.src =
                    relacionado.imagens?.[0] ||
                    IMAGEM_RESERVA;

                img.alt = relacionado.nome;
                img.loading = "lazy";

                const titulo =
                    document.createElement("h3");

                titulo.textContent = relacionado.nome;

                const preco =
                    document.createElement("p");

                preco.className = "card-preco";

                const menorPreco = Math.min(
                    ...relacionado.tamanhos.map(
                        (tamanho) => tamanho.valor
                    )
                );

                preco.textContent =
                    `A partir de ${dinheiro(menorPreco)}`;

                const link =
                    document.createElement("a");

                link.className = "btn-ver-produto";

                link.href =
                    `produtopage.html?produto=${encodeURIComponent(relacionado.id)}`;

                link.textContent = "Ver produto";

                card.append(img, titulo, preco, link);

                container.appendChild(card);
            });
    }


    // Monta o pedido com todas as escolhas do cliente
    function montarPedido(produto) {
        const tamanho =
            document.querySelector(
                'input[name="tamanho"]:checked'
            );

        const campoQuantidade =
            elemento("quantidade");

        const quantidade = Math.max(
            1,
            Math.min(
                10,
                Number.parseInt(campoQuantidade.value, 10) || 1
            )
        );

        campoQuantidade.value = String(quantidade);

        const adicionais = [
            ...document.querySelectorAll(
                'input[name="adicional"]:checked'
            )
        ].map((item) => ({
            nome: item.value,
            valor: Number(item.dataset.preco)
        }));

        const precoUnitario =
            precoSelecionado(produto);

        return {
            id: produto.id,
            nome: produto.nome,
            tamanho: tamanho
                ? tamanho.value
                : produto.tamanhos[0].nome,
            adicionais,
            quantidade,
            precoUnitario,
            subtotal: precoUnitario * quantidade
        };
    }


    // Adiciona o pedido ao carrinho local do navegador
    function adicionarAoCarrinho(pedido) {
        let carrinho = [];

        try {
            carrinho = JSON.parse(
                localStorage.getItem(
                    "acaiZeroGrauCarrinho"
                ) || "[]"
            );

            if (!Array.isArray(carrinho)) {
                carrinho = [];
            }
        } catch {
            carrinho = [];
        }

        carrinho.push({
            ...pedido,
            adicionadoEm: new Date().toISOString()
        });

        try {
            localStorage.setItem(
                "acaiZeroGrauCarrinho",
                JSON.stringify(carrinho)
            );

            definirMensagem(
                `Adicionado ao carrinho! ${pedido.quantidade} × ` +
                `${pedido.nome} — ${dinheiro(pedido.subtotal)}.`
            );
        } catch {
            definirMensagem(
                "Não foi possível salvar o carrinho neste navegador."
            );
        }
    }


    // Abre o WhatsApp com os detalhes do pedido
    function pedirWhatsApp(pedido) {
        const extras = pedido.adicionais.length
            ? pedido.adicionais
                .map((item) =>
                    `${item.nome} (${dinheiro(item.valor)})`
                )
                .join(", ")
            : "Nenhum";

        const mensagem = [
            "Olá! Gostaria de fazer este pedido:",
            "",
            `Produto: ${pedido.nome}`,
            `Tamanho: ${pedido.tamanho}`,
            `Adicionais: ${extras}`,
            `Quantidade: ${pedido.quantidade}`,
            `Valor estimado: ${dinheiro(pedido.subtotal)}`,
            "",
            "Por favor, confirmem a disponibilidade e o valor final."
        ].join("\n");

        const url =
            `https://wa.me/${WHATSAPP_LOJA}?text=${encodeURIComponent(mensagem)}`;

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );
    }


    // Inicializa os eventos e a página
    function iniciar() {
        const produto = produtoAtual();

        if (!produto) {
            elemento("produto-titulo").textContent =
                "Produto não encontrado";

            elemento("produto-descricao").textContent =
                "Esse produto não está cadastrado. Volte ao cardápio e escolha outro item.";

            elemento("produto-preco").textContent = "";

            elemento("produto-detalhes").hidden = true;

            definirMensagem(
                "Confira o endereço ou escolha um produto do cardápio.",
                "mensagem-produto"
            );

            return;
        }

        carregarProduto(produto);


        // Diminuir quantidade
        elemento("btn-menos").addEventListener("click", () => {
            const campo = elemento("quantidade");

            campo.value = String(
                Math.max(
                    1,
                    (Number.parseInt(campo.value, 10) || 1) - 1
                )
            );
        });


        // Aumentar quantidade
        elemento("btn-mais").addEventListener("click", () => {
            const campo = elemento("quantidade");

            campo.value = String(
                Math.min(
                    99,
                    (Number.parseInt(campo.value, 10) || 1) + 1
                )
            );
        });


        // Validar quantidade digitada
        elemento("quantidade").addEventListener("change", () => {
            const campo = elemento("quantidade");
             const valor = Number.parseInt(campo.value, 10);
            campo.value = String(
                Number.isFinite(valor)
                ? matchMedia.max(1, Math.min(10, valor))
                : 1
            );
        });


        // Adicionar ao carrinho
        elemento("btn-carrinho").addEventListener("click", () => {
            const pedido = montarPedido(produto);

            adicionarAoCarrinho(pedido);
        });


        // Continuar para a finalização do pedido
elemento("form-produto").addEventListener("submit", (evento) => {
    evento.preventDefault();

    const pedido = montarPedido(produto);

    // Mantém os dados do produto no formato
    // esperado pela página de finalização existente.
    const produtoSessao = {
        id: pedido.id,
        nome: pedido.nome,
        valor: pedido.precoUnitario,
        foto: produto.imagens?.[0] || IMAGEM_RESERVA,
        quantidade: pedido.quantidade,
        tamanho: pedido.tamanho,
        adicionais: pedido.adicionais,
        subtotal: pedido.subtotal
    };

    try {
        localStorage.setItem(
            "produtoSessao",
            JSON.stringify(produtoSessao)
        );

        window.location.href = "confirmarpedidio.html";
    } catch (erro) {
        definirMensagem(
            "Não foi possível preparar seu pedido. Tente novamente."
        );
    }
});


        // Pesquisar produtos pelo nome
        elemento("pesquisa-produtos").addEventListener(
            "keydown",
            (evento) => {
                if (evento.key !== "Enter") {
                    return;
                }

                evento.preventDefault();

                const termo = elemento("pesquisa-produtos")
                    .value
                    .trim()
                    .toLocaleLowerCase("pt-BR");

                const encontrado =
                    Object.values(catalogo).find((item) =>
                        item.nome
                            .toLocaleLowerCase("pt-BR")
                            .includes(termo)
                    );

                if (encontrado) {
                    window.location.href =
                        `produtopage.html?produto=${encodeURIComponent(encontrado.id)}`;
                } else if (termo) {
                    definirMensagem(
                        "Nenhum produto encontrado com esse nome.",
                        "mensagem-produto"
                    );
                }
            }
        );
    }


    document.addEventListener(
        "DOMContentLoaded",
        iniciar
    );

})();
