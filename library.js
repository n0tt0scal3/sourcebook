// Sourcing library: catalogue images shared by the whole studio.
// Used by the dashboard (curate: tick or untick images) and by each project
// (browse kept images and add one as a piece). Curation is stored studio-wide
// as library/<catalogue> = { off: [removed keys] }, key = page*100 + image number.
(function () {
  "use strict";
  const LIB_LABEL = { "BILLA-Sofa": ["Billa", "Sofas & lounge chairs"], "BILLA-CoffeeTV": ["Billa", "Coffee tables & TV units"], "BILLA-Dining": ["Billa", "Dining"], "BILLA-Outdoor": ["Billa", "Outdoor"], "HALO": ["HALO", "Collection 2026"], "Kaiwuli": ["Kaiwuli", "Catalogue 2026"], "TO-Tearsheet": ["TO Interactive", "Tearsheets 2025"] };
  const LIB_CAT = { FURNITURE: "Furniture", LIGHTING: "Lighting", PLUMBING: "Plumbing", MILLWORK: "Millwork", DOORS: "Millwork", STONE: "Stone", "WALL PANELLING": "Finishes", "WOOD PRODUCTS": "Finishes", "PARTITION SYSTEMS": "Glazing", SIGNAGE: "Hardware" };
  const LIB_ROOT = "G:\\My Drive\\LMNL\\90 CHINA PRODUCTS\\";
  const ZH = {
    "Sourcing library": "采购图库", "Kept": "保留", "Removed": "已移除", "All": "全部", "Scanned": "已扫描", "In this project": "本项目中", "All catalogues": "全部图册",
    "Keep all shown": "保留全部显示项", "Remove all shown": "移除全部显示项", "Keep page": "保留本页", "Remove page": "移除本页", "In project": "已在项目中",
    "Loading catalogues…": "正在加载图册…", "The catalogue index didn't load. Reload the page to try again.": "图册索引未能加载，请刷新页面重试。",
    "Nothing matches that search.": "没有匹配的结果。", "Nothing has been removed here.": "这里没有移除的图片。", "No images kept here yet.": "这里还没有保留的图片。",
    "Every image scanned from the supplier catalogues, each kept with its catalogue and page. Untick the ones you don't want offered to projects.": "从供应商图册中扫描出的所有图片，均保留其图册和页码。取消勾选不希望提供给项目的图片。",
    "The images kept in the studio library. Open one to see where it comes from, or add it to this project as a piece with its source attached.": "工作室图库中保留的图片。打开可查看来源，或将其连同来源一起添加到本项目。",
    "Search a code, product or page, e.g. AA01, Ampleforth, p44": "搜索编号、产品或页码，例如 AA01、p44", "Catalogue": "图册", "Page": "页码", "Codes on page": "本页编号", "Source": "来源",
    "Catalogue folder": "图册文件夹", "Image file": "图片文件", "Copy source note": "复制来源说明", "In the library": "图库状态", "Keep in library": "保留在图库中", "Remove from library": "从图库中移除",
    "Open the piece in this project": "打开本项目中的该项", "Adding…": "正在添加…", "Close": "关闭", "Source note copied": "来源说明已复制", "Couldn't save. Check your connection and try again.": "无法保存，请检查网络后重试。",
    "Removing hides the image from every project's library. It stays in the catalogue folder and can be kept again at any time.": "移除后，所有项目的图库中都不再显示此图片。图片仍保留在图册文件夹中，可随时重新保留。",
    "Couldn't add it. Try again.": "无法添加，请重试。", "Removed. Tick to keep.": "已移除，勾选以保留。", "Kept. Untick to remove.": "已保留，取消勾选以移除。", "Selected. Press Ctrl+C to copy.": "已选中，按 Ctrl+C 复制。", "Show": "显示",
  };
  const lang = () => { try { return localStorage.getItem("sb_lang") === "zh" ? "zh" : "en"; } catch (_) { return "en"; } };
  const t = s => (lang() === "zh" ? ZH[s] ?? s : s);
  const zh = () => lang() === "zh";
  const nf = n => n.toLocaleString(lang() === "zh" ? "zh-CN" : "en-CA");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = s => document.querySelector(s);

  const CSS = `
.sbl-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px 28px;align-items:end;padding-top:34px;padding-bottom:16px;border-bottom:1px solid var(--ink)}
.sbl-head h2{font-family:var(--display);font-weight:400;font-size:clamp(30px,3.6vw,42px);line-height:1.05;margin:6px 0 8px}
.sbl-head p{margin:0;color:var(--ink2);max-width:62ch;font-size:14px}
.sbl-stat{display:flex;border-left:1px solid var(--rule2)}
.sbl-stat div{padding:0 0 2px 16px;min-width:96px}
.sbl-stat div + div{border-left:1px solid var(--rule2);margin-left:16px}
.sbl-stat b{display:block;font-family:var(--display);font-weight:400;font-size:30px;line-height:1.1;font-variant-numeric:tabular-nums}
.sbl-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr));gap:18px 16px;padding-top:22px}
.sbl-cat{display:flex;flex-direction:column;gap:7px;background:none;border:0;padding:0;text-align:left;color:var(--ink);cursor:pointer;min-width:0}
.sbl-cat .sbl-sw{width:100%;aspect-ratio:4/3;border:1px solid var(--rule)}
.sbl-cat .sbl-all{display:flex;align-items:flex-end;width:100%;aspect-ratio:4/3;padding:14px;border:1px dashed var(--ink2);font-family:var(--display);font-size:22px;line-height:1.1}
.sbl-cat[aria-pressed="true"] .sbl-sw,.sbl-cat[aria-pressed="true"] .sbl-all{outline:2px solid var(--ink);outline-offset:3px}
.sbl-name{font-family:var(--display);font-size:19px;line-height:1.15;overflow-wrap:anywhere}
.sbl-sub{font-family:var(--mono);font-size:11px;letter-spacing:.04em;color:var(--muted);font-variant-numeric:tabular-nums}
.sbl-bar{display:block;height:3px;background:var(--rule2)}
.sbl-bar i{display:block;height:100%;background:var(--ok)}
.sbl-tools{position:sticky;top:calc(env(safe-area-inset-top,0px) + 58px);z-index:4;background:var(--ground);display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;padding-block:14px;margin-top:26px;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.sbl-tools .sbl-q{flex:1 1 240px;max-width:420px;border:0;border-bottom:1px solid var(--rule);background:transparent;padding:8px 2px;font-size:15px;color:var(--ink);min-width:0}
.sbl-tools .sbl-q:focus{outline:none;border-color:var(--ink)}
.sbl-seg{display:inline-flex;gap:4px}
.sbl-count{font-family:var(--mono);font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.sbl-bulk{display:flex;gap:14px;margin-left:auto}
.sbl-page{display:flex;justify-content:space-between;align-items:baseline;gap:12px;grid-column:1/-1;padding-top:14px;border-bottom:1px solid var(--rule2);padding-bottom:6px}
.sbl-page b{font-family:var(--display);font-style:italic;font-weight:400;font-size:19px}
.sbl-page span{display:flex;gap:14px}
.sbl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px 14px;padding-top:18px}
.sbl-tile{position:relative;display:flex;flex-direction:column;gap:6px;min-width:0;transition:opacity .2s}
.sbl-tile.off .sbl-sw{opacity:.32;filter:grayscale(1)}
.sbl-tile.off .sbl-cap{color:var(--muted);text-decoration:line-through}
.sbl-open{display:block;padding:0;border:0;background:none;cursor:pointer;width:100%}
.sbl-sw{display:block;width:100%;aspect-ratio:1;max-width:100%;background-color:#fff;background-repeat:no-repeat;border:1px solid var(--rule2);transition:border-color .2s}
.sbl-open:hover .sbl-sw{border-color:var(--ink)}
.sbl-chk{position:absolute;top:6px;right:6px;width:30px;height:30px;display:grid;place-items:center;background:var(--paper);border:1px solid var(--rule);cursor:pointer}
.sbl-chk input{width:17px;height:17px;margin:0;accent-color:var(--ok);cursor:pointer}
.sbl-cap{display:flex;gap:6px;align-items:baseline;font-family:var(--mono);font-size:11px;color:var(--ink2);overflow:hidden;white-space:nowrap}
.sbl-cap b{font-weight:500;color:var(--ink);overflow:hidden;text-overflow:ellipsis}
.sbl-cap span{flex:none;color:var(--muted)}
.sbl-inproj{position:absolute;left:6px;top:6px;background:var(--accent);color:#fff;font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:3px 7px}
.sbl-more{display:flex;justify-content:center;padding-top:26px}
.sbl-empty{grid-column:1/-1;padding:40px 0;color:var(--muted);font-family:var(--display);font-size:22px;font-style:italic}
.sbl-scrim{position:fixed;inset:0;background:var(--scrim);z-index:20}
.sbl-sheet{position:fixed;inset:0;z-index:21;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);background:var(--paper);color:var(--ink)}
.sbl-hero{background:#fff;display:flex;align-items:center;justify-content:center;padding:clamp(16px,4vw,48px);min-height:0}
.sbl-hero .sbl-sw{width:min(100%,560px);border:0}
.sbl-body{overflow-y:auto;padding:calc(env(safe-area-inset-top,0px) + 22px) clamp(18px,4vw,48px) calc(env(safe-area-inset-bottom,0px) + 60px)}
.sbl-top{display:flex;justify-content:space-between;align-items:center;gap:12px}
.sbl-x{background:none;border:1px solid var(--rule);width:38px;height:38px;border-radius:50%;font-size:18px;line-height:1;color:var(--ink);cursor:pointer}
.sbl-body h2{font-family:var(--display);font-weight:400;font-size:clamp(34px,4.4vw,56px);line-height:1;margin:18px 0 8px;letter-spacing:-.01em;overflow-wrap:anywhere}
.sbl-file{font-family:var(--mono);font-size:13px;color:var(--ink2);margin:0;overflow-wrap:anywhere}
.sbl-facts{display:grid;grid-template-columns:repeat(3,1fr);margin-top:24px;border-top:1px solid var(--ink)}
.sbl-facts div{padding:12px 12px 14px 0;border-bottom:1px solid var(--rule2)}
.sbl-facts div + div{padding-left:12px;border-left:1px solid var(--rule2)}
.sbl-facts b{display:block;font-family:var(--display);font-weight:400;font-size:19px;line-height:1.15;margin-top:2px;overflow-wrap:anywhere}
.sbl-sec{margin-top:34px}
.sbl-sec > header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:8px;margin-bottom:4px}
.sbl-sec h5{margin:0;font-family:var(--display);font-style:italic;font-weight:400;font-size:22px}
.sbl-kv{display:grid;grid-template-columns:minmax(110px,34%) 1fr;gap:0 16px}
.sbl-kv > *{padding:10px 0;border-bottom:1px solid var(--rule2);min-width:0}
.sbl-kv .k{color:var(--muted);font-size:13px}
.sbl-kv a{color:var(--ink);text-underline-offset:3px;overflow-wrap:anywhere}
.sbl-kv .m{font-family:var(--mono);font-size:12px;overflow-wrap:anywhere}
.sbl-note{margin-top:22px;padding:14px 16px;background:var(--accent-soft);display:flex;flex-direction:column;gap:8px}
.sbl-note code{font-family:var(--mono);font-size:12px;overflow-wrap:anywhere;color:var(--ink)}
.sbl-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}
.sbl-hint{color:var(--muted);font-size:13px;margin:10px 0 0}
.sbl-excerpt{margin:16px 0 0;color:var(--muted);font-size:13px;max-width:65ch}
@media (max-width:900px){.sbl-sheet{grid-template-columns:1fr;grid-template-rows:38vh 1fr}}
@media (max-width:760px){.sbl-head{grid-template-columns:1fr}.sbl-stat{border-left:0}.sbl-stat div:first-child{padding-left:0}.sbl-tools{position:static}.sbl-cats{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}.sbl-name{font-size:16px}.sbl-cat .sbl-all{font-size:18px}.sbl-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}.sbl-facts{grid-template-columns:1fr 1fr}}
`;
  const style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);

  let LIB = null, libP = null, off = {}, watching = false, qT = null;
  const ui = { sup: null, q: "", show: null, n: 120, open: null, adding: false };
  let host = { ctx: "studio", canEdit: () => false, canAdd: () => false, projectName: () => "", inProject: () => new Map(), add: null, openPiece: () => {}, layer: () => {}, toast: m => console.log(m), toastUndo: (m) => console.log(m) };

  function load() {
    if (LIB) return Promise.resolve(LIB);
    return libP || (libP = fetch("/lib/data.json").then(r => { if (!r.ok) throw new Error("lib"); return r.json(); }).then(d => {
      d.items = d.items.map((it, i) => {
        const m = String(it[0]).match(/_p(\d+)_(\d+)\.jpg$/);
        const o = { i, file: it[0], sup: it[1], page: it[2], codes: it[3] ? String(it[3]).split(" ").filter(Boolean) : [], text: it[4] || "", s: it[5], k: it[6], key: m ? (+m[1]) * 100 + (+m[2]) : i };
        const L = LIB_LABEL[o.sup] || [o.sup, ""];
        o.h = [o.file, o.sup, L[0], L[1], d.sups[o.sup] && d.sups[o.sup].pdf, "p" + o.page, it[3], o.text].join(" ").toLowerCase();
        return o;
      });
      d.bySup = {}; d.items.forEach(o => (d.bySup[o.sup] = d.bySup[o.sup] || []).push(o));
      LIB = d; return d;
    }).catch(e => { libP = null; throw e; }));
  }
  async function fetchOff() {
    const r = await fetch("/api/db/col?path=library"); if (!r.ok) return;
    const j = await r.json(); const next = {};
    j.docs.forEach(d => { next[d.id] = new Set((d.data.off || []).map(Number)); });
    off = next; repaint();
  }
  function watch() {
    if (watching) return; watching = true;
    fetchOff().catch(() => {});
    try {
      const es = new EventSource("/api/events");
      es.onmessage = e => { try { const m = JSON.parse(e.data); if (!/^library\/[^/]+$/.test(m.path)) return; const sup = m.path.slice(8); off[sup] = new Set(((m.exists && m.data && m.data.off) || []).map(Number)); repaint(); } catch (_) {} };
      es.onopen = () => fetchOff().catch(() => {});
    } catch (_) {}
  }

  const isOff = o => !!(off[o.sup] && off[o.sup].has(o.key));
  const sprite = o => { const g = LIB.grid; return `style="background-image:url(/lib/sprites/s${String(o.s).padStart(3, "0")}.jpg);background-size:${g * 100}% ${g * 100}%;background-position:${(o.k % g) / (g - 1) * 100}% ${Math.floor(o.k / g) / (g - 1) * 100}%"`; };
  const label = sup => LIB_LABEL[sup] || [sup, ""];
  const name = o => o.codes[0] || label(o.sup)[0] + " · p" + o.page;
  const kept = () => LIB.items.filter(o => !isOff(o)).length;
  // Projects only ever see kept images; curation happens on the dashboard.
  const showMode = () => (host.ctx === "project" ? "kept" : ui.show || "all");
  function list() {
    const q = ui.q.toLowerCase().trim().split(/\s+/).filter(Boolean); const show = showMode();
    const src = ui.sup && LIB.bySup[ui.sup] ? LIB.bySup[ui.sup] : LIB.items;
    return src.filter(o => { const x = isOff(o); if (show === "kept" && x) return false; if (show === "removed" && !x) return false; return q.every(w => o.h.includes(w)); });
  }

  function view() {
    if (!LIB) {
      load().then(() => { const r = $("#sblib"); if (r) r.outerHTML = view(); }).catch(() => { const g = $("#sbl-grid"); if (g) g.innerHTML = `<p class="sbl-empty">${t("The catalogue index didn't load. Reload the page to try again.")}</p>`; });
      return `<div id="sblib"><section class="sbl-head"><div><span class="eyebrow">${t("Sourcing library")}</span></div></section><div id="sbl-grid"><p class="mono" style="padding-top:30px;color:var(--muted)">${t("Loading catalogues…")}</p></div></div>`;
    }
    watch();
    const ed = host.canEdit(), show = showMode(), tot = LIB.items.length, k = kept();
    const cats = [...new Set(Object.values(LIB.sups).map(s => s.cat))].map(c => c[0] + c.slice(1).toLowerCase());
    return `<div id="sblib"><section class="sbl-head"><div><span class="eyebrow">${zh() ? `90 中国产品 · ${esc(cats.map(c => ({ Furniture: "家具", Lighting: "灯具", Doors: "门", Millwork: "木作", Stone: "石材", Signage: "标识" })[c] || c).join("、"))} · ${Object.keys(LIB.sups).length} 本图册` : `90 China Products · ${esc(cats.join(", "))} · ${Object.keys(LIB.sups).length} catalogues`}</span>
      ${host.ctx === "project" ? `<h2>${t("Sourcing library")}</h2>` : ""}
      <p>${host.ctx === "studio" ? t("Every image scanned from the supplier catalogues, each kept with its catalogue and page. Untick the ones you don't want offered to projects.") : t("The images kept in the studio library. Open one to see where it comes from, or add it to this project as a piece with its source attached.")}</p></div>
      <div class="sbl-stat"><div><span class="eyebrow">${t("Kept")}</span><b id="sbl-kept">${nf(k)}</b></div><div><span class="eyebrow">${t("Scanned")}</span><b>${nf(tot)}</b></div>${host.ctx === "project" ? `<div><span class="eyebrow">${t("In this project")}</span><b>${host.inProject().size}</b></div>` : ""}</div></section>
    <div class="sbl-cats" id="sbl-cats">${catsHTML()}</div>
    <div class="sbl-tools"><input class="sbl-q" type="search" id="sbl-q" value="${esc(ui.q)}" placeholder="${esc(t("Search a code, product or page, e.g. AA01, Ampleforth, p44"))}" autocomplete="off" aria-label="${esc(t("Sourcing library"))}">
      ${host.ctx === "project" ? "" : `<span class="sbl-seg" role="group" aria-label="${t("Show")}">${[["kept", "Kept"], ["removed", "Removed"], ["all", "All"]].map(([v, l]) => `<button class="chip" data-sblshow="${v}" aria-pressed="${show === v}">${t(l)}</button>`).join("")}</span>`}
      <span class="sbl-count" id="sbl-count"></span>
      ${ed && ui.sup ? `<span class="sbl-bulk"><button class="linkbtn" data-sblbulk="keep">${t("Keep all shown")}</button><button class="linkbtn" data-sblbulk="drop">${t("Remove all shown")}</button></span>` : ""}</div>
    <div id="sbl-grid">${gridHTML()}</div></div>`;
  }
  function catsHTML() {
    const all = LIB.items.length, allKept = kept();
    return `<button class="sbl-cat" data-sblsup="" aria-pressed="${!ui.sup}"><span class="sbl-all">${t("All catalogues")}</span><span class="sbl-sub">${nf(allKept)} / ${nf(all)} ${t("Kept").toLowerCase()}</span><span class="sbl-bar"><i style="width:${all ? allKept / all * 100 : 0}%"></i></span></button>` +
      Object.keys(LIB.sups).map(s => {
        const arr = LIB.bySup[s] || []; const keptArr = arr.filter(o => !isOff(o));
        const cover = keptArr[Math.min(keptArr.length - 1, Math.floor(keptArr.length * .12))] || arr[0]; const L = label(s);
        return `<button class="sbl-cat" data-sblsup="${esc(s)}" aria-pressed="${ui.sup === s}">${cover ? `<span class="sbl-sw" ${sprite(cover)}></span>` : ""}<span class="sbl-name">${esc(L[0])}${L[1] ? ` · ${esc(L[1])}` : ""}</span><span class="sbl-sub">${keptArr.length} / ${arr.length} ${t("Kept").toLowerCase()} · ${LIB.sups[s].pages} pp</span><span class="sbl-bar"><i style="width:${arr.length ? keptArr.length / arr.length * 100 : 0}%"></i></span></button>`;
      }).join("");
  }
  function gridHTML() {
    const l = list(), ed = host.canEdit(), inP = host.ctx === "project" ? host.inProject() : new Map();
    setTimeout(() => { const c = $("#sbl-count"); if (c) c.textContent = zh() ? `${nf(l.length)} 张图片` : `${nf(l.length)} image${l.length === 1 ? "" : "s"}`; }, 0);
    if (!l.length) return `<div class="sbl-grid"><p class="sbl-empty">${ui.q ? t("Nothing matches that search.") : showMode() === "removed" ? t("Nothing has been removed here.") : t("No images kept here yet.")}</p></div>`;
    let page = null, html = ""; const bySup = !!ui.sup;
    for (const o of l.slice(0, ui.n)) {
      if (bySup && o.page !== page) { page = o.page; html += `<div class="sbl-page"><b>${t("Page")} ${o.page}</b>${ed ? `<span><button class="linkbtn" data-sblpage="${o.page}" data-v="keep">${t("Keep page")}</button><button class="linkbtn" data-sblpage="${o.page}" data-v="drop">${t("Remove page")}</button></span>` : ""}</div>`; }
      const x = isOff(o);
      html += `<div class="sbl-tile ${x ? "off" : ""}"><button class="sbl-open" data-sblopen="${o.i}" aria-label="${esc(o.file)}"><span class="sbl-sw" ${sprite(o)}></span></button>
        ${ed ? `<label class="sbl-chk" title="${x ? t("Removed. Tick to keep.") : t("Kept. Untick to remove.")}"><input type="checkbox" data-sblkeep="${o.i}" ${x ? "" : "checked"} aria-label="${zh() ? "保留 " : "Keep "}${esc(o.file)}"></label>` : ""}
        ${inP.has(o.file) ? `<span class="sbl-inproj">${t("In project")}</span>` : ""}
        <span class="sbl-cap"><b>${esc(o.codes[0] || label(o.sup)[0])}</b><span>${bySup ? "" : esc(label(o.sup)[0]) + " · "}p${o.page}</span></span></div>`;
    }
    return `<div class="sbl-grid">${html}</div>${l.length > ui.n ? `<div class="sbl-more"><button class="btn ghost" data-sblmore>${zh() ? `再显示 ${Math.min(120, l.length - ui.n)} 张（还有 ${nf(l.length - ui.n)} 张）` : `Show ${Math.min(120, l.length - ui.n)} more of ${nf(l.length - ui.n)}`}</button></div>` : ""}`;
  }
  function repaint() {
    if (!LIB) return;
    const g = $("#sbl-grid"), c = $("#sbl-cats"), k = $("#sbl-kept");
    if (g) g.innerHTML = gridHTML(); if (c) c.innerHTML = catsHTML(); if (k) k.textContent = nf(kept());
    if (ui.open != null) host.layer();
  }
  function rerender() { const r = $("#sblib"); if (r) r.outerHTML = view(); }

  // Ask the server to add or remove keys; it merges them into the stored list, so two people curating at once don't overwrite each other.
  async function send(sup, keys, x) {
    const r = await fetch("/api/library/set", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sup, keys, off: x }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw Object.assign(new Error(j.message || "save"), { code: j.code }); }
  }
  function setOff(sup, keys, x) {
    const s = new Set(off[sup] || []); keys.forEach(k => (x ? s.add(k) : s.delete(k))); off[sup] = s;
    send(sup, keys, x).catch(e => { host.toast(e.code === "forbidden" ? e.message : t("Couldn't save. Check your connection and try again.")); fetchOff().catch(() => {}); });
  }
  function bulk(l, x) {
    if (!l.length) return;
    const by = {}; l.forEach(o => (by[o.sup] = by[o.sup] || []).push(o));
    const prev = {}; Object.entries(by).forEach(([s, arr]) => { prev[s] = { on: arr.filter(o => isOff(o)).map(o => o.key), offK: arr.filter(o => !isOff(o)).map(o => o.key) }; });
    Object.entries(by).forEach(([s, arr]) => setOff(s, arr.map(o => o.key), x)); repaint();
    host.toastUndo(zh() ? `已${x ? "移除" : "保留"} ${l.length} 张图片` : `${l.length} image${l.length === 1 ? "" : "s"} ${x ? "removed" : "kept"}`, () => {
      Object.entries(prev).forEach(([s, p]) => { if (p.on.length) setOff(s, p.on, true); if (p.offK.length) setOff(s, p.offK, false); }); repaint();
    });
  }

  function sourceNote(o) { const S = LIB.sups[o.sup]; return `${o.file}\nSource: ${S.pdf}, page ${o.page} of ${S.pages} (${S.cat})\nPDF: https://drive.google.com/file/d/${S.drive}/view\nImage: ${LIB_ROOT}_IMAGE LIBRARY\\${S.cat}\\${o.sup}\\${o.file}`; }
  function sheet() {
    const o = LIB && ui.open != null ? LIB.items[ui.open] : null; if (!o) { ui.open = null; return ""; }
    const S = LIB.sups[o.sup], L = label(o.sup), x = isOff(o), ed = host.canEdit();
    const inId = host.ctx === "project" ? host.inProject().get(o.file) : null;
    document.body.style.overflow = "hidden";
    return `<div class="sbl-scrim" data-sbl="close"></div>
    <section class="sbl-sheet" role="dialog" aria-modal="true" aria-label="${esc(o.file)}">
      <div class="sbl-hero"><span class="sbl-sw" ${sprite(o)}></span></div>
      <div class="sbl-body">
        <div class="sbl-top"><span class="eyebrow">${t("Sourcing library")} · ${esc(L[0])}${L[1] ? " · " + esc(L[1]) : ""}</span><button class="sbl-x" data-sbl="close" aria-label="${t("Close")}">×</button></div>
        <h2>${esc(name(o))}</h2>
        <p class="sbl-file">${esc(o.file)}</p>
        <div class="sbl-facts">
          <div><span class="eyebrow">${t("Catalogue")}</span><b>${esc(L[0])}</b></div>
          <div><span class="eyebrow">${t("Page")}</span><b>${o.page} / ${S.pages}</b></div>
          <div><span class="eyebrow">${t("Codes on page")}</span><b style="font-family:var(--mono);font-size:15px">${esc(o.codes.slice(0, 4).join(" ") || "—")}</b></div>
        </div>
        <section class="sbl-sec"><header><h5>${t("Source")}</h5></header>
          <div class="sbl-kv"><div class="k">PDF</div><div><a href="https://drive.google.com/file/d/${esc(S.drive)}/view" target="_blank" rel="noopener">${esc(S.pdf)} ↗</a></div>
            <div class="k">${t("Catalogue folder")}</div><div class="m">${esc(LIB_ROOT + S.cat)}</div>
            <div class="k">${t("Image file")}</div><div class="m">${esc(LIB_ROOT + "_IMAGE LIBRARY\\" + S.cat + "\\" + o.sup + "\\")}</div></div>
          <div class="sbl-note"><code id="sbl-note">${esc(sourceNote(o)).replace(/\n/g, "<br>")}</code><div class="sbl-row" style="margin-top:0"><button class="btn sm" data-sbl="copy">${t("Copy source note")}</button><span class="mono" style="font-size:11.5px;color:var(--muted)">${zh() ? `PDF 从第 1 页打开；此图片在第 ${o.page} 页。` : `The PDF opens at page 1; this image is on page ${o.page}.`}</span></div></div>
        </section>
        <section class="sbl-sec"><header><h5>${t("In the library")}</h5><span class="mono" style="color:var(--muted)">${x ? t("Removed") : t("Kept")}</span></header>
          <div class="sbl-row">
            ${host.ctx === "project" && host.canAdd() ? (inId ? `<button class="btn" data-sbl="piece" data-id="${esc(inId)}">${t("Open the piece in this project")}</button>` : `<button class="btn" data-sbl="add" ${ui.adding ? "disabled" : ""}>${ui.adding ? t("Adding…") : (lang() === "zh" ? "添加到 " : "Add to ") + esc(host.projectName())}</button>`) : ""}
            ${ed ? `<button class="btn ghost" data-sbl="toggle">${x ? t("Keep in library") : t("Remove from library")}</button>` : ""}
          </div>
          ${ed ? `<p class="sbl-hint">${t("Removing hides the image from every project's library. It stays in the catalogue folder and can be kept again at any time.")}</p>` : ""}
        </section>
        ${o.text ? `<p class="sbl-excerpt">${zh() ? "页面文字：" : "Text on the page: "}${esc(o.text.slice(0, 220))}${o.text.length > 220 ? "…" : ""}</p>` : ""}
      </div></section>`;
  }
  function close() { if (ui.open == null) return; ui.open = null; ui.adding = false; document.body.style.overflow = ""; host.layer(); }

  // Cut one image out of its thumbnail sheet, for the piece's photo.
  async function crop(o) {
    const im = await new Promise((res, rej) => { const x = new Image(); x.onload = () => res(x); x.onerror = rej; x.src = `/lib/sprites/s${String(o.s).padStart(3, "0")}.jpg`; });
    const c = LIB.cell, g = LIB.grid; const cv = document.createElement("canvas"); cv.width = c; cv.height = c;
    cv.getContext("2d").drawImage(im, (o.k % g) * c, Math.floor(o.k / g) * c, c, c, 0, 0, c, c);
    return await new Promise(r => cv.toBlob(r, "image/jpeg", .9));
  }
  async function add() {
    const o = LIB && LIB.items[ui.open]; if (!o || ui.adding || !host.add) return;
    const S = LIB.sups[o.sup], L = label(o.sup);
    ui.adding = true; host.layer();
    try {
      await host.add(o, { pdf: S.pdf, drive: S.drive, pages: S.pages, cat: S.cat, category: LIB_CAT[S.cat] || "Finishes", supplier: L[0], product: L[1] || "", photo: () => crop(o) });
      ui.adding = false; ui.open = null; document.body.style.overflow = ""; host.layer(); rerender();
    } catch (e) { ui.adding = false; host.layer(); host.toast(t("Couldn't add it. Try again.")); }
  }

  document.addEventListener("click", async e => {
    const el = e.target.closest && e.target.closest("[data-sblsup],[data-sblshow],[data-sblmore],[data-sblopen],[data-sblbulk],[data-sblpage],[data-sbl]"); if (!el || !LIB) return;
    if (el.dataset.sblsup !== undefined) { ui.sup = el.dataset.sblsup || null; ui.n = 120; rerender(); return; }
    if (el.dataset.sblshow) { ui.show = el.dataset.sblshow; ui.n = 120; document.querySelectorAll("[data-sblshow]").forEach(b => b.setAttribute("aria-pressed", b === el)); repaint(); return; }
    if (el.dataset.sblmore !== undefined) { ui.n += 120; repaint(); return; }
    if (el.dataset.sblopen !== undefined) { ui.open = +el.dataset.sblopen; host.layer(); return; }
    if (el.dataset.sblbulk) { bulk(list(), el.dataset.sblbulk === "drop"); return; }
    if (el.dataset.sblpage) { const p = +el.dataset.sblpage; bulk(list().filter(o => o.page === p), el.dataset.v === "drop"); return; }
    const a = el.dataset.sbl;
    if (a === "close") close();
    else if (a === "toggle") { const o = LIB.items[ui.open]; if (o) { setOff(o.sup, [o.key], !isOff(o)); repaint(); host.layer(); } }
    else if (a === "add") add();
    else if (a === "piece") { const id = el.dataset.id; ui.open = null; host.openPiece(id); }
    else if (a === "copy") {
      const o = LIB.items[ui.open]; if (!o) return;
      try { await navigator.clipboard.writeText(sourceNote(o)); host.toast(t("Source note copied")); }
      catch (_) { const r = document.createRange(); r.selectNodeContents($("#sbl-note")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); host.toast(t("Selected. Press Ctrl+C to copy.")); }
    }
  });
  document.addEventListener("change", e => {
    const el = e.target; if (!(el.dataset && el.dataset.sblkeep !== undefined) || !LIB) return;
    const o = LIB.items[+el.dataset.sblkeep]; if (!o) return;
    setOff(o.sup, [o.key], !el.checked); el.closest(".sbl-tile")?.classList.toggle("off", !el.checked);
    const c = $("#sbl-cats"); if (c) c.innerHTML = catsHTML(); const k = $("#sbl-kept"); if (k) k.textContent = nf(kept());
  });
  document.addEventListener("input", e => { if (e.target.id === "sbl-q" && LIB) { ui.q = e.target.value; ui.n = 120; clearTimeout(qT); qT = setTimeout(() => { const g = $("#sbl-grid"); if (g) g.innerHTML = gridHTML(); }, 140); } });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && ui.open != null && !document.getElementById("viewer")) { e.stopPropagation(); close(); } }, true);

  window.SBLibrary = Object.freeze({
    configure(h) { host = { ...host, ...h }; },
    view, sheet, close, repaint, load,
    isOpen: () => ui.open != null && !!LIB,
    t,
  });
})();
