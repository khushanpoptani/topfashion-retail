(function () {
  const POLL_INTERVAL_MS = 8000;
  let lastUpdatedAt = "";

  document.addEventListener("DOMContentLoaded", () => {
    loadContent();
    window.setInterval(loadContent, POLL_INTERVAL_MS);
  });

  async function loadContent() {
    try {
      const response = await fetch("/api/content", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      if (!payload || !payload.content) {
        return;
      }

      if (payload.updatedAt && payload.updatedAt === lastUpdatedAt) {
        return;
      }

      lastUpdatedAt = payload.updatedAt || "";
      applyContent(payload.content);
    } catch (error) {
      console.warn("Unable to load dynamic site content.", error);
    }
  }

  function applyContent(content) {
    bindText(content);
    bindPhone(content.contact || {});
    bindWhatsapp(content.contact || {});
    bindMap(content.map || {});
    bindTimingSummary(content.timing || {});
    renderCollections(content.collections || []);
    renderSocialCards(content.social || {}, content.map || {});
  }

  function bindText(content) {
    document.querySelectorAll("[data-bind]").forEach((node) => {
      const value = getByPath(content, node.dataset.bind);
      if (value !== undefined && value !== null) {
        node.textContent = String(value);
      }
    });
  }

  function bindPhone(contact) {
    const phoneValue = contact.phone || "";
    const phoneHref = phoneValue ? `tel:${phoneValue.replace(/\s+/g, "")}` : "#";

    document.querySelectorAll("[data-phone-display]").forEach((node) => {
      node.textContent = phoneValue;
    });
    document.querySelectorAll("[data-phone-link]").forEach((node) => {
      node.setAttribute("href", phoneHref);
    });
  }

  function bindWhatsapp(contact) {
    const whatsappValue = contact.whatsapp || "";
    const digits = whatsappValue.replace(/[^\d]/g, "");
    const whatsappHref = digits ? `https://wa.me/${digits}` : "#";

    document.querySelectorAll("[data-whatsapp-display]").forEach((node) => {
      node.textContent = whatsappValue;
    });
    document.querySelectorAll("[data-whatsapp-link]").forEach((node) => {
      node.setAttribute("href", whatsappHref);
    });
  }

  function bindMap(map) {
    const query = map.query || "Meerut";
    const mapHref = resolveMapLink(map, query);
    const embedSrc = resolveMapEmbedLink(map, query);

    document.querySelectorAll("[data-map-query]").forEach((node) => {
      node.textContent = map.locationUrl || query;
    });
    document.querySelectorAll("[data-map-link]").forEach((node) => {
      node.setAttribute("href", mapHref);
    });
    document.querySelectorAll("[data-map-embed]").forEach((node) => {
      node.setAttribute("src", embedSrc);
    });
  }

  function bindTimingSummary(timing) {
    const parts = [
      `${timing.weekdaysLabel || "Mon - Sat"}: ${timing.weekdaysHours || ""}`,
      `${timing.sundayLabel || "Sunday"}: ${timing.sundayHours || ""}`,
    ];
    const summary = parts.join(" | ");
    document.querySelectorAll("[data-timing-summary]").forEach((node) => {
      node.textContent = summary;
    });
  }

  function renderCollections(collections) {
    const featuredRoot = document.querySelector("#home-collections-grid");
    const catalogRoot = document.querySelector("#collections-catalog-grid");

    if (featuredRoot) {
      const featuredItems = collections.filter((item) => item.featured !== false).slice(0, 4);
      featuredRoot.innerHTML = featuredItems.map((item) => collectionCard(item)).join("");
    }

    if (catalogRoot) {
      catalogRoot.innerHTML = collections.map((item) => collectionCard(item, true)).join("");
    }
  }

  function renderSocialCards(social, map) {
    const roots = document.querySelectorAll("[data-social-grid]");
    if (!roots.length) {
      return;
    }

    const mapHref = resolveMapLink(map || {}, (map && map.query) || "Meerut");

    const items = [
      {
        className: "instagram",
        icon: "IG",
        title: "Instagram",
        copy: social.instagramHandle || "@topfashion",
        href: social.instagramUrl || "#",
        action: "Follow for new arrivals",
      },
      {
        className: "facebook",
        icon: "FB",
        title: "Facebook",
        copy: social.facebookHandle || "/topfashion",
        href: social.facebookUrl || "#",
        action: "Visit page",
      },
      {
        className: "maps",
        icon: "MAP",
        title: "Google Maps",
        copy: social.mapsLabel || "Open store location",
        href: mapHref,
        action: "Open location",
      },
    ];

    roots.forEach((root) => {
      root.innerHTML = items
        .map(
          (item) => `
            <a class="social-card ${escapeHtml(item.className)}" href="${escapeHtml(item.href)}">
              <div class="social-icon">${escapeHtml(item.icon)}</div>
              <h3 class="social-title">${escapeHtml(item.title)}</h3>
              <p class="social-copy">${escapeHtml(item.copy)}</p>
              <span class="card-link">${escapeHtml(item.action)}</span>
            </a>
          `
        )
        .join("");
    });
  }

  function collectionCard(item) {
    return `
      <a class="collection-card" href="contact.html">
        <div class="collection-media">
          <img src="${escapeHtml(item.image || "")}" alt="${escapeHtml(item.title || "Collection")}" />
        </div>
        <div class="collection-body">
          <span class="tag">${escapeHtml(item.badge || "Featured")}</span>
          <h3 class="collection-title">${escapeHtml(item.title || "Collection")}</h3>
          <p class="collection-copy">${escapeHtml(item.description || "Collection details.")}</p>
          <p class="price-note">Starting from <span>${escapeHtml(formatPrice(item.price || "0"))}</span></p>
          <span class="card-link">View Collection</span>
        </div>
      </a>
    `;
  }

  function formatPrice(price) {
    const raw = String(price).trim();
    if (!raw) {
      return "\u20B90";
    }
    if (raw.startsWith("\u20B9")) {
      return raw;
    }
    if (/^rs\.?/i.test(raw)) {
      return raw;
    }
    return `\u20B9${raw}`;
  }

  function resolveMapLink(map, query) {
    const locationUrl = String((map && map.locationUrl) || "").trim();
    if (locationUrl) {
      return locationUrl;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || "Meerut")}`;
  }

  function resolveMapEmbedLink(map, query) {
    const embedUrl = String((map && map.embedUrl) || "").trim();
    if (embedUrl) {
      return embedUrl;
    }

    const locationUrl = String((map && map.locationUrl) || "").trim();
    if (locationUrl && (locationUrl.includes("output=embed") || locationUrl.includes("/maps/embed"))) {
      return locationUrl;
    }

    return `https://www.google.com/maps?q=${encodeURIComponent(query || "Meerut")}&output=embed`;
  }

  function getByPath(object, path) {
    return path.split(".").reduce((current, key) => {
      if (current && Object.prototype.hasOwnProperty.call(current, key)) {
        return current[key];
      }
      return undefined;
    }, object);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
