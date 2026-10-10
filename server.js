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
const tls = require("tls");

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, "data"));
const BLOB_DIR = path.join(DATA_DIR, "blobs");
const DB_FILE = path.join(DATA_DIR, "db.json");
// Works whether files were uploaded in their folders (public/, seed/, seed/blobs/)
// or flattened into the top level, which GitHub's web uploader sometimes does.
const exists = f => { try { return fs.existsSync(f); } catch (_) { return false; } };
const PUBLIC_DIR = exists(path.join(__dirname, "public", "dashboard.html")) ? path.join(__dirname, "public") : __dirname;
const FLAT_PUBLIC = PUBLIC_DIR === __dirname;
const PUBLIC_FILES = new Set(["index.html", "dashboard.html", "admin.html", "claude-shim.js", "library.js", "pdfjs/pdf.min.mjs", "pdfjs/pdf.worker.min.mjs", "manifest.webmanifest", "icon-192.png", "icon-512.png"]);
// Sourcing library: lib/data.json (index) and lib/sprites/ (thumbnail sheets), next to the app files.
const LIB_DIR = exists(path.join(PUBLIC_DIR, "lib", "data.json")) ? path.join(PUBLIC_DIR, "lib") : path.join(__dirname, "lib");
// Full-size library images, uploaded by an admin from the Drive zips, live on the data disk.
const LIB_FULL_DIR = path.join(DATA_DIR, "lib-full");
// Catalogues an admin adds from a PDF: lib-cats/<sup>.json (index) and <sup>.pdf (the source), with 280px thumbnails in lib-thumbs/.
const LIB_CATS_DIR = path.join(DATA_DIR, "lib-cats");
const LIB_THUMB_DIR = path.join(DATA_DIR, "lib-thumbs");
// The library index, read once and kept in memory for building pieces on the server.
const LIB_LABEL = { "BILLA-Sofa": ["Billa", "Sofas & lounge chairs"], "BILLA-CoffeeTV": ["Billa", "Coffee tables & TV units"], "BILLA-Dining": ["Billa", "Dining"], "BILLA-Outdoor": ["Billa", "Outdoor"], "HALO": ["HALO", "Collection 2026"], "Kaiwuli": ["Kaiwuli", "Catalogue 2026"], "TO-Tearsheet": ["TO Interactive", "Tearsheets 2025"] };
const LIB_CAT = { FURNITURE: "Furniture", LIGHTING: "Lighting", PLUMBING: "Plumbing", MILLWORK: "Millwork", DOORS: "Millwork", STONE: "Stone", "WALL PANELLING": "Finishes", "WOOD PRODUCTS": "Finishes", "PARTITION SYSTEMS": "Glazing", "GLASS PRODUCTS": "Glazing", FLOORING: "Finishes", OFFICE: "Furniture", VANITIES: "Plumbing", MIRRORS: "Glazing", SIGNAGE: "Hardware" };
const libCatFile = c => String(c).replace(/ /g, "-");
let libCache = null;
// The scanned catalogues in lib/ plus the finished ones added from PDFs; uploaded catalogues carry label and up: 1.
async function libIndex() {
  if (libCache) return libCache;
  let d, types = {};
  try { d = JSON.parse(await fsp.readFile(path.join(LIB_DIR, "data.json"), "utf8")); } catch (_) { d = { sups: {}, items: [], cell: 280, grid: 8 }; }
  // Product type of each scanned image (lib/types.json, { file: code }), added as item[7].
  try { types = JSON.parse(await fsp.readFile(path.join(LIB_DIR, "types.json"), "utf8")); } catch (_) {}
  d.items.forEach(x => { x[7] = types[x[0]] || ""; });
  for (const f of (await fsp.readdir(LIB_CATS_DIR).catch(() => [])).filter(f => f.endsWith(".json")).sort()) {
    try {
      const c = JSON.parse(await fsp.readFile(path.join(LIB_CATS_DIR, f), "utf8"));
      if (c.status !== "done" || d.sups[c.sup]) continue;
      d.sups[c.sup] = { pdf: c.pdf, drive: c.drive || "", pages: c.pages, cat: c.cat, n: c.items.length, label: [c.supplier, c.product || ""], up: 1, created: c.created };
      c.items.forEach(x => d.items.push([x[0], c.sup, x[1], x[2] || "", x[3] || "", null, null, x[4] || LIB_CAT_TYPE[c.cat] || ""]));
    } catch (_) {}
  }
  libCache = { sups: d.sups, byFile: new Map(d.items.map(x => [x[0], x])), json: JSON.stringify(d) };
  return libCache;
}
// Product types (see TYPES in library.js). Catalogues outside furniture take their category's type;
// furniture images added from a PDF are sorted by Claude from their thumbnails when an API key is set.
const LIB_TYPES = "SLCTBKDEGR1HPXZMINJWQVYAO";
const LIB_CAT_TYPE = { LIGHTING: "H", PLUMBING: "P", MILLWORK: "M", DOORS: "I", STONE: "N", "WALL PANELLING": "W", "WOOD PRODUCTS": "W", "PARTITION SYSTEMS": "Q", "GLASS PRODUCTS": "V", FLOORING: "J", OFFICE: "1", VANITIES: "X", MIRRORS: "Z", SIGNAGE: "Y" };
const LIB_TYPE_PROMPT = `Each image is a product photo from a furniture catalogue. For each image, in order, give ONE letter for the main product shown:
S sofa/sectional/loveseat · L lounge or arm chair · C dining or office chair · T stool or bar stool · B bench, ottoman or pouf · K coffee or side table · D dining table (a table shown with chairs is D) · E desk, console or dressing table · G cabinet, sideboard, chest, TV unit, shelving or wardrobe · R bed or nightstand · H lamp · Z mirror · A rug, vase, art or other decor · O logo, text, swatch, drawing or no clear product.
In a room scene, use the most prominent piece. Reply with only the letters, no spaces.`;
async function classifyCat(sup) {
  if (!ANTHROPIC_API_KEY) return;
  const c = await libCatRead(sup); if (!c || c.status !== "done") return;
  const todo = c.items.filter(x => !x[4]);
  for (let i = 0; i < todo.length; i += 20) {
    const chunk = todo.slice(i, i + 20), content = [];
    for (const [n, x] of chunk.entries()) {
      try { content.push({ type: "text", text: `Image ${n + 1}` }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: (await fsp.readFile(path.join(LIB_THUMB_DIR, x[0]))).toString("base64") } }); } catch (_) { content.push({ type: "text", text: `Image ${n + 1}: missing` }); }
    }
    content.push({ type: "text", text: LIB_TYPE_PROMPT + ` There are ${chunk.length} images, so reply with exactly ${chunk.length} letters.` });
    try {
      const r = await fetch(API_URL, { method: "POST", headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: MODELS.quick, max_tokens: 100, messages: [{ role: "user", content }] }) });
      const j = await r.json().catch(() => ({}));
      const out = ((j.content || []).map(b => b.text || "").join("").toUpperCase().match(/[A-Z]/g) || []).join("");
      if (r.ok && out.length === chunk.length) chunk.forEach((x, k) => { if (LIB_TYPES.includes(out[k])) x[4] = out[k]; });
      else console.error("library sorting:", r.status, j?.error?.message || out);
    } catch (e) { console.error("library sorting:", e.message); }
  }
  const cur = await libCatRead(sup); if (!cur || cur.status !== "done") return; // deleted meanwhile
  const got = new Map(c.items.map(x => [x[0], x[4]])); cur.items.forEach(x => { if (!x[4] && got.get(x[0])) x[4] = got.get(x[0]); });
  await fsp.writeFile(path.join(LIB_CATS_DIR, sup + ".json"), JSON.stringify(cur));
  libCache = null; broadcast({ path: "library", index: true });
}
// On start, sort any furniture catalogue that still has unsorted images (added before sorting existed, or the key was off).
async function classifyPending() {
  if (!ANTHROPIC_API_KEY) return;
  for (const f of (await fsp.readdir(LIB_CATS_DIR).catch(() => [])).filter(f => f.endsWith(".json"))) {
    const c = await libCatRead(f.slice(0, -5));
    if (c && c.status === "done" && !LIB_CAT_TYPE[c.cat] && c.items.some(x => !x[4])) enqueue(() => classifyCat(c.sup));
  }
}
async function libCatRead(sup) { try { return JSON.parse(await fsp.readFile(path.join(LIB_CATS_DIR, sup + ".json"), "utf8")); } catch (_) { return null; } }
// Streams a request body to a file, refusing it past the limit.
function bodyToFile(req, file, limit) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(file + ".tmp"); let size = 0;
    req.on("data", c => { size += c.length; if (size > limit) { req.destroy(); out.destroy(); fs.unlink(file + ".tmp", () => {}); reject(Object.assign(new Error("too_large"), { status: 413 })); } });
    req.pipe(out);
    out.on("finish", () => fs.rename(file + ".tmp", file, e => (e ? reject(e) : resolve(size))));
    out.on("error", reject); req.on("error", reject);
  });
}
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
fs.mkdirSync(LIB_FULL_DIR, { recursive: true });
fs.mkdirSync(LIB_CATS_DIR, { recursive: true });
fs.mkdirSync(LIB_THUMB_DIR, { recursive: true });

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
      if (allAccess(u) && !isSourcingPath(msg.path)) c.res.write(line);
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
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, wechat: u.wechat || "", role: u.role, projects: u.projects || [], allProjects: allAccess(u) });
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
// The sourcing library (library/<catalogue>) is studio-wide: everyone can see what's approved; only admins approve.
const isLibPath = p => /^library(types)?(\/|$)/.test(p || "");
// Sourcing requests (sourcing/<id>): the studio and sourcing agents see them all; anyone else only their own.
const isSourcingPath = p => /^sourcing(\/|$)/.test(p || "");
function canRead(u, p) { if (isLibPath(p)) return true; if (isSourcingPath(p)) { if (u.role === "admin") return true; if (p === "sourcing") return u.role === "agent"; const d = store[p]?.data; return !!d && (d.by?.id === u.id || (u.role === "agent" && !["review", "open"].includes(d.status))); } if (allAccess(u)) return true; const id = projectOf(p); return !!id && canSeeProject(u, id); }
// Internal fields a client never receives.
const CLIENT_HIDDEN = ["notes", "match", "pendingSetup", "chg"];
function forUser(u, p, data) {
  // The sourcing agent never sees which client asked for a TBS item: it comes from the studio.
  if (u.role === "agent" && data && /^sourcing\/[^/]+$/.test(p) && data.by && data.by.id !== u.id && data.by.role !== "admin") return { ...data, by: { role: "admin" } };
  if (u.role !== "client" || !data || !/^projects\/[^/]+\/items\/[^/]+$/.test(p)) return data;
  const o = { ...data }; CLIENT_HIDDEN.forEach(k => delete o[k]); return o;
}
/* ---------------- what's changed between the studio and the sourcing agent ---------------- */
// Each piece keeps chg = { field: { r: role, n: name, at } } for fields an admin or agent changed
// (chg._new when it was added). The other side sees those fields highlighted until they mark them seen.
const ITEM_DOC = /^projects\/[^/]+\/items\/[^/]+$/;
const CHG_SKIP = new Set(["chg", "order", "pendingSetup", "match", "photoFit", "created", "addedBy", "updated"]);
const sideOf = u => u.role === "admin" || u.role === "agent" ? u.role : null;
function trackChanges(me, prev, next) {
  const side = sideOf(me); if (!side) return next;
  const chg = { ...(prev?.chg || {}) }, stamp = { r: side, n: me.name || "", at: new Date().toISOString() };
  if (!prev) chg._new = stamp;
  else for (const k of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    if (CHG_SKIP.has(k)) continue;
    if (JSON.stringify(prev[k] ?? null) !== JSON.stringify(next[k] ?? null)) chg[k] = stamp;
  }
  const out = { ...next }; delete out.chg;
  if (Object.keys(chg).length) out.chg = chg;
  return out;
}
// Number of pieces in a project with changes from the other side that this person hasn't marked seen.
function newsCount(u, id) {
  const side = sideOf(u); if (!side) return 0;
  const pre = `projects/${id}/items/`; let n = 0;
  for (const [k, v] of Object.entries(store)) if (k.startsWith(pre) && Object.values(v.data?.chg || {}).some(c => c && c.r !== side)) n++;
  return n;
}
function loginPage(error) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes"><link rel="apple-touch-icon" href="/icon-192.png"><link rel="manifest" href="/manifest.webmanifest"><title>Sign in · Sourcebook</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz@1,6..96&family=Hanken+Grotesk:wght@400;500&family=IBM+Plex+Mono&display=swap" media="print" onload="this.media=\'all\'">
<style>:root{--g:#EEEDEA;--p:#F7F6F4;--i:#1A1918;--m:#8A8580;--r:#D6D3CE;--c:#A3322B}@media(prefers-color-scheme:dark){:root{--g:#141413;--p:#1C1B1A;--i:#ECEAE6;--m:#86817B;--r:#34322F;--c:#E07A72}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--g);color:var(--i);font:15px/1.5 "Hanken Grotesk",system-ui,sans-serif;padding:24px}
main{width:min(380px,100%)}.e{font:11px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--m)}
h1{font:italic 400 56px/1 "Bodoni Moda",Georgia,serif;margin:8px 0 28px}label{display:block;font-size:12px;color:var(--m)}
input{width:100%;font:inherit;font-size:17px;color:var(--i);background:transparent;border:0;border-bottom:1px solid var(--r);padding:10px 2px;margin-top:4px}input:focus{outline:none;border-color:var(--i)}
.note{font-size:12px;color:var(--m);margin-top:18px}button{margin-top:22px;width:100%;padding:12px;font:inherit;background:var(--i);color:var(--g);border:1px solid var(--i);cursor:pointer}.err{color:var(--c);font-size:13px;margin-top:12px}</style></head>
<body><main><div class="e">Sourcebook · Studio</div><h1>Sign in</h1>
<form method="post" action="/login"><label for="em">Email or WeChat ID</label><input id="em" name="email" type="text" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" autofocus>
<label for="pw" style="margin-top:18px">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required>
${error ? '<p class="err">That sign-in and password don\'t match. Studio owner: leave the first box blank and use the studio password.</p>' : ""}<button>Open Sourcebook</button>
<p class="note">Studio owner: leave the first box blank and use the studio password.</p></form></main></body></html>`;
}
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

/* ---------------- email (SMTP, no dependencies) ---------------- */
// Set SMTP_HOST, SMTP_PORT (465 for SSL, 587 for STARTTLS), SMTP_USER, SMTP_PASS and optionally MAIL_FROM in Render.
// A QQ Mail or Gmail account works: use the app password / authorization code, not the sign-in password.
const MAIL = { host: process.env.SMTP_HOST || "", port: Number(process.env.SMTP_PORT || 465), user: process.env.SMTP_USER || "", pass: process.env.SMTP_PASS || "", from: process.env.MAIL_FROM || process.env.SMTP_USER || "" };
const mailOn = () => !!(MAIL.host && MAIL.user && MAIL.pass && MAIL.from);
const origin = req => process.env.PUBLIC_URL || `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
function sendMail(to, subject, text, attachments = []) {
  const b64 = s => Buffer.from(s).toString("base64").replace(/.{76}/g, "$&\r\n");
  const bound = "sb" + crypto.randomBytes(12).toString("hex"), from = MAIL.from.replace(/[\r\n<>]/g, "");
  const msg = [`From: Sourcebook <${from}>`, `To: ${to.join(", ")}`, `Subject: =?UTF-8?B?${Buffer.from(subject.replace(/[\r\n]+/g, " ")).toString("base64")}?=`, `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomBytes(12).toString("hex")}@sourcebook>`, "MIME-Version: 1.0", `Content-Type: multipart/mixed; boundary="${bound}"`, "",
    `--${bound}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64(text),
    ...attachments.flatMap(a => [`--${bound}`, `Content-Type: ${a.type}; name="${a.name}"`, `Content-Disposition: attachment; filename="${a.name}"`, "Content-Transfer-Encoding: base64", "", b64(a.data)]),
    `--${bound}--`, ""].join("\r\n").replace(/^\./gm, "..");
  return new Promise((resolve, reject) => {
    let sock, buf = "", lines = [], pending = null, finished = false;
    const end = (e) => { if (finished) return; finished = true; clearTimeout(timer); try { sock.end(); } catch (_) {} e ? reject(e) : resolve(); };
    const timer = setTimeout(() => end(new Error("SMTP timeout")), 30000);
    const onData = d => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const l = buf.slice(0, i).replace(/\r$/, ""); buf = buf.slice(i + 1); lines.push(l); if (/^\d{3}( |$)/.test(l)) { const r = lines; lines = []; const p = pending; pending = null; if (p) p(r); } } };
    const attach = s => { sock = s; s.setEncoding("utf8"); s.on("data", onData); s.on("error", e => end(e)); };
    const cmd = async (line, ok) => { const got = new Promise(r => (pending = r)); if (line != null) sock.write(line + "\r\n"); const r = await got; const code = Number(r[r.length - 1].slice(0, 3)); if (!ok.includes(code)) throw new Error(`SMTP ${code}: ${r.join(" ").slice(0, 200)}`); return r; };
    const local = /^(localhost|127\.0\.0\.1)$/.test(MAIL.host);
    (async () => {
      if (MAIL.port === 465) { const g = new Promise(r => (pending = r)); attach(tls.connect({ host: MAIL.host, port: 465, servername: MAIL.host })); const r = await g; if (!/^220/.test(r[r.length - 1])) throw new Error("SMTP greeting " + r.join(" ")); }
      else { const g = new Promise(r => (pending = r)); attach(net.connect(MAIL.port, MAIL.host)); await g; }
      let ehlo = await cmd("EHLO sourcebook", [250]);
      if (MAIL.port !== 465) {
        if (ehlo.some(l => /STARTTLS/i.test(l))) { await cmd("STARTTLS", [220]); sock.removeAllListeners("data"); attach(tls.connect({ socket: sock, servername: MAIL.host })); ehlo = await cmd("EHLO sourcebook", [250]); }
        else if (!local) throw new Error("SMTP server doesn't offer STARTTLS");
      }
      await cmd("AUTH LOGIN", [334]); await cmd(Buffer.from(MAIL.user).toString("base64"), [334]); await cmd(Buffer.from(MAIL.pass).toString("base64"), [235]);
      await cmd(`MAIL FROM:<${from}>`, [250]);
      for (const t of to) await cmd(`RCPT TO:<${t.replace(/[\r\n<>]/g, "")}>`, [250, 251]);
      await cmd("DATA", [354]); await cmd(msg + "\r\n.", [250]);
      await cmd("QUIT", [221]).catch(() => {});
    })().then(() => end(), e => end(e));
  });
}

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
      else { const wx = email.replace(/^@/, ""); const u = people.users.find(x => !x.disabled && ((x.email && x.email === email) || (x.wechat && x.wechat.toLowerCase() === wx))); if (u && checkPass(u, pw)) who = u; else if (!u) hashPass(pw, "x"); }
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
        const wechat = b.wechat !== undefined ? String(b.wechat || "").trim().replace(/^@/, "").slice(0, 60) : undefined;
        const existing = b.id ? people.users.find(x => x.id === b.id) : null;
        const wxFinal = wechat !== undefined ? wechat : existing?.wechat || "";
        if (!name || !role) return send(res, 400, { code: "invalid_argument", message: "Add a name and a role." });
        if (!email && !wxFinal) return send(res, 400, { code: "invalid_argument", message: "Add an email or a WeChat ID. They sign in with either." });
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { code: "invalid_argument", message: "That email doesn't look right." });
        if (wxFinal && !/^[A-Za-z0-9_\-.]{2,60}$/.test(wxFinal)) return send(res, 400, { code: "invalid_argument", message: "A WeChat ID uses letters, numbers, - and _ only." });
        if (email && people.users.some(u => u.email === email && u.id !== b.id)) return send(res, 400, { code: "invalid_argument", message: "Someone already uses that email." });
        if (wxFinal && people.users.some(u => u.wechat && u.wechat.toLowerCase() === wxFinal.toLowerCase() && u.id !== b.id)) return send(res, 400, { code: "invalid_argument", message: "Someone already uses that WeChat ID." });
        let u = b.id ? find(b.id) : null;
        if (b.id && !u) return send(res, 404, { code: "not_found" });
        if (!u && String(b.password || "").length < 8) return send(res, 400, { code: "invalid_argument", message: "Set a password of at least 8 characters." });
        if (b.password && String(b.password).length < 8) return send(res, 400, { code: "invalid_argument", message: "Use at least 8 characters for the password." });
        if (u && u.id === me.id && role !== "admin") return send(res, 400, { code: "invalid_argument", message: "You can't remove your own admin role." });
        if (!u) { u = { id: crypto.randomBytes(8).toString("hex"), created: new Date().toISOString(), ver: 0 }; people.users.push(u); }
        const signOut = (u.role && u.role !== role) || (b.disabled === true && !u.disabled);
        Object.assign(u, { name, email, role });
        if (wechat !== undefined) u.wechat = wechat;
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
    if (p === "/api/projects" && req.method === "GET") return send(res, 200, { projects: projectSummaries().filter(x => canSeeProject(me, x.id)).map(x => ({ ...x, news: newsCount(me, x.id) })) });
    // mark changes from the other side as seen: { project, items: [ids] } (all pieces in the project when items is left out)
    if (p === "/api/changes/seen" && req.method === "POST") {
      const side = sideOf(me); if (!side) return deny();
      const { project, items: ids } = await readJSON(req);
      if (!validPath("projects/" + project, true) || !canSeeProject(me, project)) return deny();
      const pre = `projects/${project}/items/`, only = Array.isArray(ids) ? new Set(ids.map(String)) : null; let n = 0;
      for (const [k, v] of Object.entries(store)) {
        if (!k.startsWith(pre) || !ITEM_DOC.test(k) || (only && !only.has(k.slice(pre.length)))) continue;
        const chg = v.data?.chg; if (!chg || !Object.values(chg).some(c => c && c.r !== side)) continue;
        const keep = Object.fromEntries(Object.entries(chg).filter(([, c]) => c && c.r === side));
        const next = { ...v.data }; delete next.chg; if (Object.keys(keep).length) next.chg = keep;
        store[k] = { data: next, version: v.version + 1, updatedAt: v.updatedAt };
        broadcast({ path: k, exists: true, data: next }); n++;
      }
      if (n) persist();
      return send(res, 200, { ok: true, cleared: n });
    }
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
      if (isLibPath(dp) && !isAdmin) return deny("Only admins can approve library images.");
      if (isSourcingPath(dp)) return deny();
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
        let next = stripUndefined(op === "set" ? data : mergeDeep(cur.data, data));
        if (ITEM_DOC.test(dp)) { if (op === "update") next.chg = cur.data.chg; next = trackChanges(me, cur?.data, next); }
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

    // sourcing library: catalogue index, thumbnail sheets, approvals and adding a piece
    if (p === "/lib/data.json" && req.method === "GET") {
      const lib = await libIndex();
      return send(res, 200, lib.json, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
    }
    const tm = p.match(/^\/lib\/(thumb\/[A-Za-z0-9_.-]+\.jpg|pdf\/[A-Za-z0-9-]+\.pdf)$/);
    if (tm && req.method === "GET") {
      // Thumbnails and source PDFs of catalogues added from a PDF (any signed-in user)
      const fp = tm[1].startsWith("thumb/") ? path.join(LIB_THUMB_DIR, tm[1].slice(6)) : path.join(LIB_CATS_DIR, tm[1].slice(4));
      try {
        const st = await fsp.stat(fp);
        const pdf = fp.endsWith(".pdf");
        res.writeHead(200, { "Content-Type": pdf ? "application/pdf" : "image/jpeg", "Content-Length": st.size, "Cache-Control": "private, max-age=86400", ...(pdf ? { "Content-Disposition": "inline" } : {}) });
        return fs.createReadStream(fp).pipe(res);
      } catch (_) { return send(res, 404, "Not found"); }
    }
    const cm = p.match(/^\/api\/library\/catalogue(?:\/([A-Za-z0-9-]+)(?:\/(pdf|done|img\/[A-Za-z0-9_.-]+\.jpg))?)?$/);
    if (cm) {
      // Adding a catalogue from a PDF (admins). The browser scans the PDF; the server keeps the files.
      //   POST   /api/library/catalogue {supplier, product, cat, pdf, pages, drive}  -> { sup, prefix }
      //   PUT    /api/library/catalogue/<sup>/pdf                 the source PDF
      //   PUT    /api/library/catalogue/<sup>/img/<file>?thumb=1  a full-size image or its thumbnail
      //   POST   /api/library/catalogue/<sup>/done {items: [[file, page, codes, text]]}
      //   DELETE /api/library/catalogue/<sup>                     removes an added catalogue and its approvals
      if (!isAdmin) return deny("Only admins can add catalogues.");
      const [, sup, sub] = cm;
      if (!sup && req.method === "POST") {
        const b = await readJSON(req);
        const slug = v => String(v || "").normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
        const supplier = String(b.supplier || "").trim().slice(0, 80), product = String(b.product || "").trim().slice(0, 80);
        const s1 = [slug(supplier), slug(product)].filter(Boolean).join("-");
        if (!supplier || !s1) return send(res, 400, { code: "invalid_argument", message: "Enter the supplier's name in English letters or numbers." });
        if (!LIB_CAT[b.cat]) return send(res, 400, { code: "invalid_argument", message: "Choose a category." });
        const pages = Math.floor(Number(b.pages));
        if (!(pages >= 1 && pages <= 2000)) return send(res, 400, { code: "invalid_argument", message: "That PDF has too many pages (2,000 at most)." });
        const lib = await libIndex(), old = await libCatRead(s1);
        if (lib.sups[s1] || (old && old.status === "done")) return send(res, 409, { code: "exists", message: `There's already a catalogue called ${s1}. Use a different catalogue name.` });
        const c = { sup: s1, supplier, product, cat: b.cat, pdf: String(b.pdf || "").slice(0, 200), pages, drive: /^[A-Za-z0-9_-]{10,}$/.test(b.drive || "") ? b.drive : "", status: "scanning", created: new Date().toISOString(), by: me.name || "", items: [] };
        await fsp.writeFile(path.join(LIB_CATS_DIR, s1 + ".json"), JSON.stringify(c));
        return send(res, 200, { ok: true, sup: s1, prefix: `${libCatFile(b.cat)}_${s1}` });
      }
      const c = sup && await libCatRead(sup);
      if (!c) return send(res, 404, { code: "not_found", message: "That catalogue isn't one that was added from a PDF." });
      const prefix = `${libCatFile(c.cat)}_${c.sup}_p`;
      if (!sub && req.method === "DELETE") {
        for (const dir of [LIB_FULL_DIR, LIB_THUMB_DIR]) for (const f of await fsp.readdir(dir).catch(() => [])) if (f.startsWith(prefix)) await fsp.unlink(path.join(dir, f)).catch(() => {});
        await fsp.unlink(path.join(LIB_CATS_DIR, sup + ".pdf")).catch(() => {});
        await fsp.unlink(path.join(LIB_CATS_DIR, sup + ".json")).catch(() => {});
        const dp = "library/" + sup; if (store[dp]) { delete store[dp]; persist(); }
        if (store["librarytypes/" + sup]) { delete store["librarytypes/" + sup]; persist(); }
        libCache = null; broadcast({ path: dp, exists: false }); broadcast({ path: "library", index: true });
        return send(res, 200, { ok: true });
      }
      if (c.status !== "scanning") return send(res, 409, { code: "exists", message: "That catalogue is already finished." });
      if (sub === "pdf" && req.method === "PUT") { await bodyToFile(req, path.join(LIB_CATS_DIR, sup + ".pdf"), 400 * 1024 * 1024); return send(res, 200, { ok: true }); }
      if (sub && sub.startsWith("img/") && req.method === "PUT") {
        const f = sub.slice(4);
        if (!f.startsWith(prefix) || !/_p\d{3,4}_\d{2}\.jpg$/.test(f)) return send(res, 400, { code: "invalid_argument", message: "That image name doesn't belong to this catalogue." });
        const buf = await readBody(req, 12 * 1024 * 1024);
        if (!buf.length || sniffBuf(buf) !== "image/jpeg") return send(res, 400, { code: "invalid_argument", message: "That isn't a JPEG." });
        const fp = path.join(url.searchParams.get("thumb") ? LIB_THUMB_DIR : LIB_FULL_DIR, f);
        await fsp.writeFile(fp + ".tmp", buf); await fsp.rename(fp + ".tmp", fp);
        return send(res, 200, { ok: true });
      }
      if (sub === "done" && req.method === "POST") {
        const b = await readJSON(req, 8 * 1024 * 1024);
        const have = new Set(await fsp.readdir(LIB_FULL_DIR).catch(() => []));
        const items = (Array.isArray(b.items) ? b.items : []).filter(x => Array.isArray(x) && typeof x[0] === "string" && x[0].startsWith(prefix) && have.has(x[0]))
          .map(x => [x[0], Math.floor(Number(x[1])) || 1, String(x[2] || "").slice(0, 200), String(x[3] || "").slice(0, 600), LIB_CAT_TYPE[c.cat] || ""]);
        if (!items.length) return send(res, 400, { code: "invalid_argument", message: "No product images were found in that PDF." });
        // Images uploaded but left out of the list (logos repeated on every page) are removed.
        const keep = new Set(items.map(x => x[0]));
        for (const dir of [LIB_FULL_DIR, LIB_THUMB_DIR]) for (const f of await fsp.readdir(dir).catch(() => [])) if (f.startsWith(prefix) && !keep.has(f)) await fsp.unlink(path.join(dir, f)).catch(() => {});
        Object.assign(c, { items, status: "done", finished: new Date().toISOString() });
        await fsp.writeFile(path.join(LIB_CATS_DIR, sup + ".json"), JSON.stringify(c));
        libCache = null; broadcast({ path: "library", index: true });
        if (!LIB_CAT_TYPE[c.cat]) enqueue(() => classifyCat(sup));
        return send(res, 200, { ok: true, n: items.length, sorting: !LIB_CAT_TYPE[c.cat] && !!ANTHROPIC_API_KEY });
      }
      return send(res, 404, { code: "not_found" });
    }
    const lm = p.match(/^\/lib\/(sprites\/s\d{3}\.jpg)$/);
    if (lm && req.method === "GET") {
      try { return send(res, 200, await fsp.readFile(path.join(LIB_DIR, lm[1])), { "Content-Type": lm[1].endsWith(".json") ? "application/json" : "image/jpeg", "Cache-Control": "private, max-age=86400" }); } catch (_) { return send(res, 404, "Not found"); }
    }
    const fm = p.match(/^\/(?:lib|api\/library)\/full\/([A-Za-z0-9_.-]+\.jpg)$/);
    if (fm) {
      // GET /lib/full/<file>: the full-size image (any signed-in user). PUT /api/library/full/<file>: an admin uploads one.
      const lib = await libIndex(); if (!lib || !lib.byFile.has(fm[1])) return send(res, 404, "Not found");
      const fp = path.join(LIB_FULL_DIR, fm[1]);
      if (req.method === "GET" && p.startsWith("/lib/")) {
        try { return send(res, 200, await fsp.readFile(fp), { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=604800" }); } catch (_) { return send(res, 404, "Not found"); }
      }
      if (req.method === "PUT" && p.startsWith("/api/")) {
        if (!isAdmin) return deny("Only admins can upload library images.");
        const buf = await readBody(req, 12 * 1024 * 1024);
        if (!buf.length || sniffBuf(buf) !== "image/jpeg") return send(res, 400, { code: "invalid_argument", message: "That isn't a JPEG." });
        await fsp.writeFile(fp + ".tmp", buf); await fsp.rename(fp + ".tmp", fp);
        return send(res, 200, { ok: true });
      }
    }
    if (p === "/api/library/full" && req.method === "GET") {
      // Which library images have a full-size copy: { files: [...] }
      const lib = await libIndex();
      const files = (await fsp.readdir(LIB_FULL_DIR).catch(() => [])).filter(f => lib && lib.byFile.has(f));
      return send(res, 200, { files });
    }
    // Favourites: each person's own starred library images, in libraryfav/<user id> = { f: [file names] }.
    if (p === "/api/library/fav") {
      const dp = "libraryfav/" + me.id;
      if (req.method === "GET") return send(res, 200, { files: store[dp]?.data?.f || [] });
      if (req.method !== "POST") return send(res, 405, { code: "method_not_allowed" });
      const b = await readJSON(req), idx = await libIndex();
      if (typeof b.file !== "string" || !idx.byFile.has(b.file)) return send(res, 400, { code: "invalid_argument" });
      const cur = store[dp], f = new Set(cur?.data?.f || []);
      if (b.on) { if (f.size >= 5000) return send(res, 400, { code: "invalid_argument", message: "Favourites are full (5,000 images)." }); f.add(b.file); } else f.delete(b.file);
      const next = { f: [...f], updated: new Date().toISOString() };
      store[dp] = { data: next, version: (cur?.version || 0) + 1, updatedAt: next.updated };
      persist(); return send(res, 200, { ok: true, files: next.f });
    }
    // "Have something you want?": find similar products in the library from a photo, step by step.
    // type: Claude says which product types to look in. match: the browser sends numbered contact sheets of the
    // images in those types that this person can see, and Claude picks the ones that look like the photo.
    if (p === "/api/library/similar" && req.method === "POST") {
      if (!ANTHROPIC_API_KEY) return send(res, 503, { code: "sampling_disabled", message: "Claude isn't set up on this server yet. Add an Anthropic API key (ANTHROPIC_API_KEY) in Render." });
      const b = await readJSON(req, 16 * 1024 * 1024);
      const img = b.image && /^image\/(jpeg|png|webp)$/.test(b.image.media_type) && typeof b.image.data === "string" && b.image.data.length < 4e6 ? b.image : null;
      if (!img) return send(res, 400, { code: "invalid_argument", message: "Add a photo first." });
      const note = String(b.note || "").trim().slice(0, 300);
      const ask = async (content, model, max_tokens) => {
        const r = await fetch(API_URL, { method: "POST", headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens, messages: [{ role: "user", content }] }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw Object.assign(new Error(j?.error?.message || "Claude API error " + r.status), { code: r.status === 429 ? "rate_limited" : "upstream_error" });
        return parseJSON((j.content || []).map(x => x.text || "").join("")) || {};
      };
      const photo = { type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } };
      try {
        if (b.step === "type") {
          const out = await ask([photo, { type: "text", text: `${note ? `The person says: "${note}"\n` : ""}What product is this person looking for? Pick the product types to search, most likely first (one, or two if it could be either):
S sofa · L lounge or arm chair · C dining or office chair · T stool or bar stool · B bench, ottoman or pouf · K coffee or side table · D dining table · E desk, console or dressing table · G cabinet, sideboard, shelving, TV unit or wardrobe · R bed or nightstand · 1 office furniture (workstation, office desk or chair, meeting table, office storage) · H light or lamp · P plumbing fixture (tap, sink, toilet, bath, shower) · X bathroom vanity · Z mirror · M millwork (cabinetry, built-ins) · I door · N stone · J flooring (tile, wood, vinyl, carpet) · W wall panelling or wood product · Q partition system · V glass product · Y signage · A rug, vase, art or other decor · O anything else.
In a room scene, use the most prominent piece unless the person says otherwise. Reply with JSON only: {"types":"D","what":"short description in English","zh":"the same in Chinese"}` }], MODELS.quick, 200);
          const types = [...new Set(String(out.types || "").toUpperCase().replace(/[^A-Z1]/g, "").split(""))].filter(c => LIB_TYPES.includes(c)).slice(0, 2);
          return send(res, 200, { types: types.length ? types : ["O"], what: String(out.what || "").slice(0, 200), zh: String(out.zh || "").slice(0, 200) });
        }
        if (b.step === "match") {
          const sheets = Array.isArray(b.sheets) ? b.sheets.filter(s => s && typeof s.data === "string" && s.data.length < 1.5e6 && Number.isInteger(s.n) && s.n > 0 && s.n <= 36).slice(0, 8) : [];
          if (!sheets.length) return send(res, 400, { code: "invalid_argument" });
          const content = [{ type: "text", text: "This is what the person wants:" }, photo];
          sheets.forEach((s, i) => content.push({ type: "text", text: `Sheet ${i + 1} (${s.n} products, numbered 1 to ${s.n} in the top-left corner of each square):` }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: s.data } }));
          content.push({ type: "text", text: `${note ? `The person says: "${note}"\n` : ""}Find the products on the sheets that are most similar to what the person wants: the same kind of product with a similar shape, style and look. Score each from 0 to 100 (100 = the same or nearly the same product, 70 = clearly similar, below 55 = not really similar). List at most 12, best first, and leave out anything under 55. If nothing is similar, return an empty list.
Reply with JSON only: {"matches":[{"s":1,"c":5,"score":82}]}  (s = sheet number, c = square number)` });
          const out = await ask(content, MODELS.default, 600);
          const matches = (Array.isArray(out.matches) ? out.matches : []).map(m => ({ s: Number(m.s), c: Number(m.c), score: Math.round(Number(m.score) || 0) }))
            .filter(m => Number.isInteger(m.s) && m.s >= 1 && m.s <= sheets.length && Number.isInteger(m.c) && m.c >= 1 && m.c <= sheets[m.s - 1].n && m.score >= 55).slice(0, 12);
          return send(res, 200, { matches });
        }
      } catch (e) { console.error("similar:", e.message); return send(res, 502, { code: e.code || "upstream_error", message: "The search didn't finish. Try again." }); }
      return send(res, 400, { code: "invalid_argument" });
    }
    // TBS (to be sourced): a photo someone wants that the library doesn't have. Stored as sourcing/<id>.
    // It lands as "review" for an admin to look at; the admin sends it to the sourcing agent ("sent", emailed to
    // their QQ address when mail is set up); the agent or an admin marks it "sourced". Old "open" ones count as review.
    // Admins see them all; sourcing agents see the ones sent to them; anyone else sees their own.
    if (p === "/api/sourcing" && req.method === "GET") {
      const all = Object.entries(store).filter(([k]) => /^sourcing\/[^/]+$/.test(k)).map(([k, v]) => ({ id: k.slice(9), ...forUser(me, k, v.data) })).filter(x => canRead(me, "sourcing/" + x.id));
      return send(res, 200, { requests: all.sort((x, y) => String(y.at).localeCompare(String(x.at))), role: me.role, me: me.id, ...(isAdmin ? { mail: mailOn(), agentEmail: store["tbscfg/main"]?.data?.agentEmail || people.users.filter(u => u.role === "agent" && u.email && !u.disabled).map(u => u.email)[0] || "" } : {}) });
    }
    if (p === "/api/sourcing/request" && req.method === "POST") {
      const b = await readJSON(req, 6 * 1024 * 1024);
      const buf = typeof b.photo === "string" && b.photo.length < 4e6 ? Buffer.from(b.photo, "base64") : null;
      if (!buf || sniffBuf(buf) !== "image/jpeg") return send(res, 400, { code: "invalid_argument", message: "Add a photo first." });
      const mine = Object.entries(store).filter(([k, v]) => /^sourcing\//.test(k) && v.data?.by?.id === me.id && v.data.status !== "sourced").length;
      if (mine >= 50) return send(res, 400, { code: "invalid_argument", message: "You have 50 open requests. Wait for some to be sourced first." });
      const photo = crypto.randomBytes(16).toString("hex");
      await fsp.writeFile(path.join(BLOB_DIR, photo), buf);
      await fsp.writeFile(path.join(BLOB_DIR, photo + ".json"), JSON.stringify({ contentType: "image/jpeg", sizeBytes: buf.length, createdAt: new Date().toISOString(), source: "sourcing request" }));
      const pid = String(b.project || ""), proj = pid && store["projects/" + pid] && canSeeProject(me, pid) ? { id: pid, name: String(store["projects/" + pid].data?.name || "") } : null;
      const doc = { photo, note: String(b.note || "").trim().slice(0, 1000), what: String(b.what || "").slice(0, 200), zh: String(b.zh || "").slice(0, 200), project: proj,
        by: { id: me.id, name: me.name || "", role: me.role }, at: new Date().toISOString(), status: "review" };
      const id = crypto.randomBytes(10).toString("hex"), dp = "sourcing/" + id;
      store[dp] = { data: doc, version: 1, updatedAt: doc.at };
      persist(); broadcast({ path: dp, exists: true, data: doc });
      // Let the studio know there's something to review (by email, when mail is set up).
      const notify = (process.env.TBS_NOTIFY_EMAIL || "").split(/[,;\s]+/).filter(Boolean);
      const admins = notify.length ? notify : people.users.filter(u => u.role === "admin" && u.email && !u.disabled).map(u => u.email);
      if (mailOn() && admins.length && me.role !== "admin") {
        const link = `${origin(req)}/?tbs=${id}`;
        sendMail(admins, `Sourcebook · New item to review (TBS): ${doc.what || "photo"}`,
          `${doc.by.name || "Someone"} (${doc.by.role}) sent a photo of something they want.\n\n${doc.what ? "What it looks like: " + doc.what + "\n" : ""}${doc.note ? "Their note: " + doc.note + "\n" : ""}${proj ? "Project: " + proj.name + "\n" : ""}\nReview it and send it to the sourcing agent: ${link}\n`,
          [{ name: "photo.jpg", type: "image/jpeg", data: buf }]).catch(e => console.error("TBS notify email:", e.message));
      }
      return send(res, 200, { ok: true, id });
    }
    if (p === "/api/sourcing/send" && req.method === "POST") {
      // An admin sends a TBS item to the sourcing agent: by email (photo attached) when mail is set up, and in Sourcebook.
      if (!isAdmin) return deny("Only admins can send requests to the sourcing agent.");
      const b = await readJSON(req), dp = "sourcing/" + String(b.id || ""), cur = store[dp];
      if (!/^sourcing\/[0-9a-f]{20}$/.test(dp) || !cur) return send(res, 404, { code: "not_found", message: "That request no longer exists." });
      const to = String(b.to || "").split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean).slice(0, 3);
      const msg = String(b.message || "").trim().slice(0, 2000);
      let emailed = false;
      if (to.length) {
        if (!to.every(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) return send(res, 400, { code: "invalid_argument", message: "That email doesn't look right." });
        if (!mailOn()) return send(res, 503, { code: "mail_disabled", message: "Email isn't set up on this server yet. Add the SMTP settings in Render, or send it in Sourcebook only." });
        const d = cur.data, link = `${origin(req)}/?tbs=${b.id}`;
        let photo = null; try { photo = await fsp.readFile(path.join(BLOB_DIR, d.photo)); } catch (_) {}
        try {
          await sendMail(to, `选材手册 · 待采购 TBS：${d.zh || d.what || "照片"}`,
            `您好，\n\n请帮忙寻找这件产品，照片见附件。\n\n${d.zh || d.what ? "描述：" + (d.zh || d.what) + "\n" : ""}${d.note ? "请求人备注：" + d.note + "\n" : ""}${msg ? "工作室留言：" + msg + "\n" : ""}${d.project ? "项目：" + d.project.name + "\n" : ""}\n在选材手册中查看，找到后请标记为“已采购”：${link}\n\n` +
            `----\nHello,\n\nPlease find this item for us. The photo is attached.\n\n${d.what ? "What it looks like: " + d.what + "\n" : ""}${d.note ? "Note from the person who asked: " + d.note + "\n" : ""}${msg ? "Message from the studio: " + msg + "\n" : ""}${d.project ? "Project: " + d.project.name + "\n" : ""}\nOpen it in Sourcebook and mark it sourced when you find it: ${link}\n`,
            photo ? [{ name: "photo.jpg", type: "image/jpeg", data: photo }] : []);
          emailed = true;
        } catch (e) { console.error("TBS email:", e.message); return send(res, 502, { code: "mail_failed", message: "The email couldn't be sent. Check the SMTP settings in Render and try again." }); }
        const cfg = store["tbscfg/main"];
        store["tbscfg/main"] = { data: { ...(cfg?.data || {}), agentEmail: to.join(", ") }, version: (cfg?.version || 0) + 1, updatedAt: new Date().toISOString() };
      }
      const now = store[dp]; if (!now) return send(res, 404, { code: "not_found", message: "That request no longer exists." });
      const next = { ...now.data, status: now.data.status === "sourced" ? "sourced" : "sent", sent: { at: new Date().toISOString(), by: me.name || "", to: to.join(", "), emailed, message: msg } };
      store[dp] = { data: next, version: now.version + 1, updatedAt: next.sent.at };
      persist(); broadcast({ path: dp, exists: true, data: next });
      return send(res, 200, { ok: true, emailed });
    }
    if (p === "/api/sourcing/photo" && req.method === "POST") {
      // The studio or the sourcing agent attaches a photo of what they found (shown with the reply). { id, photo } adds; { id, remove } takes one off.
      const b = await readJSON(req, 6 * 1024 * 1024), dp = "sourcing/" + String(b.id || ""), cur = store[dp];
      if (!/^sourcing\/[0-9a-f]{20}$/.test(dp) || !cur || !canRead(me, dp)) return send(res, 404, { code: "not_found", message: "That request no longer exists." });
      if (me.role !== "admin" && me.role !== "agent") return deny("Only the studio and the sourcing agent can add photos to a request.");
      const have = Array.isArray(cur.data.found) ? cur.data.found : [];
      let found;
      if (b.remove) {
        const rm = String(b.remove); if (!have.includes(rm)) return send(res, 200, { ok: true });
        found = have.filter(x => x !== rm);
        fsp.unlink(path.join(BLOB_DIR, rm)).catch(() => {}); fsp.unlink(path.join(BLOB_DIR, rm + ".json")).catch(() => {});
      } else {
        if (have.length >= 8) return send(res, 400, { code: "invalid_argument", message: "Up to 8 photos per request." });
        const buf = typeof b.photo === "string" && b.photo.length < 4e6 ? Buffer.from(b.photo, "base64") : null;
        if (!buf || sniffBuf(buf) !== "image/jpeg") return send(res, 400, { code: "invalid_argument", message: "That isn't a photo." });
        const photo = crypto.randomBytes(16).toString("hex");
        await fsp.writeFile(path.join(BLOB_DIR, photo), buf);
        await fsp.writeFile(path.join(BLOB_DIR, photo + ".json"), JSON.stringify({ contentType: "image/jpeg", sizeBytes: buf.length, createdAt: new Date().toISOString(), source: "sourcing reply" }));
        found = [...have, photo];
      }
      const now = store[dp]; if (!now) return send(res, 404, { code: "not_found", message: "That request no longer exists." });
      const next = { ...now.data, found };
      store[dp] = { data: next, version: now.version + 1, updatedAt: new Date().toISOString() };
      persist(); broadcast({ path: dp, exists: true, data: next });
      return send(res, 200, { ok: true, found });
    }
    if (p === "/api/sourcing/update" && req.method === "POST") {
      const b = await readJSON(req), dp = "sourcing/" + String(b.id || ""), cur = store[dp];
      if (!/^sourcing\/[0-9a-f]{20}$/.test(dp) || !cur || !canRead(me, dp)) return send(res, 404, { code: "not_found", message: "That request no longer exists." });
      const own = cur.data.by?.id === me.id, staff = me.role === "admin" || me.role === "agent", inReview = ["review", "open"].includes(cur.data.status);
      if (b.remove) {
        // The person who asked can withdraw it until it's sent to the agent; admins can remove any.
        if (!isAdmin && !(own && inReview)) return deny("Only admins can remove a request.");
        delete store[dp]; persist(); broadcast({ path: dp, exists: false });
        for (const ph of [cur.data.photo, ...(Array.isArray(cur.data.found) ? cur.data.found : [])]) { fsp.unlink(path.join(BLOB_DIR, ph)).catch(() => {}); fsp.unlink(path.join(BLOB_DIR, ph + ".json")).catch(() => {}); }
        return send(res, 200, { ok: true });
      }
      if (!staff) return deny("Only the studio and the sourcing agent can update a request.");
      // Sourced, or back to sent (reopen). An agent's reopen goes back to them; an admin's to review if it was never sent.
      let status = cur.data.status;
      if (b.status === "sourced") status = "sourced";
      else if (b.status === "reopen" && status === "sourced") status = cur.data.sent ? "sent" : "review";
      const next = { ...cur.data, status, reply: typeof b.reply === "string" ? b.reply.trim().slice(0, 2000) : cur.data.reply || "", ...(status !== cur.data.status ? { done: status === "sourced" ? { by: me.name || "", role: me.role, at: new Date().toISOString() } : null } : {}) };
      store[dp] = { data: next, version: cur.version + 1, updatedAt: new Date().toISOString() };
      persist(); broadcast({ path: dp, exists: true, data: next });
      return send(res, 200, { ok: true });
    }
    if (p === "/api/library/type" && req.method === "POST") {
      // { sup, keys, type } moves images to another product type in librarytypes/<sup>.t
      if (!isAdmin) return deny("Only admins can sort library images.");
      const b = await readJSON(req);
      const dp = "librarytypes/" + b.sup;
      if (typeof b.sup !== "string" || !validPath(dp, true) || !Array.isArray(b.keys) || b.keys.length > 5000 || typeof b.type !== "string" || b.type.length !== 1 || !LIB_TYPES.includes(b.type)) return send(res, 400, { code: "invalid_argument" });
      const cur = store[dp], t0 = { ...(cur?.data?.t || {}) };
      b.keys.map(Number).filter(k => Number.isInteger(k) && k >= 0 && k < 1e7).forEach(k => (t0[k] = b.type));
      const next = { t: t0, updated: new Date().toISOString(), by: me.name || "" };
      store[dp] = { data: next, version: (cur?.version || 0) + 1, updatedAt: next.updated };
      persist(); broadcast({ path: dp, exists: true, data: next });
      return send(res, 200, { ok: true });
    }
    if (p === "/api/library/set" && req.method === "POST") {
      // { sup, keys: [page*100 + image number], on: true|false } approves or unapproves images in library/<sup>.on
      if (!isAdmin) return deny("Only admins can approve library images.");
      const b = await readJSON(req);
      const dp = "library/" + b.sup;
      if (typeof b.sup !== "string" || !validPath(dp, true) || !Array.isArray(b.keys) || b.keys.length > 5000) return send(res, 400, { code: "invalid_argument" });
      const keys = b.keys.map(Number).filter(k => Number.isInteger(k) && k >= 0 && k < 1e7);
      const cur = store[dp];
      const set = new Set((cur?.data?.on || []).map(Number));
      keys.forEach(k => (b.on ? set.add(k) : set.delete(k)));
      const next = { on: [...set].sort((x, y) => x - y), updated: new Date().toISOString(), by: me.name || "" };
      store[dp] = { data: next, version: (cur?.version || 0) + 1, updatedAt: next.updated };
      persist(); broadcast({ path: dp, exists: true, data: next });
      return send(res, 200, { ok: true, on: next.on.length });
    }
    if (p === "/api/library/add" && req.method === "POST") {
      // { project, file, photo?: base64 JPEG, prefix?: "SF" } adds an approved library image to a project as a piece.
      // Built here from the catalogue index so clients (who can't otherwise create pieces) can add them too.
      const b = await readJSON(req, 4 * 1024 * 1024);
      const pid = String(b.project || "");
      if (!validPath("projects/" + pid, true) || !store["projects/" + pid]) return send(res, 404, { code: "not_found", message: "That project no longer exists." });
      if (!canSeeProject(me, pid)) return deny("You can't add to that project.");
      const lib = await libIndex();
      const it = lib && lib.byFile.get(String(b.file || ""));
      if (!it) return send(res, 400, { code: "invalid_argument", message: "That image isn't in the library." });
      const [file, sup, page, codesStr, text] = it; const S = lib.sups[sup] || {};
      const m = file.match(/_p(\d+)_(\d+)\.jpg$/); const key = m ? Number(m[1]) * 100 + Number(m[2]) : -1;
      if (!isAdmin && !(store["library/" + sup]?.data?.on || []).includes(key)) return deny("That image hasn't been approved yet.");
      const pre = `projects/${pid}/items/`;
      const items = Object.entries(store).filter(([k]) => k.startsWith(pre) && k.split("/").length === 4).map(([, v]) => v.data);
      const dup = Object.entries(store).find(([k, v]) => k.startsWith(pre) && v.data?.libSource?.file === file);
      if (dup) return send(res, 200, { ok: true, id: dup[0].split("/")[3], code: dup[1].data.code, existing: true });
      const L = LIB_LABEL[sup] || S.label || [sup, ""];
      const category = LIB_CAT[S.cat] || "Finishes";
      const t0 = String(text || "");
      const zhPrefix = /沙发/.test(t0) ? "SF" : /(休闲椅|躺椅)/.test(t0) ? "LC" : /凳/.test(t0) ? "STL" : /椅/.test(t0) ? "CH" : /(茶几|餐台|餐桌|桌|几)/.test(t0) ? "TB" : /(柜|架)/.test(t0) ? "CR" : /床/.test(t0) ? "BD" : null;
      const prefix = zhPrefix || (/^[A-Z]{1,5}$/.test(b.prefix || "") ? b.prefix : category === "Furniture" ? "F" : "M");
      const used = new Set(items.map(x => String(x.code || "").toUpperCase().match(/^([A-Z]+)-?(\d+)/)).filter(x => x && x[1] === prefix).map(x => Number(x[2])));
      let n = 1; while (used.has(n)) n++;
      const code = `${prefix}-${n}`;
      let photo = null;
      if (typeof b.photo === "string" && b.photo.length < 3e6) {
        const buf = Buffer.from(b.photo, "base64");
        if (buf.length && sniffBuf(buf) === "image/jpeg") {
          photo = crypto.randomBytes(16).toString("hex");
          await fsp.writeFile(path.join(BLOB_DIR, photo), buf);
          await fsp.writeFile(path.join(BLOB_DIR, photo + ".json"), JSON.stringify({ contentType: "image/jpeg", sizeBytes: buf.length, createdAt: new Date().toISOString(), source: "library:" + file }));
        }
      }
      const codes = String(codesStr || "").split(" ").filter(Boolean);
      const drive = S.drive ? `https://drive.google.com/file/d/${S.drive}/view` : S.up ? `/lib/pdf/${sup}.pdf` : null;
      const doc = { specs: [], photo, photoFit: "contain", name: codes[0] ? `${codes[0]} · ${L[0]}` : `${L[0]} ${L[1]} · p${page}`.trim(), description: L[1] ? `${L[0]} ${L[1]}` : "",
        category, supplier: L[0], product: L[1] || "", modelCode: codes[0] || "", zone: "", ...(category === "Furniture" ? { furnType: prefix } : {}),
        code, qty: null, unit: "ea", leadWeeks: null, needBy: null, unitCost: null, status: "Concept", material: "wood", color: "#C9C3B8",
        notes: `From the sourcing library: ${file}`, refs: [{ kind: "Spec sheet", no: "p." + page, title: S.pdf || "", url: drive, asset: null }],
        libSource: { file, sup, page, pdf: S.pdf || "", drive: S.drive || "" }, created: new Date().toISOString(), source: "Sourcing library", addedBy: { id: me.id, name: me.name || "", role: me.role } };
      const id = crypto.randomBytes(10).toString("hex");
      const dp = pre + id, tracked = trackChanges(me, null, doc);
      store[dp] = { data: tracked, version: 1, updatedAt: doc.created };
      persist(); broadcast({ path: dp, exists: true, data: tracked });
      return send(res, 200, { ok: true, id, code });
    }

    // find products online
    if (p.startsWith("/api/match/") && req.method === "POST") {
      if (!isAdmin) return deny("Only admins can find products online.");
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
        // Pages and scripts are always re-checked, so an update shows up on the next reload.
        const data = await fsp.readFile(full);
        return send(res, 200, data, { "Content-Type": MIME[path.extname(full)] || "application/octet-stream", "Cache-Control": /\.(html|js)$/.test(full) ? "no-cache" : "public, max-age=3600" });
      } catch (_) { return send(res, 404, "Not found"); }
    }
    send(res, 404, "Not found");
  } catch (e) {
    console.error(e.message);
    if (!res.headersSent) send(res, e.status || 500, { code: e.code || (e.status === 413 ? "too_large" : "upstream_error"), message: e.message });
  }
});
if (!exists(path.join(PUBLIC_DIR, "dashboard.html")) || !exists(path.join(PUBLIC_DIR, "index.html"))) console.error("MISSING APP FILES: dashboard.html and index.html must be in the repository (in public/ or at the top level).");
server.listen(PORT, () => { classifyPending().catch(() => {}); console.log(`Sourcebook running on port ${PORT} · data in ${DATA_DIR}${APP_PASSWORD ? " · password on" : " · NO PASSWORD SET"} · ${people.users.length} people${ANTHROPIC_API_KEY ? "" : " · Claude off (no ANTHROPIC_API_KEY)"}`); });
process.on("SIGTERM", async () => { clearTimeout(saveTimer); try { fs.writeFileSync(DB_FILE, JSON.stringify(store)); } catch (_) {} process.exit(0); });
