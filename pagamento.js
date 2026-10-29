(() => {
    "use strict";
    document.addEventListener("DOMContentLoaded", () => {
        const message = document.getElementById("payment-status");
        const button = document.getElementById("refresh-payment");
        let timer;
        let attempts = 0;
        let confirmedAnalyticsId = null;
        function reportConfirmedPayment() {
            try {
                if (!confirmedAnalyticsId || !window.pentaliq?.visitorId()) return;
                window.pentaliq.track('purchase', { event_id: confirmedAnalyticsId });
                window.pentaliq.flush();
            } catch (_) { /* A medição nunca deve interromper o pagamento. */ }
        }
        window.addEventListener('pentaliq:consent', reportConfirmedPayment);
        async function refresh() {
            clearTimeout(timer);
            button.disabled = true;
            try {
                const result = await window.AsaasCheckout.status();
                if (result.paymentStatus === 'confirmed' && result.orderId) {
                    confirmedAnalyticsId = 'purchase_' + String(result.orderId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);
                    reportConfirmedPayment();
                }
                document.getElementById("payment-order").textContent = `Pedido: ${result.orderId}`;
                const messages = {
                    pending: "Aguardando confirmação do Asaas. Voltar para esta página não confirma o pagamento.",
                    confirmed: "Pagamento confirmado! Sua retirada será preparada pela loja.",
                    failed: "O pagamento não foi concluído ou precisa de verificação. Consulte a loja antes de pagar novamente.",
                    refunded: "O pagamento foi reembolsado.", cancelled: "O pagamento foi cancelado."
                };
                message.textContent = messages[result.paymentStatus] || "Aguardando atualização do pagamento.";
                attempts += 1;
                if (result.paymentStatus === "pending" && attempts < 12) timer = setTimeout(refresh, 5000);
            } catch (error) { message.textContent = error.message; }
            finally { button.disabled = false; }
        }
        button.addEventListener("click", () => { attempts = 0; refresh(); });
        refresh();
    });
})();
