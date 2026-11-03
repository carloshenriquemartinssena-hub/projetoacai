
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
};
