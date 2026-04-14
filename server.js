const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

let DatabaseSync = null;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch (_error) {
  DatabaseSync = null;
}

const ROOT = __dirname;
const CONTENT_FILE_PATH = path.resolve(
  process.env.TOP_FASHION_CONTENT_FILE || path.join(ROOT, "data", "site-content.json")
);
const LEGACY_DB_PATH = path.join(ROOT, "data", "site_content.db");
const HOST = process.env.TOP_FASHION_HOST || "127.0.0.1";
const PORT = Number(process.env.TOP_FASHION_PORT || "8000");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

const DEFAULT_CONTENT = {
  branding: {
    companyName: "Top Fashion",
    brandNote: "Meerut Boutique",
    heroEyebrow: "Affordable everyday fashion",
    heroTitle: "Top Fashion",
    heroDescription:
      "Trendy, polished and budget-friendly clothing in Meerut. Discover curated looks for men, women and kids in a simple, welcoming shopping experience.",
    heroPriceLabel: "Starting Price",
    heroPriceValue: "From Rs. 200",
    heroTimingLabel: "Store Timing",
    heroTimingValue: "Mon-Sat, 10 AM - 9 PM",
    heroBestForLabel: "Best For",
    heroBestForValue: "Daily, festive and family wear",
    aboutHeading: "Built around simple fashion choices",
    aboutParagraph1:
      "Top Fashion is imagined as a welcoming neighborhood clothing store in Meerut that makes shopping easy for families, students and working professionals.",
    aboutParagraph2:
      "The goal of this website direction is clarity first: strong visuals, simple sections, obvious contact options and enough brand personality to feel polished.",
    aboutParagraph3:
      "You can keep this structure even when you replace all sample text, photos, reviews and prices with real store information later.",
    footerDescription:
      "Sample website concept for a clean, professional clothing store presence in Meerut.",
  },
  sale: {
    badge: "Festive Sale",
    tagline: "Fresh arrivals for men, women and kids. Styles starting from Rs. 200.",
  },
  contact: {
    address: "XYZ Market, Meerut, Uttar Pradesh",
    phone: "+91 98765 43210",
    whatsapp: "+91 98765 98765",
  },
  timing: {
    weekdaysLabel: "Mon - Sat",
    weekdaysHours: "10:00 AM - 9:00 PM",
    sundayLabel: "Sunday",
    sundayHours: "Closed",
    statusText: "Open Today",
  },
  map: {
    query: "XYZ Market, Meerut, Uttar Pradesh",
    locationUrl: "https://www.google.com/maps/search/?api=1&query=XYZ+Market+Meerut+Uttar+Pradesh",
    embedUrl: "",
  },
  social: {
    instagramUrl: "https://www.instagram.com/",
    instagramHandle: "@topfashion.meerut",
    facebookUrl: "https://www.facebook.com/",
    facebookHandle: "/topfashionmeerut",
    mapsLabel: "Find the store and plan a quick visit.",
  },
  others: {
    reviewScore: "4.8 / 5",
    reviewSummary: "Based on local customer feedback and repeat shoppers.",
    reviewNote: "Customers love the easy pricing, welcoming service and updated styles.",
    copyrightText: "2026 Top Fashion. All rights reserved.",
  },
  collections: [
    {
      title: "Shirts",
      badge: "Trending",
      description: "Clean everyday fits for office, college and casual wear.",
      price: "200",
      image:
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80",
      featured: true,
    },
    {
      title: "Dresses",
      badge: "New Edit",
      description: "Flowy silhouettes and easy styling for festive or day wear.",
      price: "500",
      image:
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
      featured: true,
    },
    {
      title: "Kids Wear",
      badge: "Family Pick",
      description: "Comfortable, colorful essentials for active daily routines.",
      price: "300",
      image:
        "https://images.unsplash.com/photo-1519238359922-989348752efb?auto=format&fit=crop&w=900&q=80",
      featured: true,
    },
    {
      title: "Ethnic Wear",
      badge: "Festive",
      description: "Elegant pieces for celebrations, weddings and seasonal shopping.",
      price: "1000",
      image:
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80",
      featured: true,
    },
    {
      title: "Denim Edit",
      badge: "Daily Wear",
      description: "Classic denim options for practical wardrobes and repeat wear.",
      price: "650",
      image:
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80",
      featured: false,
    },
    {
      title: "Workwear Sets",
      badge: "Polished",
      description: "Tailored looks that feel sharp without becoming too formal.",
      price: "750",
      image:
        "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
      featured: false,
    },
  ],
};

fs.mkdirSync(path.dirname(CONTENT_FILE_PATH), { recursive: true });
ensureContentFile();

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (requestUrl.pathname === "/api/health") {
      return writeJson(res, 200, { ok: true, contentFile: CONTENT_FILE_PATH });
    }

    if (requestUrl.pathname === "/api/content") {
      if (req.method === "GET") {
        return writeJson(res, 200, loadContentRecord());
      }

      if (req.method === "PUT" || req.method === "POST") {
        const payload = await readJsonBody(req);
        const content = payload && typeof payload === "object" && "content" in payload ? payload.content : payload;
        return writeJson(res, 200, saveContentRecord(content));
      }
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return writeJson(res, 405, { error: "Method not allowed." });
    }

    return serveStaticFile(requestUrl.pathname, res, req.method === "HEAD");
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = error.expose ? error.message : `Server error: ${error.message}`;
    if (req.url && req.url.startsWith("/api/")) {
      return writeJson(res, statusCode, { error: message });
    }
    res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(message);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Top Fashion server running at http://${HOST}:${PORT}`);
});

