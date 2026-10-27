
(() => {
    "use strict";

    const CHAVE_CARRINHO = "acaiZeroGrauCarrinho";
    const WHATSAPP_LOJA = "5511974665034";
    const IMAGEM_RESERVA = "fotoexemplo.png";

    const elemento = (id) => document.getElementById(id);

    const dinheiro = (valor) =>
        Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    function lerCarrinho() {
        try {
            const dados = JSON.parse(
                localStorage.getItem(CHAVE_CARRINHO) || "[]"
            );

            return Array.isArray(dados)
                ? dados.filter(item =>
                    item &&
                    typeof item === "object" &&
                    Number.isFinite(Number(item.quantidade)) &&
                    Number(item.quantidade) >= 1
                )
                : [];
        } catch (erro) {
            console.error("Erro ao ler o carrinho:", erro);
            return [];
        }
    }

    function salvarCarrinho(itens) {
        try {
            localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens));
            return true;
        } catch (erro) {
            console.error("Erro ao salvar o carrinho:", erro);
            mostrarMensagem(
                "Não foi possível salvar o carrinho neste navegador."
            );
            return false;
        }
    }

    function mostrarMensagem(texto) {
        const campo = elemento("mensagem-carrinho");
        if (campo) campo.textContent = texto;
    }

    function textoSeguro(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caractere]);
    }

    function precoUnitario(item) {
        const preco = Number(item.precoUnitario);

        if (Number.isFinite(preco) && preco >= 0) {
            return preco;
        }

        const subtotal = Number(item.subtotal);
        const quantidade = Number(item.quantidade);

        if (
            Number.isFinite(subtotal) &&
            subtotal >= 0 &&
            quantidade > 0
        ) {
            return subtotal / quantidade;
        }

        return 0;
    }

    function totalQuantidade(itens) {
        return itens.reduce(
            (total, item) => total + Number(item.quantidade),
            0
        );
    }

    function totalCarrinho(itens) {
        return itens.reduce(
            (total, item) =>
                total + precoUnitario(item) * Number(item.quantidade),
            0
        );
    }

    function adicionaisTexto(item) {
        if (!Array.isArray(item.adicionais) || item.adicionais.length === 0) {
            return "Sem adicionais";
        }

        return item.adicionais
            .map(adicional => {
                if (typeof adicional === "string") {
                    return adicional;
                }

                return adicional?.nome || "";
            })
            .filter(Boolean)
            .join(", ");
    }

    function atualizarSubtotal(item) {
        item.precoUnitario = precoUnitario(item);
        item.quantidade = Math.max(
            1,
            Math.floor(Number(item.quantidade) || 1)
        );
        item.subtotal = item.precoUnitario * item.quantidade;
    }

    function renderizarCarrinho() {
        const itens = lerCarrinho();
        const lista = elemento("lista-carrinho");
        const vazio = elemento("carrinho-vazio");
        const contador = elemento("contador-carrinho");
        const btnEsvaziar = elemento("btn-esvaziar-carrinho");
        const btnFinalizar = elemento("btn-finalizar-pedido");

        if (!lista) return;

        lista.innerHTML = "";
        vazio.hidden = itens.length > 0;

        if (contador) {
            contador.textContent = totalQuantidade(itens);
        }

        if (btnEsvaziar) {
            btnEsvaziar.disabled = itens.length === 0;
        }

        if (btnFinalizar) {
            btnFinalizar.disabled = itens.length === 0;
        }

        itens.forEach((item, indice) => {
            atualizarSubtotal(item);

            const nome = textoSeguro(item.nome || "Produto");
            const tamanho = textoSeguro(item.tamanho || "Tamanho não informado");
            const adicionais = textoSeguro(adicionaisTexto(item));
            const observacao = textoSeguro(item.observacao || "");
            const imagem = textoSeguro(item.imagem || IMAGEM_RESERVA);
            const quantidade = Number(item.quantidade);
            const subtotal = precoUnitario(item) * quantidade;

            const card = document.createElement("article");
            card.className = "item-carrinho";

            card.innerHTML = `
                <img
                    class="item-imagem"
                    src="${imagem}"
                    alt="${nome}"
                    loading="lazy"
                >

                <div class="item-informacoes">
                    <h3>${nome}</h3>

                    <p class="item-detalhe">
                        Tamanho: ${tamanho}
                    </p>

                    <p class="item-detalhe">
                        Adicionais: ${adicionais}
                    </p>

                    ${observacao ? `<p class="item-detalhe">Observação: ${observacao}</p>` : ""}

                    <p class="item-preco">
                        ${dinheiro(subtotal)}
                    </p>

                    <div class="item-acoes">
                        <div class="controle-quantidade">
                            <button
                                type="button"
                                data-acao="diminuir"
                                data-indice="${indice}"
                                aria-label="Diminuir quantidade de ${nome}"
                                ${quantidade <= 1 ? "disabled" : ""}
                            >−</button>

                            <span class="quantidade-valor">
                                ${quantidade}
                            </span>

                            <button
                                type="button"
                                data-acao="aumentar"
                                data-indice="${indice}"
                                aria-label="Aumentar quantidade de ${nome}"
                                ${quantidade >= 99 ? "disabled" : ""}
                            >+</button>
                        </div>

                        <button
                            type="button"
                            class="btn-remover-item"
                            data-acao="remover"
                            data-indice="${indice}"
                        >
                            Remover
                        </button>
                    </div>
                </div>
            `;

            const imagemElemento = card.querySelector(".item-imagem");

            imagemElemento.addEventListener("error", () => {
                imagemElemento.onerror = null;
                imagemElemento.src = IMAGEM_RESERVA;
            });

            lista.appendChild(card);
        });

        const subtotal = totalCarrinho(itens);

        elemento("resumo-quantidade").textContent =
            totalQuantidade(itens);

        elemento("resumo-subtotal").textContent = dinheiro(subtotal);
        elemento("resumo-total").textContent = dinheiro(subtotal);

        salvarCarrinho(itens);
    }

    function alterarQuantidade(indice, variacao) {
        const itens = lerCarrinho();
        const item = itens[indice];

        if (!item) return;

        const novaQuantidade = Number(item.quantidade) + variacao;

        if (novaQuantidade < 1 || novaQuantidade > 99) return;

        item.quantidade = novaQuantidade;
        atualizarSubtotal(item);

        if (salvarCarrinho(itens)) {
            mostrarMensagem("Quantidade atualizada.");
            renderizarCarrinho();
        }
    }

    function removerItem(indice) {
        const itens = lerCarrinho();

        if (!itens[indice]) return;

        const nome = itens[indice].nome || "este produto";

        if (!confirm(`Deseja remover "${nome}" do carrinho?`)) {
            return;
        }

        itens.splice(indice, 1);

        if (salvarCarrinho(itens)) {
            mostrarMensagem("Produto removido do carrinho.");
            renderizarCarrinho();
        }
    }

    function esvaziarCarrinho() {
        const itens = lerCarrinho();

        if (itens.length === 0) return;

        if (!confirm("Deseja remover todos os produtos do carrinho?")) {
            return;
        }

        if (salvarCarrinho([])) {
            mostrarMensagem("Carrinho esvaziado.");
            renderizarCarrinho();
        }
    }

    
