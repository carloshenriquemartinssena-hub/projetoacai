
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