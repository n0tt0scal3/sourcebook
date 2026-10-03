// Sourcebook server: serves the app and provides its data store, file storage
// and Claude access. No dependencies beyond Node itself (Node 20+).
"use strict";
const http = require("http");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const dns = require("dns").promises;
const net = require("net");

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, "data"));
const BLOB_DIR = path.join(DATA_DIR, "blobs");
const DB_FILE = path.join(DATA_DIR, "db.json");
// Works whether files were uploaded in their folders (public/, seed/, seed/blobs/)
// or flattened into the top level, which GitHub's web uploader sometimes does.
const exists = f => { try { return fs.existsSync(f); } catch (_) { return false; } };
const PUBLIC_DIR = exists(path.join(__dirname, "public", "dashboard.html")) ? path.join(__dirname, "public") : __dirname;
const FLAT_PUBLIC = PUBLIC_DIR === __dirname;
const PUBLIC_FILES = new Set(["index.html", "dashboard.html", "admin.html", "claude-shim.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"]);
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
const MAX_MODEL = 100 * 1024 * 1024; // 3D models (GLB, USDZ)
const MODEL_TYPES = new Set(["model/gltf-binary", "model/vnd.usdz+zip"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "application/pdf",
  "video/mp4", "video/webm", "text/csv", "text/plain", "text/markdown", "application/json", "model/gltf-binary", "model/vnd.usdz+zip"]);

fs.mkdirSync(BLOB_DIR, { recursive: true });

