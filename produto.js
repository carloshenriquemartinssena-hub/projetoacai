
/*
 * CATÁLOGO DE PRODUTOS — AÇAÍ ZERO GRAU
 *
 * Para abrir um produto:
 * produtopage.html?produto=acai-especial
 *
 * Para cadastrar um novo produto, copie um objeto
 * e altere seu ID, nome, fotos, preços e adicionais.
 */

window.CATALOGO_PRODUTOS = {
    "acai-teste-500ml": {
    id: "8a4b37d4-eb90-4c40-b346-0bc5a9e4d097",
    combo: false,
    nome: "Açaí de teste",
    descricao: "Açaí premium com morango fresco e leite em pó ou condensado.",
    imagens: ["2fotoexemplo.png"],

    tamanhos: [
        { nome: "300ml", valor: 15.90 }, // PREÇO PROVISÓRIO
        { nome: "500ml", valor: 25.90 },
        { nome: "700ml", valor: 32.90 }  // PREÇO PROVISÓRIO
    ],

    adicionais: [{ nome: "Banana", valor: 2.00 },
            { nome: "Morango", valor: 3.00 },
            { nome: "Granola", valor: 2.00 },
            { nome: "Leite em pó", valor: 2.50 },
            { nome: "Leite condensado", valor: 2.00 }],

    relacionados: [
         "acai-nutella",
            "cupuacu-cascata",
            "barca-acai"
    ]
},

    "acai-especial": {
        id: "acai-especial",
        combo: false,

        nome: "Açaí Especial Supremo",

        descricao:
            "Nosso açaí artesanal cremoso acompanhado de banana, morango, granola crocante e leite condensado. Monte do seu jeito!",

        imagens: [
            "fotoexemplo.png",
            "fotoexemplo.png",
            "fotoexemplo.png"
        ],

        tamanhos: [
            { nome: "300 ml", valor: 15.90 },
            { nome: "500 ml", valor: 25.90 },
            { nome: "700 ml", valor: 32.90 }
        ],

        adicionais: [
            { nome: "Banana", valor: 2.00 },
            { nome: "Morango", valor: 3.00 },
            { nome: "Granola", valor: 2.00 },
            { nome: "Leite em pó", valor: 2.50 },
            { nome: "Leite condensado", valor: 2.00 }
        ],

        relacionados: [
            "acai-nutella",
            "cupuacu-cascata",
            "barca-acai"
        ]
    },


    "acai-nutella": {
        id: "acai-nutella",
        combo: false,

        nome: "Açaí com Nutella",

        descricao:
            "Açaí cremoso com Nutella e combinações deliciosas para deixar seu pedido ainda mais especial.",

        imagens: [
            "fotoexemplo.png",
            "fotoexemplo.png",
            "fotoexemplo.png"
        ],

        tamanhos: [
            { nome: "300 ml", valor: 18.00 },
            { nome: "500 ml", valor: 28.00 },
            { nome: "700 ml", valor: 35.00 }
        ],

        adicionais: [
            { nome: "Banana", valor: 2.00 },
            { nome: "Morango", valor: 3.00 },
            { nome: "Granola", valor: 2.00 },
            { nome: "Leite em pó", valor: 2.50 }
        ],

        relacionados: [
            "acai-especial",
            "cupuacu-cascata",
            "barca-acai"
        ]
    },


    "cupuacu-cascata": {
        id: "cupuacu-cascata",
        combo: false,

        nome: "Copo de Cupuaçu",

        descricao:
            "Creme de cupuaçu refrescante, com textura cremosa e sabor marcante.",

        imagens: [
            "fotoexemplo.png",
            "fotoexemplo.png",
            "fotoexemplo.png"
        ],

        tamanhos: [
            { nome: "300 ml", valor: 14.00 },
            { nome: "500 ml", valor: 22.00 },
            { nome: "700 ml", valor: 29.00 }
        ],

        adicionais: [
            { nome: "Banana", valor: 2.00 },
            { nome: "Morango", valor: 3.00 },
            { nome: "Granola", valor: 2.00 }
        ],

        relacionados: [
            "acai-especial",
            "acai-nutella",
            "barca-acai"
        ]
    },


    "barca-acai": {
        id: "barca-acai",
        combo: false,

        nome: "Barca de Açaí Completa",

        descricao:
            "Uma barca generosa de açaí para compartilhar, com espaço para combinar seus acompanhamentos favoritos.",

        imagens: [
            "fotoexemplo.png",
            "fotoexemplo.png",
            "fotoexemplo.png"
        ],

        tamanhos: [
            { nome: "Pequena", valor: 45.00 },
            { nome: "Grande", valor: 65.00 }
        ],

        adicionais: [
            { nome: "Banana", valor: 2.00 },
            { nome: "Morango", valor: 3.00 },
            { nome: "Granola", valor: 2.00 },
            { nome: "Leite em pó", valor: 2.50 }
        ],

        relacionados: [
            "acai-especial",
            "acai-nutella",
            "cupuacu-cascata"
        ]
    },

    "acai-chocolate-castanhas": {
        id: "acai-chocolate-castanhas",
        combo: false,
        novo: true,
        estacoes: ["inverno"],
        promocao: { ativa: true, descontoPercentual: 35 },
        nome: "Açaí com Chocolate e Castanhas",
        descricao:
            "Açaí cremoso em camadas com chocolate e uma mistura crocante de castanhas. Uma combinação intensa e irresistível para os dias mais frios.",
        imagens: ["acai-chocolate-castanhas.png"],
        tamanhos: [
            { nome: "300 ml", valor: 19.90 },
            { nome: "500 ml", valor: 29.90 },
            { nome: "700 ml", valor: 37.90 }
        ],
        adicionais: [
            { nome: "Banana", valor: 2.00 },
            { nome: "Morango", valor: 3.00 },
            { nome: "Granola", valor: 2.00 }
        ],
        relacionados: ["acai-especial", "acai-nutella"]
    },

    "acai-maracuja": {
        id: "acai-maracuja",
        combo: false,
        novo: true,
        estacoes: ["outono"],
        promocao: { ativa: true, descontoPercentual: 30 },
        nome: "Açaí com Maracujá",
        descricao:
            "Açaí com camadas de maracujá, banana e granola crocante: um contraste tropical, cremoso e levemente azedinho.",
        imagens: ["acai-maracuja.png"],
        tamanhos: [
            { nome: "300 ml", valor: 17.50 },
            { nome: "500 ml", valor: 27.50 },
            { nome: "700 ml", valor: 34.50 }
        ],
        adicionais: [
            { nome: "Banana", valor: 2.00 },
            { nome: "Granola", valor: 2.00 },
            { nome: "Leite condensado", valor: 2.00 }
        ],
        relacionados: ["acai-banana", "acai-tropical"]
    },

    "acai-morango": {
        id: "acai-morango",
        combo: false,
        novo: true,
        estacoes: ["primavera"],
        promocao: { ativa: true, descontoPercentual: 40 },
        nome: "Açaí com Morango",
        descricao:
            "Açaí artesanal com morangos frescos e granola em camadas, combinando fruta, cremosidade e crocância em cada colherada.",
        imagens: ["acai-morango.png"],
        tamanhos: [
            { nome: "300 ml", valor: 18.90 },
            { nome: "500 ml", valor: 28.90 },
            { nome: "700 ml", valor: 36.90 }
        ],
        adicionais: [
            { nome: "Banana", valor: 2.00 },
            { nome: "Granola", valor: 2.00 },
            { nome: "Leite em pó", valor: 2.50 }
        ],
        relacionados: ["acai-especial", "acai-granola"]
    },

    "acai-tropical": {
        id: "acai-tropical",
        combo: false,
        novo: true,
        estacoes: ["primavera"],
        promocao: { ativa: true, descontoPercentual: 35 },
        nome: "Açaí Tropical",
        descricao:
            "Açaí com manga, kiwi e granola em camadas. Uma mistura colorida de frutas para um lanche leve, refrescante e cheio de sabor.",
        imagens: ["acai-tropical.png"],
        tamanhos: [
            { nome: "300 ml", valor: 20.90 },
            { nome: "500 ml", valor: 31.90 },
            { nome: "700 ml", valor: 39.90 }
        ],
        adicionais: [
            { nome: "Banana", valor: 2.00 },
            { nome: "Morango", valor: 3.00 },
            { nome: "Granola", valor: 2.00 }
        ],
        relacionados: ["acai-morango", "acai-maracuja"]
    },

    "acai-banana": {
        id: "acai-banana",
        combo: false,
        novo: true,
        estacoes: ["inverno"],
        promocao: { ativa: true, descontoPercentual: 30 },
        nome: "Açaí com Banana",
        descricao:
            "Açaí cremoso com rodelas de banana e granola crocante, uma combinação clássica, saborosa e perfeita para qualquer hora.",
        imagens: ["acai-banana.png"],
        tamanhos: [
            { nome: "300 ml", valor: 16.90 },
            { nome: "500 ml", valor: 26.90 },
            { nome: "700 ml", valor: 33.90 }
        ],
        adicionais: [
            { nome: "Morango", valor: 3.00 },
            { nome: "Granola", valor: 2.00 },
            { nome: "Leite condensado", valor: 2.00 }
        ],
        relacionados: ["acai-granola", "acai-especial"]
    },

    "acai-granola": {
        id: "acai-granola",
        combo: false,
        novo: true,
        estacoes: ["outono"],
        promocao: { ativa: true, descontoPercentual: 40 },
        nome: "Açaí com Banana e Granola",
        descricao:
            "Açaí em camadas com banana fresca e granola dourada para acrescentar textura crocante e um toque naturalmente adocicado.",
        imagens: ["acai-granola.png"],
        tamanhos: [
            { nome: "300 ml", valor: 16.50 },
            { nome: "500 ml", valor: 26.50 },
            { nome: "700 ml", valor: 33.50 }
        ],
        adicionais: [
            { nome: "Morango", valor: 3.00 },
            { nome: "Leite em pó", valor: 2.50 },
            { nome: "Leite condensado", valor: 2.00 }
        ],
        relacionados: ["acai-banana", "acai-morango"]
    },
};

window.precoPromocional = (produto, preco) => {
    const desconto = Number(produto?.promocao?.descontoPercentual);
    if (
        produto?.promocao?.ativa !== true ||
        !Number.isFinite(desconto) ||
        desconto <= 0 ||
        desconto >= 100
    ) {
        return preco;
    }

    return Math.round(Math.round(Number(preco) * 100) * (100 - desconto) / 100) / 100;
};
