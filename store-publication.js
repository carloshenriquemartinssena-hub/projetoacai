(() => {
    "use strict";

    const config = window.PAYMENT_BACKEND_CONFIG;
    const catalog = window.CATALOGO_PRODUTOS || {};
    const now = Date.now();

    function safeAsset(value) {
        const source = String(value || "").trim();
        if (/^https:\/\//i.test(source)) return source;
        if (/^[\wÀ-ÿ./ ()_-]+$/.test(source) && !source.includes("..")) return source;
        return "";
    }

    function productIsAvailable(product) {
        if (product.active === false) return false;
        const startsAt = product.startsAt ? new Date(product.startsAt).getTime() : null;
        const endsAt = product.endsAt ? new Date(product.endsAt).getTime() : null;
        return (!startsAt || !Number.isFinite(startsAt) || startsAt <= now) &&
            (!endsAt || !Number.isFinite(endsAt) || endsAt >= now);
    }

    function applyProducts(content) {
        if (!Array.isArray(content.products)) return;
        Object.keys(catalog).forEach(id => delete catalog[id]);
        content.products.filter(productIsAvailable).forEach(product => {
            const slug = String(product.id || "").trim();
            if (!slug) return;
            const sizes = Array.isArray(product.sizes)
                ? product.sizes
                    .filter(size => size.name && Number(size.price) > 0)
                    .map(size => ({ nome: String(size.name), valor: Number(size.price) }))
                : [];
            if (!sizes.length) return;

            const discount = Number(product.discount) || 0;
            const image = safeAsset(product.image);
            catalog[slug] = {
                id: slug,
                combo: false,
                novo: true,
                nome: String(product.name || "Produto"),
                descricao: String(product.description || ""),
                imagens: image ? [image] : [],
                tamanhos: sizes,
                adicionais: [],
                relacionados: [],
                promocao: {
                    ativa: discount > 0 && discount < 100,
                    descontoPercentual: discount
                }
            };
        });
    }

    function safeLink(value) {
        const link = String(value || "").trim();
        if (/^https:\/\//i.test(link)) return link;
        if (/^(?!\/|\\)\.?[a-zA-Z0-9À-ÿ _./?=&%-]+$/.test(link) && !link.includes("..")) {
            return link;
        }
        return "";
    }

    function applyBanners(banners) {
        const track = document.querySelector(".carousel-track");
        if (!track || !Array.isArray(banners)) return;
        const activeBanners = banners.filter(banner => banner.active && safeAsset(banner.image));
        track.replaceChildren();
        activeBanners.forEach(banner => {
            const item = document.createElement("div");
            item.className = "carousel-item";
            const link = safeLink(banner.link);
            const image = document.createElement("img");
            image.src = safeAsset(banner.image);
            image.alt = String(banner.title || "Açaí Zero Grau");
            if (link) {
                const anchor = document.createElement("a");
                anchor.href = link;
                anchor.appendChild(image);
                item.appendChild(anchor);
            } else {
                item.appendChild(image);
            }
            track.appendChild(item);
        });
        window.dispatchEvent(new CustomEvent("store:banners-updated"));
    }

    function embedVideoUrl(value) {
        try {
            const url = new URL(value);
            if (url.protocol !== "https:") return null;
            if (url.hostname === "youtu.be") {
                return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(url.pathname.slice(1))}`;
            }
            if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
                const videoId = url.searchParams.get("v");
                return videoId
                    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`
                    : null;
            }
        } catch {
            return null;
        }
        return null;
    }

    function applyPublishedExtras(content) {
        document.querySelectorAll("[data-published-extra]").forEach(node => node.remove());
        const mount = document.querySelector("[data-store-footer]");
        if (!mount) return;

        if (content.content?.videoEnabled && content.content.videoUrl) {
            const section = document.createElement("section");
            section.className = "published-video-section";
            section.dataset.publishedExtra = "";
            section.appendChild(document.createElement("h2")).textContent = "Conheça a loja";
            const embed = embedVideoUrl(content.content.videoUrl);
            if (embed) {
                const frame = document.createElement("iframe");
                frame.src = embed;
                frame.title = "Vídeo da Açaí Zero Grau";
                frame.loading = "lazy";
                frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
                frame.referrerPolicy = "strict-origin-when-cross-origin";
                frame.allowFullscreen = true;
                section.appendChild(frame);
            } else {
                const url = safeAsset(content.content.videoUrl);
                if (url && /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
                    const video = document.createElement("video");
                    video.src = url;
                    video.controls = true;
                    video.preload = "metadata";
                    section.appendChild(video);
                }
            }
            if (section.querySelector("iframe, video")) mount.before(section);
        }

        if (content.content?.contactEnabled && content.content.contactValue) {
            const button = document.createElement("a");
            button.className = "published-contact-button";
            button.dataset.publishedExtra = "";
            button.target = "_blank";
            button.rel = "noopener noreferrer";
            const value = String(content.content.contactValue).trim();
            if (content.content.contactType === "whatsapp") {
                const phone = value.replace(/\D/g, "");
                if (phone.length < 10 || phone.length > 15) return;
                button.href = `https://wa.me/${phone}`;
            } else {
                const link = safeLink(value);
                if (!link || !/^https:\/\//i.test(link)) return;
                button.href = link;
            }
            button.textContent = String(content.content.contactLabel || "Fale com a gente");
            document.body.appendChild(button);
        }
    }

    function applyAppearance(appearance) {
        if (!appearance) return;
        const root = document.documentElement;
        if (/^#[\da-f]{6}$/i.test(appearance.primaryColor)) {
            root.style.setProperty("--published-primary", appearance.primaryColor);
        }
        if (/^#[\da-f]{6}$/i.test(appearance.accentColor)) {
            root.style.setProperty("--published-accent", appearance.accentColor);
        }
        root.dataset.publishedCardStyle = ["soft", "rounded", "simple"].includes(appearance.cardStyle)
            ? appearance.cardStyle
            : "soft";
    }

    async function loadPublishedVersion() {
        if (!config?.url || !config?.publishableKey) return null;
        const endpoint = new URL("/rest/v1/website_editor_publications", config.url);
        endpoint.searchParams.set("id", "eq.main");
        endpoint.searchParams.set("select", "content,published_at");

        try {
            const response = await fetch(endpoint, {
                headers: {
                    apikey: config.publishableKey,
                    Authorization: `Bearer ${config.publishableKey}`
                },
                cache: "no-store"
            });
            if (!response.ok) {
                throw new Error(`Supabase respondeu HTTP ${response.status}.`);
            }
            const [publication] = await response.json();
            if (!publication?.content) return null;

            applyProducts(publication.content);
            applyBanners(publication.content.banners);
            applyAppearance(publication.content.appearance);
            applyPublishedExtras(publication.content);
            window.STORE_PUBLICATION = publication;
            return publication;
        } catch (error) {
            console.error("Não foi possível carregar a versão publicada; será exibida a versão local.", error);
            return null;
        }
    }

    window.STORE_PUBLICATION_READY = loadPublishedVersion();
})();
