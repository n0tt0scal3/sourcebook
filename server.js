// Sourcebook server: serves the app and provides its data store, file storage
// and Claude access. No dependencies beyond Node itself (Node 20+).
"use strict";
const http = require("http");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, "data"));
const BLOB_DIR = path.join(DATA_DIR, "blobs");
const DB_FILE = path.join(DATA_DIR, "db.json");
// Works whether files were uploaded in their folders (public/, seed/, seed/blobs/)
// or flattened into the top level, which GitHub's web uploader sometimes does.
const exists = f => { try { return fs.existsSync(f); } catch (_) { return false; } };
const PUBLIC_DIR = exists(path.join(__dirname, "public", "dashboard.html")) ? path.join(__dirname, "public") : __dirname;
const FLAT_PUBLIC = PUBLIC_DIR === __dirname;
const PUBLIC_FILES = new Set(["index.html", "dashboard.html", "claude-shim.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"]);
const SEED_DIR = exists(path.join(__dirname, "seed", "db.json")) ? path.join(__dirname, "seed") : exists(path.join(__dirname, "db.json")) ? __dirname : path.join(__dirname, "seed");
// Tolerate stray spaces or quote marks pasted into the Render setting.
const APP_PASSWORD = String(process.env.APP_PASSWORD || "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const MODELS = {
  default: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
  complex: process.env.ANTHROPIC_MODEL_COMPLEX || process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
  quick: process.env.ANTHROPIC_MODEL_QUICK || "claude-haiku-4-5-20251001",
};
const MAX_UPLOAD = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "application/pdf",
  "video/mp4", "video/webm", "text/csv", "text/plain", "text/markdown", "application/json"]);

fs.mkdirSync(BLOB_DIR, { recursive: true });

// Recognise a stored file's type from its first bytes (used when no metadata file exists).
function sniffType(file) {
  try {
    const fd = fs.openSync(file, "r"); const b = Buffer.alloc(12); fs.readSync(fd, b, 0, 12, 0); fs.closeSync(fd);
    if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
    if (b.slice(0, 4).toString("hex") === "89504e47") return "image/png";
    if (b.slice(0, 4).toString() === "%PDF") return "application/pdf";
    if (b.slice(0, 4).toString() === "GIF8") return "image/gif";
    if (b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP") return "image/webp";
  } catch (_) {}
  return "application/octet-stream";
}

/* ---------------- document store ---------------- */
let store = {}; // "collection/docId" -> { data, version, updatedAt }
try { store = JSON.parse(fs.readFileSync(DB_FILE, "utf8")); } catch (_) { store = {}; }

// First boot: import the exported book if the store is empty.
if (!Object.keys(store).length && fs.existsSync(path.join(SEED_DIR, "db.json"))) {
  store = JSON.parse(fs.readFileSync(path.join(SEED_DIR, "db.json"), "utf8"));
  // Uploaded files may sit in seed/blobs/, in seed/, or at the top level; their names are 32-character ids.
  const isBlobName = f => /^[0-9a-f]{32}(\.json)?$/.test(f);
  let copied = 0;
  for (const dir of [path.join(SEED_DIR, "blobs"), SEED_DIR, __dirname]) {
    if (!exists(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!isBlobName(f)) continue;
      const dest = path.join(BLOB_DIR, f);
      if (!exists(dest)) { fs.copyFileSync(path.join(dir, f), dest); copied++; }
    }
  }
  console.log(`Copied ${copied} uploaded files from the seed`);
  fs.writeFileSync(DB_FILE, JSON.stringify(store));
  console.log(`Imported ${Object.keys(store).length} documents from seed/`);
}

let saveTimer = null, saving = Promise.resolve();
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saving = saving.then(async () => {
      const tmp = DB_FILE + ".tmp";
      await fsp.writeFile(tmp, JSON.stringify(store));
      await fsp.rename(tmp, DB_FILE);
    }).catch(e => console.error("Save failed", e));
  }, 150);
}
const SEG = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;
function validPath(p, even) {
  if (typeof p !== "string") return false;
  const s = p.split("/");
  if (s.some(x => !SEG.test(x) || x === "." || x === "..")) return false;
  return even ? s.length % 2 === 0 : s.length % 2 === 1;
}
function mergeDeep(target, patch) {
  const out = { ...target };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v) && v.__delete__ === true) { delete out[k]; continue; }
    if (v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) out[k] = mergeDeep(out[k], v);
    else out[k] = v;
  }
  return out;
}
function stripUndefined(o) { return JSON.parse(JSON.stringify(o)); }

