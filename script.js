/* =========================================================
   1. CARROSSEL DO CABEÇALHO
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

    const items = document.querySelectorAll('.carousel-item');
    const carousel = document.getElementById('carousel');
    const prevBtn = document.getElementById('prevBtn');

    let currentIndex = 0;
    let autoPlay;
    let touchStartX = 0;

    function mostrarSlide(novoIndex, direcao = 'proximo') {

        if (!items.length) return;

        items.forEach(item => {
            item.classList.remove('active', 'exit', 'return');

            item.style.transform = '';
            item.style.opacity = '';
        });

        currentIndex =
            (novoIndex + items.length) % items.length;

        items[currentIndex].classList.add('active');
    }


    function iniciarTimer() {

        clearInterval(autoPlay);

        if (items.length > 1) {
            autoPlay = setInterval(mudarSlide, 5000);
        }
    }


    function mudarSlide() {

        if (!items.length) return;

        const itemAtual = items[currentIndex];

        itemAtual.classList.remove('active', 'return');
        itemAtual.classList.add('exit');

        currentIndex =
            (currentIndex + 1) % items.length;

        const proximoItem = items[currentIndex];

        proximoItem.classList.remove('exit', 'return');
        proximoItem.classList.add('active');

        setTimeout(() => {
            itemAtual.classList.remove('exit');
        }, 1000);
    }


    function voltarSlide() {

        if (!items.length) return;

        const itemAtual = items[currentIndex];

        itemAtual.classList.remove('exit');

        itemAtual.style.transform = "translateX(50px)";
        itemAtual.style.opacity = "";

        currentIndex =
            (currentIndex - 1 + items.length) % items.length;

        const itemAnterior = items[currentIndex];

        itemAnterior.classList.remove('exit');
        itemAnterior.classList.add('active');

        iniciarTimer();
    }


    /* TOUCH DO CARROSSEL */

    if (carousel) {

        carousel.addEventListener('touchstart', e => {

            touchStartX =
                e.changedTouches[0].screenX;

        });


        carousel.addEventListener('touchend', e => {

            const touchEndX =
                e.changedTouches[0].screenX;

            /* Deslizar para a esquerda = próximo */

            if (touchStartX - touchEndX > 50) {

                mudarSlide();
                iniciarTimer();

            }

            /* Deslizar para a direita = anterior */

            if (touchEndX - touchStartX > 50) {

                voltarSlide();

            }

        });

    }


    /* BOTÃO ANTERIOR */

    if (prevBtn) {
        prevBtn.addEventListener('click', voltarSlide);
    }


    /* INICIA CARROSSEL */

    if (items.length) {

        mostrarSlide(0);
        iniciarTimer();

    }

});

/*=========================================================
MINHA TENTATIVA DE SCROLL AUTOMÁTICO PARA O CARROSSEL DE DESTAQUES
=================================================================*/

const productSlider = document.querySelectorAll('.carousel-item');
let autoscrollInterval;

function startAutoScroll() {
    autoScrollInterval = setInterval(() => {
        const maxScrollLeft = container.scrollWidth - container.clientWidht;

        /*se chegar no final, volta para o início*/
        if (container.scrollLeft >= maxScrollLeft - 1){
            container.scrollLeft = 0;
        } else {
            container.ScrollLeft += container.clientWidth;
        }
    }, 3000); /*tempo em milissegundos (3 segundos) */
}
        //início automático*/
        startAutoScroll();


/* =========================================================
   2. CARROSSEL DE PRODUTOS
   ========================================================= */

function scrollSlider(direction) {

    const slider =
        document.getElementById('productSlider');

    if (!slider) return;

    const scrollAmount = 300;

    slider.scrollBy({

        left: direction * scrollAmount,

        behavior: 'smooth'

    });

}


/* =========================================================
   3. SELEÇÃO DO PRODUTO
   ========================================================= */

