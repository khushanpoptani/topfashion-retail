(function () {
  let currentContent = null;

  document.addEventListener("DOMContentLoaded", () => {
    bindSidebar();
    bindActions();
    hydrateFromInitialPayload();
    loadAdminContent();
  });

  function bindSidebar() {
    const buttons = document.querySelectorAll("[data-section-target]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => setActiveSection(button.dataset.sectionTarget));
    });
  }

  function bindActions() {
    const saveButton = document.querySelector("#save-content");
    const reloadButton = document.querySelector("#reload-content");
    const addCollectionButton = document.querySelector("#add-collection");
    const collectionList = document.querySelector("#collection-editor-list");

    if (saveButton) {
      saveButton.addEventListener("click", saveContent);
    }

    if (reloadButton) {
      reloadButton.addEventListener("click", loadAdminContent);
    }

    if (addCollectionButton) {
      addCollectionButton.addEventListener("click", () => {
        ensureContent();
        currentContent.collections.push({
          title: "New Collection",
          badge: "Featured",
          description: "Add a short collection description.",
          price: "0",
          image:
            "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80",
          featured: true,
        });
        renderCollectionsEditor();
      });
    }

    if (collectionList) {
      collectionList.addEventListener("click", (event) => {
        const removeButton = event.target.closest("[data-remove-collection]");
        if (!removeButton) {
          return;
        }
        const index = Number(removeButton.dataset.removeCollection);
        ensureContent();
        currentContent.collections.splice(index, 1);
        renderCollectionsEditor();
      });
    }
  }

  async function loadAdminContent() {
    if (!currentContent) {
      setStatus("Loading content...", "");
    }
    try {
      const response = await fetch("/api/content", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Unable to load site content."));
      }

      const payload = await response.json();
      applyLoadedContent(payload);
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  function hydrateFromInitialPayload() {
    const initialNode = document.querySelector("#initial-admin-content");
    if (!initialNode) {
      return;
    }

    try {
      const payload = JSON.parse(initialNode.textContent);
      applyLoadedContent(payload, { silent: true });
    } catch (error) {
      console.warn("Unable to parse initial admin content.", error);
    }
  }

  function applyLoadedContent(payload, options = {}) {
    if (!payload || !payload.content) {
      return;
    }

    currentContent = payload.content;
    fillSimpleFields(currentContent);
    renderCollectionsEditor();

    if (options.silent) {
      return;
    }

    setStatus(
      payload.updatedAt
        ? `Loaded latest content. Last update: ${new Date(payload.updatedAt).toLocaleString()}`
        : "Loaded latest content.",
      "success"
    );
  }

  function fillSimpleFields(content) {
    document.querySelectorAll("[data-path]").forEach((input) => {
      if (input.closest("[data-collection-row]")) {
        return;
      }
      const value = getByPath(content, input.dataset.path);
      if (input.type === "checkbox") {
        input.checked = Boolean(value);
      } else {
        input.value = value === undefined || value === null ? "" : String(value);
      }
    });
  }

  function renderCollectionsEditor() {
    const list = document.querySelector("#collection-editor-list");
    if (!list || !currentContent) {
      return;
    }

    list.innerHTML = currentContent.collections
      .map(
        (item, index) => `
          <article class="admin-collection-card" data-collection-row="${index}">
            <div class="admin-collection-header">
              <h3>Collection ${index + 1}</h3>
              <button type="button" class="button button-ghost admin-small-button" data-remove-collection="${index}">
                Remove
              </button>
            </div>
            <div class="admin-form-grid">
              <label class="admin-field">
                <span>Title</span>
                <input type="text" data-collection-field="title" value="${escapeHtml(item.title || "")}" />
              </label>
              <label class="admin-field">
                <span>Badge</span>
                <input type="text" data-collection-field="badge" value="${escapeHtml(item.badge || "")}" />
              </label>
              <label class="admin-field admin-field-full">
                <span>Description</span>
                <textarea rows="3" data-collection-field="description">${escapeHtml(item.description || "")}</textarea>
              </label>
              <label class="admin-field">
                <span>Starting Price</span>
                <input type="text" data-collection-field="price" value="${escapeHtml(item.price || "")}" />
              </label>
              <label class="admin-field admin-field-full">
                <span>Image URL</span>
                <input type="url" data-collection-field="image" value="${escapeHtml(item.image || "")}" />
              </label>
              <label class="admin-checkbox">
                <input type="checkbox" data-collection-field="featured" ${item.featured !== false ? "checked" : ""} />
                <span>Show on homepage featured section</span>
              </label>
            </div>
          </article>
        `
      )
      .join("");
  }

  async function saveContent() {
    try {
      ensureContent();
      const payload = collectFormData();
      setStatus("Saving changes...", "");

      const response = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Unable to save site content."));
      }

      const updated = await response.json();
      applyLoadedContent(updated, { silent: true });
      setStatus(
        updated.updatedAt
          ? `Saved successfully. Public pages will reflect this automatically. Updated: ${new Date(
              updated.updatedAt
            ).toLocaleString()}`
          : "Saved successfully.",
        "success"
      );
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  function collectFormData() {
    const nextContent = JSON.parse(JSON.stringify(currentContent));

    document.querySelectorAll("[data-path]").forEach((input) => {
      if (input.closest("[data-collection-row]")) {
        return;
      }
      const value = input.type === "checkbox" ? input.checked : input.value.trim();
      setByPath(nextContent, input.dataset.path, value);
    });

    nextContent.collections = Array.from(document.querySelectorAll("[data-collection-row]")).map((row) => {
      const item = {};
      row.querySelectorAll("[data-collection-field]").forEach((input) => {
        const key = input.dataset.collectionField;
        item[key] = input.type === "checkbox" ? input.checked : input.value.trim();
      });
      return item;
    });

    return nextContent;
  }

  function setActiveSection(sectionName) {
    document.querySelectorAll("[data-section-target]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.sectionTarget === sectionName);
    });

    document.querySelectorAll("[data-section-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.sectionPanel !== sectionName;
    });
  }

  function setStatus(message, tone) {
    const statusNode = document.querySelector("#admin-status");
    if (!statusNode) {
      return;
    }
    statusNode.textContent = message;
    statusNode.classList.remove("is-success", "is-error");
    if (tone === "success") {
      statusNode.classList.add("is-success");
    }
    if (tone === "error") {
      statusNode.classList.add("is-error");
    }
  }

  function ensureContent() {
    if (!currentContent) {
      currentContent = {
        branding: {},
        sale: {},
        contact: {},
        timing: {},
        map: {},
        social: {},
        others: {},
        collections: [],
      };
    }
  }

  async function extractErrorMessage(response, fallbackMessage) {
    try {
      const text = await response.text();
      if (!text) {
        return fallbackMessage;
      }

      try {
        const payload = JSON.parse(text);
        if (payload && payload.error) {
          return payload.error;
        }
      } catch (error) {
        return text;
      }

      return text;
    } catch (error) {
      return fallbackMessage;
    }
  }

  function getByPath(object, path) {
    return path.split(".").reduce((current, key) => {
      if (current && Object.prototype.hasOwnProperty.call(current, key)) {
        return current[key];
      }
      return "";
    }, object);
  }

  function setByPath(object, path, value) {
    const keys = path.split(".");
    let target = object;
    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        target[key] = value;
        return;
      }
      if (!target[key] || typeof target[key] !== "object") {
        target[key] = {};
      }
      target = target[key];
    });
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
