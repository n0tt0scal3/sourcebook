// Supplier RFIs bell: sits next to the admin's name on the dashboard and in every project, counts RFIs and supplier
// responses from other people that the admin hasn't seen yet, and lists the latest ones across all projects.
// Each one opens its piece's Supplier RFIs. Used as <sb-rfis></sb-rfis>; it shows nothing for anyone but admins.
(function () {
  "use strict";
  const ZH = {
    "Supplier RFIs": "供应商询问（RFI）", "RFI": "询问", "Supplier response": "供应商回复", "Open": "待回复", "Answered": "已回复", "New": "新",
    "Mark all seen": "全部标为已读", "No RFIs yet. When someone adds an RFI or a supplier response to a piece, it shows here.": "暂无询问。有人在产品中添加询问或供应商回复时，会显示在这里。",
    "RFIs and supplier responses": "询问和供应商回复", "new": "条新", "Unknown": "未知", "Couldn't load the RFIs. Check your connection and try again.": "无法加载询问，请检查网络后重试。",
    "Admin": "管理员", "Sourcing agent": "采购代理", "Specifier / designer": "设计师", "Client": "客户", "Studio owner": "工作室负责人", "Close": "关闭",
    "image": "张图片", "images": "张图片", "Loading…": "正在加载…",
  };
  const ROLE = { admin: "Admin", agent: "Sourcing agent", specifier: "Specifier / designer", client: "Client" };
  const zh = () => { try { return localStorage.getItem("sb_lang") === "zh"; } catch (_) { return false; } };
  const t = s => (zh() ? ZH[s] ?? s : s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const when = iso => { if (!iso) return ""; const d = new Date(iso); if (isNaN(d)) return ""; const L = zh() ? "zh-CN" : "en-CA";
    return d.toLocaleDateString(L, { day: "numeric", month: "short", ...(d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) }) + " · " + d.toLocaleTimeString(L, { hour: "numeric", minute: "2-digit" }); };

  const CSS = `
sb-rfis{display:inline-flex;align-self:center}
.sbr-bell{position:relative;display:inline-grid;place-items:center;width:32px;height:32px;margin:-6px 2px -6px 0;padding:0;border:1px solid transparent;border-radius:50%;background:none;color:var(--ink2);cursor:pointer}
.sbr-bell:hover,.sbr-bell[aria-expanded="true"]{border-color:var(--rule);color:var(--ink)}
.sbr-bell svg{width:18px;height:18px}
.sbr-bell b{position:absolute;top:-3px;right:-5px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--crit,#A3322B);color:#fff;font:600 11px/18px var(--sans,system-ui);text-align:center}
.sbr-pop{position:fixed;z-index:90;width:min(420px,calc(100vw - 32px));max-height:min(70vh,640px);display:flex;flex-direction:column;background:var(--paper);color:var(--ink);border:1px solid var(--rule);box-shadow:0 18px 50px rgba(0,0,0,.22);font-family:var(--sans,system-ui);font-size:14px;line-height:1.45}
.sbr-hd{display:flex;align-items:baseline;gap:10px;padding:14px 16px 12px;border-bottom:1px solid var(--rule)}
.sbr-hd h4{flex:1;margin:0;font-size:11px;font-family:var(--mono,monospace);font-weight:400;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.sbr-hd .sbr-n{color:var(--crit,#A3322B)}
.sbr-hd button{white-space:nowrap;background:none;border:0;padding:0;color:var(--ink2);font:inherit;font-size:13px;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.sbr-hd button.sbr-x{margin-left:8px;text-decoration:none;font-size:20px;line-height:1}
.sbr-list{overflow:auto;overscroll-behavior:contain}
.sbr-it{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--rule2,var(--rule));padding:12px 16px 12px 28px;position:relative;color:inherit;font:inherit;cursor:pointer}
.sbr-it:hover{background:var(--ground)}
.sbr-it.new::before{content:"";position:absolute;left:12px;top:19px;width:7px;height:7px;border-radius:50%;background:var(--crit,#A3322B)}
.sbr-top{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.sbr-kind{font:11px var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--ink2)}
.sbr-kind.resp{color:var(--accent)}
.sbr-st{font-size:11px;padding:0 6px;border:1px solid var(--rule);border-radius:9px;color:var(--muted)}
.sbr-st.open{border-color:var(--warn,#A5621E);color:var(--warn,#A5621E)}
.sbr-it.new .sbr-new{font-size:11px;font-weight:600;color:var(--crit,#A3322B)}
.sbr-where{margin-left:auto;font-size:12px;color:var(--muted);text-align:right}
.sbr-pc{display:block;margin-top:2px;font-weight:500}
.sbr-tx{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:2px;color:var(--ink2);white-space:pre-wrap}
.sbr-by{display:block;margin-top:4px;font-size:12px;color:var(--muted)}
.sbr-by b{font-weight:500;color:var(--ink2)}
.sbr-empty{padding:22px 16px;color:var(--muted)}
`;
  let state = { rfis: null, unseen: 0, err: false }, pop = null, timer = null, loading = null, admin = null;
  const els = new Set();

  async function isAdmin() {
    if (admin !== null) return admin;
    try { const r = await fetch("/api/me"); const me = r.ok ? await r.json() : null; admin = !!(me && me.role === "admin"); } catch (_) { admin = false; }
    return admin;
  }
  function load() {
    if (loading) return loading;
    loading = fetch("/api/rfis").then(r => { if (!r.ok) throw 0; return r.json(); })
      .then(j => { state = { rfis: j.rfis || [], unseen: j.unseen || 0, err: false }; })
      .catch(() => { state.err = true; })
      .finally(() => { loading = null; paint(); const o = typeof window.SBRfisOpen === "function" && window.SBRfisOpen(); if (o) window.SBRfis.seenItem(o[0], o[1]); });
    return loading;
  }
  const bellSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;
  function bellHTML() {
    const n = state.unseen, lab = t("Supplier RFIs") + (n ? ` · ${n} ${t("new")}` : "");
    return `<button type="button" class="sbr-bell" data-sbr="toggle" aria-haspopup="dialog" aria-expanded="${!!pop}" title="${esc(lab)}" aria-label="${esc(lab)}">${bellSVG}${n ? `<b>${n > 99 ? "99+" : n}</b>` : ""}</button>`;
  }
  function itemHTML(x) {
    const who = x.by ? `<b>${esc(x.by.name === "Studio owner" ? t("Studio owner") : x.by.name || t("Unknown"))}</b>${x.by.role ? " · " + esc(t(ROLE[x.by.role] || x.by.role)) : ""}` : `<b>${t("Unknown")}</b>`;
    const piece = [x.item.code, x.item.name].filter(Boolean).join(" · ");
    const imgs = x.images ? ` · ${x.images} ${t(x.images === 1 ? "image" : "images")}` : "";
    return `<button type="button" class="sbr-it${x.seen ? "" : " new"}" data-sbr="go" data-p="${esc(x.project.id)}" data-i="${esc(x.item.id)}">
      <span class="sbr-top"><span class="sbr-kind${x.kind === "resp" ? " resp" : ""}">${t(x.kind === "resp" ? "Supplier response" : "RFI")}</span>${x.kind === "rfi" ? `<span class="sbr-st${x.answered ? "" : " open"}">${t(x.answered ? "Answered" : "Open")}</span>` : ""}${x.seen ? "" : `<span class="sbr-new">${t("New")}</span>`}<span class="sbr-where">${esc(x.project.name)}</span></span>
      <span class="sbr-pc">${esc(piece)}</span>
      ${x.text ? `<span class="sbr-tx">${esc(x.text)}</span>` : ""}
      <span class="sbr-by">${who} · ${esc(when(x.at))}${imgs}</span></button>`;
  }
  function popHTML() {
    const list = state.rfis;
    return `<div class="sbr-hd"><h4>${t("RFIs and supplier responses")}${state.unseen ? ` · <span class="sbr-n">${state.unseen} ${t("new")}</span>` : ""}</h4>${state.unseen ? `<button type="button" data-sbr="all">${t("Mark all seen")}</button>` : ""}<button type="button" class="sbr-x" data-sbr="close" aria-label="${t("Close")}">×</button></div>
      <div class="sbr-list">${!list ? `<p class="sbr-empty">${state.err ? t("Couldn't load the RFIs. Check your connection and try again.") : t("Loading…")}</p>` : list.length ? list.map(itemHTML).join("") : `<p class="sbr-empty">${t("No RFIs yet. When someone adds an RFI or a supplier response to a piece, it shows here.")}</p>`}</div>`;
  }
  function place() {
    if (!pop) return; const b = [...els].map(e => e.querySelector(".sbr-bell")).find(b => b && b.offsetParent); if (!b) return;
    const r = b.getBoundingClientRect(), w = pop.offsetWidth;
    pop.style.top = Math.round(r.bottom + 8) + "px"; pop.style.left = Math.round(Math.max(16, Math.min(window.innerWidth - w - 16, r.right - w))) + "px";
  }
  function paint() {
    els.forEach(e => { e.innerHTML = admin ? bellHTML() : ""; });
    if (pop) { const sc = pop.querySelector(".sbr-list")?.scrollTop || 0; pop.innerHTML = popHTML(); const l = pop.querySelector(".sbr-list"); if (l) l.scrollTop = sc; place(); }
  }
  function openPop() {
    if (pop) return; pop = document.createElement("div"); pop.className = "sbr-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", t("Supplier RFIs"));
    document.body.appendChild(pop); paint(); load();
  }
  function closePop() { if (!pop) return; pop.remove(); pop = null; paint(); }
  function seen(body) {
    return fetch("/api/rfis/seen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(r => r.ok ? r.json() : null).then(j => { if (j) state.unseen = j.unseen; }).catch(() => {}).finally(paint);
  }
  function go(project, item) {
    closePop();
    if (window.SOURCEBOOK_PROJECT === project) { if (location.hash === "#rfi=" + item) window.dispatchEvent(new HashChangeEvent("hashchange")); else location.hash = "rfi=" + item; }
    else location.href = "/p/" + encodeURIComponent(project) + "#rfi=" + encodeURIComponent(item);
  }

  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-sbr]");
    if (!b) { if (pop && !e.target.closest(".sbr-pop")) closePop(); return; }
    e.preventDefault(); e.stopPropagation();
    const a = b.dataset.sbr;
    if (a === "toggle") pop ? closePop() : openPop();
    else if (a === "close") closePop();
    else if (a === "all") { (state.rfis || []).forEach(x => { x.seen = true; }); state.unseen = 0; paint(); seen({ all: true }); }
    else if (a === "go") go(b.dataset.p, b.dataset.i);
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && pop) { e.stopPropagation(); closePop(); } }, true);
  window.addEventListener("resize", place);
  window.addEventListener("scroll", () => { if (pop) place(); }, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && admin) load(); });

  class SBRfis extends HTMLElement {
    connectedCallback() {
      els.add(this); this.innerHTML = admin ? bellHTML() : "";
      isAdmin().then(a => { if (!a) return; paint(); if (state.rfis === null && !loading) load(); if (!timer) timer = setInterval(() => { if (!document.hidden) load(); }, 60000); });
    }
    disconnectedCallback() { els.delete(this); }
  }
  if (!document.getElementById("sbr-css")) { const st = document.createElement("style"); st.id = "sbr-css"; st.textContent = CSS; document.head.appendChild(st); }
  if (!customElements.get("sb-rfis")) customElements.define("sb-rfis", SBRfis);

  // For the project page: refresh after RFIs change, and mark a piece's RFIs seen once its card is open.
  let refreshT = null;
  window.SBRfis = {
    refresh() { if (!admin) return; clearTimeout(refreshT); refreshT = setTimeout(load, 1200); },
    seenItem(project, item) {
      if (!admin || !state.rfis) return;
      const fresh = state.rfis.filter(x => !x.seen && x.project.id === project && x.item.id === item); if (!fresh.length) return;
      fresh.forEach(x => { x.seen = true; }); state.unseen = Math.max(0, state.unseen - fresh.length); paint();
      seen({ project, item });
    },
  };
})();