function configurarBotoesCompra() {

    console.log("configurarBotoesCompra() FOI EXECUTADA");

    const botoes = document.querySelectorAll(
        '.buy-btn, .enfeitebotao'
    );

    console.log(
        "BOTÕES ENCONTRADOS:",
        botoes.length
    );


    botoes.forEach((botao, index) => {

        botao.addEventListener('click', function(e) {

            console.log(
                "BOTÃO CLICADO:",
                index
            );


            /* Localiza o card */

            const card =
                e.currentTarget.closest('.product-card') ||
                e.currentTarget.closest('.carousel-item');


            if (!card) {

                console.error(
                    "Card do produto não encontrado."
                );

                return;

            }


            /* Pega UUID */

            const productId =
                card.dataset.productId;


            console.log(
                "UUID DO PRODUTO:",
                productId
            );


            if (!productId) {

                alert(
                    "Erro: este produto não possui um ID cadastrado."
                );

                return;

            }


            /* Informações do produto */

            const nomeElemento =
                card.querySelector('h4, .font1');

            const precoElemento =
                card.querySelector('.price');

            const imagemElemento =
                card.querySelector('img');


            const nome =
                nomeElemento
                    ? nomeElemento.innerText
                        .replace(':', '')
                        .trim()
                    : "Produto";


            const valor =
                precoElemento
                    ? precoElemento.innerText.trim()
                    : "R$ 25,00";


            const foto =
                imagemElemento
                    ? imagemElemento.src
                    : "";


            /* Monta produto */

            const produto = {

                id: productId,

                nome: nome,

                valor: valor,

                foto: foto,

                quantidade: 1,

                tamanho: "Padrão"

            };


            console.log(
                "PRODUTO QUE SERÁ SALVO:",
                produto
            );


            /* Salva */

            localStorage.setItem(
                'produtoSessao',
                JSON.stringify(produto)
            );


            console.log(
                "PRODUTO SALVO NO LOCALSTORAGE"
            );


            console.log(
                "LOCALSTORAGE:",
                localStorage.getItem(
                    'produtoSessao'
                )
            );


            /* Vai para cadastro */

            window.location.href =
                'cadastro.html';

        });

    });

}


/* =========================================================
   4. CADASTRO DO CLIENTE
   ========================================================= */

function salvarDadosCliente(event) {

    event.preventDefault();

    const form = event.target;


    const dadosCliente = {

        nome: form.nome.value,

        sobrenome: form.sobrenome.value,

        cpf: form.cpf.value,

        cep: form.cep.value,

        endereco: form.endereco.value,

        numero: form.numero.value,

        complemento: form.complemento.value,

        whatsapp: form.whatsapp.value,

        pagamento: form.pagamento.value

    };


    localStorage.setItem(
        'dadosCliente',
        JSON.stringify(dadosCliente)
    );


    console.log(
        "DADOS DO CLIENTE SALVOS:",
        dadosCliente
    );


    window.location.href =
        'confirmarpedidio.html';

}


/* =========================================================
   5. PÁGINA DE CONFIRMAÇÃO
   ========================================================= */

function renderizarConfirmacao() {

    const infoContainer =
        document.getElementById('exibir-info');

    const produtoContainer =
        document.getElementById('display-produtos');


    const produto =
        JSON.parse(
            localStorage.getItem('produtoSessao')
        );


    const cliente =
        JSON.parse(
            localStorage.getItem('dadosCliente')
        );


    console.log(
        "PRODUTO RECUPERADO:",
        produto
    );


    console.log(
        "UUID RECUPERADO:",
        produto?.id
    );


    if (cliente && infoContainer) {

        infoContainer.innerHTML = `

            <p>
                <strong>Cliente:</strong>
                ${cliente.nome}
                ${cliente.sobrenome}
            </p>

            <p>
                <strong>CPF:</strong>
                ${cliente.cpf}
            </p>

            <p>
                <strong>WhatsApp:</strong>
                ${cliente.whatsapp}
            </p>

            <p>
                <strong>Endereço:</strong>
                ${cliente.endereco},
                nº ${cliente.numero}
            </p>

            <p>
                <strong>CEP:</strong>
                ${cliente.cep}
            </p>

            <p>
                <strong>Pagamento:</strong>
                ${cliente.pagamento}
            </p>

        `;

    }


    if (produto && produtoContainer) {

        produtoContainer.innerHTML = `

            <div class="produto-principal">

                <img
                    src="${produto.foto}"
                    style="width: 100%; border-radius: 15px;"
                >

                <h3>
                    ${produto.nome}
                </h3>

                <p>
                    Quantidade:
                    ${produto.quantidade}
                    |
                    Tamanho:
                    ${produto.tamanho}
                </p>

                <h2 style="color: #54AE00;">

                    Total:
                    ${produto.valor}

                </h2>

            </div>

        `;

    }

}


/* =========================================================
   6. INICIALIZAÇÃO
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        /* Página inicial */

        if (
            document.querySelector('.buy-btn') ||
            document.querySelector('.enfeitebotao')
        ) {

            configurarBotoesCompra();

        }


        /* Cadastro */

        const formCadastro =
            document.getElementById('formPedido');


        if (formCadastro) {

            formCadastro.addEventListener(
                'submit',
                salvarDadosCliente
            );

        }


        /* Confirmação */

        if (
            window.location.pathname
                .toLowerCase()
                .includes('confirmarpedidio.html')
        ) {

            renderizarConfirmacao();

        }

    }
);