function ensureContentFile() {
  if (fs.existsSync(CONTENT_FILE_PATH)) {
    const currentRecord = parseContentRecord(fs.readFileSync(CONTENT_FILE_PATH, "utf8"));
    writeContentRecord(currentRecord);
    return;
  }

  const migratedRecord = loadLegacySqliteRecord();
  if (migratedRecord) {
    writeContentRecord(migratedRecord);
    return;
  }

  writeContentRecord({
    content: clone(DEFAULT_CONTENT),
    updatedAt: utcNow(),
  });
}

function loadContentRecord() {
  ensureContentFile();
  return parseContentRecord(fs.readFileSync(CONTENT_FILE_PATH, "utf8"));
}

function saveContentRecord(content) {
  const record = {
    content: normalizeContent(content),
    updatedAt: utcNow(),
  };
  writeContentRecord(record);
  return record;
}

function writeContentRecord(record) {
  const normalizedRecord = {
    content: normalizeContent(record.content),
    updatedAt: typeof record.updatedAt === "string" && record.updatedAt ? record.updatedAt : utcNow(),
  };
  const tempPath = `${CONTENT_FILE_PATH}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(normalizedRecord, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, CONTENT_FILE_PATH);
}

function parseContentRecord(rawText) {
  let payload;
  try {
    payload = JSON.parse(rawText);
  } catch (_error) {
    throw createError(500, "Unable to parse content file.");
  }

  if (payload && isPlainObject(payload.content)) {
    return {
      content: normalizeContent(payload.content),
      updatedAt: typeof payload.updatedAt === "string" && payload.updatedAt ? payload.updatedAt : utcNow(),
    };
  }

  if (isPlainObject(payload)) {
    return {
      content: normalizeContent(payload),
      updatedAt: utcNow(),
    };
  }

  throw createError(500, "Content file must contain a JSON object.");
}

function loadLegacySqliteRecord() {
  if (!DatabaseSync || !fs.existsSync(LEGACY_DB_PATH)) {
    return null;
  }

  let legacyDb;
  try {
    legacyDb = new DatabaseSync(LEGACY_DB_PATH);
    const row = legacyDb.prepare("SELECT data, updated_at FROM site_content WHERE id = 1").get();
    if (!row) {
      return null;
    }
    return {
      content: normalizeContent(JSON.parse(row.data)),
      updatedAt: typeof row.updated_at === "string" && row.updated_at ? row.updated_at : utcNow(),
    };
  } catch (_error) {
    return null;
  } finally {
    if (legacyDb && typeof legacyDb.close === "function") {
      legacyDb.close();
    }
  }
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      throw createError(413, "Payload too large.");
    }
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (_error) {
    throw createError(400, "Invalid JSON payload.");
  }
}

function serveStaticFile(requestPath, res, headOnly) {
  let normalizedPath = requestPath;
  if (normalizedPath === "/") {
    normalizedPath = "/index.html";
  }
  if (normalizedPath === "/admin") {
    normalizedPath = "/admin.html";
  }

  if (normalizedPath.startsWith("/data/")) {
    throw createError(404, "Not found.");
  }

  const absolutePath = path.resolve(ROOT, `.${normalizedPath}`);
  if (!absolutePath.startsWith(ROOT)) {
    throw createError(404, "Not found.");
  }
  if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
    throw createError(404, "Not found.");
  }

  const extension = path.extname(absolutePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";

  if (path.basename(absolutePath) === "admin.html") {
    const html = fs.readFileSync(absolutePath, "utf8");
    const injected = html.replace(
      "__INITIAL_ADMIN_CONTENT__",
      serializeForInlineJson(loadContentRecord())
    );
    const body = Buffer.from(injected, "utf8");
    res.writeHead(200, {
      "Content-Length": body.length,
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    if (!headOnly) {
      res.end(body);
      return;
    }
    res.end();
    return;
  }

  const body = fs.readFileSync(absolutePath);
  res.writeHead(200, {
    "Content-Length": body.length,
    "Content-Type": contentType,
  });
  if (!headOnly) {
    res.end(body);
    return;
  }
  res.end();
}

function writeJson(res, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  res.writeHead(statusCode, {
    "Content-Length": body.length,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function normalizeContent(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createError(400, "Content payload must be a JSON object.");
  }

  const content = deepMerge(DEFAULT_CONTENT, payload);
  if (!Array.isArray(content.collections) || !content.collections.length) {
    content.collections = clone(DEFAULT_CONTENT.collections);
    return content;
  }

  const normalizedCollections = content.collections
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      title: stringOrFallback(item.title, "Collection"),
      badge: stringOrFallback(item.badge, "Featured"),
      description: stringOrFallback(item.description, "Collection details."),
      price: stringOrFallback(item.price, "0"),
      image: stringOrFallback(
        item.image,
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80"
      ),
      featured: item.featured !== false,
    }));

  content.collections = normalizedCollections.length
    ? normalizedCollections
    : clone(DEFAULT_CONTENT.collections);
  return content;
}

function deepMerge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return clone(override);
  }

  const merged = clone(base);
  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(merged[key]) && isPlainObject(value)) {
      merged[key] = deepMerge(merged[key], value);
    } else {
      merged[key] = clone(value);
    }
  }
  return merged;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOrFallback(value, fallback) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function clone(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

function serializeForInlineJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function utcNow() {
  return new Date().toISOString();
}

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.expose = true;
  return error;
}
