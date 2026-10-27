(() => {
    "use strict";

    const cliente = window.supabaseClient;
    let sessaoAtual = null;
    let acaoPendente = null;
    let modal;
    let inicializacao;

    function elemento(tag, attributes = {}) {
        const node = document.createElement(tag);
        Object.entries(attributes).forEach(([name, value]) => {
            if (name === "text") {
                node.textContent = value;
            } else {
                node.setAttribute(name, value);
            }
        });
        return node;
    }

    function mensagem(texto, isError = false) {
        const alvo = modal?.querySelector("[data-auth-message]");
        if (!alvo) return;
        alvo.textContent = texto;
        alvo.classList.toggle("auth-error", isError);
    }

    function perfilKey() {
        return sessaoAtual?.user?.id
            ? `aiz-perfil:${sessaoAtual.user.id}`
            : null;
    }

    function carregarPerfil() {
        const key = perfilKey();
        if (!key) return null;
        try {
            const profile = JSON.parse(localStorage.getItem(key) || "null");
            return profile && typeof profile === "object" ? profile : null;
        } catch (error) {
            console.error("Não foi possível carregar o perfil local.", error);
            return null;
        }
    }

    function atualizarCabecalho() {
        const header = document.querySelector(
            ".header-loja, .carrinho-cabecalho, .site-header, .checkout-header"
        );
        if (!header) return;

        header.querySelector(".auth-account")?.remove();

        const account = elemento("div", { class: "auth-account" });
        if (!sessaoAtual?.user) {
            const login = elemento("button", {
                class: "auth-login-trigger",
                type: "button",
                text: "Entrar"
            });
            account.appendChild(login);
        } else {
            const user = sessaoAtual.user;
            const metadata = user.user_metadata || {};
            const profile = carregarPerfil();
            const nome =
                profile?.nome ||
                metadata.full_name ||
                metadata.name ||
                user.email?.split("@")[0] ||
                "Cliente";

            const toggle = elemento("button", {
                class: "auth-profile-trigger",
                type: "button",
                "aria-expanded": "false",
                text: nome
            });
            const menu = elemento("div", {
                class: "auth-profile-menu",
                hidden: ""
            });
            const email = elemento("span", {
                class: "auth-profile-email",
                text: user.email || ""
            });
            const switchAccount = elemento("button", {
                type: "button",
                text: "Trocar de conta"
            });
            const signOut = elemento("button", {
                type: "button",
                text: "Sair"
            });

            toggle.addEventListener("click", () => {
                menu.hidden = !menu.hidden;
                toggle.setAttribute("aria-expanded", String(!menu.hidden));
            });
            switchAccount.addEventListener("click", async () => {
                if (await sair()) abrir();
            });
            signOut.addEventListener("click", sair);
            menu.append(email, switchAccount, signOut);
            account.append(toggle, menu);
        }
        header.appendChild(account);
    }

    function fechar(cancelarAcao = false) {
        if (cancelarAcao) acaoPendente = null;
        modal?.classList.remove("auth-modal-open");
        modal?.setAttribute("aria-hidden", "true");
        document.body.classList.remove("auth-modal-visible");
    }

    function abrir() {
        if (!modal) return;
        modal.classList.add("auth-modal-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("auth-modal-visible");
        modal.querySelector("#auth-email")?.focus();
    }

    function concluirAutenticacao(session) {
        sessaoAtual = session;
        atualizarCabecalho();
        fechar();
        if (acaoPendente) {
            const action = acaoPendente;
            acaoPendente = null;
            action();
        } else {
            mensagem("");
        }
    }

    function criarModal() {
        modal = elemento("div", {
            class: "auth-modal",
            "aria-hidden": "true"
        });
        modal.innerHTML = `
            <section class="auth-dialog" role="dialog" aria-modal="true"
                aria-labelledby="auth-title">
                <button class="auth-close" type="button" aria-label="Fechar">×</button>
                <p class="auth-eyebrow">AÇAÍ ZERO GRAU</p>
                <h2 id="auth-title">Entre ou crie sua conta</h2>
                <p class="auth-intro">Entre para continuar seu pedido e guardar seus dados para a próxima compra.</p>
                <button class="auth-google" type="button">Continuar com Google</button>
                <div class="auth-divider"><span>ou use seu e-mail</span></div>
                <form class="auth-form">
                    <label for="auth-email">E-mail</label>
                    <input id="auth-email" name="email" type="email" autocomplete="email" required>
                    <label for="auth-password">Senha</label>
                    <input id="auth-password" name="password" type="password"
                        autocomplete="current-password" minlength="6" required>
                    <label class="auth-name-label" for="auth-name" hidden>Seu nome</label>
                    <input id="auth-name" name="name" type="text" autocomplete="name" hidden>
                    <p class="auth-message" data-auth-message role="status" aria-live="polite"></p>
                    <button class="auth-submit" type="submit">Entrar</button>
                </form>
                <button class="auth-mode" type="button">Ainda não tem conta? Criar conta</button>
            </section>
        `;

        const form = modal.querySelector(".auth-form");
        const title = modal.querySelector("#auth-title");
        const name = modal.querySelector("#auth-name");
        const nameLabel = modal.querySelector(".auth-name-label");
        const password = modal.querySelector("#auth-password");
        const submit = modal.querySelector(".auth-submit");
        let criandoConta = false;

        modal.querySelector(".auth-close").addEventListener(
            "click",
            () => fechar(true)
        );
        modal.addEventListener("click", event => {
            if (event.target === modal) fechar(true);
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && modal.classList.contains("auth-modal-open")) {
                fechar(true);
            }
        });
        modal.querySelector(".auth-mode").addEventListener("click", event => {
            criandoConta = !criandoConta;
            title.textContent = criandoConta
                ? "Crie sua conta"
                : "Entre ou crie sua conta";
            name.hidden = !criandoConta;
            nameLabel.hidden = !criandoConta;
            name.required = criandoConta;
            password.autocomplete = criandoConta
                ? "new-password"
                : "current-password";
            submit.textContent = criandoConta ? "Criar conta" : "Entrar";
            event.currentTarget.textContent = criandoConta
                ? "Já tem conta? Entrar"
                : "Ainda não tem conta? Criar conta";
            mensagem("");
        });

        modal.querySelector(".auth-google").addEventListener("click", async event => {
            if (!cliente) {
                mensagem("O login está indisponível: não foi possível conectar ao Supabase.", true);
                return;
            }
            const button = event.currentTarget;
            button.disabled = true;
            try {
                const { error } = await cliente.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: window.location.href }
                });
                if (error) throw error;
            } catch (error) {
                button.disabled = false;
                mensagem(
                    error instanceof Error
                        ? error.message
                        : "Não foi possível iniciar o login com Google.",
                    true
                );
            }
        });

        form.addEventListener("submit", async event => {
            event.preventDefault();
            if (!cliente) {
                mensagem("O login está indisponível: não foi possível conectar ao Supabase.", true);
                return;
            }
            const formData = new FormData(form);
            const email = String(formData.get("email")).trim();
            const senha = String(formData.get("password"));
            const nome = String(formData.get("name") || "").trim();
            submit.disabled = true;
            mensagem("Aguarde...");

            try {
                const resultado = criandoConta
                    ? await cliente.auth.signUp({
                        email,
                        password: senha,
                        options: { data: { full_name: nome } }
                    })
                    : await cliente.auth.signInWithPassword({
                        email,
                        password: senha
                    });

                if (resultado.error) {
                    mensagem(resultado.error.message, true);
                    return;
                }
                if (resultado.data.session) {
                    concluirAutenticacao(resultado.data.session);
                } else {
                    mensagem("Conta criada. Verifique seu e-mail para confirmar o cadastro e depois entre.");
                }
            } catch (error) {
                mensagem(
                    error instanceof Error
                        ? error.message
                        : "Não foi possível concluir a autenticação.",
                    true
                );
            } finally {
                submit.disabled = false;
            }
        });
        document.body.appendChild(modal);
        document.addEventListener("click", event => {
            if (event.target.closest(".auth-login-trigger")) abrir();
        });
    }

    async function sair() {
        if (!cliente) return;
        const { error } = await cliente.auth.signOut();
        if (error) {
            console.error("Não foi possível encerrar a sessão.", error);
            mensagem("Não foi possível sair da conta. Tente novamente.", true);
            return false;
        }
        sessaoAtual = null;
        atualizarCabecalho();
        return true;
    }

    async function inicializar() {
        criarModal();
        if (!cliente) {
            atualizarCabecalho();
            console.error("Cliente Supabase indisponível; autenticação não foi inicializada.");
            return;
        }

        cliente.auth.onAuthStateChange((_event, session) => {
            sessaoAtual = session;
            atualizarCabecalho();
            if (session && acaoPendente) concluirAutenticacao(session);
        });

        try {
            const { data, error } = await cliente.auth.getSession();
            if (error) throw error;
            sessaoAtual = data?.session || null;
        } catch (error) {
            console.error("Não foi possível recuperar a sessão.", error);
            mensagem("Não foi possível verificar sua sessão. Entre novamente.", true);
            sessaoAtual = null;
        }
        atualizarCabecalho();
    }

    function pronto() {
        inicializacao ||= inicializar();
        return inicializacao;
    }

    window.AuthLoja = {
        async exigirLogin(acao) {
            await pronto();
            if (sessaoAtual?.user) {
                acao();
                return true;
            }
            acaoPendente = acao;
            abrir();
            return false;
        },
        async precisaLogin() {
            await pronto();
            return !sessaoAtual?.user;
        },
        async obterUsuario() {
            await pronto();
            return sessaoAtual?.user || null;
        },
        carregarPerfil,
        salvarPerfil(profile) {
            const key = perfilKey();
            if (!key) return false;
            try {
                localStorage.setItem(key, JSON.stringify(profile));
                atualizarCabecalho();
                return true;
            } catch (error) {
                console.error("Não foi possível guardar os dados do perfil.", error);
                return false;
            }
        },
        abrirLogin: abrir,
        sair
    };

    document.addEventListener("DOMContentLoaded", pronto);
})();
