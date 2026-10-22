// Notes from the studio for the sourcing agent: an admin presses "Send to agent" on a product card and writes a note.
// For the agent this shows a pulsing alert at the top of the dashboard and every project until they open the piece or
// mark it seen. It shows nothing for anyone else. Loaded on every page; the project page calls SBAgentNotes to refresh
// it when pieces change and to mark a piece seen once its card is open.
(function () {
  "use strict";
  const ZH = {
    "Note from the studio": "工作室留言", "Notes from the studio": "工作室留言", "Open": "打开", "✓ Seen": "✓ 已读", "Mark as seen": "标为已读",
    "Turn on alerts": "开启提醒", "Studio": "工作室", "New note from the studio": "工作室新留言",
  };
  const zh = () => { try { return localStorage.getItem("sb_lang") === "zh"; } catch (_) { return false; } };
  const t = s => (zh() ? ZH[s] ?? s : s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const when = iso => { if (!iso) return ""; const d = new Date(iso); if (isNaN(d)) return ""; const L = zh() ? "zh-CN" : "en-CA";
    return d.toLocaleDateString(L, { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString(L, { hour: "numeric", minute: "2-digit" }); };

  const CSS = `
.sban{position:fixed;z-index:95;top:calc(10px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);width:min(680px,calc(100vw - 24px));max-height:min(60vh,520px);overflow:auto;
  background:#1E7A3C;color:#fff;font-family:var(--sans,system-ui);font-size:14px;line-height:1.45;border-radius:4px;box-shadow:0 10px 32px rgba(0,0,0,.25);animation:sbanpulse 1.6s ease-in-out infinite}
@keyframes sbanpulse{0%,100%{box-shadow:0 10px 32px rgba(0,0,0,.25),0 0 0 0 rgba(30,122,60,.7)}50%{box-shadow:0 10px 32px rgba(0,0,0,.25),0 0 0 12px rgba(30,122,60,0)}}
.sban-row{display:grid;grid-template-columns:1fr auto;gap:4px 14px;align-items:center;padding:12px 16px}
.sban-row + .sban-row{border-top:1px solid rgba(255,255,255,.25)}
.sban-eb{font:11px var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;opacity:.85}
.sban-eb b{display:inline-block;margin-right:6px;animation:sbandot 1.6s ease-in-out infinite}
@keyframes sbandot{50%{opacity:.25}}
.sban-pc{display:block;font-weight:600;margin-top:2px}
.sban-tx{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap;margin-top:2px}
.sban-by{display:block;font-size:12px;opacity:.8;margin-top:3px}
.sban-act{display:flex;gap:8px;align-items:center;grid-row:1 / span 4;grid-column:2}
.sban-act button{font:inherit;font-size:13px;padding:6px 12px;border:1px solid #fff;background:#fff;color:#1E7A3C;cursor:pointer;white-space:nowrap}
.sban-act button.ghost{background:transparent;color:#fff}
.sban-more{padding:8px 16px 12px;font-size:13px;opacity:.9;display:flex;gap:14px;flex-wrap:wrap}
.sban-more button{background:none;border:0;padding:0;color:#fff;font:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
@media (max-width:560px){.sban-row{grid-template-columns:1fr}.sban-act{grid-row:auto;grid-column:auto;margin-top:6px}}
@media print{.sban{display:none}}
`;
  let notes = [], agent = null, loading = null, timer = null, el = null, known = null, all = false;

  async function isAgent() {
    if (agent !== null) return agent;
    try { const r = await fetch("/api/me"); const me = r.ok ? await r.json() : null; agent = !!(me && me.role === "agent"); } catch (_) { agent = false; }
    return agent;
  }
  const key = n => n.project.id + "|" + n.item.id + "|" + n.note.at;
  function load() {
    if (loading) return loading;
    loading = fetch("/api/agentnotes").then(r => { if (!r.ok) throw 0; return r.json(); })
      .then(j => {
        notes = j.notes || [];
        // a system alert for notes that arrived while the page was open and in the background
        const keys = new Set(notes.map(key)), fresh = known ? notes.filter(n => !known.has(key(n))) : [];
        known = keys;
        if (fresh.length && window.Notification && Notification.permission === "granted" && (document.hidden || !document.hasFocus())) {
          const n = fresh[0]; try { new Notification(t("New note from the studio"), { body: [n.item.code, n.item.name].filter(Boolean).join(" ") + " · " + n.note.text, icon: "/icon-192.png", tag: "sb-agentnote" }); } catch (_) {}
        }
        const o = typeof window.SBAgentNotesOpen === "function" && window.SBAgentNotesOpen(); if (o) seenItem(o[0], o[1]);
      })
      .catch(() => {})
      .finally(() => { loading = null; paint(); });
    return loading;
  }
  function rowHTML(n) {
    return `<div class="sban-row"><div><span class="sban-eb"><b>●</b>${t("Note from the studio")} · ${esc(n.project.name)}</span>
      <span class="sban-pc">${esc([n.item.code, n.item.name].filter(Boolean).join(" · "))}</span>
      <span class="sban-tx">${esc(n.note.text)}</span>
      <span class="sban-by">${esc(n.note.by === "Studio owner" || !n.note.by ? t("Studio") : n.note.by)} · ${esc(when(n.note.at))}</span></div>
      <span class="sban-act"><button type="button" data-sban="go" data-p="${esc(n.project.id)}" data-i="${esc(n.item.id)}">${t("Open")}</button><button type="button" class="ghost" data-sban="seen" data-p="${esc(n.project.id)}" data-i="${esc(n.item.id)}" title="${esc(t("Mark as seen"))}">${t("✓ Seen")}</button></span></div>`;
  }
  function paint() {
    if (!agent || !notes.length) { if (el) { el.remove(); el = null; } return; }
    if (!el) { el = document.createElement("div"); el.className = "sban"; el.setAttribute("role", "alert"); el.setAttribute("data-noi18n", ""); document.body.appendChild(el); }
    const show = all ? notes : notes.slice(0, 3), more = notes.length - show.length;
    const canAlert = window.Notification && Notification.permission === "default";
    el.innerHTML = show.map(rowHTML).join("") + (more || canAlert ? `<div class="sban-more">${more ? `<button type="button" data-sban="all">${zh() ? `另有 ${more} 条` : `and ${more} more`}</button>` : ""}${canAlert ? `<button type="button" data-sban="alerts">${t("Turn on alerts")}</button>` : ""}</div>` : "");
  }
  function seenItem(project, item) {
    if (!agent || !notes.some(n => n.project.id === project && n.item.id === item)) return;
    notes = notes.filter(n => !(n.project.id === project && n.item.id === item)); paint();
    fetch("/api/agentnotes/seen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project, item }) }).catch(() => {});
  }
  function go(project, item) {
    seenItem(project, item);
    if (window.SOURCEBOOK_PROJECT === project) { if (location.hash === "#agent=" + item) window.dispatchEvent(new HashChangeEvent("hashchange")); else location.hash = "agent=" + item; }
    else location.href = "/p/" + encodeURIComponent(project) + "#agent=" + encodeURIComponent(item);
  }
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-sban]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const a = b.dataset.sban;
    if (a === "go") go(b.dataset.p, b.dataset.i);
    else if (a === "seen") seenItem(b.dataset.p, b.dataset.i);
    else if (a === "all") { all = true; paint(); }
    else if (a === "alerts") Notification.requestPermission().then(paint);
  }, true);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && agent) load(); });

  function start() {
    if (!document.getElementById("sban-css")) { const st = document.createElement("style"); st.id = "sban-css"; st.textContent = CSS; document.head.appendChild(st); }
    isAgent().then(a => { if (!a) return; load(); if (!timer) timer = setInterval(() => { if (!document.hidden) load(); }, 30000); });
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);

  let refreshT = null;
  window.SBAgentNotes = {
    refresh() { if (!agent) return; clearTimeout(refreshT); refreshT = setTimeout(load, 800); },
    seenItem,
  };
})();
