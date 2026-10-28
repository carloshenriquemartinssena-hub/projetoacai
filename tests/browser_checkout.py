"""Smoke test local. Requer servidor na porta 8000 e Playwright/Chromium.

Somente autenticação e serviços remotos são simulados; o JS do checkout é real.
Não efetua pagamentos nem acessa o Supabase remoto.
"""
import json
from playwright.sync_api import sync_playwright, expect

BASE = "http://127.0.0.1:8000/"
PRODUCT_ID = "7fba538e-2989-4b41-93fd-f957ffd083f6"

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    page = browser.new_page()
    errors, payloads = [], []
    state = {"payment": "pending"}
    page.on("pageerror", lambda error: errors.append(str(error)))

    def route_request(route):
        url = route.request.url
        if "/functions/v1/create-checkout" in url:
            if route.request.method == "OPTIONS":
                route.fulfill(status=204, headers={"Access-Control-Allow-Origin": BASE[:-1], "Access-Control-Allow-Headers": "content-type,apikey"})
                return
            assert "wvwkdhlerzwixmarlupe.supabase.co" in url
            assert "apikey" not in route.request.headers
            body = route.request.post_data_json
            payloads.append(body)
            assert body["items"][0]["productId"] == PRODUCT_ID
            assert "total" not in body and "precoUnitario" not in body["items"][0]
            response = {"error": "Falha temporária de teste"} if len(payloads) == 1 else {
                "orderId": "11111111-1111-4111-8111-111111111111",
                "paymentUrl": "https://sandbox.asaas.com/i/test", "totalCents": 100,
            }
            route.fulfill(status=503 if len(payloads) == 1 else 200, body=json.dumps(response), content_type="application/json", headers={"Access-Control-Allow-Origin": BASE[:-1]})
        elif "/functions/v1/checkout-status" in url:
            if route.request.method == "OPTIONS":
                route.fulfill(status=204, headers={"Access-Control-Allow-Origin": BASE[:-1], "Access-Control-Allow-Headers": "content-type,apikey"})
                return
            route.fulfill(body=json.dumps({"orderId": "11111111-1111-4111-8111-111111111111", "paymentStatus": state["payment"]}), content_type="application/json", headers={"Access-Control-Allow-Origin": BASE[:-1]})
        elif url.startswith(BASE):
            route.continue_()
        else:
            route.abort()

    page.route("**/*", route_request)
    page.add_init_script("""
        localStorage.setItem('produtoSessao', JSON.stringify({itens:[{
          id:'7fba538e-2989-4b41-93fd-f957ffd083f6', nome:'Açaí Teste 300ml',
          tamanho:'300ml',quantidade:1,adicionais:[],precoUnitario:99,subtotal:99
        }]}));
        localStorage.setItem('dadosCliente',JSON.stringify({userId:'test-user',nome:'Cliente Teste',
          email:'teste@example.com',whatsapp:'11999999999',cpf:'12345678909',cep:'01001000',
          endereco:'Rua Teste',numero:'1',pagamento:'Pix'}));
    """)
    page.goto(BASE + "dados-entrega.html")
    expect(page.locator("#nome")).to_have_value("Cliente Teste")
    page.locator("[name=aceiteTermos]").check()
    page.get_by_role("button", name="Revisar pedido").click()
    page.wait_for_url("**/confirmarpedidio.html")
    button = page.locator("#pagar-asaas")
    link = page.locator("#abrir-pagamento")
    expect(link).to_be_hidden()
    button.click()
    expect(page.locator("#checkout-message")).to_have_text("Falha temporária de teste")
    expect(button).to_be_enabled()
    button.click()
    expect(link).to_be_visible()
    expect(link).to_have_attribute("href", "https://sandbox.asaas.com/i/test")
    expect(button).to_be_hidden()
    assert payloads[0]["requestId"] == payloads[1]["requestId"]
    assert payloads[0]["token"] == payloads[1]["token"]
    expect(page.locator("#resumo-total")).to_contain_text("1,00")

    page.goto(BASE + "pagamento.html?success=true")
    expect(page.locator("#payment-status")).to_contain_text("Aguardando confirmação")
    state["payment"] = "confirmed"
    page.locator("#refresh-payment").click()
    expect(page.locator("#payment-status")).to_contain_text("Pagamento confirmado")
    assert not errors, errors
    browser.close()
    print("PASS: criação, repetição segura, total do backend, retorno pendente e confirmação consultada")