/* ---------------- projects ---------------- */
const STAGES = ["Concept", "Specified", "Approved", "Ordered", "Delivered"];
function projectSummaries() {
  const ids = Object.keys(store).filter(k => /^projects\/[^/]+$/.test(k)).map(k => k.split("/")[1]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return ids.map(id => {
    const pre = `projects/${id}/`;
    const reg = store[`projects/${id}`];
    const col = c => Object.entries(store).filter(([k]) => k.startsWith(pre + c + "/") && k.split("/").length === 4).map(([k, v]) => ({ id: k.split("/")[3], ...v.data, _u: v.updatedAt }));
    const main = store[pre + "project/main"]?.data || {};
    const items = col("items"), images = col("images"), drawings = col("drawings"), decisions = col("decisions");
    const fx = Number(main.fxRate) > 0 ? Number(main.fxRate) : 4.73;
    const unitCAD = it => it.priceBase === "CNY" && it.unitCostCNY != null && it.unitCostCNY !== "" ? Number(it.unitCostCNY) / fx : it.unitCost == null || it.unitCost === "" ? null : Number(it.unitCost);
    const sub = items.reduce((s, it) => s + (Number(it.qty) || 0) * (unitCAD(it) || 0), 0);
    const fee = sub * (Number(main.quoteFee) || 0) / 100, freight = Number(main.quoteFreight) || 0;
    const total = (sub + fee + freight) * (1 + (Number(main.quoteTax) || 0) / 100);
    const stages = Object.fromEntries(STAGES.map(st => [st, items.filter(i => i.status === st).length]));
    let overdue = 0, dueSoon = 0;
    items.forEach(it => {
      if (STAGES.indexOf(it.status) >= 3 || !it.needBy) return;
      const [y, m, d] = String(it.needBy).split("-").map(Number); if (!y) return;
      const ob = new Date(y, m - 1, d - (Number(it.leadWeeks) || 0) * 7);
      const days = Math.round((ob - today) / 864e5);
      if (days < 0) overdue++; else if (days <= 21) dueSoon++;
    });
    const gal = images.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const cover = gal[0]?.asset || items.find(i => i.photo)?.photo || null;
    const thumbs = items.filter(i => i.photo).slice(0, 4).map(i => i.photo);
    const updated = [reg?.updatedAt, ...Object.entries(store).filter(([k]) => k.startsWith(pre)).map(([, v]) => v.updatedAt)].filter(Boolean).sort().pop();
    return { id, name: main.name || "Untitled project", client: main.client || "", location: main.location || "", phase: main.phase || "",
      created: reg?.data?.created, archived: !!reg?.data?.archived, updated, cover, thumbs,
      counts: { items: items.length, images: images.length, drawings: drawings.length, decisions: decisions.length, priced: items.filter(i => unitCAD(i) != null).length },
      stages, overdue, dueSoon, quote: { cad: total, cny: total * fx, fx } };
  }).sort((a, b) => String(b.updated || "").localeCompare(String(a.updated || "")));
}

/* ---------------- live updates (server-sent events) ---------------- */
const clients = new Set();
function broadcast(msg) {
  const line = `data: ${JSON.stringify(msg)}\n\n`;
  for (const res of clients) { try { res.write(line); } catch (_) {} }
}
setInterval(() => { for (const res of clients) { try { res.write(": ping\n\n"); } catch (_) {} } }, 25000);

/* ---------------- helpers ---------------- */
function send(res, code, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  const payload = isBuf ? body : typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(code, { "Content-Type": isBuf || typeof body === "string" ? headers["Content-Type"] || "text/plain; charset=utf-8" : "application/json", ...headers });
  res.end(payload);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on("data", c => { size += c.length; if (size > limit) { reject(Object.assign(new Error("too_large"), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
async function readJSON(req, limit = 2 * 1024 * 1024) {
  const b = await readBody(req, limit);
  try { return JSON.parse(b.toString("utf8") || "{}"); } catch (_) { throw Object.assign(new Error("bad_json"), { status: 400 }); }
}
function samePass(given) {
  const a = Buffer.from(String(given || "").trim()), b = Buffer.from(APP_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
// Signed-in browsers carry a cookie derived from the password; changing the password signs everyone out.
const SESSION = crypto.createHmac("sha256", APP_PASSWORD || "open").update("sourcebook-session-v1").digest("hex");
function cookies(req) { return Object.fromEntries(String(req.headers.cookie || "").split(/;\s*/).filter(Boolean).map(c => { const i = c.indexOf("="); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; })); }
function authorized(req) {
  if (!APP_PASSWORD) return true;
  if (cookies(req).sb_session === SESSION) return true;
  const h = req.headers.authorization || "";
  if (h.startsWith("Basic ")) { const s = Buffer.from(h.slice(6), "base64").toString("utf8"); return samePass(s.includes(":") ? s.slice(s.indexOf(":") + 1) : s); }
  return false;
}
function loginPage(error) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes"><link rel="apple-touch-icon" href="/icon-192.png"><link rel="manifest" href="/manifest.webmanifest"><title>Sign in · Sourcebook</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz@1,6..96&family=Hanken+Grotesk:wght@400;500&family=IBM+Plex+Mono&display=swap">
<style>:root{--g:#EEEDEA;--p:#F7F6F4;--i:#1A1918;--m:#8A8580;--r:#D6D3CE;--c:#A3322B}@media(prefers-color-scheme:dark){:root{--g:#141413;--p:#1C1B1A;--i:#ECEAE6;--m:#86817B;--r:#34322F;--c:#E07A72}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--g);color:var(--i);font:15px/1.5 "Hanken Grotesk",system-ui,sans-serif;padding:24px}
main{width:min(380px,100%)}.e{font:11px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--m)}
h1{font:italic 400 56px/1 "Bodoni Moda",Georgia,serif;margin:8px 0 28px}label{display:block;font-size:12px;color:var(--m)}
input{width:100%;font:inherit;font-size:17px;color:var(--i);background:transparent;border:0;border-bottom:1px solid var(--r);padding:10px 2px;margin-top:4px}input:focus{outline:none;border-color:var(--i)}
button{margin-top:22px;width:100%;padding:12px;font:inherit;background:var(--i);color:var(--g);border:1px solid var(--i);cursor:pointer}.err{color:var(--c);font-size:13px;margin-top:12px}</style></head>
<body><main><div class="e">Sourcebook · Studio</div><h1>Sign in</h1>
<form method="post" action="/login"><label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
${error ? '<p class="err">That password isn\'t right. Check it under Environment → APP_PASSWORD in Render.</p>' : ""}<button>Open Sourcebook</button></form></main></body></html>`;
}
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

/* ---------------- Claude ---------------- */
async function askClaude({ input, images = [], modelTier = "default" }) {
  if (!ANTHROPIC_API_KEY) throw Object.assign(new Error("Claude isn't set up on this server. Add ANTHROPIC_API_KEY in Render."), { status: 503, code: "sampling_disabled" });
  const turns = typeof input === "string" ? [{ role: "user", content: input }] : input;
  if (!Array.isArray(turns) || !turns.length) throw Object.assign(new Error("empty input"), { status: 400, code: "invalid_request" });
  const messages = turns.map((t, i) => {
    const last = i === turns.length - 1;
    if (last && images.length) {
      return { role: "user", content: [...images.slice(0, 8).map(im => ({ type: "image", source: { type: "base64", media_type: im.media_type, data: im.data } })), { type: "text", text: String(t.content) }] };
    }
    return { role: t.role === "assistant" ? "assistant" : "user", content: String(t.content) };
  });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODELS[modelTier] || MODELS.default, max_tokens: 8000, messages }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const code = r.status === 429 ? "rate_limited" : r.status === 400 ? "invalid_request" : r.status === 401 || r.status === 403 ? "sampling_disabled" : "upstream_error";
    throw Object.assign(new Error(j?.error?.message || `Claude API error ${r.status}`), { status: r.status === 429 ? 429 : 502, code });
  }
  const text = (j.content || []).filter(c => c.type === "text").map(c => c.text).join("");
  if (!text.trim()) throw Object.assign(new Error("empty"), { status: 502, code: "empty_completion" });
  return { text, truncated: j.stop_reason === "max_tokens", modelTierApplied: modelTier };
}

/* ---------------- server ---------------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  try {
    if (p === "/healthz") return send(res, 200, "ok");
    // Files the sign-in page and home-screen icon need before signing in
    if (/^\/(icon-(192|512)\.png|manifest\.webmanifest)$/.test(p) && req.method === "GET") {
      try { return send(res, 200, await fsp.readFile(path.join(PUBLIC_DIR, p)), { "Content-Type": MIME[path.extname(p)], "Cache-Control": "public, max-age=86400" }); } catch (_) { return send(res, 404, "Not found"); }
    }
    if (p === "/login" && req.method === "POST") {
      const body = new URLSearchParams((await readBody(req, 10000)).toString("utf8"));
      if (!APP_PASSWORD || samePass(body.get("password"))) {
        res.writeHead(303, { Location: "/", "Set-Cookie": `sb_session=${SESSION}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${req.headers["x-forwarded-proto"] === "https" ? "; Secure" : ""}` });
        return res.end();
      }
      return send(res, 401, loginPage(true), { "Content-Type": "text/html; charset=utf-8" });
    }
    if (p === "/login") return send(res, 200, loginPage(false), { "Content-Type": "text/html; charset=utf-8" });
    if (p === "/logout") { res.writeHead(303, { Location: "/login", "Set-Cookie": "sb_session=; Path=/; Max-Age=0" }); return res.end(); }
    if (!authorized(req)) {
      if (req.method === "GET" && !p.startsWith("/api/") && !p.startsWith("/_blob/")) { res.writeHead(303, { Location: "/login" }); return res.end(); }
      return send(res, 401, { code: "not_signed_in", message: "Sign in again." });
    }

    // live updates
    if (p === "/api/events") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
      res.write("retry: 3000\n\n");
      clients.add(res); req.on("close", () => clients.delete(res));
      return;
    }

    // full backup of the document store (files stay on the disk)
    if (p === "/api/export" && req.method === "GET") {
      return send(res, 200, JSON.stringify(store, null, 1), { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="sourcebook-backup-${new Date().toISOString().slice(0, 10)}.json"` });
    }

    // projects
    if (p === "/api/projects" && req.method === "GET") return send(res, 200, { projects: projectSummaries() });
    if (p === "/api/projects/delete" && req.method === "POST") {
      const { id } = await readJSON(req);
      if (!validPath("projects/" + id, true)) return send(res, 400, { code: "invalid_argument" });
      const pre = `projects/${id}/`; let n = 0;
      for (const k of Object.keys(store)) if (k === `projects/${id}` || k.startsWith(pre)) { delete store[k]; n++; }
      persist(); broadcast({ path: `projects/${id}`, exists: false });
      return send(res, 200, { ok: true, removed: n });
    }

    // documents
    if (p === "/api/db/doc" && req.method === "GET") {
      const dp = url.searchParams.get("path");
      if (!validPath(dp, true)) return send(res, 400, { code: "invalid_argument" });
      const d = store[dp];
      return send(res, 200, d ? { exists: true, data: d.data, version: d.version } : { exists: false });
    }
    if (p === "/api/db/col" && req.method === "GET") {
      const cp = url.searchParams.get("path");
      if (!validPath(cp, false)) return send(res, 400, { code: "invalid_argument" });
      const depth = cp.split("/").length + 1, pre = cp + "/";
      const docs = Object.entries(store).filter(([k]) => k.startsWith(pre) && k.split("/").length === depth).map(([k, v]) => ({ id: k.slice(pre.length), data: v.data, version: v.version }));
      return send(res, 200, { docs });
    }
    if (p.startsWith("/api/db/") && req.method === "POST") {
      const op = p.slice(8);
      const { path: dp, data } = await readJSON(req);
      if (!validPath(dp, true)) return send(res, 400, { code: "invalid_argument", message: "bad path" });
      const cur = store[dp];
      if (op === "set" || op === "update") {
        if (!data || typeof data !== "object" || Array.isArray(data)) return send(res, 400, { code: "invalid_argument" });
        if (op === "update" && !cur) return send(res, 400, { code: "invalid_argument", message: "document does not exist" });
        const next = stripUndefined(op === "set" ? data : mergeDeep(cur.data, data));
        if (Buffer.byteLength(JSON.stringify(next)) > 256 * 1024) return send(res, 400, { code: "invalid_argument", message: "document too large" });
        store[dp] = { data: next, version: (cur?.version || 0) + 1, updatedAt: new Date().toISOString() };
        persist(); broadcast({ path: dp, exists: true, data: next });
        return send(res, 200, { ok: true, version: store[dp].version });
      }
      if (op === "delete") {
        if (cur) { delete store[dp]; persist(); broadcast({ path: dp, exists: false }); }
        return send(res, 200, { ok: true });
      }
      return send(res, 404, { code: "not_found" });
    }

    // files
    if (p === "/api/assets" && req.method === "POST") {
      const type = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
      if (!ALLOWED_TYPES.has(type)) return send(res, 415, { code: "unsupported_type", message: "Use a PDF, JPG, PNG or WebP file." });
      const body = await readBody(req, MAX_UPLOAD);
      if (!body.length) return send(res, 400, { code: "invalid_request" });
      const id = crypto.randomBytes(16).toString("hex");
      await fsp.writeFile(path.join(BLOB_DIR, id), body);
      await fsp.writeFile(path.join(BLOB_DIR, id + ".json"), JSON.stringify({ contentType: type, sizeBytes: body.length, createdAt: new Date().toISOString() }));
      return send(res, 200, { id, url: "/_blob/" + id, sizeBytes: body.length, contentType: type });
    }
    const bm = p.match(/^\/_blob\/([0-9a-f]{32})$/);
    if (bm && req.method === "GET") {
      const file = path.join(BLOB_DIR, bm[1]);
      let meta = {};
      try { meta = JSON.parse(await fsp.readFile(file + ".json", "utf8")); } catch (_) { meta = { contentType: sniffType(file) }; }
      try {
        const st = await fsp.stat(file);
        res.writeHead(200, { "Content-Type": meta.contentType || "application/octet-stream", "Content-Length": st.size, "Cache-Control": "private, max-age=31536000, immutable" });
        fs.createReadStream(file).pipe(res);
      } catch (_) { send(res, 404, "Not found"); }
      return;
    }

    // Claude
    if (p === "/api/sample" && req.method === "POST") {
      const body = await readJSON(req, 40 * 1024 * 1024);
      const out = await askClaude(body);
      return send(res, 200, out);
    }

    // static app
    if (req.method === "GET") {
      if (/^\/p\/[A-Za-z0-9_\-.~:@+]{1,200}\/?$/.test(p)) {
        const data = await fsp.readFile(path.join(PUBLIC_DIR, "index.html"));
        return send(res, 200, data, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      }
      let f = p === "/" ? "/dashboard.html" : p;
      if (FLAT_PUBLIC && !PUBLIC_FILES.has(f.slice(1))) return send(res, 404, "Not found");
      const full = path.join(PUBLIC_DIR, path.normalize(f).replace(/^(\.\.[\/\\])+/, ""));
      if (!full.startsWith(PUBLIC_DIR)) return send(res, 403, "Forbidden");
      try {
        const data = await fsp.readFile(full);
        return send(res, 200, data, { "Content-Type": MIME[path.extname(full)] || "application/octet-stream", "Cache-Control": full.endsWith(".html") ? "no-cache" : "public, max-age=3600" });
      } catch (_) { return send(res, 404, "Not found"); }
    }
    send(res, 404, "Not found");
  } catch (e) {
    console.error(e.message);
    if (!res.headersSent) send(res, e.status || 500, { code: e.code || (e.status === 413 ? "too_large" : "upstream_error"), message: e.message });
  }
});
if (!exists(path.join(PUBLIC_DIR, "dashboard.html")) || !exists(path.join(PUBLIC_DIR, "index.html"))) console.error("MISSING APP FILES: dashboard.html and index.html must be in the repository (in public/ or at the top level).");
server.listen(PORT, () => console.log(`Sourcebook running on port ${PORT} · data in ${DATA_DIR}${APP_PASSWORD ? " · password on" : " · NO PASSWORD SET"}${ANTHROPIC_API_KEY ? "" : " · Claude off (no ANTHROPIC_API_KEY)"}`));
process.on("SIGTERM", async () => { clearTimeout(saveTimer); try { fs.writeFileSync(DB_FILE, JSON.stringify(store)); } catch (_) {} process.exit(0); });
