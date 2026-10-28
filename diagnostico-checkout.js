(() => {
    "use strict";
    document.addEventListener("DOMContentLoaded", () => {
        const button = document.getElementById("check-connection");
        const output = document.getElementById("connection-results");
        const help = document.getElementById("connection-help");
        button.addEventListener("click", async () => {
            button.disabled = true;
            output.textContent = "Verificando…";
            help.textContent = "";
            try {
                const config = window.PAYMENT_BACKEND_CONFIG;
                if (!config?.url) throw new Error("Configuração pública do checkout ausente.");
                async function probe(name, method) {
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), 15000);
                    try {
                        const response = await fetch(`${config.url}/functions/v1/${name}`, {
                            method,
                            headers: method === "POST" ? { "Content-Type": "application/json" } : {},
                            // Corpo inválido de propósito: a validação ocorre antes de acessar banco ou Asaas.
                            ...(method === "POST" ? { body: "{}" } : {}),
                            signal: controller.signal,
                            cache: "no-store"
                        });
                        return { name, method, status: response.status };
                    } catch (error) {
                        return { name, method, status: null, timeout: error.name === "AbortError" };
                    } finally { clearTimeout(timer); }
                }
                const results = await Promise.all([
                    probe("create-checkout", "GET"), probe("create-checkout", "POST"),
                    probe("checkout-status", "GET"), probe("checkout-status", "POST")
                ]);
                output.textContent = results.map(result => `${result.name} ${result.method}: ${
                    result.status === null ? (result.timeout ? "tempo esgotado" : "resposta não acessível ao navegador") : `HTTP ${result.status}`
                }`).join("\n");
                if (results.every(result => result.status === (result.method === "GET" ? 405 : 400))) {
                    help.textContent = "Acesso às funções confirmado. HTTP 400 é esperado neste teste. Isso ainda não verifica os Secrets do Asaas, o banco ou o webhook. Copie os quatro resultados para continuarmos.";
                } else if (results.some(result => result.status === 401)) {
                    help.textContent = "Há uma resposta HTTP 401. Confira se Verify JWT está desativado nas duas funções e se a configuração pública aponta para o projeto correto. Copie os quatro resultados para continuarmos.";
                } else if (results.some(result => result.status === 404)) {
                    help.textContent = "Há uma resposta HTTP 404. Confira se as funções foram publicadas com os nomes create-checkout e checkout-status no projeto correto. Copie os quatro resultados para continuarmos.";
                } else {
                    help.textContent = "Confira SITE_URL nos Secrets: https://carloshenriquemartinssena-hub.github.io/projetoacai/ . Depois abra create-checkout → Invocations/Logs no Supabase para conferir a última tentativa. Copie os quatro resultados para continuarmos.";
                }
            } catch (error) { output.textContent = error.message; }
            finally { button.disabled = false; }
        });
    });
})();
