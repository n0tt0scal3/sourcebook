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
    "Sourcebook can't check Google Drive for new catalogues:": "选材手册无法检查 Google 云盘上的新目录：", "Check again": "重新检查", "No new catalogues on Google Drive.": "Google 云盘上没有新目录。", "Check now": "立即检查",
    "Ignore": "忽略", "Couldn't get the PDF from Google Drive. Try again.": "无法从 Google 云盘获取 PDF，请重试。", "Checking Google Drive…": "正在检查 Google 云盘…", "Google Drive couldn't be reached.": "无法连接 Google 云盘。",
    "The catalogue folder isn't shared with Sourcebook's Google account.": "目录文件夹尚未共享给选材手册的 Google 账号。", "That PDF isn't in the catalogue folder any more.": "该 PDF 已不在目录文件夹中。",
    "The Google key in Render (GOOGLE_SERVICE_ACCOUNT) couldn't be read.": "无法读取 Render 中的 Google 密钥（GOOGLE_SERVICE_ACCOUNT）。",
    "Drop it here and we'll search for something similar in our library. If we can't find it, we'll source it for you.": "把图片拖到这里，我们会在图库中搜索相似的产品。如果找不到，我们会为您采购。", "Choose a photo": "选择图片", "What are you looking for? (optional) e.g. the chair, in walnut": "您想找什么？（可选）例如：这把椅子，胡桃木", "Sending it to our sourcing agent…": "正在发送给采购代理…", "Searching our library for something similar…": "正在图库中搜索相似产品…", "We couldn't find anything similar in our library, so we've sent it to our sourcing agent. We'll source it for you.": "图库中没有找到相似的产品，已发送给采购代理，我们会为您采购。", "Sent to our sourcing agent. We'll source it for you.": "已发送给采购代理，我们会为您采购。", "Withdraw the request": "撤回请求", "Search for something else": "搜索其他产品", "None of these? Send it to our sourcing agent": "都不合适？发送给采购代理", "Waiting to be sourced": "等待采购", "We're sourcing it": "正在为您采购", "Sourced": "已采购", "Note for the person who asked (optional)": "给提出请求者的备注（可选）", "Mark as sourced": "标为已采购", "Reopen": "重新打开", "Remove": "移除", "Sourcing requests": "采购请求", "Your sourcing requests": "您的采购请求", "Hide sourced": "隐藏已采购", "Nothing waiting to be sourced.": "没有待采购的请求。", "That isn't a photo.": "这不是图片。", "The search didn't finish. Try again.": "搜索未完成，请重试。", "Couldn't send it. Check your connection and try again.": "无法发送，请检查网络后重试。", "Photo": "图片", "Studio owner": "工作室负责人", "new": "新", "New": "新", "Add category": "添加类别", "Admins only": "仅限管理员", "New category": "新类别", "Name in English": "英文名称", "Name in Chinese": "中文名称", "e.g. Outdoor furniture": "例如：Outdoor furniture", "e.g. 户外家具": "例如：户外家具", "In a project, its products go under": "加入项目时归入", "Adding…": "正在添加…", "Cancel": "取消", "Give the category a name.": "请填写类别名称。", "There's already a category with that name.": "已有同名类别。", "Choose where its products go in a project.": "请选择加入项目时归入的分类。", "Only admins can add categories.": "只有管理员可以添加类别。", "No more categories can be added.": "无法再添加更多类别。", "Furniture": "家具", "Lighting": "灯具", "Plumbing": "卫浴", "Millwork": "木作", "Stone": "石材", "Finishes": "饰面", "Glazing": "玻璃", "Hardware": "五金", "Add photos of what you found": "添加找到的产品照片", "Attach photos or files": "添加照片或文件", "Up to 10 files per request.": "每个请求最多 10 个文件。", "That file is too big (25 MB at most).": "文件太大（最大 25 MB）。", "That file is empty.": "文件是空的。", "Only the studio and the sourcing agent can attach files to a request.": "只有工作室和采购代理可以为请求添加文件。", "Adding photos…": "正在添加照片…", "Photos of what was found": "找到的产品照片", "Up to 8 photos per request.": "每个请求最多 8 张照片。", "Only the studio and the sourcing agent can add photos to a request.": "只有工作室和采购代理可以为请求添加照片。",
    "You have 50 open requests. Wait for some to be sourced first.": "您有 50 个未完成的请求，请等部分采购完成后再提交。", "Only admins can remove a request.": "只有管理员可以移除请求。", "Only the studio and the sourcing agent can update a request.": "只有工作室和采购代理可以更新请求。", "Add a photo first.": "请先添加图片。", "Claude isn't set up on this server yet. Add an Anthropic API key (ANTHROPIC_API_KEY) in Render.": "此服务器尚未设置 Claude。请在 Render 中添加 Anthropic API 密钥（ANTHROPIC_API_KEY）。",
    "Back to all product types": "返回全部产品类型", "Product types": "产品类型",
    "Catalogues clients see": "客户可见的图册", "Specifier / designer": "设计师", "Hidden from clients": "对客户隐藏", "Show all to clients": "全部对客户显示", "Hide all from clients": "全部对客户隐藏",
    "Clients only see the approved images in the catalogues ticked here, in the library and in photo searches. Specifiers and designers see every approved catalogue.": "客户只能看到这里勾选的图册中已批准的图片（包括图库和以图搜图）。设计师可以看到所有已批准的图册。",
    "Only admins choose what clients see.": "只有管理员可以设置客户可见内容。",
    "To be sourced": "待采购", "To review": "待审核", "With the studio": "工作室审核中", "With the sourcing agent": "采购代理处理中", "To find": "待寻找", "Turn on alerts for new requests": "开启新请求提醒", "Photos sent from the Sourcing library that we couldn't match. Review each one, then send it to the sourcing agent; with email set up, it goes to their QQ Mail with the photo attached.": "从采购图库提交、但未找到匹配的图片。逐一审核后发送给采购代理；设置邮件后会附上照片发送到其 QQ 邮箱。", "Items the studio has asked you to find. Mark each one sourced when you've found it, with a note on where.": "工作室请您寻找的产品。找到后请标记为已采购，并备注来源。", "Things you've asked us to find. We review each one and send it to our sourcing agent.": "您请我们寻找的产品。我们会逐一审核并交给采购代理。", "Nothing here.": "这里没有内容。", "Nothing to be sourced yet. Drop a photo in the box on the Sourcing library page.": "还没有待采购的产品。可在采购图库页面的方框中拖入图片。", "Sourcing agent's email (QQ Mail)": "采购代理的邮箱（QQ 邮箱）", "Email isn't set up yet, so this sends it in Sourcebook only. Add the SMTP settings in Render to email the agent's QQ Mail.": "尚未设置邮件，因此仅在选材手册中发送。在 Render 中添加 SMTP 设置后即可发送到代理的 QQ 邮箱。", "Message to the agent (optional)": "给代理的留言（可选）", "e.g. Need 6, walnut, by November": "例如：需要 6 件，胡桃木，11 月前", "Sending…": "正在发送…", "Send to the sourcing agent again": "再次发送给采购代理", "Send to the sourcing agent": "发送给采购代理", "Client": "客户", "Message to the agent": "给代理的留言", "Where it was found, for the person who asked (optional)": "在哪里找到的，告诉提出请求的人（可选）", "Add the sourcing agent's email first.": "请先填写采购代理的邮箱。", "Sent to the sourcing agent by email.": "已通过邮件发送给采购代理。", "Sent to the sourcing agent in Sourcebook.": "已在选材手册中发送给采购代理。", "Adding it to TBS (to be sourced)…": "正在加入待采购 TBS…", "Nothing similar in our library, so it's been added to TBS (to be sourced).": "图库中没有相似产品，已加入待采购 TBS。", "We couldn't find anything similar in our library, so it's been added to TBS (to be sourced). We'll review it and have our sourcing agent find it for you.": "图库中没有找到相似的产品，已加入待采购 TBS。我们会审核后请采购代理为您寻找。", "Added to TBS (to be sourced).": "已加入待采购 TBS。", "Added to TBS (to be sourced). We'll review it and have our sourcing agent find it for you.": "已加入待采购 TBS。我们会审核后请采购代理为您寻找。", "Open TBS": "打开待采购 TBS", "None of these? Add it to TBS (to be sourced)": "都不合适？加入待采购 TBS", "Email isn't set up on this server yet. Add the SMTP settings in Render, or send it in Sourcebook only.": "此服务器尚未设置邮件。请在 Render 中添加 SMTP 设置，或仅在选材手册中发送。", "The email couldn't be sent. Check the SMTP settings in Render and try again.": "邮件无法发送，请检查 Render 中的 SMTP 设置后重试。", "That email doesn't look right.": "邮箱格式不正确。", "Only admins can send requests to the sourcing agent.": "只有管理员可以将请求发送给采购代理。",
    "Sourcing library": "采购图库", "Approved": "已批准", "Not approved": "未批准", "All": "全部", "Scanned": "已扫描", "In this project": "本项目中", "All catalogues": "全部图册",
    "Approve all shown": "批准全部显示项", "Move selected to…": "将所选移至…", "Select all shown": "全选显示项", "Clear selection": "清除选择", "Select images first.": "请先选择图片。", "Select to move": "选择以移动", "Unapprove all shown": "取消批准全部显示项", "Approve page": "批准本页", "Unapprove page": "取消批准本页", "In project": "已在项目中",
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
    "Google Drive link to the PDF (optional)": "PDF 的 Google 云端硬盘链接（可选）", "Scan and add": "扫描并添加", "Cancel": "取消", "Delete this catalogue": "删除此图册", "Re-sort into product types": "重新分类到产品类型",
    "Sorting started. The product types update in a minute or two.": "已开始分类，产品类型将在一两分钟内更新。", "Sorting needs the Anthropic API key in Render.": "分类需要在 Render 中设置 Anthropic API 密钥。",
    "Only furniture catalogues are sorted into product types.": "只有家具图册会按产品类型分类。",
    "Choose a PDF and enter the supplier.": "请选择 PDF 并填写供应商。", "Couldn't read that PDF.": "无法读取该 PDF。",
    "The PDF is scanned in this browser, so keep this tab open until it finishes. Photos in the PDF become library images named like the others (category_supplier_page_number) and start unapproved. Up to 300 MB and 2,000 pages.": "PDF 在此浏览器中扫描，请保持此标签页打开直到完成。PDF 中的照片会按与其他图片相同的方式命名（类别_供应商_页码_编号）成为图库图片，默认未批准。最大 300 MB、2000 页。",
    "All product types": "全部产品类型", "Favourites": "收藏", "Favourite": "收藏", "Add to favourites": "加入收藏", "Client & designer favourites": "客户与设计师收藏", "What this project's clients and designers starred": "本项目客户和设计师收藏的图片", "No client or designer has starred anything in this project yet.": "本项目的客户和设计师还没有收藏任何图片。", "Remove from favourites": "取消收藏", "No favourites yet. Tap the star on any image to save it here.": "还没有收藏。点击任意图片上的星标即可收藏到这里。", "Star images to save them here": "点星标即可收藏到这里", "Product type": "产品类型", "Not sorted yet": "尚未分类", "Choose a product type to see its images.": "选择一个产品类型以查看图片。",
    "Featured products": "精选产品", "Featured": "精选", "Feature": "设为精选", "Feature on the landing page": "设为首页精选", "Remove from featured": "取消精选", "The studio's picks": "工作室精选",
    "See all featured products": "查看全部精选产品", "Catalogue page": "图册页面", "Opens the page inside Sourcebook": "在 Sourcebook 中打开该页", "Pause": "暂停", "Play": "播放", "Open this product": "打开此产品",
    "No featured products yet. Open an approved product and press Feature.": "还没有精选产品。打开已批准的产品，点“设为精选”。",
    "Approve the image before featuring it.": "请先批准该图片，再设为精选。", "Featured products show here, large, for everyone who opens the library. Open an approved product and press Feature.": "精选产品会以大图显示在这里，所有打开图库的人都能看到。打开已批准的产品，点“设为精选”。",
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
.sbl-pages{display:flex;flex-wrap:wrap;gap:16px;padding-top:18px}
.sbl-pg{flex:1 1 calc(max(var(--n) * 128px,210px) + 26px);max-width:min(100%,calc(max(var(--n) * 128px,210px) * 1.6 + 26px));min-width:0;padding:4px 12px 12px;background:var(--paper);border:1px solid var(--rule)}
.sbl-pg .sbl-page{padding-top:6px;flex-wrap:wrap}
.sbl-pg .sbl-page b{font-size:17px}
.sbl-pg.hit{box-shadow:0 0 0 2px #c8a046}
.sbl-tile.hit .sbl-open{outline:3px solid #c8a046;outline-offset:1px}
.sbl-pg .sbl-page span{gap:10px;font-size:12.5px;white-space:nowrap}
.sbl-pgimgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:12px 10px;padding-top:10px}
.sbl-tile{position:relative;display:flex;flex-direction:column;gap:6px;min-width:0;transition:opacity .2s}
.sbl-tile.off .sbl-sw{opacity:.38;filter:grayscale(1)}
.sbl-tile.off .sbl-cap{color:var(--muted)}
.sbl-open{display:block;padding:0;border:0;background:none;cursor:pointer;width:100%}
.sbl-sw{display:block;width:100%;aspect-ratio:1;max-width:100%;background-color:#fff;background-repeat:no-repeat;border:1px solid var(--rule2);transition:border-color .2s}
.sbl-open:hover .sbl-sw{border-color:var(--ink)}
.sbl-chk{position:absolute;top:6px;right:6px;width:30px;height:30px;display:grid;place-items:center;background:var(--paper);border:1px solid var(--rule);cursor:pointer}
.sbl-sel{position:absolute;top:6px;left:6px;width:30px;height:30px;display:grid;place-items:center;background:var(--paper);border:1px solid var(--rule);cursor:pointer;z-index:1}
.sbl-sel input{width:17px;height:17px;margin:0;accent-color:var(--ink);cursor:pointer}
.sbl-tile.sel .sbl-open{outline:2px solid var(--ink);outline-offset:2px}
.sbl-sortbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:12px 14px;margin:18px 0 4px;background:var(--paper);border:1px solid var(--rule);font-size:14px}
.sbl-sortbar select{font:inherit;font-size:14px;color:var(--ink);background:var(--paper);border:1px solid var(--rule);padding:6px 8px}
.sbl-sortbar b{font-weight:500}
.sbl-chk input{width:17px;height:17px;margin:0;accent-color:var(--ok);cursor:pointer}
.sbl-cap{display:flex;gap:6px;align-items:baseline;font-family:var(--mono);font-size:11px;color:var(--ink2);overflow:hidden;white-space:nowrap}
.sbl-star{margin-left:auto;flex:none;border:0;background:none;padding:0 2px;font-size:17px;line-height:1;color:var(--muted);cursor:pointer;font-family:inherit}
.sbl-star[aria-pressed=true]{color:#c8a046}
.sbl-star:hover{color:var(--ink)}
.sbl-cat .sbl-addic{font-size:40px;color:var(--ink3,#888);border-style:dashed}
.sbl-cat .sbl-empty-ic{font-family:var(--display);font-size:40px;color:var(--ink3,#999)}
.sbl-addtype{gap:8px;padding:12px;background:var(--paper);border:1px solid var(--rule);cursor:default}
.sbl-addtype label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--ink2)}
.sbl-addtype input,.sbl-addtype select{font:inherit;font-size:14px;padding:5px 0;border:0;border-bottom:1px solid var(--rule);background:none;color:var(--ink)}
.sbl-cat .sbl-favic{display:grid;place-items:center;width:100%;aspect-ratio:4/3;background:var(--paper);border:1px solid var(--rule);font-size:44px;color:#c8a046}
.btn.sbl-favbtn[aria-pressed=true]{color:#a07a20}
.sbl-cfby{display:block;font-size:11px;color:#a07a20;margin:4px 0 -2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
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
.sbl-cli{font-size:13px;color:var(--ink2)}.sbl-cli.open{border-top:1px solid var(--rule);padding-top:12px}.sbl-cli .sbl-hint{margin:8px 0}
.sbl-clilist{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:4px 18px;margin-top:8px}
.sbl-clirow{display:flex!important;flex-direction:row!important;gap:10px;font-size:13px!important;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--rule);cursor:pointer}.sbl-clirow input{margin-top:3px}.sbl-clirow b{display:block;font-weight:500;color:var(--ink)}.sbl-clirow .sbl-sub{display:block;font-size:12px;color:var(--muted)}
.sbl-hid{color:var(--muted)}
.sbl-find{margin-top:22px;padding:18px;background:var(--paper);border:1.5px dashed var(--ink2);transition:background .2s,border-color .2s}
.sbl-find.busy{border-style:solid;border-color:var(--rule)}
.sbl-find.over{border-color:var(--ink);background:var(--ground)}
.sbl-find .sbl-fdrop{position:relative;display:flex;flex-direction:row;align-items:center;gap:14px 22px;flex-wrap:wrap;cursor:pointer;font-size:inherit;color:var(--ink)}
.sbl-fdrop input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.sbl-fcopy{flex:1 1 300px;display:flex;flex-direction:column;gap:4px}
.sbl-fcopy b{font-family:var(--display);font-weight:400;font-size:clamp(22px,2.4vw,28px);line-height:1.1}
.sbl-fcopy span{color:var(--ink2);font-size:14px;max-width:62ch}
.sbl-fnote{display:block;width:100%;max-width:520px;margin-top:12px;font:inherit;font-size:14px;color:var(--ink);background:transparent;border:0;border-bottom:1px solid var(--rule);padding:7px 2px}
.sbl-fnote:focus{outline:none;border-color:var(--ink)}
.sbl-ferr{margin:10px 0 0;color:var(--crit);font-size:14px}
.sbl-fwork{display:flex;gap:16px;align-items:flex-start}
.sbl-fwork > div{display:flex;flex-direction:column;gap:5px;min-width:0;flex:1}
.sbl-fwork b{font-family:var(--display);font-weight:400;font-size:21px;line-height:1.2}
.sbl-fwork span{color:var(--ink2);font-size:13.5px}
.sbl-fwork .sbl-row{margin-top:6px}
.sbl-fpic{width:96px;height:96px;object-fit:contain;background:#fff;border:1px solid var(--rule2);flex:none}
.sbl-fbar{display:block;height:3px;max-width:320px;margin-top:6px;background:var(--rule2);overflow:hidden}
.sbl-fbar i{display:block;height:100%;width:35%;background:var(--ink);animation:sblbar 1.4s ease-in-out infinite}
@keyframes sblbar{0%{transform:translateX(-100%)}100%{transform:translateX(290%)}}
.sbl-cat .sbl-sw{position:relative}
.sbl-sw .sbl-newb{position:absolute;top:8px;right:8px;min-width:26px;padding:3px 8px;background:#1E7A3C;color:#fff;font-style:normal;font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;text-align:center}
.sbl-newc{font-weight:500;color:#1E7A3C;font-family:var(--mono);font-size:11px;letter-spacing:.04em;text-transform:uppercase}
.sbl-hero-f{position:relative;margin-top:22px;border:1px solid var(--rule);background:var(--paper);overflow:hidden}
.sbl-hero-f .sbl-fslide{display:grid;grid-template-columns:minmax(0,1fr) 300px;min-height:min(58vh,540px);animation:sbl-fade .9s ease}
@keyframes sbl-fade{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.sbl-hero-f .sbl-fslide{animation:none}}
.sbl-fpic{position:relative;display:grid;place-items:center;width:100%;height:100%;border:0;padding:18px;margin:0;background:#fff;cursor:zoom-in;min-width:0}
.sbl-fpic img{max-width:100%;max-height:min(54vh,500px);object-fit:contain;display:block}
.sbl-fpic .sbl-sw{display:block;width:min(100%,460px);aspect-ratio:1;border:0}
.sbl-finfo{display:flex;flex-direction:column;gap:10px;padding:26px 24px;border-left:1px solid var(--rule)}
.sbl-finfo h3{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(26px,2.6vw,34px);line-height:1.1;word-break:break-word}
.sbl-finfo p{margin:0;color:var(--muted);font-size:13px}
.sbl-finfo .sbl-fctl{margin-top:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sbl-fdots{display:flex;gap:6px;flex-wrap:wrap;max-width:100%}
.sbl-fdots button{width:8px;height:8px;border-radius:50%;border:0;padding:0;background:var(--rule);cursor:pointer}
.sbl-fdots button[aria-current=true]{background:var(--ink)}
.sbl-fbar{position:absolute;left:0;bottom:0;height:2px;background:#c8a046;width:0}
.sbl-hero-f.run .sbl-fbar{animation:sbl-bar var(--dur) linear forwards}
@keyframes sbl-bar{from{width:0}to{width:100%}}
.sbl-fnav{border:1px solid var(--rule);background:var(--paper);width:34px;height:34px;cursor:pointer;font-size:18px;line-height:1;color:var(--ink)}
.sbl-ftag{position:absolute;right:6px;bottom:34px;background:#c8a046;color:#fff;font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:3px 7px;pointer-events:none}
.sbl-feat{margin-left:auto;flex:none;border:0;background:none;padding:0 2px;font-size:14px;line-height:1;color:var(--muted);cursor:pointer;font-family:inherit}
.sbl-feat[aria-pressed=true]{color:#c8a046}
.sbl-feat+.sbl-star{margin-left:0}
.btn.sbl-featbtn[aria-pressed=true]{color:#a07a20}
@media (max-width:760px){.sbl-hero-f .sbl-fslide{grid-template-columns:1fr;min-height:0}.sbl-fpic img{max-height:52vh}.sbl-finfo{border-left:0;border-top:1px solid var(--rule);padding:16px}}
.sbl-newt{position:absolute;left:6px;bottom:34px;background:#1E7A3C;color:#fff;font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:3px 7px;pointer-events:none}
.sbl-cat .sbl-tbsic{position:relative;background-size:cover;background-position:center}
.sbl-tbsic i{position:absolute;top:8px;right:8px;min-width:26px;padding:3px 8px;background:#1E7A3C;color:#fff;font-style:normal;font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;text-align:center}
.sbl-req .sbl-newtag{align-self:flex-start;background:#1E7A3C;color:#fff;font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px}
.sbl-cat .sbl-tbsword{font-family:var(--display);font-size:40px;letter-spacing:.06em;color:var(--ink)}
.sbl-send{display:flex;flex-direction:column;gap:8px;margin-top:8px;padding:10px 12px;background:var(--ground);border:1px solid var(--rule2)}
.sbl-send label{display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--muted)}
.sbl-send input{font:inherit;font-size:14px;color:var(--ink);background:transparent;border:0;border-bottom:1px solid var(--rule);padding:6px 2px}
.sbl-send input:focus{outline:none;border-color:var(--ink)}
.sbl-rstate.sent{color:#8a5a00}
.sbl-req.focus{outline:2px solid var(--ink);outline-offset:2px}
.sbl-rmsg{font-size:12.5px!important;color:var(--muted)!important}
.sbl-tools .sbl-back{margin-left:4px}
.sbl-reqs{margin-top:22px}
.sbl-reqs > header{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;border-bottom:1px solid var(--ink);padding-bottom:8px}
.sbl-reqs h5{margin:0;font-family:var(--display);font-style:italic;font-weight:400;font-size:22px}
.sbl-reqlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr));gap:14px;padding-top:14px}
.sbl-req{display:flex;gap:14px;padding:12px;background:var(--paper);border:1px solid var(--rule)}
.sbl-req.done{opacity:.75}
.sbl-req img{width:88px;height:88px;object-fit:contain;background:#fff;border:1px solid var(--rule2);display:block}
.sbl-req > div{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
.sbl-req b{font-weight:500;font-size:14.5px}
.sbl-req p{margin:0;font-size:13.5px;color:var(--ink2);overflow-wrap:anywhere}
.sbl-req .sbl-fnote{margin-top:4px;font-size:13px}
.sbl-req .sbl-row{margin-top:6px}
.sbl-rstate{font-family:var(--mono);font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--accent)}
.sbl-rstate.ok{color:var(--ok)}
.sbl-rreply{padding:8px 10px;background:var(--accent-soft)}
.sbl-found{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}
.sbl-found span{position:relative;display:block}
.sbl-req .sbl-found img{width:72px;height:72px}
.sbl-found button{position:absolute;top:-6px;right:-6px;width:20px;height:20px;padding:0;border:0;border-radius:50%;background:var(--ink);color:var(--paper);font-size:13px;line-height:20px;cursor:pointer}
.sbl-files{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:4px}
.sbl-files li{display:flex;align-items:center;gap:6px}
.sbl-files a{display:flex;align-items:center;gap:8px;min-width:0;font-size:13.5px;color:var(--ink);text-decoration:none;padding:6px 8px;border:1px solid var(--rule);background:var(--paper2,#fff);flex:1}
.sbl-files a:hover{border-color:var(--ink)}
.sbl-files small{margin-left:auto;color:var(--ink3,#888);font-family:var(--mono);font-size:11px;white-space:nowrap}
.sbl-fext{flex:none;font-family:var(--mono);font-size:10px;letter-spacing:.06em;padding:2px 5px;background:var(--ink);color:var(--paper)}
.sbl-addfound{align-self:flex-start;cursor:pointer}
.sbl-addfound input{display:none}
.sbl-drive{grid-column:1/-1;margin:0 0 14px;padding:14px 16px;background:var(--paper);border:1px solid var(--rule);font-size:14px;color:var(--ink)}
.sbl-drive h5{margin:0 0 8px;font-family:var(--display);font-weight:400;font-size:18px}
.sbl-drive.quiet{padding:0;background:none;border:0;color:var(--muted);font-size:13px}
.sbl-drive.err{border-color:var(--crit);color:var(--crit)}
.sbl-driverow{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:8px 0;border-top:1px solid var(--rule2,var(--rule))}
.sbl-driverow span{display:flex;flex-direction:column;min-width:0}.sbl-driverow b{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sbl-driverow small{color:var(--muted);font-size:12px}
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
.sbl-added{flex-basis:100%;margin:2px 0 0;color:var(--ok);font-size:13.5px;font-weight:600}
.sbl-pick{display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--muted);min-width:min(100%,260px)}
.sbl-pick select{font:inherit;font-size:15px;color:var(--ink);background:transparent;border:0;border-bottom:1px solid var(--rule);padding:7px 2px}
.sbl-excerpt{margin:16px 0 0;color:var(--muted);font-size:13px;max-width:65ch}
.sbl-split{display:grid;grid-template-columns:minmax(170px,210px) minmax(0,1fr);gap:0 34px;align-items:start}
.sbl-main{min-width:0}
.sbl-side{position:sticky;top:64px;max-height:calc(100vh - 80px);overflow:auto;padding-top:28px;scrollbar-width:thin}
.sbl-side summary{display:none}
.sbl-side nav{display:flex;flex-direction:column}
.sbl-sidei{display:flex;align-items:baseline;gap:8px;width:100%;background:none;border:0;border-left:2px solid transparent;padding:6px 4px 6px 10px;text-align:left;font:inherit;font-size:13.5px;line-height:1.3;color:var(--ink2);cursor:pointer}
.sbl-sidei span{flex:1;min-width:0;overflow-wrap:anywhere}
.sbl-sidei em{font-style:normal;font-family:var(--mono);font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
.sbl-sidei .sbl-newc{font-size:10px}
.sbl-sidei:hover{color:var(--ink);background:var(--rule2)}
.sbl-sidei[aria-current="true"]{color:var(--ink);font-weight:600;border-left-color:var(--ink);background:var(--rule2)}
.sbl-siderule{display:block;height:1px;background:var(--rule);margin:8px 0}
@media (max-width:760px){.sbl-split{grid-template-columns:1fr}.sbl-side{position:static;max-height:none;overflow:visible;padding-top:16px}.sbl-side summary{display:flex;align-items:baseline;gap:10px;cursor:pointer;list-style:none;font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border:1px solid var(--rule);padding:10px 12px}.sbl-side summary::-webkit-details-marker{display:none}.sbl-side summary span{font-family:inherit;text-transform:none;letter-spacing:0;font-size:14px;color:var(--ink);flex:1}.sbl-side summary::after{content:"▾";color:var(--ink)}.sbl-side[open] summary::after{content:"▴"}.sbl-side nav{border:1px solid var(--rule);border-top:0;padding:6px 0;max-height:60vh;overflow:auto}}
@media (max-width:900px){.sbl-sheet,.sbl-sheet.big{grid-template-columns:1fr;grid-template-rows:38vh 1fr}.sbl-sheet.big{grid-template-rows:52vh 1fr}}
@media (max-width:760px){.sbl-head{grid-template-columns:1fr}.sbl-stat{border-left:0}.sbl-stat div:first-child{padding-left:0}.sbl-tools{position:static}.sbl-cats{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}.sbl-name{font-size:16px}.sbl-cat .sbl-all{font-size:18px}.sbl-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}.sbl-pages{gap:12px}.sbl-pg{flex-basis:calc(max(var(--n) * 100px,150px) + 26px);padding:4px 10px 10px}.sbl-pgimgs{grid-template-columns:repeat(auto-fill,minmax(90px,1fr))}.sbl-facts{grid-template-columns:1fr 1fr}}
`;
  const style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);

  let LIB = null, libP = null, on = {}, tov = {}, hideCli = new Set(), watching = false, qT = null, full = new Set(), up = null;
  // Product types, independent of the supplier catalogue. Images are sorted into them once (lib/data.json, item[7]);
  // an admin's corrections are stored as librarytypes/<catalogue> = { t: { key: code } }.
  const BASE_TYPES = [["S", "Sofas", "沙发"], ["L", "Lounge chairs", "休闲椅"], ["C", "Dining chairs", "餐椅"], ["T", "Stools & bar stools", "凳子与吧凳"], ["B", "Benches & ottomans", "长凳与脚凳"],
    ["K", "Coffee & side tables", "茶几与边几"], ["D", "Dining tables", "餐桌"], ["E", "Desks & consoles", "书桌与玄关桌"], ["G", "Storage & TV units", "储物柜与电视柜"], ["R", "Beds & nightstands", "床与床头柜"],
    ["1", "Office", "办公家具"], ["H", "Lighting", "灯具"], ["P", "Plumbing fixtures", "卫浴洁具"], ["X", "Vanities", "浴室柜"], ["Z", "Mirrors", "镜子"], ["M", "Millwork", "木作"], ["I", "Doors", "门"], ["N", "Stone", "石材"], ["J", "Flooring", "地板"], ["W", "Wall panelling & wood", "墙板与木制品"], ["Q", "Partition systems", "隔断系统"], ["V", "Glass products", "玻璃制品"], ["Y", "Signage", "标识"],
    ["A", "Decor & accessories", "装饰与配饰"], ["O", "Other", "其他"], ["U", "Not sorted yet", "尚未分类"]];
  // Categories an admin added (librarycats/main): shown before Decor & accessories, each also a catalogue category CUSTOM-<code>.
  let custom = [], TYPES = BASE_TYPES;
  function setCustom(list) {
    custom = (Array.isArray(list) ? list : []).filter(x => x && typeof x.c === "string" && x.c.length === 1 && x.en);
    const at = BASE_TYPES.findIndex(x => x[0] === "A");
    TYPES = [...BASE_TYPES.slice(0, at), ...custom.map(x => [x.c, x.en, x.zh || x.en]), ...BASE_TYPES.slice(at)];
  }
  const typeName = c => { if (c === "F") return t("Favourites"); if (c === "CF") return t("Client & designer favourites"); if (c === "FT") return t("Featured products"); const x = TYPES.find(y => y[0] === c) || TYPES[TYPES.length - 1]; return zh() ? x[2] : x[1]; };
  // Each person's own starred images (file names), saved on the server for their account.
  let fav = new Set();
  // Admins inside a project also see what that project's clients and designers starred: file name -> [their names].
  let cfav = new Map();
  const showCfav = () => host.ctx === "project" && isAdm();
  async function fetchCfav() {
    if (host.ctx !== "project") return; const r = await fetch("/api/library/fav/clients?project=" + encodeURIComponent(host.project())); if (!r.ok) return;
    const m = new Map(); ((await r.json()).clients || []).forEach(c => c.files.forEach(f => m.set(f, [...(m.get(f) || []), c.name]))); cfav = m; repaint();
  }
  const inType = o => ui.type === "CF" ? cfav.has(o.file) : ui.type === "F" ? fav.has(o.file) : ui.type === "FT" ? feat.has(o.file) : typeOf(o) === ui.type;
  // Featured products: the studio's picks (libraryfeat/main, file names oldest first), chosen by admins from approved
  // images. They cycle, large, at the top of the library, and all of them are listed under the Featured tile.
  let feat = new Map();
  const setFeat = d => { feat = new Map(((d && d.f) || []).map((f, i) => [f, i])); };
  async function fetchFeat() { const r = await fetch("/api/db/doc?path=libraryfeat/main"); if (!r.ok) return; const d = await r.json(); setFeat(d.exists && d.data); repaint(); }
  function toggleFeat(o) {
    const x = !feat.has(o.file); if (x) feat.set(o.file, Date.now()); else feat.delete(o.file);
    api("/api/library/featured", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ file: o.file, on: x }) })
      .catch(e => { host.toast(t(e.message || "Couldn't save. Check your connection and try again.")); fetchFeat().catch(() => {}); });
    return x;
  }
  // Newest picks first. Only approved ones, except for an admin curating on the dashboard.
  const featPool = () => LIB.items.filter(o => feat.has(o.file) && (curating() || isOn(o))).sort((a, b) => feat.get(b.file) - feat.get(a.file));
  async function fetchFav() { const r = await fetch("/api/library/fav"); if (!r.ok) return; fav = new Set((await r.json()).files || []); repaint(); }
  function toggleFav(o) {
    const x = !fav.has(o.file); x ? fav.add(o.file) : fav.delete(o.file);
    fetch("/api/library/fav", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ file: o.file, on: x }) })
      .then(r => { if (!r.ok) throw new Error(); }).catch(() => { host.toast(t("Couldn't save. Check your connection and try again.")); fetchFav().catch(() => {}); });
    return x;
  }
  // New in the library for this person (file names, from the server): approved since they last looked (for an
  // admin, uploaded by another admin). Opening a product type or an image marks it seen; what was just seen keeps a
  // "New" tag until they leave the page, so they can find it.
  let fresh = new Set(), justSeen = new Set(), seenT = null;
  async function fetchSeen() { const r = await fetch("/api/library/seen"); if (!r.ok) return; fresh = new Set((await r.json()).files || []); repaint(); tbsBadge(); }
  const fetchSeenSoon = () => { clearTimeout(seenT); seenT = setTimeout(() => fetchSeen().catch(() => {}), 1500); };
  function markSeen(files) {
    files = files.filter(f => fresh.has(f)); if (!files.length) return;
    files.forEach(f => { fresh.delete(f); justSeen.add(f); }); tbsBadge();
    fetch("/api/library/seen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ files }) }).catch(() => {});
  }
  const isNew = o => fresh.has(o.file) && (curating() || isOn(o));
  const newBadge = n => n ? `<i class="sbl-newb">● ${nf(n)} ${t("new")}</i>` : "";
  const ui = { type: null, sup: null, q: "", show: null, n: 120, hit: null, open: null, adding: false, target: "", zoom: false, seq: [] };
  const done = new Map(); // file -> [{project, pname, code, id, existing}] added from the card this visit, shown on the card
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
    const j = await r.json(); const next = {}; j.docs.forEach(d => { next[d.id] = (d.data && d.data.t) || {}; }); tov = next;
    const rs = await fetch("/api/db/doc?path=libraryshow/main").catch(() => null); if (rs && rs.ok) { const d = await rs.json(); hideCli = new Set((d.exists && d.data && d.data.hide) || []); }
    const rc = await fetch("/api/db/col?path=librarycats").catch(() => null); if (rc && rc.ok) { const m = ((await rc.json()).docs || []).find(d => d.id === "main"); setCustom(m && m.data && m.data.types); }
    repaint();
  }
  async function fetchFull() {
    const r = await fetch("/api/library/full"); if (!r.ok) return;
    full = new Set((await r.json()).files || []); fullLine(); fPaint(); if (ui.open != null) host.layer();
  }
  function watch() {
    if (watching) return; watching = true;
    fetchOn().catch(() => {}); fetchFull().catch(() => {}); fetchTypes().catch(() => {}); fetchFav().catch(() => {}); fetchCfav().catch(() => {}); fetchFeat().catch(() => {}); fetchReqs().catch(() => {});
    try {
      const es = new EventSource("/api/events");
      es.onmessage = e => { try { const m = JSON.parse(e.data); if (m.path === "library" && m.index) { reloadIndex(); fetchSeenSoon(); return; } if (/^sourcing\/[^/]+$/.test(m.path)) { const id = m.path.slice(9); const was = reqs.get(id); if (m.exists && m.data && !was && isAdm() && inReview(m.data) && !(m.data.by && m.data.by.id === tbsCfg.me)) tbsAlert({ id, ...m.data }); if (m.exists && m.data) { if (was && was.status === m.data.status && (was.reply || "") === (m.data.reply || "") && JSON.stringify(was.sent || null) === JSON.stringify(m.data.sent || null) && JSON.stringify(was.found || []) === JSON.stringify(m.data.found || []) && JSON.stringify(was.files || []) === JSON.stringify(m.data.files || [])) { reqs.set(id, { id, ...m.data }); return; } reqs.set(id, { id, ...m.data }); } else { if (!was) return; reqs.delete(id); } findPaint(); return; } if (m.path === "libraryshow/main") { hideCli = new Set((m.exists && m.data && m.data.hide) || []); const w = $("#sbl-cliwrap"); if (w) w.innerHTML = cliHTML(); repaint(); return; } if (m.path === "libraryfeat/main") { setFeat(m.exists && m.data); repaint(); return; } if (m.path === "librarycats/main") { setCustom(m.exists && m.data && m.data.types); repaint(); return; } if (/^librarytypes\/[^/]+$/.test(m.path)) { tov[m.path.slice(13)] = (m.exists && m.data && m.data.t) || {}; repaint(); return; } if (!/^library\/[^/]+$/.test(m.path)) return; const sup = m.path.slice(8); on[sup] = new Set(((m.exists && m.data && m.data.on) || []).map(Number)); repaint(); fetchSeenSoon(); } catch (_) {} };
      es.onopen = () => { fetchSeen().catch(() => {}); fetchCfav().catch(() => {}); fetchFeat().catch(() => {}); fetchOn().catch(() => {}); fetchTypes().catch(() => {}); fetchReqs().catch(() => {}); };
    } catch (_) {}
  }

  const isOn = o => !!(on[o.sup] && on[o.sup].has(o.key));
  const typeOf = o => (tov[o.sup] && tov[o.sup][o.key]) || o.t || "U";
  const sprite = o => { if (o.s == null) return `style="background-image:url(/lib/thumb/${encodeURIComponent(o.file)});background-size:contain;background-position:center"`; const g = LIB.grid; return `style="background-image:url(/lib/sprites/s${String(o.s).padStart(3, "0")}.jpg);background-size:${g * 100}% ${g * 100}%;background-position:${(o.k % g) / (g - 1) * 100}% ${Math.floor(o.k / g) / (g - 1) * 100}%"`; };
  const label = sup => LIB_LABEL[sup] || (LIB && LIB.sups[sup] && LIB.sups[sup].label) || [sup, ""];
  const pdfURL = S => S.drive ? `https://drive.google.com/file/d/${S.drive}/view` : S.up ? `/lib/pdf/${encodeURIComponent(Object.keys(LIB.sups).find(k => LIB.sups[k] === S))}.pdf` : "#";
  const name = o => o.codes[0] || label(o.sup)[0] + " · p" + o.page;
  const pageBtn = o => zh() ? `打开图册第 ${o.page} 页` : `Open catalogue page ${o.page}`;
  // Open the catalogue an image comes from inside the library, scrolled to its page card with the image picked out,
  // instead of the PDF (which opens at page 1). Only images this person can see are listed there.
  function goPage(o) {
    if (ui.open != null) close();
    ui.type = typeOf(o); ui.sup = o.sup; ui.q = "";
    if (curating() && showMode() === (isOn(o) ? "off" : "on")) ui.show = "all";
    const l = ordered(), at = l.map(x => x.page).lastIndexOf(o.page);
    ui.n = Math.max(120, Math.ceil((at + 1) / 120) * 120);
    markSeen(LIB.items.filter(x => inType(x) && isNew(x)).map(x => x.file));
    ui.hit = o.i; rerender();
    const pg = document.querySelector(`.sbl-pg[data-p="${o.page}"]`);
    (pg || $("#sblib"))?.scrollIntoView({ block: pg ? "center" : "start" });
  }
  const approved = arr => (arr || LIB.items).filter(isOn).length;
  // Only an admin on the dashboard sees images that aren't approved.
  const curating = () => host.ctx === "studio" && host.canEdit();
  const showMode = () => (curating() ? ui.show || "all" : "on");
  function list() {
    const q = ui.q.toLowerCase().trim().split(/\s+/).filter(Boolean); const show = showMode();
    const src = ui.sup && LIB.bySup[ui.sup] ? LIB.bySup[ui.sup] : LIB.items;
    return src.filter(o => { if (ui.type && !inType(o)) return false; const x = isOn(o); if (show === "on" && !x) return false; if (show === "off" && x) return false; return q.every(w => o.h.includes(w)); });
  }
  // As shown in the grid: outside a single catalogue, images new to this person come first.
  const markedNew = o => justSeen.has(o.file) || fresh.has(o.file);
  function ordered() { const l = list(); if (ui.type === "FT") return l.sort((a, b) => feat.get(b.file) - feat.get(a.file)); if (!ui.sup && l.some(markedNew)) l.sort((a, b) => markedNew(b) - markedNew(a)); return l; }
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
    if (!cur && !a) return `<div id="sblib"><section class="sbl-head"><div>${host.ctx === "project" ? `<h2>${t("Sourcing library")}</h2>` : ""}<p>${t(lede)}</p></div></section><div id="sbl-findwrap">${findHTML()}</div><div id="sbl-grid"><p class="sbl-empty">${t("The studio hasn't approved any products yet.")}</p></div></div>`;
    return `<div id="sblib"><section class="sbl-head"><div><span class="eyebrow">${zh() ? `90 中国产品 · ${esc(cats.map(c => ({ Furniture: "家具", Office: "办公家具", Lighting: "灯具", Doors: "门", Millwork: "木作", Stone: "石材", Flooring: "地板", Signage: "标识" })[c] || c).join("、"))}` : `90 China Products · ${esc(cats.join(", "))}`}</span>
      ${host.ctx === "project" ? `<h2>${t("Sourcing library")}</h2>` : ""}
      <p>${t(lede)}</p></div>
      <div class="sbl-stat"><div><span class="eyebrow">${t("Approved")}</span><b id="sbl-kept">${nf(a)}</b></div>${cur ? `<div><span class="eyebrow">${t("Scanned")}</span><b>${nf(tot)}</b></div>` : ""}${host.ctx === "project" ? `<div><span class="eyebrow">${t("In this project")}</span><b>${host.inProject().size}</b></div>` : ""}</div>
      ${cur ? `<div class="sbl-full" id="sbl-full">${fullHTML()}</div><div id="sbl-addwrap" style="grid-column:1/-1">${addCatHTML()}</div><div id="sbl-cliwrap" style="grid-column:1/-1">${cliHTML()}</div>` : ""}</section>${splitHTML(`
    ${ui.type === "TBS" ? `<div class="sbl-crumb"><button class="linkbtn" data-sbltype="">‹ ${t("All product types")}</button><h3>TBS · ${t("To be sourced")}</h3></div><div id="sbl-tbs">${tbsHTML()}</div><div class="sbl-tools"><button class="btn ghost sm sbl-back" data-sbltype="" data-sbltop>‹ ${t("Back to all product types")}</button></div>`
      : ""}${ui.type === "TBS" ? "" : `${ui.type ? `<div class="sbl-crumb"><button class="linkbtn" data-sbltype="">‹ ${t("All product types")}</button><h3>${esc(typeName(ui.type))}</h3></div><div class="sbl-chips" id="sbl-cats">${catsHTML()}</div>`
      : `<div id="sbl-featwrap">${featHTML()}</div><div id="sbl-findwrap">${findHTML()}</div><div class="sbl-cats" id="sbl-cats">${catsHTML()}</div>`}
    <div class="sbl-tools"><input class="sbl-q" type="search" id="sbl-q" value="${esc(ui.q)}" placeholder="${esc(t("Search a code, product or page, e.g. AA01, Ampleforth, p44"))}" autocomplete="off" aria-label="${esc(t("Sourcing library"))}">
      ${cur ? `<span class="sbl-seg" role="group" aria-label="${t("Show")}">${[["on", "Approved"], ["off", "Not approved"], ["all", "All"]].map(([v, l]) => `<button class="chip" data-sblshow="${v}" aria-pressed="${show === v}">${t(l)}</button>`).join("")}</span>` : ""}
      <span class="sbl-count" id="sbl-count"></span>
      ${ui.type || ui.q.trim() ? `<button class="btn ghost sm sbl-back" data-sbltype="" data-sbltop>‹ ${t("Back to all product types")}</button>` : ""}
      ${cur && ui.sup && LIB.sups[ui.sup] && LIB.sups[ui.sup].up && LIB.sups[ui.sup].cat === "FURNITURE" ? `<button class="linkbtn" data-sbl="resort">${t("Re-sort into product types")}</button>` : ""}
      ${cur && ui.sup && LIB.sups[ui.sup] && LIB.sups[ui.sup].up ? `<button class="linkbtn" data-sbl="delcat" style="color:var(--crit)">${t("Delete this catalogue")}</button>` : ""}
      ${cur && (ui.sup || ui.type) ? `<span class="sbl-bulk"><button class="linkbtn" data-sblbulk="on">${t("Approve all shown")}</button><button class="linkbtn" data-sblbulk="off">${t("Unapprove all shown")}</button></span>` : ""}</div>
    <div id="sbl-grid">${gridHTML()}</div>`}`)}</div>`;
  }
  // Inside a product type, every category is listed down the left beside the grid so you can jump straight to another.
  // On phones the list folds into a "Product types" toggle above the grid.
  function splitHTML(body) {
    if (!ui.type) return body;
    const narrow = (() => { try { return matchMedia("(max-width:760px)").matches; } catch (_) { return false; } })();
    return `<div class="sbl-split"><details class="sbl-side" ${narrow ? "" : "open"}><summary>${t("Product types")}<span>${esc(ui.type === "TBS" ? "TBS · " + t("To be sourced") : typeName(ui.type))}</span></summary><nav id="sbl-side" aria-label="${esc(t("Product types"))}">${sideHTML()}</nav></details><div class="sbl-main">${body}</div></div>`;
  }
  function sideHTML() {
    const cur = curating(), vis = o => cur || isOn(o), by = {}, nw = {};
    LIB.items.forEach(o => { if (!vis(o)) return; const c = typeOf(o); by[c] = (by[c] || 0) + 1; if (isNew(o)) nw[c] = (nw[c] || 0) + 1; });
    const row = (c, name, n, k) => `<button class="sbl-sidei" data-sbltype="${c}" aria-current="${ui.type === c ? "true" : "false"}"><span>${name}</span>${k ? `<b class="sbl-newc">● ${nf(k)}</b>` : ""}${n != null ? `<em>${nf(n)}</em>` : ""}</button>`;
    const fp = featPool().length, fv = LIB.items.filter(o => fav.has(o.file) && vis(o)).length, tb = tbsList(), tn = tbsTodo();
    return (fp || cur ? row("FT", "◆ " + esc(t("Featured products")), fp) : "") + row("F", "★ " + esc(t("Favourites")), fv) + (showCfav() ? row("CF", "★ " + esc(t("Client & designer favourites")), LIB.items.filter(o => cfav.has(o.file) && vis(o)).length) : "")
      + (tb.length || staff() ? row("TBS", "TBS · " + esc(t("To be sourced")), tb.length, tn) : "")
      + `<span class="sbl-siderule"></span>`
      + TYPES.filter(([c]) => by[c] || (cur && custom.some(x => x.c === c))).map(([c]) => row(c, esc(typeName(c)), by[c] || 0, nw[c])).join("");
  }
  // The landing slideshow: one featured product at a time, large, changing every few seconds. It pauses while the
  // pointer is over it, after a touch, while a product card is open, in a hidden tab, or when the viewer asked for less motion.
  const F_MS = 6000;
  let fIdx = 0, fT = null, fSig = "", fHover = false, fUser = true, fTouch = 0;
  const featBtn = o => `<button class="sbl-feat" data-sblfeat="${o.i}" aria-pressed="${feat.has(o.file)}" title="${t(feat.has(o.file) ? "Remove from featured" : "Feature on the landing page")}">${feat.has(o.file) ? "◆" : "◇"}</button>`;
  const fReduce = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (_) { return false; } };
  const fRunning = () => fUser && !fHover && Date.now() > fTouch && ui.open == null && !document.hidden && !fReduce() && featPool().length > 1;
  function featHTML() {
    const pool = featPool(); fSig = pool.map(o => o.file).join("|");
    if (!pool.length) return curating() ? `<p class="sbl-hint" style="padding-top:18px">◆ ${t("Featured products show here, large, for everyone who opens the library. Open an approved product and press Feature.")}</p>` : "";
    fIdx = ((fIdx % pool.length) + pool.length) % pool.length;
    const o = pool[fIdx], L = label(o.sup), nx = pool[(fIdx + 1) % pool.length];
    if (nx && full.has(nx.file)) new Image().src = `/lib/full/${nx.file}`;
    return `<section class="sbl-hero-f${fRunning() ? " run" : ""}" id="sbl-hero-f" style="--dur:${F_MS}ms" aria-roledescription="carousel" aria-label="${esc(t("Featured products"))}">
      <div class="sbl-fslide" data-k="${esc(o.file)}">
        <button class="sbl-fpic" data-sbl="fopen" aria-label="${esc(t("Open this product"))}: ${esc(name(o))}">${full.has(o.file) ? `<img src="/lib/full/${esc(o.file)}" alt="${esc(name(o))}">` : `<span class="sbl-sw" ${sprite(o)}></span>`}</button>
        <div class="sbl-finfo"><span class="eyebrow">◆ ${t("Featured products")} · ${nf(fIdx + 1)} / ${nf(pool.length)}</span>
          <h3>${esc(name(o))}</h3><p>${esc(typeName(typeOf(o)))} · ${esc(L[0])}${L[1] ? " · " + esc(L[1]) : ""}</p>
          <span class="sbl-row" style="margin-top:6px"><button class="btn sm" data-sbl="fopen">${t("Open this product")}</button><button class="btn sm ghost" data-sbl="gopage" data-i="${o.i}" title="${esc(t("Opens the page inside Sourcebook"))}">${pageBtn(o)}</button></span>
          <div class="sbl-fctl">${pool.length > 1 ? `<button class="sbl-fnav" data-sbl="fprev" aria-label="${t("Previous")}">‹</button><button class="sbl-fnav" data-sbl="fnext" aria-label="${t("Next")}">›</button><button class="linkbtn" data-sbl="fplay">${t(fUser ? "Pause" : "Play")}</button>` : ""}
            <button class="linkbtn" data-sbltype="FT">${t("See all featured products")} ›</button></div>
          ${pool.length > 1 && pool.length <= 40 ? `<div class="sbl-fdots">${pool.map((_, i) => `<button data-sblfslide="${i}" aria-label="${i + 1}" aria-current="${i === fIdx}"></button>`).join("")}</div>` : ""}
        </div></div><span class="sbl-fbar"></span></section>${(setTimeout(fArm, 0), "")}`;
  }
  function fArm() { clearTimeout(fT); if ($("#sbl-hero-f") && fRunning()) fT = setTimeout(() => fGo(fIdx + 1), F_MS); }
  function fPaint() { clearTimeout(fT); const w = $("#sbl-featwrap"); if (w) w.innerHTML = featHTML(); }
  function fGo(i) { fIdx = i; fPaint(); }
  // Resume after a pause without redrawing the picture: restart the progress line and the timer.
  function fResume() { const h = $("#sbl-hero-f"); if (!h) return; h.classList.remove("run"); void h.offsetWidth; h.classList.toggle("run", fRunning()); const b = h.querySelector("[data-sbl=fplay]"); if (b) b.textContent = t(fUser ? "Pause" : "Play"); fArm(); }
  function fHold() { clearTimeout(fT); $("#sbl-hero-f")?.classList.remove("run"); }
  // Only redraw the slideshow when the pool of picks changes, so it isn't restarted by every other repaint.
  function fRefresh() { const pool = featPool(), sig = pool.map(o => o.file).join("|"); if (sig !== fSig) fPaint(); }
  document.addEventListener("pointerover", e => { if (e.pointerType === "touch") return; const h = !!(e.target.closest && e.target.closest("#sbl-hero-f")); if (h !== fHover) { fHover = h; h ? fHold() : fResume(); } });
  document.addEventListener("touchstart", e => { if (e.target.closest && e.target.closest("#sbl-hero-f")) { fTouch = Date.now() + 15000; fHold(); clearTimeout(fTouchT); fTouchT = setTimeout(fResume, 15100); } }, { passive: true });
  let fTouchT = null;
  document.addEventListener("visibilitychange", () => { document.hidden ? fHold() : fResume(); });
  function catsHTML() {
    const cur = curating(), vis = o => cur || isOn(o);
    if (ui.type) {
      const mine = LIB.items.filter(o => inType(o) && vis(o)); const n = {}, nw = {}; mine.forEach(o => { n[o.sup] = (n[o.sup] || 0) + 1; if (markedNew(o)) nw[o.sup] = (nw[o.sup] || 0) + 1; });
      return `<button class="chip" data-sblsup="" aria-pressed="${!ui.sup}">${t("All catalogues")} · ${nf(mine.length)}</button>` +
        Object.keys(n).map(s => { const L = label(s); return `<button class="chip" data-sblsup="${esc(s)}" aria-pressed="${ui.sup === s}">${esc(L[0])}${L[1] ? " · " + esc(L[1]) : ""} · ${nf(n[s])}${nw[s] ? ` <b class="sbl-newc">● ${nf(nw[s])} ${t("new")}</b>` : ""}${cur && hideCli.has(s) ? ` <span class="sbl-hid">· ${t("Hidden from clients")}</span>` : ""}</button>`; }).join("");
    }
    const sub = (n, of) => cur ? `${nf(n)} / ${nf(of)} ${t("Approved").toLowerCase()}` : zh() ? `${nf(n)} 张图片` : `${nf(n)} image${n === 1 ? "" : "s"}`;
    const by = {}; LIB.items.forEach(o => (by[typeOf(o)] = by[typeOf(o)] || []).push(o));
    const favs = LIB.items.filter(o => fav.has(o.file) && vis(o)), fc = favs[0];
    const favTile = `<button class="sbl-cat" data-sbltype="F">${fc ? `<span class="sbl-sw" ${sprite(fc)}></span>` : `<span class="sbl-favic">★</span>`}<span class="sbl-name">★ ${t("Favourites")}</span><span class="sbl-sub">${favs.length ? (zh() ? `${nf(favs.length)} 张图片` : `${nf(favs.length)} image${favs.length === 1 ? "" : "s"}`) : t("Star images to save them here")}</span></button>`;
    const cfs = showCfav() ? LIB.items.filter(o => cfav.has(o.file) && vis(o)) : [], cfc = cfs[0];
    const cfTile = showCfav() ? `<button class="sbl-cat" data-sbltype="CF">${cfc ? `<span class="sbl-sw" ${sprite(cfc)}></span>` : `<span class="sbl-favic">★</span>`}<span class="sbl-name">★ ${t("Client & designer favourites")}</span><span class="sbl-sub">${cfs.length ? (zh() ? `${nf(cfs.length)} 张图片` : `${nf(cfs.length)} image${cfs.length === 1 ? "" : "s"}`) : t("What this project's clients and designers starred")}</span></button>` : "";
    const fp = featPool(), ftc = fp[0];
    const featTile = fp.length || cur ? `<button class="sbl-cat" data-sbltype="FT">${ftc ? `<span class="sbl-sw" ${sprite(ftc)}></span>` : `<span class="sbl-favic">◆</span>`}<span class="sbl-name">◆ ${t("Featured products")}</span><span class="sbl-sub">${fp.length ? (zh() ? `${nf(fp.length)} 张图片` : `${nf(fp.length)} image${fp.length === 1 ? "" : "s"}`) : t("The studio's picks")}</span></button>` : "";
    return featTile + favTile + cfTile + tbsTileHTML() + TYPES.filter(([c]) => (by[c] && (cur || by[c].some(isOn))) || (cur && custom.some(x => x.c === c))).map(([c]) => {
      // Cover: an approved image if there is one, preferring product photos over tearsheet pages.
      const arr = by[c] || [], ok = arr.filter(isOn), pool0 = cur && !ok.length ? arr : ok, photos = pool0.filter(o => !/tearsheet/i.test(o.sup)), pool = photos.length ? photos : pool0, cover = pool[Math.min(pool.length - 1, Math.floor(pool.length * .12))];
      const nn = arr.filter(isNew).length;
      return `<button class="sbl-cat" data-sbltype="${c}">${cover ? `<span class="sbl-sw" ${sprite(cover)}>${newBadge(nn)}</span>` : `<span class="sbl-favic sbl-empty-ic">${esc(typeName(c).slice(0, 1))}</span>`}<span class="sbl-name">${esc(typeName(c))}</span><span class="sbl-sub">${sub(ok.length, arr.length)}</span>${cur ? `<span class="sbl-bar"><i style="width:${arr.length ? ok.length / arr.length * 100 : 0}%"></i></span>` : ""}</button>`;
    }).join("") + (cur ? addTypeHTML() : "");
  }
  // Which catalogues clients see. Specifiers, agents and admins see every approved catalogue; clients only the ones ticked here.
  function cliHTML() {
    const all = Object.keys(LIB.sups), shown = all.filter(s => !hideCli.has(s)).length;
    const head = `<button class="linkbtn" data-sbl="clitog" aria-expanded="${!!ui.cli}">${t("Catalogues clients see")} · ${zh() ? `${nf(shown)} / ${nf(all.length)}` : `${nf(shown)} of ${nf(all.length)}`} ${ui.cli ? "▴" : "▾"}</button>`;
    if (!ui.cli) return `<div class="sbl-cli">${head}</div>`;
    const cat = c => { const x = String(c || ""); return x.startsWith("CUSTOM-") ? (custom.find(y => "CUSTOM-" + y.c === x) || {}).en || x : x[0] + x.slice(1).toLowerCase(); };
    const rows = all.slice().sort((a, b) => cat(LIB.sups[a].cat).localeCompare(cat(LIB.sups[b].cat)) || label(a).join(" ").localeCompare(label(b).join(" "))).map(s => {
      const L = label(s), n = approved(LIB.bySup[s]);
      return `<label class="sbl-clirow"><input type="checkbox" data-sblcli="${esc(s)}" ${hideCli.has(s) ? "" : "checked"}><span><b>${esc(L[0])}${L[1] ? " · " + esc(L[1]) : ""}</b><span class="sbl-sub">${esc(zh() ? ({ Furniture: "家具", Office: "办公家具", Lighting: "灯具", Doors: "门", Millwork: "木作", Stone: "石材", Flooring: "地板", Signage: "标识", Plumbing: "卫浴", Vanities: "浴室柜", Mirrors: "镜子", "Wall panelling": "墙板", "Wood products": "木制品", "Partition systems": "隔断系统", "Glass products": "玻璃制品" })[cat(LIB.sups[s].cat)] || cat(LIB.sups[s].cat) : cat(LIB.sups[s].cat))} · ${zh() ? `已批准 ${nf(n)} 张` : `${nf(n)} approved`}</span></span></label>`;
    }).join("");
    return `<div class="sbl-cli open">${head}<p class="sbl-hint">${t("Clients only see the approved images in the catalogues ticked here, in the library and in photo searches. Specifiers and designers see every approved catalogue.")}</p>
      <div class="sbl-row"><button class="linkbtn" data-sbl="cliall">${t("Show all to clients")}</button><button class="linkbtn" data-sbl="clinone">${t("Hide all from clients")}</button></div><div class="sbl-clilist">${rows}</div></div>`;
  }
  async function setCli(sups, show) {
    const prev = new Set(hideCli); sups.forEach(s => show ? hideCli.delete(s) : hideCli.add(s));
    const w = $("#sbl-cliwrap"); if (w) w.innerHTML = cliHTML(); const c = $("#sbl-cats"); if (c) c.innerHTML = catsHTML();
    try { for (const s of sups) await api("/api/library/show", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sup: s, clients: show }) }); }
    catch (e) { hideCli = prev; const w2 = $("#sbl-cliwrap"); if (w2) w2.innerHTML = cliHTML(); host.toast(t(e.message || "Couldn't save. Check your connection and try again.")); }
  }
  // Admins add a category: its name in English and Chinese, and where its products go when added to a project.
  const SECTIONS = [["Furniture", "家具"], ["Lighting", "灯具"], ["Plumbing", "卫浴"], ["Millwork", "木作"], ["Stone", "石材"], ["Finishes", "饰面"], ["Glazing", "玻璃"], ["Hardware", "五金"]];
  function addTypeHTML() {
    if (!ui.addtype) return `<button class="sbl-cat" data-sbl="addtype"><span class="sbl-favic sbl-addic">+</span><span class="sbl-name">${t("Add category")}</span><span class="sbl-sub">${t("Admins only")}</span></button>`;
    return `<div class="sbl-cat sbl-addtype"><b>${t("New category")}</b>
      <label>${t("Name in English")}<input id="sbl-nten" maxlength="40" autocomplete="off" placeholder="${esc(t("e.g. Outdoor furniture"))}"></label>
      <label>${t("Name in Chinese")}<input id="sbl-ntzh" maxlength="20" autocomplete="off" placeholder="${esc(t("e.g. 户外家具"))}"></label>
      <label>${t("In a project, its products go under")}<select id="sbl-ntsec">${SECTIONS.map(([v, z]) => `<option value="${v}">${zh() ? z : t(v)}</option>`).join("")}</select></label>
      <span class="sbl-row"><button class="btn sm" data-sbl="addtypego" ${ui.addtype === "busy" ? "disabled" : ""}>${t(ui.addtype === "busy" ? "Adding…" : "Add category")}</button><button class="linkbtn" data-sbl="addtypex">${t("Cancel")}</button></span></div>`;
  }
  async function addType() {
    const en = ($("#sbl-nten") || {}).value || "", zhn = ($("#sbl-ntzh") || {}).value || "", section = ($("#sbl-ntsec") || {}).value || "";
    if (!en.trim()) { host.toast(t("Give the category a name.")); return; }
    ui.addtype = "busy"; const keep = { en, zhn, section }; repaint(); const f = $("#sbl-nten"); if (f) { f.value = keep.en; $("#sbl-ntzh").value = keep.zhn; $("#sbl-ntsec").value = keep.section; }
    try {
      const j = await api("/api/library/category", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ en, zh: zhn, section }) });
      setCustom([...custom, { c: j.code, en: en.trim(), zh: zhn.trim(), section }]); ui.addtype = false; repaint();
      host.toast(zh() ? `已添加类别「${zhn.trim() || en.trim()}」。可用“移至…”把图片移进来，或上传该类别的 PDF 图册。` : `Added ${en.trim()}. Move images into it with "Move selected to…", or add a PDF catalogue in this category.`);
    } catch (e) { ui.addtype = true; repaint(); const g = $("#sbl-nten"); if (g) { g.value = keep.en; $("#sbl-ntzh").value = keep.zhn; $("#sbl-ntsec").value = keep.section; } host.toast(t(e.message || "Couldn't save. Check your connection and try again.")); }
  }
  function gridHTML() {
    if (!ui.type && !ui.q.trim()) { setTimeout(() => { const c = $("#sbl-count"); if (c) c.textContent = ""; }, 0); return `<p class="sbl-hint" style="padding-top:18px">${t("Choose a product type to see its images.")}</p>`; }
    const l = ordered(), cur = curating(), inP = host.ctx === "project" ? host.inProject() : new Map();
    setTimeout(() => { const c = $("#sbl-count"); if (c) c.textContent = zh() ? `${nf(l.length)} 张图片` : `${nf(l.length)} image${l.length === 1 ? "" : "s"}`; autoMore(); }, 0);
    if (!l.length) return `<div class="sbl-grid"><p class="sbl-empty">${ui.type === "F" && !ui.q ? t("No favourites yet. Tap the star on any image to save it here.") : ui.type === "CF" && !ui.q ? t("No client or designer has starred anything in this project yet.") : ui.type === "FT" && !ui.q ? t("No featured products yet. Open an approved product and press Feature.") : ui.q ? t("Nothing matches that search.") : showMode() === "off" ? t("Nothing is waiting for approval here.") : t("Nothing has been approved yet.")}</p></div>`;
    // Inside a product type, admins tick images and send them to another type in one go.
    const sorting = cur && !!ui.type;
    if (!sorting) sel.clear(); else { const ids = new Set(l.map(o => o.i)); [...sel].forEach(i => ids.has(i) || sel.delete(i)); }
    const bySup = !!ui.sup, shown = l.slice(0, ui.n);
    const tile = o => { const x = isOn(o);
      return `<div class="sbl-tile ${cur && !x ? "off" : ""} ${sel.has(o.i) ? "sel" : ""}${o.i === ui.hit ? " hit" : ""}"><button class="sbl-open" data-sblopen="${o.i}" aria-label="${esc(o.file)}"><span class="sbl-sw" ${sprite(o)}></span></button>
        ${sorting ? `<label class="sbl-sel" title="${t("Select to move")}"><input type="checkbox" data-sblsel="${o.i}" ${sel.has(o.i) ? "checked" : ""} aria-label="${t("Select to move")} ${esc(o.file)}"></label>` : ""}
        ${cur ? `<label class="sbl-chk" title="${x ? t("Approved. Untick to hide it.") : t("Not approved. Tick to approve.")}"><input type="checkbox" data-sblkeep="${o.i}" ${x ? "checked" : ""} aria-label="${t("Approve")} ${esc(o.file)}"></label>` : ""}
        ${inP.has(o.file) ? `<span class="sbl-inproj">${t("In project")}</span>` : ""}${markedNew(o) ? `<span class="sbl-newt">● ${t("New")}</span>` : ""}${feat.has(o.file) && ui.type !== "FT" ? `<span class="sbl-ftag">◆ ${t("Featured")}</span>` : ""}${ui.type === "CF" && cfav.has(o.file) ? `<span class="sbl-cfby" title="${esc(cfav.get(o.file).join(", "))}">★ ${esc(cfav.get(o.file).join(", "))}</span>` : ""}
        <span class="sbl-cap"><b>${esc(o.codes[0] || label(o.sup)[0])}</b><span>${bySup ? "" : esc(label(o.sup)[0]) + " · "}p${o.page}</span>${isAdm() && x ? featBtn(o) : ""}<button class="sbl-star" data-sblfav="${o.i}" aria-pressed="${fav.has(o.file)}" title="${t(fav.has(o.file) ? "Remove from favourites" : "Add to favourites")}">${fav.has(o.file) ? "★" : "☆"}</button></span></div>`; };
    let html;
    if (bySup) {
      // Inside one catalogue, each page is a card and the cards tile across the screen, sized to their number of images.
      const pages = []; shown.forEach(o => { const g = pages[pages.length - 1]; if (g && g.p === o.page) g.l.push(o); else pages.push({ p: o.page, l: [o] }); });
      html = `<div class="sbl-pages">${pages.map(g => `<section class="sbl-pg${g.l.some(o => o.i === ui.hit) ? " hit" : ""}" data-p="${g.p}" style="--n:${Math.min(g.l.length, 4)}"><div class="sbl-page"><b>${t("Page")} ${g.p}</b>${cur ? `<span><button class="linkbtn" data-sblpage="${g.p}" data-v="on">${t("Approve page")}</button><button class="linkbtn" data-sblpage="${g.p}" data-v="off">${t("Unapprove page")}</button></span>` : ""}</div><div class="sbl-pgimgs">${g.l.map(tile).join("")}</div></section>`).join("")}</div>`;
    } else html = `<div class="sbl-grid">${shown.map(tile).join("")}</div>`;
    return `${sorting ? sortBarHTML() : ""}${html}${l.length > ui.n ? `<div class="sbl-more"><button class="btn ghost" data-sblmore>${zh() ? `再显示 ${Math.min(120, l.length - ui.n)} 张（还有 ${nf(l.length - ui.n)} 张）` : `Show ${Math.min(120, l.length - ui.n)} more of ${nf(l.length - ui.n)}`}</button></div>` : ""}`;
  }
  const sel = new Set();
  function sortBarHTML() {
    return `<div class="sbl-sortbar"><b id="sbl-selcount">${selCount()}</b>
      <select id="sbl-moveto" aria-label="${t("Move selected to…")}"><option value="">${t("Move selected to…")}</option>${TYPES.filter(x => x[0] !== "U" && x[0] !== ui.type).map(x => `<option value="${x[0]}">${esc(typeName(x[0]))}</option>`).join("")}</select>
      <button class="linkbtn" data-sbl="selall">${t("Select all shown")}</button><button class="linkbtn" data-sbl="selnone">${t("Clear selection")}</button></div>`;
  }
  const selCount = () => zh() ? `已选 ${nf(sel.size)} 张` : `${nf(sel.size)} selected`;
  function selPaint() { const c = $("#sbl-selcount"); if (c) c.textContent = selCount(); document.querySelectorAll("[data-sblsel]").forEach(el => { const on = sel.has(+el.dataset.sblsel); el.checked = on; el.closest(".sbl-tile")?.classList.toggle("sel", on); }); }
  function repaint() {
    if (!LIB) return;
    const r = $("#sblib");
    // Switch between the empty state and the grid when the first approval arrives or the last one goes.
    if (r && !curating() && !!$("#sbl-cats") !== !!approved()) { r.outerHTML = view(); if (ui.open != null) host.layer(); return; }
    const g = $("#sbl-grid"), c = $("#sbl-cats"), k = $("#sbl-kept");
    if (g && c) g.innerHTML = gridHTML(); if (c) c.innerHTML = catsHTML(); const sd = $("#sbl-side"); if (sd) sd.innerHTML = sideHTML(); if (k) k.textContent = nf(approved()); fRefresh();
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
  // After an add the card stays open on the same product and says where it went, so you can carry on with ‹ ›.
  function addedHTML(o) {
    const d = done.get(o.file); if (!d || !d.length) return "";
    return `<p class="sbl-added">${d.map(x => "✓ " + (zh() ? `${x.existing ? "已在" : "已添加到"} ${esc(x.pname)}，编号 ${esc(x.code)}` : `${x.existing ? "Already in" : "Added to"} ${esc(x.pname)} as ${esc(x.code)}`)).join("<br>")}</p>`;
  }
  function addControls(o) {
    if (!host.canAdd() || (!isOn(o) && !host.canEdit())) return "";
    if (host.ctx === "project") {
      const mine = (done.get(o.file) || []).find(x => x.project === host.project());
      const inId = host.inProject().get(o.file) || (mine && mine.id);
      return (inId ? `<button class="btn" data-sbl="piece" data-id="${esc(inId)}">${t("Open the piece in this project")}</button>`
        : `<button class="btn" data-sbl="add" ${ui.adding ? "disabled" : ""}>${ui.adding ? t("Adding…") : (zh() ? "添加到 " : "Add to ") + esc(host.projectName())}</button>`) + addedHTML(o);
    }
    const ps = host.projects();
    if (!ps.length) return `<span class="sbl-hint" style="margin:0">${t("No projects to add to yet.")}</span>`;
    if (!ps.some(p => p.id === ui.target)) ui.target = ps.length === 1 ? ps[0].id : "";
    return `<label class="sbl-pick">${t("Add to project")}<select id="sbl-target"><option value="">${t("Choose a project")}</option>${ps.map(p => `<option value="${esc(p.id)}" ${p.id === ui.target ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
      <button class="btn" data-sbl="add" ${ui.adding || !ui.target ? "disabled" : ""}>${ui.adding ? t("Adding…") : t("Add")}</button>${addedHTML(o)}`;
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
    if (fresh.has(o.file)) markSeen([o.file]);
    document.body.style.overflow = "hidden";
    return `<div class="sbl-scrim" data-sbl="close"></div>
    <section class="sbl-sheet${full.has(o.file) ? " big" : ""}" role="dialog" aria-modal="true" aria-label="${esc(o.file)}">
      ${full.has(o.file) ? `<div class="sbl-hero big"><button class="sbl-zoom" data-sbl="zoom" title="${t("Click to see it full screen")}"><span class="sbl-sw" ${sprite(o)}></span><img class="sbl-big" src="/lib/full/${esc(o.file)}" alt="${esc(o.file)}"></button>${navHTML()}</div>`
        : `<div class="sbl-hero"><span class="sbl-sw" ${sprite(o)}></span>${navHTML()}</div>`}
      <div class="sbl-body">
        <div class="sbl-top"><span class="eyebrow">${esc(typeName(typeOf(o)))} · ${esc(L[0])}${L[1] ? " · " + esc(L[1]) : ""}</span><span class="sbl-topr"><button class="btn sm ghost sbl-favbtn" data-sbl="fav" aria-pressed="${fav.has(o.file)}">${fav.has(o.file) ? "★ " + t("Favourite") : "☆ " + t("Add to favourites")}</button>${isAdm() && (x || feat.has(o.file)) ? `<button class="btn sm ghost sbl-featbtn" data-sbl="feat" aria-pressed="${feat.has(o.file)}" title="${t(feat.has(o.file) ? "Remove from featured" : "Feature on the landing page")}">${feat.has(o.file) ? "◆ " + t("Featured") : "◇ " + t("Feature")}</button>` : ""}${cur ? `<button class="btn sm sbl-appr ${x ? "on" : ""}" data-sbl="toggle" aria-pressed="${x}">${x ? "✓ " + t("Approved") : t("Approve")}</button>` : ""}<button class="sbl-x" data-sbl="close" aria-label="${t("Close")}">×</button></span></div>
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
          <div class="sbl-kv"><div class="k">${t("Catalogue page")}</div><div><button class="linkbtn" data-sbl="gopage" data-i="${o.i}" title="${esc(t("Opens the page inside Sourcebook"))}">${pageBtn(o)} ›</button></div><div class="k">PDF</div><div><a href="${esc(pdfURL(S))}" target="_blank" rel="noopener">${esc(S.pdf)} ↗</a></div>
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
  function close() { if (ui.open == null) return; ui.open = null; ui.adding = false; ui.zoom = false; ui.seq = []; document.body.style.overflow = ""; host.layer(); fResume(); }

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
  // The catalogue page the image is on, rendered from the PDF kept on the server (catalogues added from a PDF),
  // for the piece's Specification. Only that page's bytes are read. Returns null for catalogues kept on Google Drive.
  async function pagePic(o) {
    const S = LIB.sups[o.sup]; if (!S || !S.up) return null;
    const lib = await pdfjs();
    const doc = await lib.getDocument({ url: `/lib/pdf/${encodeURIComponent(o.sup)}.pdf`, disableAutoFetch: true, disableStream: true, rangeChunkSize: 262144 }).promise;
    try {
      const pg = await doc.getPage(Math.max(1, Math.min(doc.numPages, Number(o.page) || 1)));
      const v1 = pg.getViewport({ scale: 1 }), sc = Math.min(3, 2200 / Math.max(v1.width, v1.height)), vp = pg.getViewport({ scale: sc });
      const cv = document.createElement("canvas"); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
      await pg.render({ canvasContext: g, viewport: vp }).promise;
      return { data: cv.toDataURL("image/jpeg", .85).split(",")[1], w: v1.width, h: v1.height };
    } finally { doc.destroy(); }
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
      let pg = null; try { pg = await pagePic(o); } catch (_) {}
      const r = await fetch("/api/library/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project, file: o.file, photo, prefix, ...(pg ? { page: pg.data, pageW: pg.w, pageH: pg.h } : {}) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(j.message || "add"), { code: j.code });
      const pname = host.ctx === "project" ? host.projectName() : (host.projects().find(p => p.id === project) || {}).name || project;
      const d = (done.get(o.file) || []).filter(x => x.project !== project); d.push({ project, pname, code: j.code, id: j.id, existing: !!j.existing }); done.set(o.file, d);
      ui.adding = false; host.layer();
      if (host.added) host.added(j, pname); else host.toast(zh() ? `已添加到 ${pname}，编号 ${j.code}` : `Added to ${pname} as ${j.code}`);
      rerender();
    } catch (e) { ui.adding = false; host.layer(); host.toast(e.code === "forbidden" || e.code === "invalid_argument" ? e.message : t("Couldn't add it. Try again.")); }
  }

  // Adding a catalogue from a PDF (admins). The browser reads the PDF with pdf.js, takes out the photos
  // embedded on each page and uploads each one full size (up to 2400px) with a 280px thumbnail, named
  // CATEGORY_Supplier-Catalogue_pPAGE_NN.jpg like the scanned catalogues. Nothing is approved.
  const CATS = ["FURNITURE", "OFFICE", "LIGHTING", "PLUMBING", "VANITIES", "MIRRORS", "MILLWORK", "DOORS", "STONE", "FLOORING", "WALL PANELLING", "WOOD PRODUCTS", "PARTITION SYSTEMS", "GLASS PRODUCTS", "SIGNAGE"];
  const catName = c => zh() ? CAT_ZH[c] || c : c === "PLUMBING" ? "Plumbing fixtures" : c[0] + c.slice(1).toLowerCase();
  const CAT_ZH = { FURNITURE: "家具", OFFICE: "办公家具", LIGHTING: "灯具", PLUMBING: "卫浴洁具", VANITIES: "浴室柜", MIRRORS: "镜子", MILLWORK: "木作", DOORS: "门", STONE: "石材", FLOORING: "地板", "WALL PANELLING": "墙板", "WOOD PRODUCTS": "木制品", "PARTITION SYSTEMS": "隔断系统", "GLASS PRODUCTS": "玻璃制品", SIGNAGE: "标识" };
  let scan = null, scanErr = "", pdfMode = "scan"; // progress text while a PDF is being scanned; why the last one stopped
  function addCatHTML() {
    if (scan) return `<div class="sbl-addcat"><p style="color:var(--ink);font-size:14px">${esc(scan)}</p></div>`;
    if (!ui.addcat) return driveHTML() + `<button class="linkbtn" data-sbl="addcat">${t("Add a catalogue from a PDF")}</button>`;
    return `<div class="sbl-addcat">${scanErr ? `<p style="color:var(--crit);font-size:14px">${esc(scanErr)}</p>` : ""}
      <label class="sbl-drop">${t("PDF catalogue")}<span>${t("Drop the PDF here, or click to choose it")}</span><b id="sbl-pdfname"></b><input type="file" id="sbl-pdf" accept="application/pdf,.pdf"></label>
      <fieldset class="sbl-mode" id="sbl-mode" hidden><legend>${t("How to add it")}</legend>
        <label><input type="radio" name="sbl-mode" value="scan" ${pdfMode === "scan" ? "checked" : ""}><span>${t("Scan for product images")}<small>${t("Pulls out each photo in the PDF.")}</small></span></label>
        <label><input type="radio" name="sbl-mode" value="pages" ${pdfMode === "pages" ? "checked" : ""}><span>${t("Import page by page")}<small>${t("Each page becomes one image.")}</small></span></label></fieldset>
      <label>${t("Supplier")}<input id="sbl-supplier" autocomplete="off" placeholder="Billa"></label>
      <label>${t("Catalogue name (optional)")}<input id="sbl-product" autocomplete="off" placeholder="Sofa 2026"></label>
      <label>${t("Category")}<select id="sbl-cat">${CATS.map(c => `<option value="${c}">${catName(c)}</option>`).join("")}${custom.map(x => `<option value="CUSTOM-${x.c}">${esc(zh() ? x.zh || x.en : x.en)}</option>`).join("")}</select></label>
      <label style="grid-column:1/-1">${t("Google Drive link to the PDF (optional)")}<input id="sbl-drive" autocomplete="off" placeholder="https://drive.google.com/file/d/…"></label>
      <p>${t("The PDF is scanned in this browser, so keep this tab open until it finishes. Photos in the PDF become library images named like the others (category_supplier_page_number) and start unapproved. Up to 300 MB and 2,000 pages.")}</p>
      <div class="sbl-row"><button class="btn" data-sbl="scan" id="sbl-go">${t(pdfMode === "pages" ? "Import pages" : "Scan and add")}</button><button class="btn ghost" data-sbl="addcancel">${t("Cancel")}</button></div></div>`;
  }
  function addLine() { const el = $("#sbl-addwrap"); if (el) el.innerHTML = addCatHTML(); }
  // New catalogues on Google Drive: PDFs in the catalogue folder that aren't in the library yet. Add opens the form
  // with the PDF, category and Drive link filled in; Ignore hides that PDF for good.
  let driveSt = null, driveBusy = "";
  async function loadDrive(check) {
    try { const r = await fetch("/api/library/drive" + (check ? "?check=1" : "")); driveSt = r.ok ? await r.json() : { on: false, pending: [] }; } catch (_) { driveSt = driveSt || { on: false, pending: [] }; }
    if (!ui.addcat && !scan) addLine();
  }
  function driveHTML() {
    if (!curating()) return "";
    if (!driveSt) { loadDrive(); return ""; }
    if (!driveSt.on) return driveSt.error ? `<p class="sbl-drive err">${esc(t(driveSt.error))}</p>` : "";
    if (driveSt.error) return `<div class="sbl-drive err"><p>${t("Sourcebook can't check Google Drive for new catalogues:")} ${esc(t(driveSt.error))}</p><button class="linkbtn" data-sbl="drivecheck">${t("Check again")}</button></div>`;
    if (driveBusy) return `<div class="sbl-drive"><p>${esc(driveBusy)}</p></div>`;
    const P = driveSt.pending || [];
    if (!P.length) return `<p class="sbl-drive quiet">${t("No new catalogues on Google Drive.")} <button class="linkbtn" data-sbl="drivecheck">${t("Check now")}</button></p>`;
    const mb = n => n ? ` · ${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} MB` : "";
    return `<div class="sbl-drive"><h5>${zh() ? `Google 云盘上有 ${P.length} 份新目录` : `${P.length} new catalogue${P.length === 1 ? "" : "s"} on Google Drive`}</h5>
      ${P.slice(0, ui.driveAll ? 500 : 6).map(f => `<div class="sbl-driverow"><span><b>${esc(f.name)}</b><small>${esc(f.cat ? catLabel(f.cat) : f.folder)}${mb(f.size)}</small></span><button class="btn sm" data-sbl="driveadd" data-id="${esc(f.id)}">${t("Add")}</button><button class="btn ghost sm" data-sbl="driveignore" data-id="${esc(f.id)}">${t("Ignore")}</button></div>`).join("")}
      ${P.length > 6 && !ui.driveAll ? `<button class="linkbtn" data-sbl="driveall">${zh() ? `显示全部 ${P.length} 份` : `Show all ${P.length}`}</button>` : ""}</div>`;
  }
  const catLabel = c => c.startsWith("CUSTOM-") ? (x => x ? (zh() ? x.zh || x.en : x.en) : c)(custom.find(x => x.c === c.slice(7))) : catName(c);
  async function driveAdd(id) {
    const f = driveSt && (driveSt.pending || []).find(x => x.id === id); if (!f || driveBusy) return;
    driveBusy = zh() ? `正在从 Google 云盘获取 ${f.name}…` : `Getting ${f.name} from Google Drive…`; addLine();
    try {
      const r = await fetch(`/api/library/drive/pdf/${encodeURIComponent(id)}`);
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "drive");
      const file = new File([await r.blob()], f.name, { type: "application/pdf" });
      driveBusy = ""; ui.addcat = true; addLine();
      const inp = $("#sbl-pdf"); if (inp) { const dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files; pdfName(); }
      const sel = $("#sbl-cat"); if (sel && f.cat && [...sel.options].some(o => o.value === f.cat)) sel.value = f.cat;
      const dv = $("#sbl-drive"); if (dv) dv.value = `https://drive.google.com/file/d/${id}/view`;
      const sp = $("#sbl-supplier"); if (sp) { sp.value = f.name.replace(/\.pdf$/i, "").replace(/^\d{4}\s*/, "").replace(/[^A-Za-z0-9 &-]+/g, " ").trim().split(/\s+/)[0] || ""; sp.focus(); sp.select(); }
    } catch (e) { driveBusy = ""; addLine(); host.toast(e.message && e.message !== "drive" ? e.message : t("Couldn't get the PDF from Google Drive. Try again.")); }
  }
  async function driveIgnore(id) {
    if (!driveSt) return; const f = (driveSt.pending || []).find(x => x.id === id);
    driveSt.pending = (driveSt.pending || []).filter(x => x.id !== id); addLine();
    try { await api("/api/library/drive/ignore", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      host.toastUndo(zh() ? `已忽略 ${f ? f.name : ""}` : `Ignored ${f ? f.name : ""}`, async () => { await api("/api/library/drive/ignore", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, undo: true }) }).catch(() => {}); loadDrive(); });
    } catch (_) { host.toast(t("Couldn't save. Check your connection and try again.")); loadDrive(); }
  }
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
      reloadIndex(); if (driveSt && driveSt.on) loadDrive();
    } catch (e) {
      scan = null;
      scanErr = e.code ? e.message : e.name === "InvalidPDFException" || e.name === "PasswordException" ? t("Couldn't read that PDF.") : (zh() ? "扫描中断，请重试。" : "The scan stopped part way. Try again.") + (e.message ? " (" + e.message + ")" : "");
      addLine(); host.toast(scanErr);
    }
  }
  // Sorts an added furniture catalogue's images into product types again; images an admin moved by hand keep their type.
  async function resortCat(sup) {
    const S = LIB.sups[sup]; if (!S || !S.up) return;
    const L = label(sup).filter(Boolean).join(" · ");
    if (!confirm(zh() ? `重新将「${L}」的 ${S.n} 张图片分类到产品类型？你手动移动过的图片保持不变。` : `Re-sort the ${S.n} images in ${L} into product types? Images you moved by hand keep your choice.`)) return;
    try { await api(`/api/library/catalogue/${sup}/resort`, { method: "POST" }); host.toast(t("Sorting started. The product types update in a minute or two.")); }
    catch (e) { host.toast(t(e.message || "Couldn't save. Check your connection and try again.")); }
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
  // "Have something you want?": drop a photo, Claude looks for similar products among the images this person
  // can see, and if there's nothing similar the photo goes to the sourcing agent as a sourcing request.
  const find = { st: "idle", url: "", b64: "", note: "", what: "", zh: "", m: [], err: "", req: null, auto: false };
  let reqs = new Map(), showDone = false;
  const staff = () => host.internal();
  async function fetchReqs() { const r = await fetch("/api/sourcing"); if (!r.ok) return; const j = await r.json(); reqs = new Map((j.requests || []).map(x => [x.id, x])); tbsCfg = { role: j.role || "", me: j.me || "", mail: !!j.mail, agentEmail: j.agentEmail || tbsCfg.agentEmail || "" }; findPaint(); }
  async function prepPhoto(f) {
    const b = await createImageBitmap(f), sc = Math.min(1, 1024 / Math.max(b.width, b.height)), cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(b.width * sc)); cv.height = Math.max(1, Math.round(b.height * sc));
    const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(b, 0, 0, cv.width, cv.height);
    const url = cv.toDataURL("image/jpeg", .85); return { url, b64: url.split(",")[1] };
  }
  const imgs = new Map();
  const loadImg = src => imgs.get(src) || imgs.set(src, new Promise((res, rej) => { const x = new Image(); x.onload = () => res(x); x.onerror = () => { imgs.delete(src); rej(new Error("img")); }; x.src = src; })).get(src);
  // Numbered contact sheets (6 x 6 squares of 160px) of the images to compare, drawn from the thumbnail sprites.
  async function contactSheets(items) {
    const out = [], C = 160, N = 6;
    for (let i = 0; i < items.length; i += N * N) {
      const part = items.slice(i, i + N * N), rows = Math.ceil(part.length / N), cv = document.createElement("canvas");
      cv.width = C * N; cv.height = C * rows; const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
      for (const [n, o] of part.entries()) {
        const x = (n % N) * C, y = Math.floor(n / N) * C;
        try {
          if (o.s == null) { const im = await loadImg(`/lib/thumb/${encodeURIComponent(o.file)}`), sc = Math.min((C - 8) / im.width, (C - 8) / im.height); g.drawImage(im, x + (C - im.width * sc) / 2, y + (C - im.height * sc) / 2, im.width * sc, im.height * sc); }
          else { const im = await loadImg(`/lib/sprites/s${String(o.s).padStart(3, "0")}.jpg`), c = LIB.cell, k = LIB.grid; g.drawImage(im, (o.k % k) * c, Math.floor(o.k / k) * c, c, c, x + 4, y + 4, C - 8, C - 8); }
        } catch (_) {}
        g.strokeStyle = "#ccc"; g.strokeRect(x + .5, y + .5, C - 1, C - 1);
        g.fillStyle = "#000"; g.fillRect(x, y, 34, 24); g.fillStyle = "#fff"; g.font = "bold 17px sans-serif"; g.textBaseline = "middle"; g.fillText(String(n + 1), x + 5, y + 12);
      }
      out.push({ items: part, data: cv.toDataURL("image/jpeg", .82).split(",")[1], n: part.length });
    }
    return out;
  }
  async function findSearch(f) {
    if (!LIB || find.st === "type" || find.st === "match") return;
    const note = (($("#sbl-fnote") || {}).value || find.note || "").trim();
    Object.assign(find, { st: "type", note, m: [], err: "", req: null, auto: false, what: "", zh: "" }); findPaint();
    try {
      Object.assign(find, await prepPhoto(f)); findPaint();
      const image = { media_type: "image/jpeg", data: find.b64 };
      const ty = await api("/api/library/similar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ step: "type", image, note }) });
      find.what = ty.what || ""; find.zh = ty.zh || ""; find.st = "match"; findPaint();
      const cur = curating(), pool = LIB.items.filter(o => (cur || isOn(o)) && ty.types.includes(typeOf(o))).slice(0, 4 * 8 * 36);
      let found = [];
      if (pool.length) {
        const sh = await contactSheets(pool), calls = [];
        for (let i = 0; i < sh.length; i += 8) calls.push(sh.slice(i, i + 8));
        const res = await Promise.all(calls.map(part => api("/api/library/similar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ step: "match", image, note, sheets: part.map(s => ({ data: s.data, n: s.n })) }) })
          .then(r => r.matches.map(m => ({ o: part[m.s - 1].items[m.c - 1], score: m.score })))));
        found = res.flat().filter(x => x.o).sort((a, b) => b.score - a.score).slice(0, 12);
      }
      find.m = [...new Set(found.map(x => x.o.i))]; find.st = "done";
      if (!find.m.length) { find.auto = true; await sendReq(); return; }
      findPaint();
    } catch (e) { find.st = "error"; find.err = e.code === "sampling_disabled" ? t(e.message) : t("The search didn't finish. Try again."); findPaint(); }
  }
  async function sendReq() {
    if (!find.b64 || find.st === "sending") return;
    find.st = "sending"; findPaint();
    try {
      const j = await api("/api/sourcing/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ photo: find.b64, note: find.note, what: find.what, zh: find.zh, project: host.ctx === "project" ? host.project() : "" }) });
      find.req = j.id; find.st = "sent"; fetchReqs().catch(() => {});
    } catch (e) { find.st = "error"; find.err = e.message && e.code === "invalid_argument" ? t(e.message) : t("Couldn't send it. Check your connection and try again."); }
    findPaint();
  }
  // quiet: save without redrawing, so a button clicked while a note loses focus still gets the click.
  function updReq(id, body, quiet) {
    const x = reqs.get(id); if (x && body.status && body.status !== "reopen") x.status = body.status; if (x && typeof body.reply === "string") x.reply = body.reply;
    if (body.remove) { reqs.delete(id); if (find.req === id) { find.req = null; find.st = find.m.length ? "done" : "idle"; } }
    if (!quiet) findPaint();
    api("/api/sourcing/update", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...body }) }).catch(e => { host.toast(e.code === "forbidden" ? t(e.message) : t("Couldn't save. Check your connection and try again.")); fetchReqs().catch(() => {}); });
  }
  const ago = s => { const d = new Date(s); return isNaN(d) ? "" : d.toLocaleDateString(zh() ? "zh-CN" : "en-CA", { month: "short", day: "numeric" }); };
  function tileHTML(o) {
    return `<div class="sbl-tile"><button class="sbl-open" data-sblopen="${o.i}" data-sblseq="find" aria-label="${esc(o.file)}"><span class="sbl-sw" ${sprite(o)}></span></button>
      <span class="sbl-cap"><b>${esc(o.codes[0] || label(o.sup)[0])}</b><span>${esc(typeName(typeOf(o)))}</span><button class="sbl-star" data-sblfav="${o.i}" aria-pressed="${fav.has(o.file)}" title="${t(fav.has(o.file) ? "Remove from favourites" : "Add to favourites")}">${fav.has(o.file) ? "★" : "☆"}</button></span></div>`;
  }
  function findHTML() {
    const pic = find.url ? `<img class="sbl-fpic" src="${find.url}" alt="">` : "";
    const what = (zh() ? find.zh : find.what) || find.what;
    let body;
    if (find.st === "idle" || find.st === "error") body = `<label class="sbl-fdrop"><input type="file" id="sbl-fimg" accept="image/*"><span class="sbl-fcopy"><b>${t("Have something you want?")}</b><span>${t("Drop it here and we'll search for something similar in our library. If we can't find it, we'll source it for you.")}</span></span><span class="btn ghost sm">${t("Choose a photo")}</span></label>
      <input class="sbl-fnote" id="sbl-fnote" value="${esc(find.note)}" maxlength="300" autocomplete="off" placeholder="${esc(t("What are you looking for? (optional) e.g. the chair, in walnut"))}">
      ${find.st === "error" ? `<p class="sbl-ferr">${esc(find.err)}</p>` : ""}`;
    else if (find.st === "type" || find.st === "match" || find.st === "sending") body = `<div class="sbl-fwork">${pic}<div><b>${t(find.st === "sending" ? "Adding it to TBS (to be sourced)…" : "Searching our library for something similar…")}</b>${what ? `<span>${esc(what)}</span>` : ""}<span class="sbl-fbar"><i></i></span></div></div>`;
    else if (find.st === "sent") {
      const r = reqs.get(find.req);
      body = `<div class="sbl-fwork">${pic}<div><b>${t(find.auto ? (staff() ? "Nothing similar in our library, so it's been added to TBS (to be sourced)." : "We couldn't find anything similar in our library, so it's been added to TBS (to be sourced). We'll review it and have our sourcing agent find it for you.") : (staff() ? "Added to TBS (to be sourced)." : "Added to TBS (to be sourced). We'll review it and have our sourcing agent find it for you."))}</b>${what ? `<span>${esc(what)}</span>` : ""}
        <span class="sbl-row"><button class="btn sm ghost" data-sbltype="TBS">${t("Open TBS")}</button>${r && inReview(r) && !isAdm() ? `<button class="linkbtn" data-sbl="freqcancel">${t("Withdraw the request")}</button>` : ""}<button class="linkbtn" data-sbl="freset">${t("Search for something else")}</button></span></div></div>
        ${find.m.length ? `<div class="sbl-grid">${find.m.map(i => tileHTML(LIB.items[i])).join("")}</div>` : ""}`;
    } else body = `<div class="sbl-fwork">${pic}<div><b>${zh() ? `图库中有 ${find.m.length} 件相似产品` : `${find.m.length} similar in our library`}</b>${what ? `<span>${esc(what)}</span>` : ""}
        <span class="sbl-row"><button class="btn sm" data-sbl="freq">${t("None of these? Add it to TBS (to be sourced)")}</button><button class="linkbtn" data-sbl="freset">${t("Search for something else")}</button></span></div></div>
      <div class="sbl-grid">${find.m.map(i => tileHTML(LIB.items[i])).join("")}</div>`;
    return `<section class="sbl-find${find.st === "idle" || find.st === "error" ? "" : " busy"}" id="sbl-find">${body}</section>`;
  }
  // TBS (to be sourced): the requests this person can see. Admins review new ones and send them to the sourcing
  // agent; agents see the ones sent to them; anyone else sees their own.
  const inReview = x => x.status === "review" || x.status === "open";
  let tbsCfg = { role: "", mail: false, agentEmail: "" }, tbsFilter = null, tbsSending = new Set(), tbsUp = new Set(), tbsFocus = (location.search.match(/[?&]tbs=([0-9a-f]{20})/) || [])[1] || null;
  if (tbsFocus) ui.type = "TBS";
  const isAdm = () => tbsCfg.role === "admin";
  // What needs this person's attention: new items for an admin, sent ones for the sourcing agent.
  const tbsNew = x => inReview(x) && !(x.by && x.by.id === tbsCfg.me);
  const tbsMine = x => !!(x.by && x.by.id === tbsCfg.me);
  // Inside a project, a client sees only that project's requests (plus their own asked from the dashboard).
  const tbsList = () => { const all = [...reqs.values()]; if (staff() || host.ctx !== "project") return all; const pid = host.project(); return all.filter(x => x.project && x.project.id ? x.project.id === pid : tbsMine(x)); };
  const tbsTodo = () => [...reqs.values()].filter(x => isAdm() ? tbsNew(x) : tbsCfg.role === "agent" ? x.status === "sent" : false).length;
  let badgeEl = null;
  function tbsBadge() {
    if (!badgeEl) { badgeEl = document.createElement("style"); document.head.appendChild(badgeEl); }
    // TBS items waiting on this person, plus images new to them in the library.
    const k = LIB ? LIB.items.filter(isNew).length : fresh.size, n = tbsTodo() + k;
    badgeEl.textContent = n ? `[data-dview="library"]::after,[data-view="lib"]::after{content:"● ${n}${isAdm() || k ? (zh() ? " 新" : " new") : ""}";display:inline-block;min-width:18px;margin-left:7px;padding:1px 7px;border-radius:9px;background:#1E7A3C;color:#fff;font-size:11px;line-height:16px;text-align:center;font-family:var(--mono,monospace)}` : "";
  }
  function tbsAlert(x) {
    const msg = (zh() ? "新的待采购 TBS 需要审核：" : "New item to review in TBS: ") + ((zh() ? x.zh : x.what) || x.what || t("Photo")) + (x.by && x.by.name ? " · " + x.by.name : "");
    host.toast(msg);
    if (window.Notification && Notification.permission === "granted" && (document.hidden || !document.hasFocus())) { try { new Notification("Sourcebook · TBS", { body: msg, icon: "/icon-192.png", tag: "sb-tbs-" + x.id }); } catch (_) {} }
  }
  function tbsTileHTML() {
    const all = tbsList(); if (!all.length && !staff()) return "";
    const n = tbsTodo(), sub = isAdm() ? (zh() ? `${nf(all.filter(inReview).length)} 项待审核 · ${nf(all.filter(x => x.status === "sent").length)} 项采购中` : `${nf(all.filter(inReview).length)} to review · ${nf(all.filter(x => x.status === "sent").length)} with the agent`)
      : tbsCfg.role === "agent" ? (zh() ? `${nf(n)} 项待寻找` : `${nf(n)} to find`) : (zh() ? `${nf(all.length)} 项请求` : `${nf(all.length)} request${all.length === 1 ? "" : "s"}`);
    const cover = all.find(x => isAdm() ? inReview(x) : true) || all[0];
    return `<button class="sbl-cat" data-sbltype="TBS">${cover ? `<span class="sbl-sw sbl-tbsic" style="background-image:url(/_blob/${esc(cover.photo)})">${n ? `<i>● ${nf(n)}${isAdm() ? " " + t("new") : ""}</i>` : ""}</span>` : `<span class="sbl-favic sbl-tbsword">TBS</span>`}<span class="sbl-name">TBS · ${t("To be sourced")}</span><span class="sbl-sub">${sub}</span></button>`;
  }
  const tbsState = x => inReview(x) ? "review" : x.status;
  function tbsHTML() {
    const all = tbsList(), st = staff(), adm = isAdm();
    const counts = { review: all.filter(inReview).length, sent: all.filter(x => x.status === "sent").length, sourced: all.filter(x => x.status === "sourced").length };
    if (!tbsFilter || (tbsFilter !== "all" && !counts[tbsFilter])) tbsFilter = adm && counts.review ? "review" : tbsCfg.role === "agent" && counts.sent ? "sent" : "all";
    const list = all.filter(x => tbsFilter === "all" || tbsState(x) === tbsFilter);
    const chips = st ? `<div class="sbl-chips">${(adm ? [["review", "To review"], ["sent", "With the sourcing agent"], ["sourced", "Sourced"], ["all", "All"]] : [["sent", "To find"], ["sourced", "Sourced"], ["all", "All"]]).map(([k, l]) => `<button class="chip" data-sbltbsf="${k}" aria-pressed="${tbsFilter === k}">${t(l)}${k === "all" ? "" : " · " + nf(counts[k])}</button>`).join("")}</div>` : "";
    const alerts = adm && window.Notification && Notification.permission === "default" ? `<button class="linkbtn" data-sbl="tbsalerts">${t("Turn on alerts for new requests")}</button>` : "";
    const lede = adm ? "Photos sent from the Sourcing library that we couldn't match. Review each one, then send it to the sourcing agent; with email set up, it goes to their QQ Mail with the photo attached."
      : tbsCfg.role === "agent" ? "Items the studio has asked you to find. Mark each one sourced when you've found it, with a note on where." : "Things you've asked us to find. We review each one and send it to our sourcing agent.";
    return `<p class="sbl-hint" style="max-width:70ch">${t(lede)} ${alerts}</p>${chips}${list.length ? `<div class="sbl-reqlist">${list.map(tbsCard).join("")}</div>` : `<p class="sbl-empty">${t(all.length ? "Nothing here." : "Nothing to be sourced yet. Drop a photo in the box on the Sourcing library page.")}</p>`}`;
  }
  function tbsCard(x) {
    const st = staff(), adm = isAdm(), s = tbsState(x), sending = tbsSending.has(x.id), found = Array.isArray(x.found) ? x.found : [], files = Array.isArray(x.files) ? x.files : [];
    const chip = s === "review" ? `<span class="sbl-rstate">${t(st ? "To review" : "With the studio")}</span>`
      : s === "sent" ? `<span class="sbl-rstate sent">${t(st ? "With the sourcing agent" : "We're sourcing it")}${st && x.sent ? ` · ${esc(ago(x.sent.at))}${x.sent.emailed && x.sent.to ? " · " + (zh() ? "已发邮件至 " : "emailed to ") + esc(x.sent.to) : ""}` : ""}</span>`
      : `<span class="sbl-rstate ok">✓ ${t("Sourced")}${x.done && x.done.by && st ? " · " + esc(x.done.by) : ""}</span>`;
    const sendForm = adm && s !== "sourced" ? `<div class="sbl-send">
        ${tbsCfg.mail ? `<label>${t("Sourcing agent's email (QQ Mail)")}<input data-sbltbsto="${esc(x.id)}" value="${esc(tbsCfg.agentEmail)}" placeholder="12345678@qq.com" autocomplete="off"></label>` : `<p class="sbl-hint" style="margin:0">${t("Email isn't set up yet, so this sends it in Sourcebook only. Add the SMTP settings in Render to email the agent's QQ Mail.")}</p>`}
        <label>${t("Message to the agent (optional)")}<input data-sbltbsmsg="${esc(x.id)}" maxlength="2000" autocomplete="off" placeholder="${esc(t("e.g. Need 6, walnut, by November"))}"></label>
        <span class="sbl-row"><button class="btn sm" data-sbl="tbssend" data-id="${esc(x.id)}" ${sending ? "disabled" : ""}>${t(sending ? "Sending…" : s === "sent" ? "Send to the sourcing agent again" : "Send to the sourcing agent")}</button></span></div>` : "";
    return `<article class="sbl-req${s === "sourced" ? " done" : ""}${tbsFocus === x.id ? " focus" : ""}" id="sbl-req-${esc(x.id)}"><a href="/_blob/${esc(x.photo)}" target="_blank" rel="noopener"><img src="/_blob/${esc(x.photo)}" alt="" loading="lazy"></a><div>
      ${adm && tbsNew(x) ? `<span class="sbl-newtag">● ${t("New")}</span>` : ""}<b>${esc((zh() ? x.zh : x.what) || x.what || t("Photo"))}</b>${x.note ? `<p>“${esc(x.note)}”</p>` : ""}
      <span class="sbl-sub">${st ? esc(x.by && x.by.name || t("Studio owner")) + (x.by && x.by.role === "client" ? " · " + t("Client") : x.by && x.by.role === "specifier" ? " · " + t("Specifier / designer") : "") + " · " : ""}${esc(ago(x.at))}${x.project && x.project.name ? " · " + esc(x.project.name) : ""}</span>
      ${chip}
      ${x.sent && x.sent.message && st ? `<p class="sbl-rmsg">${t("Message to the agent")}: ${esc(x.sent.message)}</p>` : ""}
      ${x.reply && !st ? `<p class="sbl-rreply">${esc(x.reply)}</p>` : ""}
      ${found.length ? `<span class="sbl-found" title="${esc(t("Photos of what was found"))}">${found.map(ph => `<span><a href="/_blob/${esc(ph)}" target="_blank" rel="noopener"><img src="/_blob/${esc(ph)}" alt="" loading="lazy"></a>${st ? `<button data-sbl="rfoundrm" data-id="${esc(x.id)}" data-ph="${esc(ph)}" title="${esc(t("Remove"))}" aria-label="${esc(t("Remove"))}">×</button>` : ""}</span>`).join("")}</span>` : ""}
      ${files.length ? `<ul class="sbl-files">${files.map(f => `<li><a href="/_blob/${esc(f.id)}" download="${esc(f.name)}"><span class="sbl-fext">${esc((f.name.match(/\.([A-Za-z0-9]{1,5})$/) || [, "FILE"])[1].toUpperCase())}</span>${esc(f.name)}<small>${esc(fsize(f.size))}</small></a>${st ? `<button class="linkbtn" data-sbl="rfilerm" data-id="${esc(x.id)}" data-f="${esc(f.id)}" title="${esc(t("Remove"))}" aria-label="${esc(t("Remove"))}">×</button>` : ""}</li>`).join("")}</ul>` : ""}
      ${sendForm}
      ${st && s !== "review" ? `<input class="sbl-fnote" data-sblreply="${esc(x.id)}" value="${esc(x.reply || "")}" maxlength="2000" placeholder="${esc(t("Where it was found, for the person who asked (optional)"))}"><label class="btn ghost sm sbl-addfound"><input type="file" multiple data-sblfound="${esc(x.id)}">${t(tbsUp.has(x.id) ? "Adding…" : "Attach photos or files")}</label>` : ""}
      <span class="sbl-row">${st && s === "sent" ? `<button class="btn sm" data-sbl="rdone" data-id="${esc(x.id)}">${t("Mark as sourced")}</button>` : ""}${st && s === "sourced" ? `<button class="linkbtn" data-sbl="ropen" data-id="${esc(x.id)}">${t("Reopen")}</button>` : ""}
        ${(!st && s === "review" && tbsMine(x)) || adm ? `<button class="linkbtn" data-sbl="rdel" data-id="${esc(x.id)}" style="color:var(--crit)">${t(adm ? "Remove" : "Withdraw the request")}</button>` : ""}</span></div></article>`;
  }
  async function tbsSend(id) {
    if (tbsSending.has(id)) return;
    const to = (document.querySelector(`[data-sbltbsto="${id}"]`) || {}).value || "", message = (document.querySelector(`[data-sbltbsmsg="${id}"]`) || {}).value || "";
    if (tbsCfg.mail && !to.trim()) { host.toast(t("Add the sourcing agent's email first.")); return; }
    tbsSending.add(id); findPaint();
    try {
      const j = await api("/api/sourcing/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, to: tbsCfg.mail ? to : "", message }) });
      if (tbsCfg.mail) tbsCfg.agentEmail = to.trim();
      host.toast(t(j.emailed ? "Sent to the sourcing agent by email." : "Sent to the sourcing agent in Sourcebook."));
      const x = reqs.get(id); if (x) { x.status = x.status === "sourced" ? "sourced" : "sent"; x.sent = { at: new Date().toISOString(), to: tbsCfg.mail ? to.trim() : "", emailed: !!j.emailed, message }; }
    } catch (e) { host.toast(e.message && /mail|email|SMTP/i.test(e.message) ? t(e.message) : t("Couldn't send it. Check your connection and try again.")); }
    tbsSending.delete(id); findPaint();
  }
  function tbsPaint() {
    tbsBadge();
    const v = $("#sbl-tbs"); if (v) v.innerHTML = tbsHTML();
    if (!ui.type) { const c = $("#sbl-cats"); if (c && LIB) c.innerHTML = catsHTML(); }
    if (tbsFocus && v) { const el = $("#sbl-req-" + tbsFocus); if (el) { el.scrollIntoView({ block: "center" }); tbsFocus = null; } }
  }
  function findPaint() { const el = $("#sbl-findwrap"); if (el) el.innerHTML = findHTML(); tbsPaint(); }
  // Drop or paste a photo on the box.
  const findZone = e => e.dataTransfer && [...e.dataTransfer.types].includes("Files") && e.target.closest && e.target.closest("#sbl-find");
  document.addEventListener("dragover", e => { const z = findZone(e); if (!z) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; z.classList.add("over"); });
  document.addEventListener("dragleave", e => { const z = findZone(e); if (z && !z.contains(e.relatedTarget)) z.classList.remove("over"); });
  document.addEventListener("drop", e => {
    const z = findZone(e); if (!z) return; e.preventDefault(); z.classList.remove("over");
    const f = [...e.dataTransfer.files].find(f => /^image\//.test(f.type)); if (!f) { host.toast(t("That isn't a photo.")); return; }
    findSearch(f);
  });
  document.addEventListener("paste", e => {
    if (!$("#sbl-find") || ui.open != null || (find.st !== "idle" && find.st !== "error")) return;
    const f = [...(e.clipboardData && e.clipboardData.files || [])].find(f => /^image\//.test(f.type)); if (f) { e.preventDefault(); findSearch(f); }
  });
  const fsize = n => n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  async function tbsAddFound(id, files) {
    if (!files.length || tbsUp.has(id)) return;
    tbsUp.add(id); findPaint();
    try {
      for (const f of files.slice(0, 10)) {
        const x0 = reqs.get(id);
        // Photos show as pictures (up to 8); anything else (PDF, Excel, Word…) or extra photos are kept as files to download.
        if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type) || (x0 && (x0.found || []).length >= 8)) {
          if (f.size > 25 * 1024 * 1024) { host.toast((zh() ? "文件太大（最大 25 MB）：" : "Too big (25 MB at most): ") + f.name); continue; }
          const j = await api(`/api/sourcing/file?id=${encodeURIComponent(id)}&name=${encodeURIComponent(f.name)}`, { method: "POST", headers: { "content-type": "application/octet-stream" }, body: f });
          if (x0) x0.files = j.files; continue;
        }
        const { b64 } = await prepPhoto(f);
        const j = await api("/api/sourcing/photo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, photo: b64 }) });
        const x = reqs.get(id); if (x) x.found = j.found;
      }
    } catch (e) { host.toast(e.message ? t(e.message) : t("Couldn't send it. Check your connection and try again.")); }
    tbsUp.delete(id); findPaint();
  }
  document.addEventListener("change", e => { if (e.target.dataset && e.target.dataset.sblfound) { const files = [...e.target.files]; tbsAddFound(e.target.dataset.sblfound, files); return; } if (e.target.id === "sbl-fimg") { const f = e.target.files[0]; e.target.value = ""; if (f) findSearch(f); } });
  document.addEventListener("input", e => { if (e.target.id === "sbl-fnote") find.note = e.target.value; });
  document.addEventListener("focusout", e => { const id = e.target.dataset && e.target.dataset.sblreply; if (!id) return; const x = reqs.get(id); if (x && (x.reply || "") !== e.target.value.trim()) updReq(id, { reply: e.target.value.trim() }, true); });
  // Inside a product type, the next images load by themselves as you near the bottom (the button stays as a fallback).
  let moreBusy = false;
  function autoMore() {
    if (moreBusy || ui.open != null) return; const b = document.querySelector("[data-sblmore]"); if (!b || !b.offsetParent) return;
    if (b.getBoundingClientRect().top < innerHeight + 700) { moreBusy = true; ui.n += 120; repaint(); requestAnimationFrame(() => { moreBusy = false; autoMore(); }); }
  }
  addEventListener("scroll", () => requestAnimationFrame(autoMore), { passive: true });
  addEventListener("resize", () => requestAnimationFrame(autoMore));
  document.addEventListener("load", e => { const el = e.target; if (el.classList && el.classList.contains("sbl-big")) el.closest(".sbl-hero")?.classList.add("loaded"); }, true);
  document.addEventListener("error", e => { const el = e.target; if (el.classList && el.classList.contains("sbl-big")) { const h = el.closest(".sbl-hero"); if (h) { h.classList.remove("big"); el.remove(); } } }, true);

  document.addEventListener("click", async e => {
    const el = e.target.closest && e.target.closest("[data-sbltype],[data-sblsup],[data-sblshow],[data-sblmore],[data-sblopen],[data-sblbulk],[data-sblpage],[data-sblfav],[data-sblfeat],[data-sblfslide],[data-sbltbsf],[data-sbl]"); if (!el || !LIB) return;
    if (el.dataset.sbltbsf) { tbsFilter = el.dataset.sbltbsf; tbsPaint(); return; }
    if (el.dataset.sblfeat !== undefined) {
      const o = LIB.items[+el.dataset.sblfeat]; if (!o || !isAdm()) return; toggleFeat(o); repaint(); return;
    }
    if (el.dataset.sblfslide !== undefined) { fGo(+el.dataset.sblfslide); return; }
    if (el.dataset.sblfav !== undefined) {
      const o = LIB.items[+el.dataset.sblfav]; if (!o) return; const x = toggleFav(o);
      if (ui.type === "F") { repaint(); return; }
      el.setAttribute("aria-pressed", x); el.textContent = x ? "★" : "☆"; el.title = t(x ? "Remove from favourites" : "Add to favourites"); return;
    }
    if (el.dataset.sblsup !== undefined) { ui.sup = el.dataset.sblsup || null; ui.n = 120; ui.hit = null; rerender(); return; }
    if (el.dataset.sbltype !== undefined) { ui.type = el.dataset.sbltype || null; ui.sup = null; ui.n = 120; ui.hit = null; if (ui.type && ui.type !== "TBS") markSeen(LIB.items.filter(o => inType(o) && isNew(o)).map(o => o.file)); if (el.dataset.sbltop !== undefined) { ui.q = ""; } rerender(); const r = $("#sblib"); if (r && (ui.type || el.dataset.sbltop !== undefined)) r.scrollIntoView({ block: "start" }); return; }
    if (el.dataset.sblshow) { ui.show = el.dataset.sblshow; ui.n = 120; document.querySelectorAll("[data-sblshow]").forEach(b => b.setAttribute("aria-pressed", b === el)); repaint(); return; }
    if (el.dataset.sblmore !== undefined) { ui.n += 120; repaint(); return; }
    if (el.dataset.sblopen !== undefined) { ui.open = +el.dataset.sblopen; ui.seq = el.dataset.sblseq === "find" ? find.m.slice() : ordered().map(o => o.i); host.layer(); return; }
    if (!curating() && (el.dataset.sblbulk || el.dataset.sblpage)) return;
    if (el.dataset.sblbulk) { bulk(list(), el.dataset.sblbulk === "on"); return; }
    if (el.dataset.sblpage) { const p = +el.dataset.sblpage; bulk(list().filter(o => o.page === p), el.dataset.v === "on"); return; }
    const a = el.dataset.sbl;
    if (a === "close") close();
    else if (a === "clitog" && curating()) { ui.cli = !ui.cli; const w = $("#sbl-cliwrap"); if (w) w.innerHTML = cliHTML(); }
    else if ((a === "cliall" || a === "clinone") && curating()) setCli(Object.keys(LIB.sups).filter(s => hideCli.has(s) === (a === "cliall")), a === "cliall");
    else if (a === "addcat" && curating()) { ui.addcat = true; addLine(); }
    else if (a === "addtype" && curating()) { ui.addtype = true; repaint(); const f = $("#sbl-nten"); if (f) f.focus(); }
    else if (a === "addtypex") { ui.addtype = false; repaint(); }
    else if (a === "addtypego" && curating() && ui.addtype !== "busy") addType();
    else if (a === "selall" && curating()) { list().forEach(o => sel.add(o.i)); selPaint(); }
    else if (a === "selnone") { sel.clear(); selPaint(); }
    else if (a === "addcancel") { ui.addcat = false; addLine(); }
    else if (a === "freq") sendReq();
    else if (a === "freset") { Object.assign(find, { st: "idle", url: "", b64: "", note: "", what: "", zh: "", m: [], err: "", req: null, auto: false }); findPaint(); }
    else if (a === "freqcancel" && find.req) updReq(find.req, { remove: true });
    else if (a === "rdone" || a === "ropen") { const inp = document.querySelector(`[data-sblreply="${el.dataset.id}"]`), x = reqs.get(el.dataset.id); if (a === "ropen" && x) { x.status = x.sent ? "sent" : "review"; } updReq(el.dataset.id, { status: a === "rdone" ? "sourced" : "reopen", ...(inp ? { reply: inp.value.trim() } : {}) }); }
    else if (a === "tbssend") tbsSend(el.dataset.id);
    else if (a === "rfilerm") { const x = reqs.get(el.dataset.id); if (x && x.files) { x.files = x.files.filter(f => f.id !== el.dataset.f); findPaint(); } api(`/api/sourcing/file?id=${encodeURIComponent(el.dataset.id)}&remove=${encodeURIComponent(el.dataset.f)}`, { method: "POST" }).catch(() => host.toast(t("Couldn't send it. Check your connection and try again."))); }
    else if (a === "rfoundrm") { const x = reqs.get(el.dataset.id); if (x && x.found) { x.found = x.found.filter(p => p !== el.dataset.ph); findPaint(); } api("/api/sourcing/photo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: el.dataset.id, remove: el.dataset.ph }) }).catch(() => host.toast(t("Couldn't send it. Check your connection and try again."))); }
    else if (a === "tbsalerts") { Notification.requestPermission().then(() => findPaint()); }
    else if (a === "rdel") updReq(el.dataset.id, { remove: true });

    else if (a === "scan" && curating() && !scan) scanPDF();
    else if (a === "driveadd" && curating()) driveAdd(el.dataset.id);
    else if (a === "driveignore" && curating()) driveIgnore(el.dataset.id);
    else if (a === "driveall") { ui.driveAll = true; addLine(); }
    else if (a === "drivecheck" && curating()) { driveBusy = t("Checking Google Drive…"); addLine(); driveBusy = ""; loadDrive(true); }
    else if (a === "delcat" && curating() && ui.sup) deleteCat(ui.sup);
    else if (a === "resort" && curating() && ui.sup) resortCat(ui.sup);
    else if (a === "prev" || a === "next") { e.stopPropagation(); step(a === "next" ? 1 : -1); }
    else if (a === "zoom") { ui.zoom = true; host.layer(); }
    else if (a === "unzoom" && !e.target.closest(".sbl-nav")) { ui.zoom = false; host.layer(); }
    else if (a === "feat" && isAdm()) { const o = LIB.items[ui.open]; if (o) { toggleFeat(o); host.layer(); repaint(); } }
    else if (a === "fprev" || a === "fnext") fGo(fIdx + (a === "fnext" ? 1 : -1));
    else if (a === "fplay") { fUser = !fUser; fResume(); }
    else if (a === "gopage") { const o = LIB.items[+el.dataset.i]; if (o) goPage(o); }
    else if (a === "fopen") { const pool = featPool(), o = pool[fIdx]; if (o) { ui.open = o.i; ui.seq = pool.map(x => x.i); host.layer(); } }
    else if (a === "fav") { const o = LIB.items[ui.open]; if (o) { toggleFav(o); host.layer(); if (ui.type === "F") repaint(); } }
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
    if (el.dataset && el.dataset.sblcli !== undefined) { if (curating()) setCli([el.dataset.sblcli], el.checked); return; }
    if (el.dataset && el.dataset.sblsel !== undefined) { const i = +el.dataset.sblsel; el.checked ? sel.add(i) : sel.delete(i); selPaint(); return; }
    if (el.id === "sbl-moveto" && curating()) {
      const code = el.value; if (!code) return;
      if (!sel.size) { el.value = ""; host.toast(t("Select images first.")); return; }
      const l = [...sel].map(i => LIB.items[i]).filter(Boolean); sel.clear(); setType(l, code);
      host.toast(zh() ? `已将 ${nf(l.length)} 张移至「${typeName(code)}」` : `Moved ${nf(l.length)} to ${typeName(code)}`); return;
    }
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
    configure(h) { host = { ...host, ...h }; if (host.internal() || tbsFocus) setTimeout(watch, 0); else setTimeout(() => fetchSeen().catch(() => {}), 0); },
    view, sheet, close, repaint, load,
    isOpen: () => ui.open != null && !!LIB,
    t,
  });
})();

// Back to top: a round button on the right that appears once a page (or an open panel) has
// been scrolled about a screen down. It follows whatever was scrolled last, so it works on the
// book, the dashboard and the piece/library sheets alike. Loaded by index.html and dashboard.html.
(function () {
  "use strict";
  const label = () => { try { return localStorage.getItem("sb_lang") === "zh" ? "回到顶部" : "Back to top"; } catch (_) { return "Back to top"; } };
  let btn = null, box = null, raf = 0;
  const isWin = el => !el || el === document || el === document.documentElement || el === document.body;
  const top = el => isWin(el) ? (window.scrollY || document.documentElement.scrollTop || 0) : el.scrollTop;
  function update() {
    raf = 0;
    if (!btn) return;
    if (box && !isWin(box) && !box.isConnected) box = null;
    const locked = isWin(box) && document.body.style.overflow === "hidden";
    const show = !locked && top(box) > window.innerHeight * 0.9 && !document.querySelector("#viewer,#mvfull,.xlwrap,.sbl-zoomview");
    btn.classList.toggle("on", show);
    const tray = document.getElementById("famtray");
    btn.style.bottom = tray ? `calc(${tray.offsetHeight}px + 16px)` : "";
    const l = label();
    if (btn.title !== l) { btn.title = l; btn.setAttribute("aria-label", l); }
  }
  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  function init() {
    const st = document.createElement("style");
    st.textContent = `.sb-top{position:fixed;right:calc(env(safe-area-inset-right,0px) + 18px);bottom:calc(env(safe-area-inset-bottom,0px) + 24px);z-index:50;width:44px;height:44px;border-radius:50%;border:1px solid var(--ink,#1a1a18);background:var(--paper,#fff);color:var(--ink,#1a1a18);display:grid;place-items:center;padding:0;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.14);opacity:0;visibility:hidden;transform:translateY(8px);transition:opacity .2s,transform .2s,visibility .2s}
.sb-top.on{opacity:1;visibility:visible;transform:none}
.sb-top:hover{background:var(--ink,#1a1a18);color:var(--paper,#fff)}
.sb-top:focus-visible{outline:2px solid var(--ink,#1a1a18);outline-offset:3px}
.sb-top svg{width:18px;height:18px}
@media (max-width:560px){.sb-top{right:calc(env(safe-area-inset-right,0px) + 14px);bottom:calc(env(safe-area-inset-bottom,0px) + 18px)}}
@media print{.sb-top{display:none}}`;
    document.head.appendChild(st);
    btn = document.createElement("button");
    btn.type = "button"; btn.className = "sb-top";
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    btn.addEventListener("click", () => {
      const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto";
      (isWin(box) ? window : box).scrollTo({ top: 0, behavior: smooth });
    });
    document.body.appendChild(btn);
    // Capture so scrolls inside panels (which don't bubble) are seen too.
    document.addEventListener("scroll", e => {
      const el = e.target;
      if (isWin(el)) box = null;
      else if (el.scrollHeight > el.clientHeight + 40 && el.clientHeight > window.innerHeight * 0.5) box = el;
      queue();
    }, { capture: true, passive: true });
    window.addEventListener("resize", queue);
    new MutationObserver(queue).observe(document.body, { childList: true });
    update();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