// Recognise a stored file's type from its first bytes (used when no metadata file exists).
function sniffType(file) {
  try {
    const fd = fs.openSync(file, "r"); const b = Buffer.alloc(12); fs.readSync(fd, b, 0, 12, 0); fs.closeSync(fd);
    if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
    if (b.slice(0, 4).toString("hex") === "89504e47") return "image/png";
    if (b.slice(0, 4).toString() === "%PDF") return "application/pdf";
    if (b.slice(0, 4).toString() === "GIF8") return "image/gif";
    if (b.slice(0, 4).toString() === "glTF") return "model/gltf-binary";
    if (b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP") return "image/webp";
  } catch (_) {}
  return "application/octet-stream";
}

function sniffBuf(b) {
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b.slice(0, 4).toString("hex") === "89504e47") return "image/png";
  if (b.slice(0, 4).toString() === "GIF8") return "image/gif";
  if (b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP") return "image/webp";
  return null;
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
function liveUser(c) { return c.user.id === "owner" ? OWNER : people.users.find(x => x.id === c.user.id && !x.disabled) || null; }
function broadcast(msg) {
  const line = `data: ${JSON.stringify(msg)}\n\n`;
  for (const c of clients) {
    const u = liveUser(c); if (!u) continue;
    try {
      if (allAccess(u)) c.res.write(line);
      else if (canRead(u, msg.path)) c.res.write(`data: ${JSON.stringify(msg.exists ? { ...msg, data: forUser(u, msg.path, msg.data) } : msg)}\n\n`);
    } catch (_) {}
  }
}
setInterval(() => { for (const c of clients) { try { c.res.write(": ping\n\n"); } catch (_) {} } }, 25000);

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

/* ---------------- people and roles ---------------- */
// admin: everything · agent: everything except managing people and deleting projects
// client: only assigned projects, read-only apart from approvals and comments
const ROLES = ["admin", "agent", "client"];
const USERS_FILE = path.join(DATA_DIR, "users.json");
let people = { secret: "", users: [] };
try { people = JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); } catch (_) {}
if (!people.secret) { people.secret = crypto.randomBytes(32).toString("hex"); people.users = people.users || []; savePeople(); }
function savePeople() { const tmp = USERS_FILE + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(people, null, 1)); fs.renameSync(tmp, USERS_FILE); }
function hashPass(pw, salt) { return crypto.scryptSync(String(pw), salt, 32).toString("hex"); }
function checkPass(u, pw) { if (!u.hash || !u.salt) return false; const a = Buffer.from(hashPass(pw, u.salt), "hex"), b = Buffer.from(u.hash, "hex"); return a.length === b.length && crypto.timingSafeEqual(a, b); }
// The studio password (APP_PASSWORD) always signs in as the owner, an admin. It's the way back in if a login is lost.
const OWNER_VER = crypto.createHash("sha256").update("owner:" + APP_PASSWORD).digest("hex").slice(0, 12);
const OWNER = { id: "owner", name: "Studio owner", email: "", role: "admin", projects: [] };
const sign = v => crypto.createHmac("sha256", people.secret).update(v).digest("hex");
function tokenFor(u) { const ver = u.id === "owner" ? OWNER_VER : String(u.ver || 0); const v = `${u.id}.${ver}`; return `${v}.${sign(v)}`; }
const allAccess = u => u.role === "admin" || (u.role === "agent" && u.allProjects !== false);
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, projects: u.projects || [], allProjects: allAccess(u) });
const adminView = u => ({ ...publicUser(u), disabled: !!u.disabled, created: u.created, lastSeen: u.lastSeen || null, lastLogin: u.lastLogin || null });
let peopleTimer = null;
function touch(u) { // remember when someone was last active (written at most every few minutes)
  const now = Date.now(); if (u.id === "owner" || (u.lastSeen && now - Date.parse(u.lastSeen) < 5 * 60e3)) return;
  u.lastSeen = new Date(now).toISOString(); clearTimeout(peopleTimer); peopleTimer = setTimeout(savePeople, 2000);
}
function cookies(req) { return Object.fromEntries(String(req.headers.cookie || "").split(/;\s*/).filter(Boolean).map(c => { const i = c.indexOf("="); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; })); }
function currentUser(req) {
  if (!APP_PASSWORD && !people.users.length) return OWNER; // nothing set up: open (local testing)
  const tok = cookies(req).sb_session || "";
  const m = tok.match(/^([A-Za-z0-9_-]{1,64})\.([0-9a-f]{1,64})\.([0-9a-f]{64})$/);
  if (m) {
    const v = `${m[1]}.${m[2]}`, good = Buffer.from(sign(v)), given = Buffer.from(m[3]);
    if (good.length === given.length && crypto.timingSafeEqual(good, given)) {
      if (m[1] === "owner") { if (APP_PASSWORD && m[2] === OWNER_VER) return OWNER; }
      else { const u = people.users.find(x => x.id === m[1]); if (u && !u.disabled && String(u.ver || 0) === m[2]) { touch(u); return u; } }
    }
  }
  const h = req.headers.authorization || "";
  if (APP_PASSWORD && h.startsWith("Basic ")) { const s = Buffer.from(h.slice(6), "base64").toString("utf8"); if (samePass(s.includes(":") ? s.slice(s.indexOf(":") + 1) : s)) return OWNER; }
  return null;
}
const projectOf = p => { const m = /^projects\/([^/]+)/.exec(p || ""); return m ? m[1] : null; };
function canSeeProject(u, id) { return allAccess(u) || (u.projects || []).includes(id); }
function canRead(u, p) { if (allAccess(u)) return true; const id = projectOf(p); return !!id && canSeeProject(u, id); }
// Internal fields a client never receives.
const CLIENT_HIDDEN = ["notes", "match", "pendingSetup"];
function forUser(u, p, data) {
  if (u.role !== "client" || !data || !/^projects\/[^/]+\/items\/[^/]+$/.test(p)) return data;
  const o = { ...data }; CLIENT_HIDDEN.forEach(k => delete o[k]); return o;
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
.note{font-size:12px;color:var(--m);margin-top:18px}button{margin-top:22px;width:100%;padding:12px;font:inherit;background:var(--i);color:var(--g);border:1px solid var(--i);cursor:pointer}.err{color:var(--c);font-size:13px;margin-top:12px}</style></head>
<body><main><div class="e">Sourcebook · Studio</div><h1>Sign in</h1>
<form method="post" action="/login"><label for="em">Email</label><input id="em" name="email" type="email" autocomplete="username" autocapitalize="off" autofocus>
<label for="pw" style="margin-top:18px">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required>
${error ? '<p class="err">That email and password don\'t match. Studio owner: leave email blank and use the studio password.</p>' : ""}<button>Open Sourcebook</button>
<p class="note">Studio owner: leave email blank and use the studio password.</p></form></main></body></html>`;
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

/* ---------------- find products online ---------------- */
// Claude searches the web for the product in a photo (web search tool), then reads the
// chosen product page (web fetch tool). Jobs run on the server and write into the item,
// so they finish even if the page that started them is closed.
const API_URL = process.env.ANTHROPIC_API_URL || "https://api.anthropic.com/v1/messages";
async function claudeTurns({ messages, tools, max_tokens = 6000, model }) {
  if (!ANTHROPIC_API_KEY) throw Object.assign(new Error("Claude isn't set up on this server. Add ANTHROPIC_API_KEY in Render."), { code: "sampling_disabled" });
  const convo = messages.slice();
  for (let i = 0; i < 6; i++) {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: model || MODELS.default, max_tokens, messages: convo, tools }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = j?.error?.message || `Claude API error ${r.status}`;
      const code = /usage limits|spend limit|credit balance/i.test(msg) || j?.error?.error_code === "enforced_spend_limit_reached" ? "limit" : /web search|web_search|web fetch/i.test(msg) ? "web_disabled" : r.status === 429 ? "rate_limited" : "upstream_error";
      throw Object.assign(new Error(msg), { code });
    }
    if (j.stop_reason === "pause_turn") { convo.push({ role: "assistant", content: j.content }); continue; }
    const text = (j.content || []).filter(c => c.type === "text").map(c => c.text).join("");
    const searched = (j.content || []).filter(c => c.type === "web_search_tool_result" && Array.isArray(c.content)).flatMap(c => c.content.map(x => x.url)).filter(Boolean);
    return { text, searched, stop: j.stop_reason };
  }
  throw Object.assign(new Error("Claude took too long."), { code: "upstream_error" });
}
function parseJSON(text) {
  const tries = [text.trim()];
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) tries.push(m[1].trim());
  const a = text.indexOf("{"), b = text.lastIndexOf("}"); if (a >= 0 && b > a) tries.push(text.slice(a, b + 1));
  for (const t of tries) { try { return JSON.parse(t); } catch (_) {} }
  return null;
}
// Fetch a public web page or image, refusing private addresses.
function privateIP(ip) {
  if (net.isIPv4(ip)) { const [a, b] = ip.split(".").map(Number); return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224; }
  const x = ip.toLowerCase(); return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80") || x.startsWith("::ffff:") && privateIP(x.slice(7));
}
async function safeFetch(url, { maxBytes = 2e6, timeout = 12000, accept = "*/*" } = {}) {
  let u = new URL(url);
  for (let hop = 0; hop < 5; hop++) {
    if (!/^https?:$/.test(u.protocol) || u.username || u.password) throw new Error("bad url");
    const addrs = net.isIP(u.hostname) ? [{ address: u.hostname }] : await dns.lookup(u.hostname, { all: true });
    if (!addrs.length || addrs.some(a => privateIP(a.address))) throw new Error("blocked host");
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), timeout);
    let r;
    try { r = await fetch(u, { redirect: "manual", signal: ctl.signal, headers: { accept, "user-agent": "Mozilla/5.0 (compatible; Sourcebook/1.0; product lookup)", "accept-language": "en-CA,en;q=0.9" } }); }
    finally { clearTimeout(tm); }
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { u = new URL(r.headers.get("location"), u); continue; }
    if (!r.ok) throw new Error("status " + r.status);
    const chunks = []; let size = 0;
    for await (const c of r.body) { size += c.length; if (size > maxBytes) throw new Error("too large"); chunks.push(c); }
    return { url: u.href, type: String(r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase(), body: Buffer.concat(chunks) };
  }
  throw new Error("too many redirects");
}
async function pageImage(url) {
  try {
    const { body, type, url: final } = await safeFetch(url, { maxBytes: 1.5e6, timeout: 9000, accept: "text/html" });
    if (!/html/.test(type)) return null;
    const html = body.toString("utf8");
    const pick = re => { const m = html.match(re); return m ? m[1] : null; };
    const raw = pick(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) || pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
      || pick(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) || pick(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
    if (!raw) return null;
    const abs = new URL(raw.replace(/&amp;/g, "&"), final).href;
    return /^https?:/.test(abs) ? abs : null;
  } catch (_) { return null; }
}
function patchItem(dp, patch) {
  const cur = store[dp]; if (!cur) return null;
  const next = stripUndefined({ ...cur.data, ...patch });
  store[dp] = { data: next, version: (cur.version || 0) + 1, updatedAt: new Date().toISOString() };
  persist(); broadcast({ path: dp, exists: true, data: next });
  return next;
}
const jobQueue = []; let jobsRunning = 0;
function enqueue(fn) { jobQueue.push(fn); pump(); }
function pump() { while (jobsRunning < 2 && jobQueue.length) { const fn = jobQueue.shift(); jobsRunning++; Promise.resolve().then(fn).catch(e => console.error("job", e.message)).finally(() => { jobsRunning--; pump(); }); } }
const LOC = { type: "approximate", city: "Toronto", region: "Ontario", country: "CA", timezone: "America/Toronto" };
const CATS = ["Stone", "Finishes", "Millwork", "Lighting", "Hardware", "Plumbing", "Textiles", "Furniture", "Tile", "Glazing"];
const matchError = e => e.code === "limit" ? "The Claude spending limit or credit for this account has been reached. Check Billing in the Anthropic Console."
  : e.code === "web_disabled" ? "Web search is turned off for this Anthropic account. Turn it on in the Anthropic Console under Settings → Capabilities (or ask whoever manages the account)."
  : e.code === "sampling_disabled" ? e.message : e.code === "rate_limited" ? "Claude is busy right now. Try again in a minute." : "The search didn't finish. Try again.";
async function runIdentify(dp, image, hint, lang) {
  const it = store[dp]?.data; if (!it) return;
  const known = [["Name", it.pendingSetup ? "" : it.name], ["Description", it.description], ["Category", it.category], ["Manufacturer", it.supplier], ["Product", it.product], ["Model", it.modelCode], ["Dimensions", it.dims], ["Finish", it.finishName]].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("; ");
  const prompt = `You are a sourcing agent for an interior design studio in Toronto. ${image ? "The photo shows a product (furniture, lighting, a fixture, a finish or a material)" : "Find this product"}${it.pendingSetup ? "" : ` filed as "${it.name}"`}.${known ? "\nWhat we already know: " + known + "." : ""}${hint ? "\nHint from the studio: " + hint : ""}
1. Identify the specific commercial product: designer, manufacturer, collection and model if you can. If the photo shows a room, focus on ${it.pendingSetup ? "the most prominent product" : `the ${it.name}`}.
2. Use web search to find the actual product: the manufacturer's page first, then reputable retailers or distributors (Canadian ones where possible, to see CAD prices). Search with distinctive features, likely brand and product names. Run several searches if needed.
3. Return up to 4 candidates ranked by how well they match the photo. Only include products you found a real page for, using the URL from the search results. Do not invent URLs, prices or model numbers.
Reply with only a JSON object:
{"identified": one sentence describing what is in the photo,
 "piece": {"name": short trade name a supplier would recognise, "category": one of ${JSON.stringify(CATS)}, "description": one sentence, "isFurniture": boolean},
 "candidates": [{"brand": string, "name": product name, "model": model or SKU|null, "designer": string|null, "url": page URL, "source": site name, "price": number|null, "currency": "CAD"|"USD"|"EUR"|"GBP"|"CNY"|null, "confidence": "high"|"medium"|"low", "why": one short line on why it matches or how it differs}]}
Use an empty candidates list if nothing credible turns up.${lang === "zh" ? "\nWrite identified, description and why in Simplified Chinese; keep brand, product and model names as published." : ""}`;
  const content = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: image.media_type, data: image.data } });
  content.push({ type: "text", text: prompt });
  try {
    const { text } = await claudeTurns({ messages: [{ role: "user", content }], tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6, user_location: LOC }], max_tokens: 4000 });
    const out = parseJSON(text) || {};
    let cands = (Array.isArray(out.candidates) ? out.candidates : []).filter(c => c && c.url && /^https?:\/\//.test(c.url) && c.name).slice(0, 4)
      .map(c => ({ brand: String(c.brand || "").slice(0, 120), name: String(c.name).slice(0, 200), model: c.model ? String(c.model).slice(0, 120) : null, designer: c.designer ? String(c.designer).slice(0, 120) : null,
        url: String(c.url), source: String(c.source || (() => { try { return new URL(c.url).hostname.replace(/^www\./, ""); } catch (_) { return ""; } })()).slice(0, 80),
        price: Number.isFinite(Number(c.price)) && c.price !== null && c.price !== "" ? Number(c.price) : null, currency: c.currency || null,
        confidence: ["high", "medium", "low"].includes(c.confidence) ? c.confidence : "low", why: String(c.why || "").slice(0, 300) }));
    const imgs = await Promise.all(cands.map(c => pageImage(c.url)));
    cands = cands.map((c, i) => ({ ...c, image: imgs[i] }));
    const piece = out.piece && typeof out.piece === "object" ? { name: String(out.piece.name || "").slice(0, 200), category: CATS.includes(out.piece.category) ? out.piece.category : null, description: String(out.piece.description || "").slice(0, 400), isFurniture: !!out.piece.isFurniture } : null;
    patchItem(dp, { match: { ...(store[dp]?.data?.match || {}), status: cands.length ? "found" : "none", identified: String(out.identified || "").slice(0, 400), piece, candidates: cands, finished: new Date().toISOString() } });
  } catch (e) {
    console.error("identify", e.message);
    patchItem(dp, { match: { ...(store[dp]?.data?.match || {}), status: "error", message: matchError(e), finished: new Date().toISOString() } });
  }
}
async function runDetails(dp, index, lang) {
  const it = store[dp]?.data; const m = it?.match; const c = m?.candidates?.[index]; if (!c) return;
  const prompt = `You are a sourcing agent for an interior design studio in Toronto. We've chosen this product:
${c.brand} ${c.name}${c.model ? " (" + c.model + ")" : ""}: ${c.url}
Read that page with web fetch. If it doesn't give dimensions, materials or a spec sheet, you may search once or twice for the manufacturer's spec sheet or product page.
Extract only what the sources state. Leave anything not stated as null. Do not guess.
Reply with only a JSON object:
{"fields": {"name": product name as a schedule line, "description": one or two sentences, "supplier": manufacturer or brand, "product": collection or product name, "modelCode": model / SKU|null, "materialCategory": e.g. "Upholstered seating", "Porcelain tile", "Pendant light"|null, "finishName": finish or colour name|null, "dims": dimensions with units, e.g. "W 2400 × D 1000 × H 700 mm"|null, "frameFinish": frame or base finish|null, "upholstery": fabric or leather|null, "leadWeeks": number|null},
 "price": {"amount": number|null, "currency": "CAD"|"USD"|"EUR"|"GBP"|"CNY"|null, "note": e.g. "from", "per m²", "list price"|null},
 "specs": [{"label": string, "value": string}] (up to 10 more lines: materials, weight, certifications, options, care, warranty, origin),
 "specSheetUrl": URL of a PDF spec sheet or technical page if found|null,
 "imageUrl": main product image URL if the page states it|null,
 "summary": one sentence}${lang === "zh" ? "\nWrite description, summary and spec values in Simplified Chinese where they are prose; keep names, codes and units as published." : ""}`;
  try {
    const { text } = await claudeTurns({ messages: [{ role: "user", content: prompt }], tools: [{ type: "web_fetch_20250910", name: "web_fetch", max_uses: 3, max_content_tokens: 30000 }, { type: "web_search_20250305", name: "web_search", max_uses: 2, user_location: LOC }], max_tokens: 4000 });
    const out = parseJSON(text);
    if (!out || !out.fields) throw Object.assign(new Error("no details"), { code: "empty" });
    const details = { fields: out.fields, price: out.price || null, specs: Array.isArray(out.specs) ? out.specs.filter(x => x && x.label && x.value).slice(0, 10).map(x => ({ label: String(x.label).slice(0, 80), value: String(x.value).slice(0, 300) })) : [],
      specSheetUrl: /^https?:\/\//.test(out.specSheetUrl || "") ? out.specSheetUrl : null, imageUrl: (/^https?:\/\//.test(out.imageUrl || "") ? out.imageUrl : null) || c.image || null, summary: String(out.summary || "").slice(0, 400), at: new Date().toISOString() };
    patchItem(dp, { match: { ...(store[dp]?.data?.match || {}), status: "ready", chosen: index, details } });
  } catch (e) {
    console.error("details", e.message);
    patchItem(dp, { match: { ...(store[dp]?.data?.match || {}), status: "found", chosen: index, message: e.code === "empty" ? "Couldn't read that product page. Try another match or open the page to check it." : matchError(e) } });
  }
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
      const email = String(body.get("email") || "").trim().toLowerCase(), pw = body.get("password") || "";
      let who = null;
      if (!email) { if (APP_PASSWORD && samePass(pw)) who = OWNER; }
      else { const u = people.users.find(x => x.email === email && !x.disabled); if (u && checkPass(u, pw)) who = u; else if (!u) hashPass(pw, "x"); }
      if (who) {
        if (who.id !== "owner") { who.lastLogin = who.lastSeen = new Date().toISOString(); savePeople(); }
        res.writeHead(303, { Location: "/", "Set-Cookie": `sb_session=${tokenFor(who)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${req.headers["x-forwarded-proto"] === "https" ? "; Secure" : ""}` });
        return res.end();
      }
      await new Promise(r => setTimeout(r, 400));
      return send(res, 401, loginPage(true), { "Content-Type": "text/html; charset=utf-8" });
    }
    if (p === "/login") return send(res, 200, loginPage(false), { "Content-Type": "text/html; charset=utf-8" });
    if (p === "/logout") { res.writeHead(303, { Location: "/login", "Set-Cookie": "sb_session=; Path=/; Max-Age=0" }); return res.end(); }
    const me = currentUser(req);
    if (!me) {
      if (req.method === "GET" && !p.startsWith("/api/") && !p.startsWith("/_blob/")) { res.writeHead(303, { Location: "/login" }); return res.end(); }
      return send(res, 401, { code: "not_signed_in", message: "Sign in again." });
    }

    // live updates
    if (p === "/api/events") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
      res.write("retry: 3000\n\n");
      const c = { res, user: me }; clients.add(c); req.on("close", () => clients.delete(c));
      return;
    }

    const deny = (msg) => send(res, 403, { code: "forbidden", message: msg || "Your role can't do that." });
    const isAdmin = me.role === "admin", isClient = me.role === "client";

    // who's signed in
    if (p === "/api/me" && req.method === "GET") return send(res, 200, publicUser(me));
    if (p === "/api/me/password" && req.method === "POST") {
      const { current, next } = await readJSON(req);
      if (me.id === "owner") return send(res, 400, { code: "invalid_argument", message: "The studio password is changed in Render (APP_PASSWORD)." });
      if (!checkPass(me, current)) return send(res, 400, { code: "invalid_argument", message: "Your current password isn't right." });
      if (String(next || "").length < 8) return send(res, 400, { code: "invalid_argument", message: "Use at least 8 characters." });
      me.salt = crypto.randomBytes(16).toString("hex"); me.hash = hashPass(next, me.salt); me.ver = (me.ver || 0) + 1; savePeople();
      res.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": `sb_session=${tokenFor(me)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${req.headers["x-forwarded-proto"] === "https" ? "; Secure" : ""}` });
      return res.end(JSON.stringify({ ok: true }));
    }

    // people (admins only)
    if (p.startsWith("/api/users")) {
      if (!isAdmin) return deny("Only admins can manage people.");
      const find = id => people.users.find(x => x.id === id);
      const setPassword = (u, pw) => { u.salt = crypto.randomBytes(16).toString("hex"); u.hash = hashPass(pw, u.salt); u.ver = (u.ver || 0) + 1; };
      const cleanProjects = a => Array.isArray(a) ? [...new Set(a.filter(x => typeof x === "string" && SEG.test(x)))].slice(0, 500) : [];
      if (p === "/api/users" && req.method === "GET") return send(res, 200, { users: people.users.map(adminView), me: me.id });
      if (p === "/api/users/save" && req.method === "POST") {
        const b = await readJSON(req);
        const name = String(b.name || "").trim().slice(0, 120), email = String(b.email || "").trim().toLowerCase().slice(0, 200);
        const role = ROLES.includes(b.role) ? b.role : null;
        if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !role) return send(res, 400, { code: "invalid_argument", message: "Add a name, a valid email and a role." });
        if (people.users.some(u => u.email === email && u.id !== b.id)) return send(res, 400, { code: "invalid_argument", message: "Someone already uses that email." });
        let u = b.id ? find(b.id) : null;
        if (b.id && !u) return send(res, 404, { code: "not_found" });
        if (!u && String(b.password || "").length < 8) return send(res, 400, { code: "invalid_argument", message: "Set a password of at least 8 characters." });
        if (b.password && String(b.password).length < 8) return send(res, 400, { code: "invalid_argument", message: "Use at least 8 characters for the password." });
        if (u && u.id === me.id && role !== "admin") return send(res, 400, { code: "invalid_argument", message: "You can't remove your own admin role." });
        if (!u) { u = { id: crypto.randomBytes(8).toString("hex"), created: new Date().toISOString(), ver: 0 }; people.users.push(u); }
        const signOut = (u.role && u.role !== role) || (b.disabled === true && !u.disabled);
        Object.assign(u, { name, email, role });
        if (b.projects !== undefined) u.projects = cleanProjects(b.projects);
        u.allProjects = role === "agent" ? b.allProjects !== false : role === "admin";
        if (role === "admin") u.projects = [];
        if (b.disabled !== undefined) { if (b.disabled && u.id === me.id) return send(res, 400, { code: "invalid_argument", message: "You can't disable yourself." }); u.disabled = !!b.disabled; }
        if (b.password) setPassword(u, b.password); else if (signOut) u.ver = (u.ver || 0) + 1;
        savePeople();
        return send(res, 200, { ok: true, user: adminView(u) });
      }
      if (p === "/api/users/password" && req.method === "POST") {
        const { id, password } = await readJSON(req); const u = find(id);
        if (!u) return send(res, 404, { code: "not_found" });
        if (String(password || "").length < 8) return send(res, 400, { code: "invalid_argument", message: "Use at least 8 characters." });
        setPassword(u, password); savePeople(); // also signs them out everywhere
        return send(res, 200, { ok: true });
      }
      if (p === "/api/users/signout" && req.method === "POST") {
        const { id } = await readJSON(req); const u = find(id);
        if (!u) return send(res, 404, { code: "not_found" });
        if (u.id === me.id) return send(res, 400, { code: "invalid_argument", message: "Use Sign out for yourself." });
        u.ver = (u.ver || 0) + 1; savePeople(); return send(res, 200, { ok: true });
      }
      if (p === "/api/users/access" && req.method === "POST") {
        // { id, project, on } grants or removes one project; { id, allProjects } for agents
        const b = await readJSON(req); const u = find(b.id);
        if (!u) return send(res, 404, { code: "not_found" });
        if (u.role === "admin") return send(res, 400, { code: "invalid_argument", message: "Admins always see every project." });
        if (typeof b.allProjects === "boolean") { if (u.role !== "agent") return send(res, 400, { code: "invalid_argument", message: "Clients only see the projects you choose." }); u.allProjects = b.allProjects; }
        if (typeof b.project === "string" && SEG.test(b.project)) { const set = new Set(u.projects || []); b.on ? set.add(b.project) : set.delete(b.project); u.projects = [...set]; }
        savePeople(); return send(res, 200, { ok: true, user: adminView(u) });
      }
      if (p === "/api/users/delete" && req.method === "POST") {
        const { id } = await readJSON(req);
        if (id === me.id) return send(res, 400, { code: "invalid_argument", message: "You can't remove yourself." });
        people.users = people.users.filter(u => u.id !== id); savePeople();
        return send(res, 200, { ok: true });
      }
      return send(res, 404, { code: "not_found" });
    }

    // full backup of the document store (files stay on the disk)
    if (p === "/api/export" && req.method === "GET") {
      if (!isAdmin) return deny("Only admins can download backups.");
      return send(res, 200, JSON.stringify(store, null, 1), { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="sourcebook-backup-${new Date().toISOString().slice(0, 10)}.json"` });
    }

    // projects
    if (p === "/api/projects" && req.method === "GET") return send(res, 200, { projects: projectSummaries().filter(x => canSeeProject(me, x.id)) });
    if (p === "/api/projects/delete" && req.method === "POST") {
      if (!isAdmin) return deny("Only admins can delete projects. You can archive it instead.");
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
      if (!canRead(me, dp)) return deny();
      const d = store[dp];
      return send(res, 200, d ? { exists: true, data: forUser(me, dp, d.data), version: d.version } : { exists: false });
    }
    if (p === "/api/db/col" && req.method === "GET") {
      const cp = url.searchParams.get("path");
      if (!validPath(cp, false)) return send(res, 400, { code: "invalid_argument" });
      if (!canRead(me, cp)) return deny();
      const depth = cp.split("/").length + 1, pre = cp + "/";
      const docs = Object.entries(store).filter(([k]) => k.startsWith(pre) && k.split("/").length === depth).map(([k, v]) => ({ id: k.slice(pre.length), data: forUser(me, k, v.data), version: v.version }));
      return send(res, 200, { docs });
    }
    if (p.startsWith("/api/db/") && req.method === "POST") {
      const op = p.slice(8);
      const { path: dp, data } = await readJSON(req);
      if (!validPath(dp, true)) return send(res, 400, { code: "invalid_argument", message: "bad path" });
      const cur = store[dp];
      const commit = (next) => {
        store[dp] = { data: next, version: (cur?.version || 0) + 1, updatedAt: new Date().toISOString() };
        persist(); broadcast({ path: dp, exists: true, data: next });
        return send(res, 200, { ok: true, version: store[dp].version });
      };
      if (!cur && op === "set" && /^projects\/[^/]+$/.test(dp) && me.role === "agent" && !allAccess(me)) { me.projects = [...new Set([...(me.projects || []), projectOf(dp)])]; savePeople(); }
      // Comments: anyone who can see the project may post; the author is always the signed-in person.
      if (/^projects\/[^/]+\/comments\/[^/]+$/.test(dp)) {
        if (!canRead(me, dp)) return deny();
        if (op === "delete") {
          if (cur && cur.data.by !== me.id && !isAdmin) return deny("You can only remove your own comments.");
          if (cur) { delete store[dp]; persist(); broadcast({ path: dp, exists: false }); }
          return send(res, 200, { ok: true });
        }
        if (cur && cur.data.by !== me.id) return deny("You can only edit your own comments.");
        const text = String(data?.text || "").trim().slice(0, 4000);
        if (!text || typeof data.itemId !== "string") return send(res, 400, { code: "invalid_argument", message: "Write a comment first." });
        return commit({ itemId: data.itemId, text, by: me.id, name: me.name, role: me.role, at: cur?.data.at || new Date().toISOString(), ...(cur ? { edited: new Date().toISOString() } : {}) });
      }
      // Clients: only approve or request changes on a piece.
      if (isClient) {
        if (!canRead(me, dp)) return deny();
        if (op !== "update" || !/^projects\/[^/]+\/items\/[^/]+$/.test(dp) || !cur) return deny("Clients can view, approve and comment.");
        const keys = Object.keys(data || {});
        if (keys.length !== 1 || keys[0] !== "clientReview") return deny("Clients can view, approve and comment.");
        const r = data.clientReview;
        const state = r && ["approved", "changes"].includes(r.state) ? r.state : null;
        const next = { ...cur.data };
        if (!state) delete next.clientReview;
        else {
          next.clientReview = { state, note: String(r.note || "").trim().slice(0, 2000), by: me.id, name: me.name, at: new Date().toISOString() };
          if (state === "approved" && ["Concept", "Specified", undefined, ""].includes(next.status)) next.status = "Approved";
        }
        const out = commit(next);
        return out;
      }
      // Agents limited to some projects can only change those.
      if (!canRead(me, dp)) return deny();
      // Agents can't remove a project from the registry (that's deleting it).
      if (op === "delete" && /^projects\/[^/]+$/.test(dp) && !isAdmin) return deny("Only admins can delete projects.");
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

    // find products online
    if (p.startsWith("/api/match/") && req.method === "POST") {
      if (isClient) return deny();
      const b = await readJSON(req, 12 * 1024 * 1024);
      const dp = `projects/${b.project}/items/${b.item}`;
      if (!validPath(dp, true) || !canRead(me, dp)) return deny();
      const it = store[dp]?.data; if (!it) return send(res, 404, { code: "not_found", message: "That piece no longer exists." });
      if (p === "/api/match/start") {
        if (!ANTHROPIC_API_KEY) return send(res, 503, { code: "sampling_disabled", message: "Claude isn't set up on this server yet. Add an Anthropic API key (ANTHROPIC_API_KEY) in Render." });
        const img = b.image && /^image\/(jpeg|png|webp|gif)$/.test(b.image.media_type) && typeof b.image.data === "string" && b.image.data.length < 7e6 ? b.image : null;
        if (!img && !it.name) return send(res, 400, { code: "invalid_argument", message: "Add a photo or a name first." });
        if (it.match?.status === "searching" || it.match?.status === "pulling") return send(res, 200, { ok: true, already: true });
        const hint = String(b.hint || "").trim().slice(0, 300);
        patchItem(dp, { match: { status: "searching", started: new Date().toISOString(), by: me.name || "", hint, candidates: [] } });
        enqueue(() => runIdentify(dp, img, hint, b.lang));
        return send(res, 200, { ok: true });
      }
      if (p === "/api/match/details") {
        const i = Number(b.index); const c = it.match?.candidates?.[i];
        if (!c) return send(res, 400, { code: "invalid_argument", message: "Pick a match first." });
        if (!ANTHROPIC_API_KEY) return send(res, 503, { code: "sampling_disabled", message: "Claude isn't set up on this server yet." });
        patchItem(dp, { match: { ...it.match, status: "pulling", chosen: i, message: null } });
        enqueue(() => runDetails(dp, i, b.lang));
        return send(res, 200, { ok: true });
      }
      if (p === "/api/match/photo") {
        // Save the product photo from the web into the project's files.
        try {
          const { body, type } = await safeFetch(String(b.url || ""), { maxBytes: 15e6, timeout: 15000, accept: "image/*" });
          const ct = /^image\/(jpeg|png|webp|gif)$/.test(type) ? type : sniffBuf(body);
          if (!ct) return send(res, 415, { code: "unsupported_type", message: "That image couldn't be used." });
          const id = crypto.randomBytes(16).toString("hex");
          await fsp.writeFile(path.join(BLOB_DIR, id), body);
          await fsp.writeFile(path.join(BLOB_DIR, id + ".json"), JSON.stringify({ contentType: ct, sizeBytes: body.length, createdAt: new Date().toISOString(), source: String(b.url).slice(0, 500) }));
          return send(res, 200, { id });
        } catch (e) { return send(res, 502, { code: "upstream_error", message: "Couldn't download that photo from the site." }); }
      }
      return send(res, 404, { code: "not_found" });
    }

    // files
    if (p === "/api/assets" && req.method === "POST") {
      if (isClient) return deny("Clients can't upload files.");
      const type = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
      if (!ALLOWED_TYPES.has(type)) return send(res, 415, { code: "unsupported_type", message: "Use a PDF, JPG, PNG, WebP, GLB or USDZ file." });
      // Stream to disk so large models don't sit in memory.
      const limit = MODEL_TYPES.has(type) ? MAX_MODEL : MAX_UPLOAD;
      const id = crypto.randomBytes(16).toString("hex"), file = path.join(BLOB_DIR, id), tmp = file + ".part";
      let size = 0, head = null;
      try {
        await new Promise((resolve, reject) => {
          const out = fs.createWriteStream(tmp);
          let tooBig = false;
          req.on("data", c => {
            if (!head) head = c.slice(0, 4);
            size += c.length;
            // Over the limit: stop writing but read the rest, so the browser gets a clear answer.
            if (size > limit && !tooBig) { tooBig = true; req.unpipe(out); out.destroy(); req.resume(); }
          });
          req.on("end", () => { if (tooBig) reject(Object.assign(new Error(`That file is over ${limit / 1048576} MB.`), { status: 413, code: "too_large" })); });
          req.pipe(out); out.on("finish", () => { if (!tooBig) resolve(); }); out.on("error", e => { if (!tooBig) reject(e); }); req.on("error", reject);
        });
      } catch (e) { fsp.unlink(tmp).catch(() => {}); throw e; }
      if (!size) { await fsp.unlink(tmp).catch(() => {}); return send(res, 400, { code: "invalid_request" }); }
      if (type === "model/gltf-binary" && String(head) !== "glTF") { await fsp.unlink(tmp).catch(() => {}); return send(res, 415, { code: "unsupported_type", message: "That isn't a GLB file. Export as glTF Binary (.glb)." }); }
      if (type === "model/vnd.usdz+zip" && String(head).slice(0, 2) !== "PK") { await fsp.unlink(tmp).catch(() => {}); return send(res, 415, { code: "unsupported_type", message: "That isn't a USDZ file." }); }
      await fsp.rename(tmp, file);
      await fsp.writeFile(file + ".json", JSON.stringify({ contentType: type, sizeBytes: size, createdAt: new Date().toISOString() }));
      return send(res, 200, { id, url: "/_blob/" + id, sizeBytes: size, contentType: type });
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
      if (isClient) return deny("Not available for clients.");
      const body = await readJSON(req, 40 * 1024 * 1024);
      const out = await askClaude(body);
      return send(res, 200, out);
    }

    // static app
    if (req.method === "GET") {
      if (/^\/p\/[A-Za-z0-9_\-.~:@+]{1,200}\/?$/.test(p)) {
        if (!canSeeProject(me, decodeURIComponent(p.split("/")[2]))) { res.writeHead(303, { Location: "/" }); return res.end(); }
        const data = await fsp.readFile(path.join(PUBLIC_DIR, "index.html"));
        return send(res, 200, data, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      }
      if (p === "/admin" || p === "/admin/") {
        if (!isAdmin) { res.writeHead(303, { Location: "/" }); return res.end(); }
        return send(res, 200, await fsp.readFile(path.join(PUBLIC_DIR, "admin.html")), { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      }
      if (p === "/admin.html") { res.writeHead(303, { Location: "/admin" }); return res.end(); }
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
server.listen(PORT, () => console.log(`Sourcebook running on port ${PORT} · data in ${DATA_DIR}${APP_PASSWORD ? " · password on" : " · NO PASSWORD SET"} · ${people.users.length} people${ANTHROPIC_API_KEY ? "" : " · Claude off (no ANTHROPIC_API_KEY)"}`));
process.on("SIGTERM", async () => { clearTimeout(saveTimer); try { fs.writeFileSync(DB_FILE, JSON.stringify(store)); } catch (_) {} process.exit(0); });