function finalizarPedido() {
    const itens = lerCarrinho();

    if (itens.length === 0) {
        mostrarMensagem(
            "Seu carrinho está vazio. Adicione um produto para continuar."
        );
        return;
    }

    const total = totalCarrinho(itens);

    if (!Number.isFinite(total) || total <= 0) {
        mostrarMensagem(
            "Confira os produtos e os preços antes de continuar."
        );
        return;
    }

    // Garante que o carrinho esteja salvo antes de navegar.
    if (!salvarCarrinho(itens)) {
        return;
    }

    window.AuthLoja.exigirLogin(() => {
        try {
            localStorage.setItem("produtoSessao", JSON.stringify({
                itens,
                valor: total
            }));
        } catch (error) {
            console.error("Não foi possível preparar o pedido do carrinho.", error);
            mostrarMensagem(
                "Não foi possível preparar o pedido neste navegador."
            );
            return;
        }
        window.location.href = "cadastro.html";
    });
}


    document.addEventListener("click", evento => {
        const botao = evento.target.closest("[data-acao]");

        if (!botao) return;

        const indice = Number(botao.dataset.indice);
        if (!Number.isInteger(indice)) return;

        switch (botao.dataset.acao) {
            case "diminuir":
                alterarQuantidade(indice, -1);
                break;

            case "aumentar":
                alterarQuantidade(indice, 1);
                break;

            case "remover":
                removerItem(indice);
                break;
        }
    });

    elemento("btn-esvaziar-carrinho")
        ?.addEventListener("click", esvaziarCarrinho);

    elemento("btn-finalizar-pedido")
        ?.addEventListener("click", finalizarPedido);

    renderizarCarrinho();
})();
