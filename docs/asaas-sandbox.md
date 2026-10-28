# Checkout Asaas em sandbox

O site chama `create-checkout`, que busca produtos ativos no banco, calcula o total em centavos, registra o pedido e cria uma cobrança em `POST /v3/payments`. O cliente abre `invoiceUrl`, a página hospedada do Asaas. Não usa `/v3/checkouts`: por isso `asaas_checkout_id` permanece vazio e `asaas_payment_id` identifica a cobrança.

O retorno para `pagamento.html` apenas consulta o estado do pedido. Somente o webhook autenticado pode confirmar o pagamento. Token Asaas e service role nunca são enviados ao navegador. O checkout e a consulta de pagamento não exigem login.

## Aplicação no Supabase

1. Revise e execute [a migração](../supabase/migrations/202610280001_asaas_checkout.sql) no SQL Editor do projeto existente. Ela não recria as tabelas fornecidas e pode ser executada novamente. Faz `ALTER TABLE`, adiciona um índice e uma função transacional. Protege `orders` e `payment_events` contra leitura/escrita direta por visitantes e usuários autenticados; consultas desses clientes devem passar pelas funções. `profiles` não é alterada.
2. Confira os secrets em Edge Functions → Secrets, sem colocá-los no código:
   - `ASAAS_API_KEY`: chave da conta sandbox.
   - `ASAAS_BASE_URL`: `https://api-sandbox.asaas.com/v3`.
   - `ASAAS_WEBHOOK_TOKEN`: token forte configurado também no webhook do Asaas.
   - `SITE_URL`: URL base do site, com HTTPS e incluindo eventual subdiretório. Para testes locais, HTTP somente em `localhost` ou `127.0.0.1`. A origem deve coincidir exatamente com a página que inicia o checkout.
   - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas automaticamente pelo runtime das Edge Functions hospedadas. Não copie seus valores para o site.
3. Na raiz do repositório, com a CLI Supabase autenticada para o projeto correto, publique:

   ```sh
   supabase functions deploy create-checkout --project-ref wvwkdhlerzwixmarlupe --no-verify-jwt
   supabase functions deploy checkout-status --project-ref wvwkdhlerzwixmarlupe --no-verify-jwt
   supabase functions deploy asaas-webhook --project-ref wvwkdhlerzwixmarlupe --no-verify-jwt
   ```

   O `config.toml` também declara `verify_jwt=false`. São endpoints para checkout de visitantes; o webhook autentica o cabeçalho `asaas-access-token`, e a consulta de pedido exige um token aleatório de capacidade guardado na mesma aba do navegador. As chamadas às funções públicas não enviam chave Supabase. Não reative a verificação JWT sem adaptar a autenticação do checkout.
4. No painel **sandbox** do Asaas, cadastre um webhook para:

   ```text
   https://wvwkdhlerzwixmarlupe.supabase.co/functions/v1/asaas-webhook
   ```

   Configure o token igual a `ASAAS_WEBHOOK_TOKEN`. Inscreva os eventos `PAYMENT_CREATED`, `PAYMENT_UPDATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED`, `PAYMENT_REFUND_IN_PROGRESS`, `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE` e `PAYMENT_AWAITING_CHARGEBACK_REVERSAL`. Eventos ainda não tratados são registrados e ignorados. Não configure este endpoint para uma conta de produção.
5. Publique também os arquivos estáticos, incluindo `asaas-checkout.js`, `pagamento.html` e `pagamento.js`.

Nenhum desses passos no projeto remoto foi executado automaticamente nesta sessão: não há acesso administrativo ao Supabase nem aos secrets hospedados.

## Produto e validação manual

O item `acai-teste-500ml` mantém o slug antigo para preservar links, mas agora representa **Açaí Teste 300ml**, ID `7fba538e-2989-4b41-93fd-f957ffd083f6`, preço demonstrativo **R$ 1,00**. O preço cobrado vem de `products.price_cents`. Os outros produtos locais ainda são demonstrativos e serão rejeitados pelo backend até terem IDs, tamanhos e preços cadastrados.

