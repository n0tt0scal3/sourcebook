// Provides window.claude.use(...) on a self-hosted server, backed by /api/*.
// Implements the parts of the claude.ai runtime the Sourcebook page uses:
// db, assets, sample (Claude), downloads, user.
(function () {
  "use strict";
  const err = (code, message) => Object.assign(new Error(message || code), { code, message: message || code });
  async function api(url, opts) {
    let r;
    try { r = await fetch(url, opts); } catch (_) { throw err("unavailable", "Network error"); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw err(j.code || (r.status === 413 ? "too_large" : "unavailable"), j.message);
    return j;
  }
  // Each project lives under projects/<id>/ on the server; the page only sees its own paths.
  const pm = location.pathname.match(/^\/p\/([A-Za-z0-9_\-.~:@+]{1,200})\/?$/);
  const NS = pm ? "projects/" + decodeURIComponent(pm[1]) + "/" : "";
  window.SOURCEBOOK_PROJECT = pm ? decodeURIComponent(pm[1]) : null;
  const post = (url, body) => api(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  /* ---------- db ---------- */
  const cols = new Map();   // collection path -> Map(id -> data)
  const docs = new Map();   // doc path -> data|null
  const colSubs = new Map(); // collection path -> Set(fn)
  const docSubs = new Map(); // doc path -> Set(fn)
  const snapDoc = (id, data) => ({ id, exists: data != null, data: () => (data == null ? undefined : data), metadata: { fromCache: false, hasPendingWrites: false } });
  function emitCol(cp) {
    const m = cols.get(cp); const subs = colSubs.get(cp); if (!m || !subs) return;
    const list = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([id, d]) => snapDoc(id, d));
    const snap = { docs: list, size: list.length, empty: !list.length, docChanges: () => list.map((doc, i) => ({ type: "added", doc, oldIndex: -1, newIndex: i })), metadata: { fromCache: false, hasPendingWrites: false } };
    subs.forEach(fn => { try { fn(snap); } catch (e) { console.error(e); } });
  }
  function emitDoc(dp) { const subs = docSubs.get(dp); if (!subs) return; const d = docs.has(dp) ? docs.get(dp) : null; subs.forEach(fn => { try { fn(snapDoc(dp.split("/").pop(), d)); } catch (e) { console.error(e); } }); }
  function applyLocal(dp, data) {
    const i = dp.lastIndexOf("/"), cp = dp.slice(0, i), id = dp.slice(i + 1);
    if (docs.has(dp) || docSubs.has(dp)) { docs.set(dp, data); emitDoc(dp); }
    const m = cols.get(cp); if (m) { if (data == null) m.delete(id); else m.set(id, data); emitCol(cp); }
  }
  // live updates from other devices
  let es = null;
  function connect() {
    if (es) return; es = new EventSource("/api/events");
    es.onmessage = e => { try { const m = JSON.parse(e.data); if (!m.path.startsWith(NS)) return; applyLocal(m.path.slice(NS.length), m.exists ? m.data : null); } catch (_) {} };
    es.onopen = () => { cols.forEach((_, cp) => refreshCol(cp)); docSubs.forEach((_, dp) => refreshDoc(dp)); };
  }
  async function refreshCol(cp) { const j = await api("/api/db/col?path=" + encodeURIComponent(NS + cp)); const m = new Map(); j.docs.forEach(d => m.set(d.id, d.data)); cols.set(cp, m); emitCol(cp); }
  async function refreshDoc(dp) { const j = await api("/api/db/doc?path=" + encodeURIComponent(NS + dp)); docs.set(dp, j.exists ? j.data : null); emitDoc(dp); }
  const rid = () => { const a = "abcdefghijklmnopqrstuvwxyz0123456789"; let s = ""; const b = crypto.getRandomValues(new Uint8Array(20)); b.forEach(x => (s += a[x % 36])); return s; };
  function merge(t, p) { const o = { ...(t || {}) }; for (const [k, v] of Object.entries(p)) { if (v && typeof v === "object" && !Array.isArray(v) && o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) o[k] = merge(o[k], v); else o[k] = v; } return o; }
  function docRef(dp) {
    const id = dp.split("/").pop();
    return {
      id, path: dp,
      async get() { const j = await api("/api/db/doc?path=" + encodeURIComponent(NS + dp)); return snapDoc(id, j.exists ? j.data : null); },
      async set(data) { const clean = JSON.parse(JSON.stringify(data)); applyLocal(dp, clean); await post("/api/db/set", { path: NS + dp, data: clean }); },
      async update(data) { const clean = JSON.parse(JSON.stringify(data)); const cur = docs.get(dp) ?? cols.get(dp.slice(0, dp.lastIndexOf("/")))?.get(id); if (cur) applyLocal(dp, merge(cur, clean)); await post("/api/db/update", { path: NS + dp, data: clean }); },
      async delete() { applyLocal(dp, null); await post("/api/db/delete", { path: NS + dp }); },
      async acquire() { return { acquired: true }; },
      onSnapshot(next, error) { connect(); if (!docSubs.has(dp)) docSubs.set(dp, new Set()); docSubs.get(dp).add(next); refreshDoc(dp).catch(e => error && error(e)); return () => docSubs.get(dp)?.delete(next); },
      collection(sub) { return colRef(dp + "/" + sub); },
    };
  }
  function colRef(cp) {
    return {
      path: cp,
      doc(id) { return docRef(cp + "/" + (id || rid())); },
      async add(data) { const r = docRef(cp + "/" + rid()); await r.set(data); return r; },
      async get() { const j = await api("/api/db/col?path=" + encodeURIComponent(NS + cp)); const list = j.docs.map(d => snapDoc(d.id, d.data)); return { docs: list, size: list.length, empty: !list.length, docChanges: () => [], metadata: {} }; },
      onSnapshot(next, error) { connect(); if (!colSubs.has(cp)) colSubs.set(cp, new Set()); colSubs.get(cp).add(next); refreshCol(cp).catch(e => error && error(e)); return () => colSubs.get(cp)?.delete(next); },
      where() { return this; }, orderBy() { return this; }, limit() { return this; },
    };
  }
  const db = Object.freeze({ doc: docRef, collection: colRef });

  /* ---------- assets ---------- */
  const assets = Object.freeze({
    async upload(blob, options) {
      const type = (options && options.type) || blob.type || "application/octet-stream";
      let r;
      try { r = await fetch("/api/assets", { method: "POST", headers: { "content-type": type }, body: blob }); } catch (_) { throw err("store_unavailable"); }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw err(r.status === 413 ? "too_large" : j.code || "upstream_error", j.message);
      return j;
    },
    async list() { return { assets: [], usage: {} }; },
    async delete() { return { deleted: false }; },
  });

  /* ---------- Claude ---------- */
  async function toImage(blob) {
    // Downsize to ~1568px on the long edge and send as JPEG, like claude.ai does.
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(err("image_rejected")); i.src = url; });
      const s = Math.min(1, 1568 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL("image/jpeg", 0.88).split(",")[1];
      return { media_type: "image/jpeg", data };
    } finally { URL.revokeObjectURL(url); }
  }
  async function sample(input, opts = {}) {
    if (opts.signal && opts.signal.aborted) throw err("cancelled");
    const imgs = opts.images ? [...(opts.images instanceof Blob ? [opts.images] : opts.images)] : [];
    const images = [];
    for (const b of imgs.slice(0, 4)) images.push(await toImage(b));
    let r;
    try { r = await fetch("/api/sample", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input, images, modelTier: opts.modelTier || "default" }), signal: opts.signal }); }
    catch (e) { throw err(opts.signal && opts.signal.aborted ? "cancelled" : "upstream_error"); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw err(j.code || "upstream_error", j.message);
    if (opts.onText) { try { opts.onText({ text: j.text, delta: j.text }); } catch (_) {} }
    return j;
  }
  sample.json = async function (input, opts) {
    const { text, truncated } = await sample(input, opts);
    const tryParse = s => { try { return { ok: true, v: JSON.parse(s) }; } catch (_) { return { ok: false }; } };
    let r = tryParse(text.trim());
    if (!r.ok) { const m = text.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) r = tryParse(m[1].trim()); }
    if (!r.ok) { const a = text.search(/[\[{]/), b = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]")); if (a >= 0 && b > a) r = tryParse(text.slice(a, b + 1)); }
    if (!r.ok || truncated) throw Object.assign(err("invalid_json"), { text });
    return r.v;
  };
  sample.limits = async () => ({ maxPromptBytes: 65536, images: { maxCount: 4, maxInputBytes: 20 * 1024 * 1024, mediaTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] }, tools: undefined });

  /* ---------- downloads ---------- */
  const downloads = Object.freeze({
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename || "download";
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return { saved: true };
    },
  });

  /* ---------- user ---------- */
  // Who's signed in: admin, agent (sourcing agent) or client.
  const mePromise = fetch("/api/me").then(r => r.ok ? r.json() : null).catch(() => null)
    .then(m => { window.SOURCEBOOK_USER = m || { id: "owner", name: "", role: "admin" }; return window.SOURCEBOOK_USER; });
  const role = () => (window.SOURCEBOOK_USER || {}).role || "admin";
  const user = Object.freeze({ isOwner: () => role() === "admin", canEdit: () => role() !== "client", can: () => role() !== "client", role, id: async () => (await mePromise).id, me: async () => mePromise, profiles: async () => ({}) });

  const caps = { db, assets, sample, downloads, user };
  window.claude = Object.freeze({ use: async name => { await mePromise; if (role() === "client" && (name === "sample" || name === "assets")) return null; return caps[name] || null; } });
})();
