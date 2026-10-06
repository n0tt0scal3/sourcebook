// Sourcing library: catalogue images shared by the whole studio.
// Nothing is shown until an admin approves it on the dashboard's Sourcing library tab.
// Approved images are visible to everyone, clients included, and anyone who can open a
// project can add one to it as a piece. Approvals are stored studio-wide as
// library/<catalogue> = { on: [approved keys] }, key = page*100 + image number.
(function () {
  "use strict";
  const LIB_LABEL = { "BILLA-Sofa": ["Billa", "Sofas & lounge chairs"], "BILLA-CoffeeTV": ["Billa", "Coffee tables & TV units"], "BILLA-Dining": ["Billa", "Dining"], "BILLA-Outdoor": ["Billa", "Outdoor"], "HALO": ["HALO", "Collection 2026"], "Kaiwuli": ["Kaiwuli", "Catalogue 2026"], "TO-Tearsheet": ["TO Interactive", "Tearsheets 2025"] };
  const LIB_ROOT = "G:\\My Drive\\LMNL\\90 CHINA PRODUCTS\\";
  const ZH = {
    "Sourcing library": "采购图库", "Approved": "已批准", "Not approved": "未批准", "All": "全部", "Scanned": "已扫描", "In this project": "本项目中", "All catalogues": "全部图册",
    "Approve all shown": "批准全部显示项", "Unapprove all shown": "取消批准全部显示项", "Approve page": "批准本页", "Unapprove page": "取消批准本页", "In project": "已在项目中",
    "Loading catalogues…": "正在加载图册…", "The catalogue index didn't load. Reload the page to try again.": "图册索引未能加载，请刷新页面重试。",
    "Nothing matches that search.": "没有匹配的结果。", "Nothing is waiting for approval here.": "这里没有待批准的图片。", "Nothing has been approved yet.": "尚未批准任何图片。",
    "Every image scanned from the supplier catalogues, each kept with its catalogue and page. Tick an image to approve it; only approved images are shown to the team and clients.": "从供应商图册中扫描出的所有图片，均保留其图册和页码。勾选即可批准；只有已批准的图片会向团队和客户显示。",
    "Products approved by the studio. Open one to see where it comes from, or add it to a project.": "工作室已批准的产品。打开可查看来源，或将其添加到项目。",
    "Products approved by the studio. Open one to see where it comes from, or add it to this project with its source attached.": "工作室已批准的产品。打开可查看来源，或将其连同来源一起添加到本项目。",
    "Search a code, product or page, e.g. AA01, Ampleforth, p44": "搜索编号、产品或页码，例如 AA01、p44", "Catalogue": "图册", "Page": "页码", "Codes on page": "本页编号", "Source": "来源",
    "Catalogue folder": "图册文件夹", "Image file": "图片文件", "Copy source note": "复制来源说明", "In the library": "图库状态", "Approve": "批准", "Unapprove": "取消批准",
    "Open the piece in this project": "打开本项目中的该项", "Adding…": "正在添加…", "Close": "关闭", "Source note copied": "来源说明已复制", "Couldn't save. Check your connection and try again.": "无法保存，请检查网络后重试。",
    "Approved images are shown to everyone, clients included. Unapproving hides it again; pieces already added to projects stay.": "已批准的图片对所有人（包括客户）可见。取消批准会再次隐藏；已添加到项目的项目会保留。",
    "Couldn't add it. Try again.": "无法添加，请重试。", "Approved. Untick to hide it.": "已批准，取消勾选以隐藏。", "Not approved. Tick to approve.": "未批准，勾选以批准。", "Selected. Press Ctrl+C to copy.": "已选中，按 Ctrl+C 复制。",
    "Show": "显示", "Add to project": "添加到项目", "Project": "项目", "Choose a project": "选择项目", "No projects to add to yet.": "暂无可添加的项目。", "Add": "添加",
    "The studio hasn't approved any products yet.": "工作室尚未批准任何产品。",
    "Previous": "上一个", "Next": "下一个", "← → to move between products · Space to approve": "← → 切换产品 · 按空格键批准", "Space to approve": "按空格键批准", "← → to move between products": "← → 切换产品",
    "Add a catalogue from a PDF": "从 PDF 添加图册", "PDF catalogue": "PDF 图册", "How to add it": "添加方式", "Scan for product images": "扫描产品图片", "Pulls out each photo in the PDF.": "提取 PDF 中的每张照片。", "Import page by page": "逐页导入", "Each page becomes one image.": "每一页成为一张图片。", "Import pages": "导入页面", "Drop the PDF here, or click to choose it": "将 PDF 拖到这里，或点击选择", "That isn't a PDF.": "这不是 PDF 文件。", "Supplier": "供应商", "Catalogue name (optional)": "图册名称（可选）", "Category": "类别",
    "Google Drive link to the PDF (optional)": "PDF 的 Google 云端硬盘链接（可选）", "Scan and add": "扫描并添加", "Cancel": "取消", "Delete this catalogue": "删除此图册",
    "Choose a PDF and enter the supplier.": "请选择 PDF 并填写供应商。", "Couldn't read that PDF.": "无法读取该 PDF。",
    "The PDF is scanned in this browser, so keep this tab open until it finishes. Photos in the PDF become library images named like the others (category_supplier_page_number) and start unapproved. Up to 300 MB and 2,000 pages.": "PDF 在此浏览器中扫描，请保持此标签页打开直到完成。PDF 中的照片会按与其他图片相同的方式命名（类别_供应商_页码_编号）成为图库图片，默认未批准。最大 300 MB、2000 页。",
    "All product types": "全部产品类型", "Product type": "产品类型", "Not sorted yet": "尚未分类", "Choose a product type to see its images.": "选择一个产品类型以查看图片。",
    "Full-size images": "高清大图", "Upload zips": "上传压缩包", "Uploading…": "正在上传…", "Click to see it full screen": "点击全屏查看",
    "Choose the catalogue zips from Google Drive (or the JPEGs inside them). Images are matched to the library by file name.": "选择 Google 云端硬盘中的图册压缩包（或其中的 JPEG 图片）。图片按文件名与图库匹配。",
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
.sbl-crumb{display:flex;align-items:baseline;gap:18px;flex-wrap:wrap;padding-top:24px}
.sbl-crumb h3{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(26px,3vw,36px);line-height:1.1}
.sbl-chips{display:flex;flex-wrap:wrap;gap:6px;padding-top:14px}
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
.sbl-tile.off .sbl-sw{opacity:.38;filter:grayscale(1)}
.sbl-tile.off .sbl-cap{color:var(--muted)}
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
.sbl-hero{background:#fff;display:flex;align-items:center;justify-content:center;padding:clamp(16px,4vw,48px);min-height:0;position:relative}
.sbl-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:48px;height:48px;border-radius:50%;border:1px solid var(--rule);background:rgba(255,255,255,.92);color:var(--ink);font-size:22px;line-height:1;cursor:pointer;display:grid;place-items:center;box-shadow:0 1px 6px rgba(0,0,0,.08)}
.sbl-nav:hover:not(:disabled){border-color:var(--ink)}
.sbl-nav:disabled{opacity:.3;cursor:default}
.sbl-nav.prev{left:clamp(8px,1.5vw,20px)}
.sbl-nav.next{right:clamp(8px,1.5vw,20px)}
.sbl-pos{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);z-index:2;font-family:var(--mono);font-size:11.5px;color:var(--muted);background:rgba(255,255,255,.92);padding:3px 9px;font-variant-numeric:tabular-nums;white-space:nowrap}
.sbl-zoomview .sbl-nav{position:fixed}
.sbl-topr{display:flex;gap:10px;align-items:center;flex:none}
.sbl-appr{min-width:118px}
.sbl-appr.on{background:var(--ok);border-color:var(--ok);color:#fff}
.sbl-hero .sbl-sw{width:min(100%,560px);border:0}
.sbl-sheet.big{grid-template-columns:minmax(0,1fr) minmax(min(380px,40vw),32vw)}
.sbl-hero.big{padding:clamp(8px,2vw,24px);position:relative}
.sbl-hero.big .sbl-sw{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}
.sbl-hero.loaded .sbl-sw{visibility:hidden}
.sbl-zoom{position:relative;display:block;width:100%;height:100%;padding:0;border:0;background:none;cursor:zoom-in}
.sbl-big{display:block;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity .25s}
.sbl-hero.loaded .sbl-big{opacity:1}
.sbl-zoomview{position:fixed;inset:0;z-index:22;background:#fff;display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}
.sbl-zoomview img{max-width:100%;max-height:100%;object-fit:contain}
.sbl-full{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;grid-column:1/-1;font-size:13px;color:var(--ink2)}
.sbl-full .mono{font-size:12px;color:var(--muted)}
.sbl-addcat{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:14px 18px;align-items:end;padding:16px;background:var(--paper);border:1px solid var(--rule)}
.sbl-addcat label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted);min-width:0}
.sbl-addcat input:not([type=file]),.sbl-addcat select{font:inherit;font-size:15px;color:var(--ink);background:transparent;border:0;border-bottom:1px solid var(--rule);padding:7px 2px;min-width:0}
.sbl-addcat input[type=file]{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.sbl-addcat .sbl-drop{grid-column:1/-1;position:relative;align-items:center;justify-content:center;text-align:center;gap:6px;min-height:96px;padding:18px;border:1.5px dashed var(--rule);cursor:pointer;color:var(--muted)}
.sbl-drop b{font-weight:500;color:var(--ink);font-size:14px;word-break:break-all}
.sbl-addcat.over .sbl-drop,.sbl-drop:hover,.sbl-drop:focus-within{border-color:var(--ink);color:var(--ink);background:var(--ground)}
button[data-sbl=addcat].over{outline:1.5px dashed var(--ink);outline-offset:4px}
.sbl-mode{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:10px;border:0;padding:0;margin:0}
.sbl-mode legend{font-size:12px;color:var(--muted);padding:0;margin-bottom:6px;width:100%}
.sbl-addcat .sbl-mode label{flex:1 1 220px;flex-direction:row;align-items:flex-start;gap:10px;padding:12px 14px;border:1px solid var(--rule);cursor:pointer;color:var(--ink);font-size:14px}
.sbl-mode label:has(input:checked){border-color:var(--ink);background:var(--ground)}
.sbl-mode input{margin-top:3px;accent-color:var(--ink)}
.sbl-mode small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
.sbl-addcat p{grid-column:1/-1;margin:0;font-size:12.5px;color:var(--muted)}
.sbl-addcat .sbl-row{grid-column:1/-1;margin:0}
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
.sbl-pick{display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--muted);min-width:min(100%,260px)}
.sbl-pick select{font:inherit;font-size:15px;color:var(--ink);background:transparent;border:0;border-bottom:1px solid var(--rule);padding:7px 2px}
.sbl-excerpt{margin:16px 0 0;color:var(--muted);font-size:13px;max-width:65ch}
@media (max-width:900px){.sbl-sheet,.sbl-sheet.big{grid-template-columns:1fr;grid-template-rows:38vh 1fr}.sbl-sheet.big{grid-template-rows:52vh 1fr}}
@media (max-width:760px){.sbl-head{grid-template-columns:1fr}.sbl-stat{border-left:0}.sbl-stat div:first-child{padding-left:0}.sbl-tools{position:static}.sbl-cats{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}.sbl-name{font-size:16px}.sbl-cat .sbl-all{font-size:18px}.sbl-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}.sbl-facts{grid-template-columns:1fr 1fr}}
`;
  const style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);

  let LIB = null, libP = null, on = {}, tov = {}, watching = false, qT = null, full = new Set(), up = null;
  // Product types, independent of the supplier catalogue. Images are sorted into them once (lib/data.json, item[7]);
  // an admin's corrections are stored as librarytypes/<catalogue> = { t: { key: code } }.
  const TYPES = [["S", "Sofas", "沙发"], ["L", "Lounge chairs", "休闲椅"], ["C", "Dining chairs", "餐椅"], ["T", "Stools & bar stools", "凳子与吧凳"], ["B", "Benches & ottomans", "长凳与脚凳"],
    ["K", "Coffee & side tables", "茶几与边几"], ["D", "Dining tables", "餐桌"], ["E", "Desks & consoles", "书桌与玄关桌"], ["G", "Storage & TV units", "储物柜与电视柜"], ["R", "Beds & nightstands", "床与床头柜"],
    ["H", "Lighting", "灯具"], ["P", "Plumbing", "卫浴"], ["M", "Millwork & doors", "木作与门"], ["N", "Stone", "石材"], ["W", "Wall panelling & wood", "墙板与木制品"], ["Q", "Partition systems", "隔断系统"], ["Y", "Signage", "标识"],
    ["A", "Decor & accessories", "装饰与配饰"], ["O", "Other", "其他"], ["U", "Not sorted yet", "尚未分类"]];
  const typeName = c => { const x = TYPES.find(y => y[0] === c) || TYPES[TYPES.length - 1]; return zh() ? x[2] : x[1]; };
  const ui = { type: null, sup: null, q: "", show: null, n: 120, open: null, adding: false, target: "", zoom: false, seq: [] };
  // host.ctx: "studio" (dashboard) or "project". canEdit: may approve (admins, on the dashboard).
  // project(): this project's id (project ctx). projects(): [{id, name}] to add to (studio ctx).
  let host = { ctx: "studio", internal: () => true, canEdit: () => false, canAdd: () => false, project: () => null, projectName: () => "", projects: () => [], inProject: () => new Map(), prefix: null, added: null, openPiece: () => {}, layer: () => {}, toast: m => console.log(m), toastUndo: m => console.log(m) };

  // A catalogue was added or deleted: fetch the index again and redraw.
  // A change that arrives while the index is still loading reloads it again once that load ends.
  let reloadAgain = false;
  function reloadIndex() {
    if (!LIB) { if (libP) reloadAgain = true; return; }
    LIB = null; libP = null;
    load().then(() => { if (reloadAgain) { reloadAgain = false; return reloadIndex(); } if (ui.sup && !LIB.sups[ui.sup]) ui.sup = null; if (ui.open != null) { ui.open = null; document.body.style.overflow = ""; host.layer(); } rerender(); fetchFull().catch(() => {}); }).catch(() => {});
  }
  function load() {
    if (LIB) return Promise.resolve(LIB);
    return libP || (libP = fetch("/lib/data.json", { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error("lib"); return r.json(); }).then(d => {
      d.items = d.items.map((it, i) => {
        const m = String(it[0]).match(/_p(\d+)_(\d+)\.jpg$/);
        const o = { i, file: it[0], sup: it[1], page: it[2], codes: it[3] ? String(it[3]).split(" ").filter(Boolean) : [], text: it[4] || "", s: it[5], k: it[6], t: it[7] || "", key: m ? (+m[1]) * 100 + (+m[2]) : i };
        const L = LIB_LABEL[o.sup] || [o.sup, ""];
        o.h = [o.file, o.sup, L[0], L[1], d.sups[o.sup] && d.sups[o.sup].pdf, "p" + o.page, it[3], o.text].join(" ").toLowerCase();
        return o;
      });
      d.bySup = {}; d.items.forEach(o => (d.bySup[o.sup] = d.bySup[o.sup] || []).push(o));
      LIB = d; return d;
    }).catch(e => { libP = null; throw e; }));
  }
  async function fetchOn() {
    const r = await fetch("/api/db/col?path=library"); if (!r.ok) return;
    const j = await r.json(); const next = {};
    j.docs.forEach(d => { next[d.id] = new Set((d.data.on || []).map(Number)); });
    on = next; repaint();
  }
  async function fetchTypes() {
    const r = await fetch("/api/db/col?path=librarytypes"); if (!r.ok) return;
    const j = await r.json(); const next = {}; j.docs.forEach(d => { next[d.id] = (d.data && d.data.t) || {}; }); tov = next; repaint();
  }
  async function fetchFull() {
    const r = await fetch("/api/library/full"); if (!r.ok) return;
    full = new Set((await r.json()).files || []); fullLine(); if (ui.open != null) host.layer();
  }
  function watch() {
    if (watching) return; watching = true;
    fetchOn().catch(() => {}); fetchFull().catch(() => {}); fetchTypes().catch(() => {});
    try {
      const es = new EventSource("/api/events");
      es.onmessage = e => { try { const m = JSON.parse(e.data); if (m.path === "library" && m.index) { reloadIndex(); return; } if (/^librarytypes\/[^/]+$/.test(m.path)) { tov[m.path.slice(13)] = (m.exists && m.data && m.data.t) || {}; repaint(); return; } if (!/^library\/[^/]+$/.test(m.path)) return; const sup = m.path.slice(8); on[sup] = new Set(((m.exists && m.data && m.data.on) || []).map(Number)); repaint(); } catch (_) {} };
      es.onopen = () => { fetchOn().catch(() => {}); fetchTypes().catch(() => {}); };
    } catch (_) {}
  }

  const isOn = o => !!(on[o.sup] && on[o.sup].has(o.key));
  const typeOf = o => (tov[o.sup] && tov[o.sup][o.key]) || o.t || "U";
  const sprite = o => { if (o.s == null) return `style="background-image:url(/lib/thumb/${encodeURIComponent(o.file)});background-size:contain;background-position:center"`; const g = LIB.grid; return `style="background-image:url(/lib/sprites/s${String(o.s).padStart(3, "0")}.jpg);background-size:${g * 100}% ${g * 100}%;background-position:${(o.k % g) / (g - 1) * 100}% ${Math.floor(o.k / g) / (g - 1) * 100}%"`; };
  const label = sup => LIB_LABEL[sup] || (LIB && LIB.sups[sup] && LIB.sups[sup].label) || [sup, ""];
  const pdfURL = S => S.drive ? `https://drive.google.com/file/d/${S.drive}/view` : S.up ? `/lib/pdf/${encodeURIComponent(Object.keys(LIB.sups).find(k => LIB.sups[k] === S))}.pdf` : "#";
  const name = o => o.codes[0] || label(o.sup)[0] + " · p" + o.page;
  const approved = arr => (arr || LIB.items).filter(isOn).length;
  // Only an admin on the dashboard sees images that aren't approved.
  const curating = () => host.ctx === "studio" && host.canEdit();
  const showMode = () => (curating() ? ui.show || "all" : "on");
  function list() {
    const q = ui.q.toLowerCase().trim().split(/\s+/).filter(Boolean); const show = showMode();
    const src = ui.sup && LIB.bySup[ui.sup] ? LIB.bySup[ui.sup] : LIB.items;
    return src.filter(o => { if (ui.type && typeOf(o) !== ui.type) return false; const x = isOn(o); if (show === "on" && !x) return false; if (show === "off" && x) return false; return q.every(w => o.h.includes(w)); });
  }
  const sups = () => Object.keys(LIB.sups).filter(s => curating() || approved(LIB.bySup[s]));

  function view() {
    if (!LIB) {
      load().then(() => { const r = $("#sblib"); if (r) r.outerHTML = view(); }).catch(() => { const g = $("#sbl-grid"); if (g) g.innerHTML = `<p class="sbl-empty">${t("The catalogue index didn't load. Reload the page to try again.")}</p>`; });
      return `<div id="sblib"><section class="sbl-head"><div><span class="eyebrow">${t("Sourcing library")}</span></div></section><div id="sbl-grid"><p class="mono" style="padding-top:30px;color:var(--muted)">${t("Loading catalogues…")}</p></div></div>`;
    }
    watch();
    const cur = curating(), show = showMode(), tot = LIB.items.length, a = approved();
    const cats = [...new Set(Object.values(LIB.sups).map(s => s.cat))].map(c => c[0] + c.slice(1).toLowerCase());
    const lede = cur ? "Every image scanned from the supplier catalogues, each kept with its catalogue and page. Tick an image to approve it; only approved images are shown to the team and clients."
      : host.ctx === "project" ? "Products approved by the studio. Open one to see where it comes from, or add it to this project with its source attached." : "Products approved by the studio. Open one to see where it comes from, or add it to a project.";
    if (!cur && !a) return `<div id="sblib"><section class="sbl-head"><div>${host.ctx === "project" ? `<h2>${t("Sourcing library")}</h2>` : ""}<p>${t(lede)}</p></div></section><div id="sbl-grid"><p class="sbl-empty">${t("The studio hasn't approved any products yet.")}</p></div></div>`;
    return `<div id="sblib"><section class="sbl-head"><div><span class="eyebrow">${zh() ? `90 中国产品 · ${esc(cats.map(c => ({ Furniture: "家具", Lighting: "灯具", Doors: "门", Millwork: "木作", Stone: "石材", Signage: "标识" })[c] || c).join("、"))}` : `90 China Products · ${esc(cats.join(", "))}`}</span>
      ${host.ctx === "project" ? `<h2>${t("Sourcing library")}</h2>` : ""}
      <p>${t(lede)}</p></div>
      <div class="sbl-stat"><div><span class="eyebrow">${t("Approved")}</span><b id="sbl-kept">${nf(a)}</b></div>${cur ? `<div><span class="eyebrow">${t("Scanned")}</span><b>${nf(tot)}</b></div>` : ""}${host.ctx === "project" ? `<div><span class="eyebrow">${t("In this project")}</span><b>${host.inProject().size}</b></div>` : ""}</div>
      ${cur ? `<div class="sbl-full" id="sbl-full">${fullHTML()}</div><div id="sbl-addwrap" style="grid-column:1/-1">${addCatHTML()}</div>` : ""}</section>
    ${ui.type ? `<div class="sbl-crumb"><button class="linkbtn" data-sbltype="">‹ ${t("All product types")}</button><h3>${esc(typeName(ui.type))}</h3></div><div class="sbl-chips" id="sbl-cats">${catsHTML()}</div>`
      : `<div class="sbl-cats" id="sbl-cats">${catsHTML()}</div>`}
    <div class="sbl-tools"><input class="sbl-q" type="search" id="sbl-q" value="${esc(ui.q)}" placeholder="${esc(t("Search a code, product or page, e.g. AA01, Ampleforth, p44"))}" autocomplete="off" aria-label="${esc(t("Sourcing library"))}">
      ${cur ? `<span class="sbl-seg" role="group" aria-label="${t("Show")}">${[["on", "Approved"], ["off", "Not approved"], ["all", "All"]].map(([v, l]) => `<button class="chip" data-sblshow="${v}" aria-pressed="${show === v}">${t(l)}</button>`).join("")}</span>` : ""}
      <span class="sbl-count" id="sbl-count"></span>
      ${cur && ui.sup && LIB.sups[ui.sup] && LIB.sups[ui.sup].up ? `<button class="linkbtn" data-sbl="delcat" style="color:var(--crit)">${t("Delete this catalogue")}</button>` : ""}
      ${cur && (ui.sup || ui.type) ? `<span class="sbl-bulk"><button class="linkbtn" data-sblbulk="on">${t("Approve all shown")}</button><button class="linkbtn" data-sblbulk="off">${t("Unapprove all shown")}</button></span>` : ""}</div>
    <div id="sbl-grid">${gridHTML()}</div></div>`;
  }
  function catsHTML() {
    const cur = curating(), vis = o => cur || isOn(o);
    if (ui.type) {
      const mine = LIB.items.filter(o => typeOf(o) === ui.type && vis(o)); const n = {}; mine.forEach(o => (n[o.sup] = (n[o.sup] || 0) + 1));
      return `<button class="chip" data-sblsup="" aria-pressed="${!ui.sup}">${t("All catalogues")} · ${nf(mine.length)}</button>` +
        Object.keys(n).map(s => { const L = label(s); return `<button class="chip" data-sblsup="${esc(s)}" aria-pressed="${ui.sup === s}">${esc(L[0])}${L[1] ? " · " + esc(L[1]) : ""} · ${nf(n[s])}</button>`; }).join("");
    }
    const sub = (n, of) => cur ? `${nf(n)} / ${nf(of)} ${t("Approved").toLowerCase()}` : zh() ? `${nf(n)} 张图片` : `${nf(n)} image${n === 1 ? "" : "s"}`;
    const by = {}; LIB.items.forEach(o => (by[typeOf(o)] = by[typeOf(o)] || []).push(o));
    return TYPES.filter(([c]) => by[c] && (cur || by[c].some(isOn))).map(([c]) => {
      // Cover: an approved image if there is one, preferring product photos over tearsheet pages.
      const arr = by[c], ok = arr.filter(isOn), pool0 = cur && !ok.length ? arr : ok, photos = pool0.filter(o => !/tearsheet/i.test(o.sup)), pool = photos.length ? photos : pool0, cover = pool[Math.min(pool.length - 1, Math.floor(pool.length * .12))];
      return `<button class="sbl-cat" data-sbltype="${c}">${cover ? `<span class="sbl-sw" ${sprite(cover)}></span>` : ""}<span class="sbl-name">${esc(typeName(c))}</span><span class="sbl-sub">${sub(ok.length, arr.length)}</span>${cur ? `<span class="sbl-bar"><i style="width:${arr.length ? ok.length / arr.length * 100 : 0}%"></i></span>` : ""}</button>`;
    }).join("");
  }
  function gridHTML() {
    if (!ui.type && !ui.q.trim()) { setTimeout(() => { const c = $("#sbl-count"); if (c) c.textContent = ""; }, 0); return `<p class="sbl-hint" style="padding-top:18px">${t("Choose a product type to see its images.")}</p>`; }
    const l = list(), cur = curating(), inP = host.ctx === "project" ? host.inProject() : new Map();
    setTimeout(() => { const c = $("#sbl-count"); if (c) c.textContent = zh() ? `${nf(l.length)} 张图片` : `${nf(l.length)} image${l.length === 1 ? "" : "s"}`; }, 0);
    if (!l.length) return `<div class="sbl-grid"><p class="sbl-empty">${ui.q ? t("Nothing matches that search.") : showMode() === "off" ? t("Nothing is waiting for approval here.") : t("Nothing has been approved yet.")}</p></div>`;
    let page = null, html = ""; const bySup = !!ui.sup;
    for (const o of l.slice(0, ui.n)) {
      if (bySup && o.page !== page) { page = o.page; html += `<div class="sbl-page"><b>${t("Page")} ${o.page}</b>${cur ? `<span><button class="linkbtn" data-sblpage="${o.page}" data-v="on">${t("Approve page")}</button><button class="linkbtn" data-sblpage="${o.page}" data-v="off">${t("Unapprove page")}</button></span>` : ""}</div>`; }
      const x = isOn(o);
      html += `<div class="sbl-tile ${cur && !x ? "off" : ""}"><button class="sbl-open" data-sblopen="${o.i}" aria-label="${esc(o.file)}"><span class="sbl-sw" ${sprite(o)}></span></button>
        ${cur ? `<label class="sbl-chk" title="${x ? t("Approved. Untick to hide it.") : t("Not approved. Tick to approve.")}"><input type="checkbox" data-sblkeep="${o.i}" ${x ? "checked" : ""} aria-label="${t("Approve")} ${esc(o.file)}"></label>` : ""}
        ${inP.has(o.file) ? `<span class="sbl-inproj">${t("In project")}</span>` : ""}
        <span class="sbl-cap"><b>${esc(o.codes[0] || label(o.sup)[0])}</b><span>${bySup ? "" : esc(label(o.sup)[0]) + " · "}p${o.page}</span></span></div>`;
    }
    return `<div class="sbl-grid">${html}</div>${l.length > ui.n ? `<div class="sbl-more"><button class="btn ghost" data-sblmore>${zh() ? `再显示 ${Math.min(120, l.length - ui.n)} 张（还有 ${nf(l.length - ui.n)} 张）` : `Show ${Math.min(120, l.length - ui.n)} more of ${nf(l.length - ui.n)}`}</button></div>` : ""}`;
  }
  function repaint() {
    if (!LIB) return;
    const r = $("#sblib");
    // Switch between the empty state and the grid when the first approval arrives or the last one goes.
    if (r && !curating() && !!$("#sbl-cats") !== !!approved()) { r.outerHTML = view(); if (ui.open != null) host.layer(); return; }
    const g = $("#sbl-grid"), c = $("#sbl-cats"), k = $("#sbl-kept");
    if (g && c) g.innerHTML = gridHTML(); if (c) c.innerHTML = catsHTML(); if (k) k.textContent = nf(approved());
    if (ui.open != null) host.layer();
  }
  function rerender() { const r = $("#sblib"); if (r) r.outerHTML = view(); }

  // The server merges the keys into the stored list, so two people approving at once don't overwrite each other.
  async function send(sup, keys, x) {
    const r = await fetch("/api/library/set", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sup, keys, on: x }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw Object.assign(new Error(j.message || "save"), { code: j.code }); }
  }
  // An admin moves images to another product type; the server merges it into librarytypes/<catalogue>.
  function setType(l, code) {
    const by = {}; l.forEach(o => (by[o.sup] = by[o.sup] || []).push(o.key));
    Object.entries(by).forEach(([sup, keys]) => {
      tov[sup] = { ...(tov[sup] || {}) }; keys.forEach(k => (tov[sup][k] = code));
      fetch("/api/library/type", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sup, keys, type: code }) })
        .then(r => { if (!r.ok) throw new Error(); }).catch(() => { host.toast(t("Couldn't save. Check your connection and try again.")); fetchTypes().catch(() => {}); });
    });
    repaint();
  }
  function setOn(sup, keys, x) {
    const s = new Set(on[sup] || []); keys.forEach(k => (x ? s.add(k) : s.delete(k))); on[sup] = s;
    send(sup, keys, x).catch(e => { host.toast(e.code === "forbidden" ? e.message : t("Couldn't save. Check your connection and try again.")); fetchOn().catch(() => {}); });
  }
  function bulk(l, x) {
    if (!l.length) return;
    const by = {}; l.forEach(o => (by[o.sup] = by[o.sup] || []).push(o));
    const prev = {}; Object.entries(by).forEach(([s, arr]) => { prev[s] = { was: arr.filter(isOn).map(o => o.key), wasnt: arr.filter(o => !isOn(o)).map(o => o.key) }; });
    Object.entries(by).forEach(([s, arr]) => setOn(s, arr.map(o => o.key), x)); repaint();
    host.toastUndo(zh() ? `已${x ? "批准" : "取消批准"} ${l.length} 张图片` : `${l.length} image${l.length === 1 ? "" : "s"} ${x ? "approved" : "unapproved"}`, () => {
      Object.entries(prev).forEach(([s, p]) => { if (p.was.length) setOn(s, p.was, true); if (p.wasnt.length) setOn(s, p.wasnt, false); }); repaint();
    });
  }

  function sourceNote(o) { const S = LIB.sups[o.sup]; return `${o.file}\nSource: ${S.pdf}, page ${o.page} of ${S.pages} (${S.cat})\nPDF: ${S.up && !S.drive ? location.origin : ""}${pdfURL(S)}` + (S.up ? "" : `\nImage: ${LIB_ROOT}_IMAGE LIBRARY\\${S.cat}\\${o.sup}\\${o.file}`); }
  function addControls(o) {
    if (!host.canAdd() || (!isOn(o) && !host.canEdit())) return "";
    if (host.ctx === "project") {
      const inId = host.inProject().get(o.file);
      return inId ? `<button class="btn" data-sbl="piece" data-id="${esc(inId)}">${t("Open the piece in this project")}</button>`
        : `<button class="btn" data-sbl="add" ${ui.adding ? "disabled" : ""}>${ui.adding ? t("Adding…") : (zh() ? "添加到 " : "Add to ") + esc(host.projectName())}</button>`;
    }
    const ps = host.projects();
    if (!ps.length) return `<span class="sbl-hint" style="margin:0">${t("No projects to add to yet.")}</span>`;
    if (!ps.some(p => p.id === ui.target)) ui.target = ps.length === 1 ? ps[0].id : "";
    return `<label class="sbl-pick">${t("Add to project")}<select id="sbl-target"><option value="">${t("Choose a project")}</option>${ps.map(p => `<option value="${esc(p.id)}" ${p.id === ui.target ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
      <button class="btn" data-sbl="add" ${ui.adding || !ui.target ? "disabled" : ""}>${ui.adding ? t("Adding…") : t("Add")}</button>`;
  }
  // Next / previous move through the images that were listed when the card was opened,
  // so approving one while showing "Not approved" doesn't skip the next.
  const seqPos = () => ui.seq.indexOf(ui.open);
  function step(d) {
    const i = seqPos(), j = i + d; if (i < 0 || j < 0 || j >= ui.seq.length || ui.adding) return;
    ui.open = ui.seq[j]; host.layer();
    const n = LIB.items[ui.seq[j + d]]; if (n && full.has(n.file)) new Image().src = `/lib/full/${n.file}`;
  }
  function navHTML() {
    const i = seqPos(), n = ui.seq.length; if (i < 0 || n < 2) return "";
    return `<button class="sbl-nav prev" data-sbl="prev" aria-label="${t("Previous")}" ${i === 0 ? "disabled" : ""}>‹</button><button class="sbl-nav next" data-sbl="next" aria-label="${t("Next")}" ${i === n - 1 ? "disabled" : ""}>›</button><span class="sbl-pos">${nf(i + 1)} / ${nf(n)}</span>`;
  }
  function sheet() {
    const o = LIB && ui.open != null ? LIB.items[ui.open] : null; if (!o) { ui.open = null; return ""; }
    const S = LIB.sups[o.sup], L = label(o.sup), x = isOn(o), cur = curating();
    document.body.style.overflow = "hidden";
    return `<div class="sbl-scrim" data-sbl="close"></div>
    <section class="sbl-sheet${full.has(o.file) ? " big" : ""}" role="dialog" aria-modal="true" aria-label="${esc(o.file)}">
      ${full.has(o.file) ? `<div class="sbl-hero big"><button class="sbl-zoom" data-sbl="zoom" title="${t("Click to see it full screen")}"><span class="sbl-sw" ${sprite(o)}></span><img class="sbl-big" src="/lib/full/${esc(o.file)}" alt="${esc(o.file)}"></button>${navHTML()}</div>`
        : `<div class="sbl-hero"><span class="sbl-sw" ${sprite(o)}></span>${navHTML()}</div>`}
      <div class="sbl-body">
        <div class="sbl-top"><span class="eyebrow">${esc(typeName(typeOf(o)))} · ${esc(L[0])}${L[1] ? " · " + esc(L[1]) : ""}</span><span class="sbl-topr">${cur ? `<button class="btn sm sbl-appr ${x ? "on" : ""}" data-sbl="toggle" aria-pressed="${x}">${x ? "✓ " + t("Approved") : t("Approve")}</button>` : ""}<button class="sbl-x" data-sbl="close" aria-label="${t("Close")}">×</button></span></div>
        ${ui.seq.length > 1 || cur ? `<p class="sbl-hint" style="margin-top:6px">${t(ui.seq.length > 1 ? (cur ? "← → to move between products · Space to approve" : "← → to move between products") : "Space to approve")}</p>` : ""}
        <h2>${esc(name(o))}</h2>
        <p class="sbl-file">${esc(o.file)}</p>
        <div class="sbl-facts">
          <div><span class="eyebrow">${t("Catalogue")}</span><b>${esc(L[0])}</b></div>
          <div><span class="eyebrow">${t("Page")}</span><b>${o.page} / ${S.pages}</b></div>
          <div><span class="eyebrow">${t("Codes on page")}</span><b style="font-family:var(--mono);font-size:15px">${esc(o.codes.slice(0, 4).join(" ") || "—")}</b></div>
        </div>
        <div class="sbl-row" style="margin-top:22px;align-items:flex-end">${addControls(o)}</div>
        <section class="sbl-sec"><header><h5>${t("Source")}</h5></header>
          <div class="sbl-kv"><div class="k">PDF</div><div><a href="${esc(pdfURL(S))}" target="_blank" rel="noopener">${esc(S.pdf)} ↗</a></div>
            ${host.internal() && !S.up ? `<div class="k">${t("Catalogue folder")}</div><div class="m">${esc(LIB_ROOT + S.cat)}</div>
            <div class="k">${t("Image file")}</div><div class="m">${esc(LIB_ROOT + "_IMAGE LIBRARY\\" + S.cat + "\\" + o.sup + "\\")}</div>` : ""}</div>
          ${host.internal() ? `<div class="sbl-note"><code id="sbl-note">${esc(sourceNote(o)).replace(/\n/g, "<br>")}</code><div class="sbl-row" style="margin-top:0"><button class="btn sm" data-sbl="copy">${t("Copy source note")}</button><span class="mono" style="font-size:11.5px;color:var(--muted)">${zh() ? `PDF 从第 1 页打开；此图片在第 ${o.page} 页。` : `The PDF opens at page 1; this image is on page ${o.page}.`}</span></div></div>` : ""}
        </section>
        ${cur ? `<section class="sbl-sec"><header><h5>${t("Product type")}</h5></header>
          <label class="sbl-pick" style="margin-top:10px"><select id="sbl-type">${TYPES.filter(x => x[0] !== "U" || typeOf(o) === "U").map(([c]) => `<option value="${c}" ${typeOf(o) === c ? "selected" : ""}>${esc(typeName(c))}</option>`).join("")}</select></label>
        </section>` : ""}
        ${cur ? `<section class="sbl-sec"><header><h5>${t("In the library")}</h5><span class="mono" style="color:var(--muted)">${x ? t("Approved") : t("Not approved")}</span></header>
          <p class="sbl-hint">${t("Approved images are shown to everyone, clients included. Unapproving hides it again; pieces already added to projects stay.")}</p>
        </section>` : ""}
        ${o.text ? `<p class="sbl-excerpt">${zh() ? "页面文字：" : "Text on the page: "}${esc(o.text.slice(0, 220))}${o.text.length > 220 ? "…" : ""}</p>` : ""}
      </div></section>
    ${ui.zoom && full.has(o.file) ? `<div class="sbl-zoomview" data-sbl="unzoom" role="dialog" aria-label="${esc(o.file)}"><img src="/lib/full/${esc(o.file)}" alt="${esc(o.file)}">${navHTML()}</div>` : ""}`;
  }
  function close() { if (ui.open == null) return; ui.open = null; ui.adding = false; ui.zoom = false; ui.seq = []; document.body.style.overflow = ""; host.layer(); }

  // Cut one image out of its thumbnail sheet, for the piece's photo (JPEG, base64).
  async function crop(o) {
    const im = await new Promise((res, rej) => { const x = new Image(); x.onload = () => res(x); x.onerror = rej; x.src = `/lib/sprites/s${String(o.s).padStart(3, "0")}.jpg`; });
    const c = LIB.cell, g = LIB.grid; const cv = document.createElement("canvas"); cv.width = c; cv.height = c;
    cv.getContext("2d").drawImage(im, (o.k % g) * c, Math.floor(o.k / g) * c, c, c, 0, 0, c, c);
    return cv.toDataURL("image/jpeg", .9).split(",")[1];
  }
  // The full-size image, scaled to at most 1600px, for the piece's photo.
  async function bigPhoto(o) {
    const b = await createImageBitmap(await (await fetch(`/lib/full/${encodeURIComponent(o.file)}`)).blob());
    const sc = Math.min(1, 1600 / Math.max(b.width, b.height)); const cv = document.createElement("canvas");
    cv.width = Math.round(b.width * sc); cv.height = Math.round(b.height * sc);
    const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(b, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", .86).split(",")[1];
  }
  // The server builds the piece from the catalogue index, so clients can add pieces too.
  async function add() {
    const o = LIB && LIB.items[ui.open]; if (!o || ui.adding) return;
    const project = host.ctx === "project" ? host.project() : ui.target; if (!project) return;
    ui.adding = true; host.layer();
    try {
      let photo = null;
      if (full.has(o.file)) try { photo = await bigPhoto(o); } catch (_) {}
      if (!photo) try { photo = await crop(o); } catch (_) {}
      const prefix = host.prefix ? host.prefix(o, label(o.sup)[1]) : null;
      const r = await fetch("/api/library/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project, file: o.file, photo, prefix }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(j.message || "add"), { code: j.code });
      const pname = host.ctx === "project" ? host.projectName() : (host.projects().find(p => p.id === project) || {}).name || project;
      ui.adding = false; ui.open = null; document.body.style.overflow = ""; host.layer();
      if (host.added) host.added(j, pname); else host.toast(zh() ? `已添加到 ${pname}，编号 ${j.code}` : `Added to ${pname} as ${j.code}`);
      rerender();
    } catch (e) { ui.adding = false; host.layer(); host.toast(e.code === "forbidden" || e.code === "invalid_argument" ? e.message : t("Couldn't add it. Try again.")); }
  }

  // Adding a catalogue from a PDF (admins). The browser reads the PDF with pdf.js, takes out the photos
  // embedded on each page and uploads each one full size (up to 2400px) with a 280px thumbnail, named
  // CATEGORY_Supplier-Catalogue_pPAGE_NN.jpg like the scanned catalogues. Nothing is approved.
  const CATS = ["FURNITURE", "LIGHTING", "PLUMBING", "MILLWORK", "DOORS", "STONE", "WALL PANELLING", "WOOD PRODUCTS", "PARTITION SYSTEMS", "SIGNAGE"];
  const CAT_ZH = { FURNITURE: "家具", LIGHTING: "灯具", PLUMBING: "卫浴", MILLWORK: "木作", DOORS: "门", STONE: "石材", "WALL PANELLING": "墙板", "WOOD PRODUCTS": "木制品", "PARTITION SYSTEMS": "隔断系统", SIGNAGE: "标识" };
  let scan = null, scanErr = "", pdfMode = "scan"; // progress text while a PDF is being scanned; why the last one stopped
  function addCatHTML() {
    if (scan) return `<div class="sbl-addcat"><p style="color:var(--ink);font-size:14px">${esc(scan)}</p></div>`;
    if (!ui.addcat) return `<button class="linkbtn" data-sbl="addcat">${t("Add a catalogue from a PDF")}</button>`;
    return `<div class="sbl-addcat">${scanErr ? `<p style="color:var(--crit);font-size:14px">${esc(scanErr)}</p>` : ""}
      <label class="sbl-drop">${t("PDF catalogue")}<span>${t("Drop the PDF here, or click to choose it")}</span><b id="sbl-pdfname"></b><input type="file" id="sbl-pdf" accept="application/pdf,.pdf"></label>
      <fieldset class="sbl-mode" id="sbl-mode" hidden><legend>${t("How to add it")}</legend>
        <label><input type="radio" name="sbl-mode" value="scan" ${pdfMode === "scan" ? "checked" : ""}><span>${t("Scan for product images")}<small>${t("Pulls out each photo in the PDF.")}</small></span></label>
        <label><input type="radio" name="sbl-mode" value="pages" ${pdfMode === "pages" ? "checked" : ""}><span>${t("Import page by page")}<small>${t("Each page becomes one image.")}</small></span></label></fieldset>
      <label>${t("Supplier")}<input id="sbl-supplier" autocomplete="off" placeholder="Billa"></label>
      <label>${t("Catalogue name (optional)")}<input id="sbl-product" autocomplete="off" placeholder="Sofa 2026"></label>
      <label>${t("Category")}<select id="sbl-cat">${CATS.map(c => `<option value="${c}">${zh() ? CAT_ZH[c] : c[0] + c.slice(1).toLowerCase()}</option>`).join("")}</select></label>
      <label style="grid-column:1/-1">${t("Google Drive link to the PDF (optional)")}<input id="sbl-drive" autocomplete="off" placeholder="https://drive.google.com/file/d/…"></label>
      <p>${t("The PDF is scanned in this browser, so keep this tab open until it finishes. Photos in the PDF become library images named like the others (category_supplier_page_number) and start unapproved. Up to 300 MB and 2,000 pages.")}</p>
      <div class="sbl-row"><button class="btn" data-sbl="scan" id="sbl-go">${t(pdfMode === "pages" ? "Import pages" : "Scan and add")}</button><button class="btn ghost" data-sbl="addcancel">${t("Cancel")}</button></div></div>`;
  }
  function addLine() { const el = $("#sbl-addwrap"); if (el) el.innerHTML = addCatHTML(); }
  let PDFJS = null;
  async function pdfjs() {
    if (!PDFJS) { PDFJS = await import("/pdfjs/pdf.min.mjs"); PDFJS.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs"; }
    return PDFJS;
  }
  // An image object from pdf.js, drawn onto a white canvas (transparent parts become white).
  function imgCanvas(img) {
    const w = img.width, h = img.height; if (!w || !h) return null;
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    if (img.bitmap) { g.drawImage(img.bitmap, 0, 0); return cv; }
    if (!img.data) return null;
    const src = img.data, id = g.createImageData(w, h), d = id.data, n = w * h;
    if (img.kind === 3 && src.length >= n * 4) d.set(src.subarray(0, n * 4));
    else if (img.kind === 1) { const row = (w + 7) >> 3; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = (src[y * row + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0, i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } }
    else if (img.kind === 2 && src.length >= n * 3) for (let i = 0, j = 0; i < n; i++, j += 3) { d[i * 4] = src[j]; d[i * 4 + 1] = src[j + 1]; d[i * 4 + 2] = src[j + 2]; d[i * 4 + 3] = 255; }
    else return null;
    const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h; tmp.getContext("2d").putImageData(id, 0, 0); g.drawImage(tmp, 0, 0);
    return cv;
  }
  // A small fingerprint, to skip a picture repeated across pages (logos, backgrounds) and near-blank fills.
  function fingerprint(cv) {
    const c = document.createElement("canvas"); c.width = 16; c.height = 16; const g = c.getContext("2d"); g.drawImage(cv, 0, 0, 16, 16);
    const d = g.getImageData(0, 0, 16, 16).data; let s = "", sum = 0, sq = 0;
    for (let i = 0; i < d.length; i += 4) { const v = (d[i] * 3 + d[i + 1] * 6 + d[i + 2]) / 10; sum += v; sq += v * v; s += String.fromCharCode(65 + (v >> 4)); }
    const m = sum / 256; return { key: cv.width + "x" + cv.height + s, flat: Math.sqrt(sq / 256 - m * m) < 6 };
  }
  function toJPEG(cv, max, q, square) {
    const sc = Math.min(1, max / Math.max(cv.width, cv.height)), w = Math.max(1, Math.round(cv.width * sc)), h = Math.max(1, Math.round(cv.height * sc));
    const o = document.createElement("canvas"); o.width = square ? max : w; o.height = square ? max : h; const g = o.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, o.width, o.height); g.drawImage(cv, square ? (max - w) / 2 : 0, square ? (max - h) / 2 : 0, w, h);
    return new Promise(r => o.toBlob(r, "image/jpeg", q));
  }
  const pageObj = (page, name) => new Promise(res => { const t0 = setTimeout(() => res(null), 8000); try { (name.startsWith("g_") ? page.commonObjs : page.objs).get(name, v => { clearTimeout(t0); res(v); }); } catch (_) { clearTimeout(t0); res(null); } });
  async function api(url, opt) { const r = await fetch(url, opt); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.message || "Upload failed"), { code: j.code }); return j; }
  async function scanPDF() {
    const file = $("#sbl-pdf") && $("#sbl-pdf").files[0], supplier = ($("#sbl-supplier") || {}).value || "", product = ($("#sbl-product") || {}).value || "", cat = ($("#sbl-cat") || {}).value;
    const dm = String(($("#sbl-drive") || {}).value || "").match(/[-\w]{25,}/);
    if (!file || !supplier.trim()) { host.toast(t("Choose a PDF and enter the supplier.")); return; }
    if (file.size > 300 * 1024 * 1024) { host.toast(zh() ? "PDF 超过 300 MB。" : "That PDF is over 300 MB."); return; }
    const setScan = m => { scan = m; addLine(); }; scanErr = "";
    let sup = null;
    try {
      setScan(zh() ? "正在打开 PDF…" : "Opening the PDF…");
      const pj = await pdfjs();
      const doc = await pj.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
      const start = await api("/api/library/catalogue", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ supplier, product, cat, pdf: file.name, pages: doc.numPages, drive: dm ? dm[0] : "" }) });
      sup = start.sup;
      setScan(zh() ? "正在上传 PDF…" : "Uploading the PDF…");
      await api(`/api/library/catalogue/${sup}/pdf`, { method: "PUT", headers: { "content-type": "application/pdf" }, body: file });
      const items = [], seen = new Map(), OPS = pj.OPS, pages = pdfMode === "pages";
      // The whole page drawn on a white canvas, up to max px on its long side.
      const renderPage = async (page, max) => {
        const v1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: Math.min(4, max / Math.max(v1.width, v1.height)) });
        const cv = document.createElement("canvas"); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
        const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
        await page.render({ canvasContext: g, viewport: vp }).promise; return cv;
      };
      for (let n = 1; n <= doc.numPages; n++) {
        setScan(pages ? (zh() ? `正在导入第 ${n} / ${doc.numPages} 页` : `Importing page ${n} of ${doc.numPages}`) : zh() ? `正在扫描第 ${n} / ${doc.numPages} 页 · 已找到 ${items.length} 张图片` : `Scanning page ${n} of ${doc.numPages} · ${items.length} image${items.length === 1 ? "" : "s"} found`);
        const page = await doc.getPage(n);
        const ops = await page.getOperatorList();
        const names = []; let imgOps = 0, pathOps = 0;
        ops.fnArray.forEach((fn, i) => {
          if (fn === OPS.paintImageXObject) { imgOps++; if (!names.includes(ops.argsArray[i][0])) names.push(ops.argsArray[i][0]); }
          else if (fn === OPS.paintInlineImageXObject || fn === OPS.paintImageXObjectRepeat) imgOps++;
          else if (fn === OPS.constructPath) pathOps++;
        });
        let nn = 0;
        const save = async cv => {
          nn++;
          const f = `${start.prefix}_p${String(n).padStart(3, "0")}_${String(nn).padStart(2, "0")}.jpg`;
          const [big, th] = await Promise.all([toJPEG(cv, 2400, .88), toJPEG(cv, 280, .85, true)]);
          await api(`/api/library/catalogue/${sup}/img/${f}`, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: big });
          await api(`/api/library/catalogue/${sup}/img/${f}?thumb=1`, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: th });
          const it = [f, n, "", ""]; items.push(it); return it;
        };
        // Page by page: every page becomes one image, blank ones included so page numbers stay complete.
        if (pages) await save(await renderPage(page, 2400));
        else for (const name of names) {
          if (nn >= 99) break;
          const img = await pageObj(page, name); if (!img) continue;
          if (Math.min(img.width, img.height) < 160 || img.width * img.height < 60000) continue;
          const cv = imgCanvas(img); if (!cv) continue;
          const fp = fingerprint(cv); if (fp.flat) continue;
          if (seen.has(fp.key)) { const x = seen.get(fp.key); if (x.page !== n) { x.pages++; x.page = n; } continue; }
          const it = await save(cv); seen.set(fp.key, { it, pages: 1, page: n });
        }
        // No separate photos (a page saved as tiles, small pieces or drawings): keep the whole page as one image.
        if (!pages && !nn && (imgOps > 0 || pathOps > 150)) {
          try { const cv = await renderPage(page, 2000); if (!fingerprint(cv).flat) await save(cv); } catch (e) { if (e.code) throw e; }
        }
        if (nn) {
          const tc = await page.getTextContent().catch(() => null);
          const text = tc ? tc.items.map(x => x.str).join(" ").replace(/\s+/g, " ").trim() : "";
          const codes = [...new Set(text.match(/\b[A-Z]{1,4}-?\d{2,5}[A-Z]{0,2}\b/g) || [])].slice(0, 8).join(" ");
          items.filter(x => x[1] === n).forEach(x => { x[2] = codes; x[3] = text.slice(0, 600); });
        }
        page.cleanup();
      }
      doc.destroy();
      // A picture on three or more pages is a logo or page decoration, not a product.
      const drop = new Set([...seen.values()].filter(x => x.pages >= 3).map(x => x.it));
      const keep = items.filter(x => !drop.has(x));
      setScan(zh() ? "正在完成…" : "Finishing…");
      const done = await api(`/api/library/catalogue/${sup}/done`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: keep }) });
      scan = null; ui.addcat = false; ui.sup = sup; ui.show = "all";
      host.toast(zh() ? `已添加 ${nf(done.n)} 张图片，尚未批准` : `${nf(done.n)} images added. None are approved yet`);
      reloadIndex();
    } catch (e) {
      scan = null;
      scanErr = e.code ? e.message : e.name === "InvalidPDFException" || e.name === "PasswordException" ? t("Couldn't read that PDF.") : (zh() ? "扫描中断，请重试。" : "The scan stopped part way. Try again.") + (e.message ? " (" + e.message + ")" : "");
      addLine(); host.toast(scanErr);
    }
  }
  async function deleteCat(sup) {
    const S = LIB.sups[sup]; if (!S || !S.up) return;
    const L = label(sup);
    if (!confirm(zh() ? `删除图册「${L.join(" · ")}」？它的 ${S.n} 张图片和批准记录将被移除，已添加到项目中的项目会保留。` : `Delete ${L.filter(Boolean).join(" · ")}? Its ${S.n} images and approvals are removed. Pieces already added to projects stay.`)) return;
    try { await api(`/api/library/catalogue/${sup}`, { method: "DELETE" }); ui.sup = null; reloadIndex(); }
    catch (e) { host.toast(e.message || t("Couldn't save. Check your connection and try again.")); }
  }

  // Admins upload the full-size images: the catalogue zips from Drive, or the JPEGs inside them.
  function fullHTML() {
    const n = LIB ? LIB.items.filter(o => full.has(o.file)).length : full.size, tot = LIB ? LIB.items.length : 0;
    return `<span>${t("Full-size images")}: <b>${nf(n)}</b> / ${nf(tot)}</span>
      ${up ? `<span class="mono">${esc(up)}</span>` : `<label class="linkbtn" style="cursor:pointer">${t("Upload zips")}<input type="file" id="sbl-up" accept=".zip,.jpg,.jpeg" multiple hidden></label>`}
      ${up ? "" : `<span class="mono">${t("Choose the catalogue zips from Google Drive (or the JPEGs inside them). Images are matched to the library by file name.")}</span>`}`;
  }
  function fullLine() { const el = $("#sbl-full"); if (el) el.innerHTML = fullHTML(); }
  // Lists a zip's files without loading it all: [{name, get() -> Blob}]. Stored and deflated entries only.
  async function unzip(file) {
    const tail = new DataView(await file.slice(Math.max(0, file.size - 66000)).arrayBuffer());
    let e = -1; for (let i = tail.byteLength - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error("zip");
    const cdSize = tail.getUint32(e + 12, true), cdOff = tail.getUint32(e + 16, true);
    const cd = new DataView(await file.slice(cdOff, cdOff + cdSize).arrayBuffer()); const out = [];
    for (let i = 0; i + 46 <= cd.byteLength && cd.getUint32(i, true) === 0x02014b50;) {
      const method = cd.getUint16(i + 10, true), csize = cd.getUint32(i + 20, true), nl = cd.getUint16(i + 28, true), xl = cd.getUint16(i + 30, true), cl = cd.getUint16(i + 32, true), off = cd.getUint32(i + 42, true);
      const name = new TextDecoder().decode(new Uint8Array(cd.buffer, i + 46, nl));
      out.push({ name: name.split(/[\\/]/).pop(), get: async () => {
        const h = new DataView(await file.slice(off, off + 30).arrayBuffer()); const start = off + 30 + h.getUint16(26, true) + h.getUint16(28, true);
        const raw = file.slice(start, start + csize);
        if (method === 0) return raw;
        if (method !== 8) throw new Error("method");
        return new Response(raw.stream().pipeThrough(new DecompressionStream("deflate-raw"))).blob();
      } });
      i += 46 + nl + xl + cl;
    }
    return out;
  }
  // Very large originals are scaled to 2400px on the long side; anything smaller is uploaded as it is.
  async function shrink(blob) {
    const b = await createImageBitmap(blob); const m = Math.max(b.width, b.height);
    if (m <= 2400) { b.close && b.close(); return blob; }
    const sc = 2400 / m, cv = document.createElement("canvas"); cv.width = Math.round(b.width * sc); cv.height = Math.round(b.height * sc);
    cv.getContext("2d").drawImage(b, 0, 0, cv.width, cv.height);
    return new Promise(r => cv.toBlob(r, "image/jpeg", .88));
  }
  async function upload(files) {
    if (up || !LIB || !curating()) return;
    const known = new Set(LIB.items.map(o => o.file)), jobs = [];
    up = t("Uploading…"); fullLine();
    try {
      for (const f of files) {
        if (/\.zip$/i.test(f.name)) (await unzip(f)).forEach(x => { if (known.has(x.name)) jobs.push(x); });
        else if (known.has(f.name)) jobs.push({ name: f.name, get: async () => f });
      }
      let done = 0, bad = 0, i = 0;
      const tick = () => { up = zh() ? `正在上传 ${nf(done)} / ${nf(jobs.length)}` : `Uploading ${nf(done)} of ${nf(jobs.length)}`; fullLine(); };
      tick();
      await Promise.all([0, 1, 2, 3].map(async () => {
        while (i < jobs.length) {
          const j = jobs[i++];
          try {
            const r = await fetch(`/api/library/full/${encodeURIComponent(j.name)}`, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: await shrink(await j.get()) });
            if (r.ok) full.add(j.name); else bad++;
          } catch (_) { bad++; }
          done++; if (done % 10 === 0 || done === jobs.length) tick();
        }
      }));
      up = null; fullLine();
      host.toast(zh() ? `已上传 ${nf(done - bad)} 张高清大图${bad ? `，${nf(bad)} 张失败` : ""}${jobs.length ? "" : "（没有与图库匹配的文件）"}`
        : jobs.length ? `${nf(done - bad)} full-size image${done - bad === 1 ? "" : "s"} uploaded${bad ? `, ${nf(bad)} failed. Upload again to retry them` : ""}` : "None of those files match the library.");
    } catch (_) { up = null; fullLine(); host.toast(zh() ? "无法读取该压缩包。" : "Couldn't read that zip."); }
  }
  document.addEventListener("load", e => { const el = e.target; if (el.classList && el.classList.contains("sbl-big")) el.closest(".sbl-hero")?.classList.add("loaded"); }, true);
  document.addEventListener("error", e => { const el = e.target; if (el.classList && el.classList.contains("sbl-big")) { const h = el.closest(".sbl-hero"); if (h) { h.classList.remove("big"); el.remove(); } } }, true);

  document.addEventListener("click", async e => {
    const el = e.target.closest && e.target.closest("[data-sbltype],[data-sblsup],[data-sblshow],[data-sblmore],[data-sblopen],[data-sblbulk],[data-sblpage],[data-sbl]"); if (!el || !LIB) return;
    if (el.dataset.sblsup !== undefined) { ui.sup = el.dataset.sblsup || null; ui.n = 120; rerender(); return; }
    if (el.dataset.sbltype !== undefined) { ui.type = el.dataset.sbltype || null; ui.sup = null; ui.n = 120; rerender(); const r = $("#sblib"); if (r && ui.type) r.scrollIntoView({ block: "start" }); return; }
    if (el.dataset.sblshow) { ui.show = el.dataset.sblshow; ui.n = 120; document.querySelectorAll("[data-sblshow]").forEach(b => b.setAttribute("aria-pressed", b === el)); repaint(); return; }
    if (el.dataset.sblmore !== undefined) { ui.n += 120; repaint(); return; }
    if (el.dataset.sblopen !== undefined) { ui.open = +el.dataset.sblopen; ui.seq = list().map(o => o.i); host.layer(); return; }
    if (!curating() && (el.dataset.sblbulk || el.dataset.sblpage)) return;
    if (el.dataset.sblbulk) { bulk(list(), el.dataset.sblbulk === "on"); return; }
    if (el.dataset.sblpage) { const p = +el.dataset.sblpage; bulk(list().filter(o => o.page === p), el.dataset.v === "on"); return; }
    const a = el.dataset.sbl;
    if (a === "close") close();
    else if (a === "addcat" && curating()) { ui.addcat = true; addLine(); }
    else if (a === "addcancel") { ui.addcat = false; addLine(); }
    else if (a === "scan" && curating() && !scan) scanPDF();
    else if (a === "delcat" && curating() && ui.sup) deleteCat(ui.sup);
    else if (a === "prev" || a === "next") { e.stopPropagation(); step(a === "next" ? 1 : -1); }
    else if (a === "zoom") { ui.zoom = true; host.layer(); }
    else if (a === "unzoom" && !e.target.closest(".sbl-nav")) { ui.zoom = false; host.layer(); }
    else if (a === "toggle" && curating()) { const o = LIB.items[ui.open]; if (o) { setOn(o.sup, [o.key], !isOn(o)); repaint(); host.layer(); } }
    else if (a === "add") add();
    else if (a === "piece") { const id = el.dataset.id; ui.open = null; host.openPiece(id); }
    else if (a === "copy") {
      const o = LIB.items[ui.open]; if (!o) return;
      try { await navigator.clipboard.writeText(sourceNote(o)); host.toast(t("Source note copied")); }
      catch (_) { const r = document.createRange(); r.selectNodeContents($("#sbl-note")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); host.toast(t("Selected. Press Ctrl+C to copy.")); }
    }
  });
  document.addEventListener("change", e => {
    const el = e.target;
    if (el.id === "sbl-target") { ui.target = el.value; host.layer(); return; }
    if (el.id === "sbl-type" && curating()) { const o = LIB && LIB.items[ui.open]; if (o) { setType([o], el.value); host.toast(zh() ? `已移至「${typeName(el.value)}」` : `Moved to ${typeName(el.value)}`); } return; }
    if (el.id === "sbl-pdf") { pdfName(); return; }
    if (el.name === "sbl-mode") { pdfMode = el.value; const g = $("#sbl-go"); if (g) g.textContent = t(pdfMode === "pages" ? "Import pages" : "Scan and add"); return; }
    if (el.id === "sbl-up") { const f = [...el.files]; el.value = ""; upload(f); return; }
    if (!(el.dataset && el.dataset.sblkeep !== undefined) || !LIB || !curating()) return;
    const o = LIB.items[+el.dataset.sblkeep]; if (!o) return;
    setOn(o.sup, [o.key], el.checked); el.closest(".sbl-tile")?.classList.toggle("off", !el.checked);
    const c = $("#sbl-cats"); if (c) c.innerHTML = catsHTML(); const k = $("#sbl-kept"); if (k) k.textContent = nf(approved());
  });
  // Drag a PDF onto the add form (or the link that opens it) instead of choosing it.
  const pdfName = () => { const f = $("#sbl-pdf") && $("#sbl-pdf").files[0], b = $("#sbl-pdfname"), m = $("#sbl-mode"); if (b) b.textContent = f ? f.name : ""; if (m) m.hidden = !f; };
  const dropZone = e => !scan && curating() && e.dataTransfer && [...e.dataTransfer.types].includes("Files") && e.target.closest && e.target.closest(".sbl-addcat,[data-sbl=addcat]");
  document.addEventListener("dragover", e => { const z = dropZone(e); if (!z) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; z.classList.add("over"); });
  document.addEventListener("dragleave", e => { const z = dropZone(e); if (z && !z.contains(e.relatedTarget)) z.classList.remove("over"); });
  document.addEventListener("drop", e => {
    const z = dropZone(e); if (!z) return; e.preventDefault(); z.classList.remove("over");
    const f = [...e.dataTransfer.files].find(f => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    if (!f) { host.toast(t("That isn't a PDF.")); return; }
    if (!ui.addcat) { ui.addcat = true; addLine(); }
    const inp = $("#sbl-pdf"); if (!inp) return; const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; pdfName();
  });
  document.addEventListener("input", e => { if (e.target.id === "sbl-q" && LIB) { ui.q = e.target.value; ui.n = 120; clearTimeout(qT); qT = setTimeout(() => { const g = $("#sbl-grid"); if (g) g.innerHTML = gridHTML(); }, 140); } });
  document.addEventListener("keydown", e => {
    if (ui.open == null || !LIB || document.getElementById("viewer") || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); step(e.key === "ArrowRight" ? 1 : -1); }
    // Space (or A) approves or unapproves the image that's open. Re-rendering the card drops focus, so a focused button isn't pressed too.
    else if ((e.key === " " || e.key === "a" || e.key === "A") && curating()) { e.preventDefault(); if (e.repeat) return; const o = LIB.items[ui.open]; if (o) { setOn(o.sup, [o.key], !isOn(o)); repaint(); host.layer(); } }
  });
  // Swipe left or right on the picture to move between products on a phone or tablet.
  let sw = null;
  document.addEventListener("touchstart", e => { sw = ui.open != null && e.touches.length === 1 && e.target.closest(".sbl-hero,.sbl-zoomview") ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
  document.addEventListener("touchend", e => {
    if (!sw) return; const t0 = e.changedTouches[0], dx = t0.clientX - sw.x, dy = t0.clientY - sw.y; sw = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && ui.open != null && !document.getElementById("viewer")) { e.stopPropagation(); if (ui.zoom) { ui.zoom = false; host.layer(); } else close(); } }, true);

  window.SBLibrary = Object.freeze({
    configure(h) { host = { ...host, ...h }; },
    view, sheet, close, repaint, load,
    isOpen: () => ui.open != null && !!LIB,
    t,
  });
})();
