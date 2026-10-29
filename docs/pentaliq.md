# PENTALIQ no Projeto Açaí

A integração usa uma configuração pública central, pentaliq-config.js, e um carregador leve, pentaliq-loader.js. Os dois são incluídos nas 17 páginas HTML. Não é necessário copiar chaves separadamente para cada página.

## Eventos

- page_view em cada página após consentimento;
- product_view para o produto informado na URL da página de produto;
- cliques nos botões reconhecidos de carrinho, continuação e pagamento;
- form_start ao interagir com o formulário de entrega;
- form_submit somente depois da validação e armazenamento bem-sucedidos do formulário;
- purchase apenas quando a consulta de pagamento retorna paymentStatus=confirmed;
- heartbeat para tempo ativo estimado.

A repetição da consulta de pagamento reutiliza o ID do evento para o servidor não duplicar a conversão. Um clique no botão ou uma página de retorno não comprovam pagamento. O PENTALIQ é consultivo e não interfere em preços, cobranças ou status do pedido.

Não são enviados nomes, emails, CPF, telefone, endereço, conteúdo dos campos ou tokens de pagamento. Os eventos dependem de consentimento e das preferências de privacidade do navegador. A coleta observada no navegador não substitui conciliação financeira.

## Testar no site publicado

1. Abra a loja e aceite a análise.
2. Visite um produto e o carrinho.
3. Aguarde alguns segundos.
4. No PENTALIQ, selecione Projeto Açaí e Hoje. Atualize a visão geral.
5. Em Inteligência, clique em Atualizar análise. Uma amostra inicial gera orientação de validação; recomendações comerciais específicas exigem mais evidências.

Não precisa comprar nada para validar navegação, produtos, sessões e cliques.

## Desativar

Pause o site no painel PENTALIQ ou altere enabled para false em pentaliq-config.js. Remova as duas tags de cada HTML para desinstalar. Rotação da chave do site exige atualizar somente pentaliq-config.js.

## Validação técnica

O teste PENTALIQ tests/pilot_integration.py verifica inclusão nas 17 páginas, ausência de eventos antes do aceite, continuidade dos IDs entre páginas, visualização de produto, compra somente após confirmação simulada e revogação persistente. Todos os acessos externos de pagamento e analytics são interceptados no teste. A suíte de validação de clientes do checkout também foi executada.

O proxy do ambiente de desenvolvimento bloqueou a consulta ao hostname Supabase público. Por isso, a chegada de eventos reais ao projeto deve ser confirmada no painel autenticado após navegar no site publicado.