O fluxo online oferece **retirada na loja**, com frete zero explícito. Entrega exige uma regra de cálculo validada no backend antes de ser habilitada. Adicionais são rejeitados até existir um catálogo de preços deles no banco. Não há parcelamento, assinaturas, pagamentos em dinheiro ou coleta direta de cartão nesta implementação.

1. Abra `testepagamento.html` no site, escolha o produto, preencha dados válidos de teste aceitos pelo Asaas e selecione Pix ou cartão. O formulário atual é `dados-entrega.html` e não exige login.
2. Clique em **Preparar pagamento de teste**. Confira o total confirmado pelo banco e abra **Pagar … no Asaas** na mesma aba. O pedido deve estar `pending_payment` / `pending`.
3. Simule o pagamento na conta sandbox. Ao voltar para a loja, a página consulta o banco por até um minuto. Também é possível consultar novamente. Perder o armazenamento da aba exige consultar o pedido pela loja; nenhum token aparece na URL.
4. Confira no banco com as consultas abaixo. Uma repetição da mesma solicitação deve devolver a mesma cobrança. A chave de repetição é salva antes do envio. Respostas incertas não disparam outro POST de cobrança: o pedido fica `needs_review` para conferência na loja.
5. Reentregue o mesmo evento no painel Asaas: deve existir só uma linha com o mesmo `asaas_event_id`. Reembolso deve atualizar `payment_status` para `refunded`. Um evento de atraso não regride um pagamento confirmado nem o progresso do preparo.

```sql
SELECT id, total_cents, fulfillment_type, status, payment_status,
       asaas_payment_id, payment_url, checkout_state, paid_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 20;

SELECT asaas_event_id, event_type, order_id, processed_at, processing_error
FROM public.payment_events
ORDER BY received_at DESC
LIMIT 30;
```

Eventos com valor ou ID de pagamento divergentes ficam sem `processed_at`, com diagnóstico em `processing_error`, e recebem HTTP 503 para permitir reentrega. Não marque pedidos como pagos manualmente para contornar esses erros.

Se um pedido ficar `needs_review`, confira na conta sandbox usando seu UUID em `externalReference` antes de qualquer nova tentativa. Um timeout pode acontecer depois que a cobrança foi criada. Reconcilie o ID e URL da cobrança existente; não apague a chave de repetição para emitir outra cobrança. A implementação privilegia evitar duplicação e não faz recuperação automática de falhas ambíguas.

## Verificações locais

Com Deno 2 instalado:

```sh
deno task check
deno task test
python3 -m http.server 8000 --bind 127.0.0.1
```

Em ambientes com proxy TLS, use a cadeia confiável do sistema (`DENO_TLS_CA_STORE=system`) quando necessário. Não desabilite a verificação de certificados.

Os testes usam respostas simuladas para Supabase/Asaas e PostgreSQL isolado via PGlite para executar a migração e os eventos reais. Eles não comprovam a publicação nem a aceitação de pagamentos pelo serviço remoto. Antes de produção ainda é necessário validar o ciclo completo na conta sandbox e configurar controles de abuso para o endpoint público de criação (limites e proteção contra automação).

## Configuração do site publicado

Para o GitHub Pages informado, configure `SITE_URL` como:

```text
https://carloshenriquemartinssena-hub.github.io/projetoacai/
```

Aplicar o SQL no editor não publica Edge Functions. Os três deploys da seção inicial continuam necessários. A versão do GitHub anterior à compatibilização chamava `create-asaas-checkout`, mas esta implementação usa `create-checkout`; publique site e funções compatíveis. A versão sem login e o caminho `dados-entrega.html` foram preservados. O botão de pedido pelo WhatsApp permanece separado do pagamento online.

Não basta trocar a chave para produção: tanto o backend (`ASAAS_BASE_URL`) quanto a validação de links no backend e no navegador aceitam somente sandbox. A migração para produção exige parametrizar e testar esse par de ambientes, configurar o webhook de produção e concluir a validação ponta a ponta.

O projeto confirmado para as funções é `wvwkdhlerzwixmarlupe`. A migração SQL, os Secrets e o webhook devem estar nesse mesmo projeto. O arquivo legado `supabase.js` pertence à integração antiga e não é usado pelo checkout sem login.
