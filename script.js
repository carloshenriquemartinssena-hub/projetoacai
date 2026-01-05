
/* ANIMAÇÃO DE MOVIMENTO DE FOTOS DE PRODUTOS NO CABEÇALHO */
document.addEventListener('DOMContentLoaded', () => {
    const items = document.querySelectorAll('.carousel-item');
    let currentIndex = 0;
    let autoPlay;

    function iniciarTimer() {
        clearInterval(autoPlay);
        autoPlay = setInterval(mudarSlide, 5000);
    }

    function mudarSlide() {
        const itemAtual = items[currentIndex];
        itemAtual.classList.remove('active', 'return');
        itemAtual.classList.add('exit');

        currentIndex = (currentIndex + 1) % items.length;
        const proximoItem = items[currentIndex];
        proximoItem.classList.remove('exit', 'return');
        proximoItem.classList.add('active');

        setTimeout(() => { itemAtual.classList.remove('exit'); }, 1000);
    }

    function voltarSlide() {
        const itemAtual = items[currentIndex];
        itemAtual.classList.remove('exit');
        // O atual "some" para a direita
        itemAtual.style.transform = "translateX(50px)";
        itemAtual.style.opacity = "0";

        // Calcula o anterior
        currentIndex = (currentIndex - 1 + items.length) % items.length;
        const itemAnterior = items[currentIndex];

        itemAnterior.classList.remove('exit');
        itemAnterior.classList.add('active');
        
        iniciarTimer(); // Reinicia os 5 segundos
    }

    // --- DETECÇÃO DE DESLIZE (TOUCH) ---
    let touchStartX = 0;
    const carousel = document.getElementById('carousel');

    carousel.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    });

    carousel.addEventListener('touchend', e => {
        let touchEndX = e.changedTouches[0].screenX;
        // Se deslizou para a direita (voltar)
        if (touchEndX > touchStartX + 50) {
            voltarSlide();
        }
    });

    // --- BOTÃO DESKTOP ---
    document.getElementById('prevBtn').addEventListener('click', voltarSlide);

    iniciarTimer(); // Inicia o carrossel
});



/* CARROSEL DE PRODUTOS DA PÁGINA INICIAL */ 

function scrollSlider(direction) {
    const slider = document.getElementById('productSlider');
    const scrollAmount = 300; // Quantidade de pixels que move por clique
    slider.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
    });
}



// automação 


// =========================================================
// 1. LÓGICA DA PÁGINA INICIAL (INDEX.HTML)
// =========================================================

// Função para capturar o produto ao clicar em comprar
function configurarBotoesCompra() {
    const botoes = document.querySelectorAll('.buy-btn, .enfeitebotao');

    botoes.forEach(botao => {
        botao.addEventListener('click', (e) => {
            // Localiza o container do produto (pode ser o card ou o item do carrossel)
            const card = e.target.closest('.product-card') || e.target.closest('.carousel-item');
            
            if (card) {
                const produto = {
                    nome: card.querySelector('h4, .font1').innerText.replace(':', '').trim(),
                    preco: card.querySelector('.price') ? card.querySelector('.price').innerText : "R$ 25,00", // Valor padrão se não houver no carrossel
                    imagem: card.querySelector('img').src,
                    quantidade: 1, // Valor inicial
                    tamanho: "Padrão" // Pode ser expandido com um select no HTML
                };

                // Salva no LocalStorage
                localStorage.setItem('produtoSelecionado', JSON.stringify(produto));
                console.log("Produto salvo:", produto);
            }
        });
    });
}

// =========================================================
// 2. LÓGICA DA PÁGINA DE CADASTRO (CADASTRO.HTML)
// =========================================================

function salvarDadosCliente(event) {
    event.preventDefault(); // Impede o recarregamento da página

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

    localStorage.setItem('dadosEntrega', JSON.stringify(dadosCliente));
    window.location.href = 'confirmarpedidio.html'; // Redireciona
}

// =========================================================
// 3. LÓGICA DA PÁGINA DE CONFIRMAÇÃO (CONFIRMARPEDIDIO.HTML)
// =========================================================

function renderizarConfirmacao() {
    const infoContainer = document.getElementById('exibir-info'); // ID no seu HTML de confirmação
    const produtoContainer = document.getElementById('display-produtos'); // ID no seu HTML de confirmação
    
    const produto = JSON.parse(localStorage.getItem('produtoSelecionado'));
    const cliente = JSON.parse(localStorage.getItem('dadosEntrega'));

    if (cliente && infoContainer) {
        infoContainer.innerHTML = `
            <p><strong>Cliente:</strong> ${cliente.nome} ${cliente.sobrenome}</p>
            <p><strong>CPF:</strong> ${cliente.cpf}</p>
            <p><strong>WhatsApp:</strong> ${cliente.whatsapp}</p>
            <p><strong>Endereço:</strong> ${cliente.endereco}, nº ${cliente.numero}</p>
            <p><strong>CEP:</strong> ${cliente.cep}</p>
            <p><strong>Pagamento:</strong> ${cliente.pagamento}</p>
        `;
    }

    if (produto && produtoContainer) {
        produtoContainer.innerHTML = `
            <div class="produto-principal">
                <img src="${produto.imagem}" style="width: 100%; border-radius: 15px;">
                <h3>${produto.nome}</h3>
                <p>Quantidade: ${produto.quantidade} | Tamanho: ${produto.tamanho}</p>
                <h2 style="color: #54AE00;">Total: ${produto.preco}</h2>
            </div>
        `;
    }
}

// =========================================================
// INICIALIZAÇÃO
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // Verifica em qual página o usuário está
    if (document.querySelector('.buy-btn') || document.querySelector('.enfeitebotao')) {
        configurarBotoesCompra();
    }

    const formCadastro = document.getElementById('formPedido'); // ID que você deve usar no <form> do cadastro.html
    if (formCadastro) {
        formCadastro.addEventListener('submit', salvarDadosCliente);
    }

    if (window.location.pathname.includes('confirmarpedidio.html')) {
        renderizarConfirmacao();
    }
});