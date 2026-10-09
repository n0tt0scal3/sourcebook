# Sourcebook

Sourcing lookbook, finish and furniture schedules, ordering schedule and quotations, from design to construction. One book per project, with a projects dashboard as the home page.

This folder is a complete, self-hosted version of the Sourcebook built in Claude. It runs on Render (or any server with Node 20+) and has no third-party dependencies.

- `server.js`: the web server. It stores project data, uploaded files and drawings, and forwards image and drawing reading to Claude through your Anthropic API key.
- `public/dashboard.html`: the projects dashboard (home page).
- `public/index.html`: the project book (opened at `/p/<project>`).
- `public/claude-shim.js`: connects the book to this server.
- `seed/`: your projects (Acornhouse and Spoletto) with their images and drawings, exported from Claude on 30 Sep 2026. They're imported automatically the first time the server starts with an empty disk.
- `render.yaml`: tells Render how to run it.

---

## Deploy to Render

### 1. Put this folder on GitHub

Render deploys from a Git repository.

1. Unzip `sourcebook-render.zip` and open the `sourcebook-render` folder.
2. In your empty `sourcebook` repository on github.com, click **uploading an existing file** (or **Add file → Upload files**).
3. Select everything inside the folder (`public`, `seed`, `server.js`, `package.json`, `render.yaml`, `README.md`) and drag it all onto the GitHub page at once. Use Chrome, Edge or Safari, and drag the folders themselves so their structure is kept.
4. Wait until every file is listed (65 in total), then click **Commit changes**.
5. Check the repository: you should see `public/`, `seed/`, `server.js`, `package.json` and `render.yaml` at the top level, not inside another `sourcebook-render` folder.

`.gitignore` is hidden on Mac and is optional; it's fine if it doesn't upload.

### 2. Get an Anthropic API key

This is what lets "Detect materials" and "Read details" work on your own server.

1. Go to console.anthropic.com, sign in, and add billing.
2. Open **API keys → Create key**, name it `sourcebook`, and copy the key (it starts with `sk-ant-`).

Usage is billed per request to that account. Reading one image or drawing typically costs a few cents.

### 3. Create the service on Render

1. Sign in at render.com (you can sign in with GitHub).
2. Click **New → Blueprint**, connect your GitHub account if asked, and pick the `sourcebook` repository.
3. Render reads `render.yaml` and shows one web service, **sourcebook**, with a 5 GB disk. It asks for two values:
   - `APP_PASSWORD`: the password you'll use to open the site. Choose something strong.
   - `ANTHROPIC_API_KEY`: the key from step 2.
4. Click **Apply**. The first deploy takes a minute or two.

Cost: the service uses Render's smallest paid instance ($7/month) plus the 5 GB disk ($0.25/GB/month, about $1.25). The free tier can't be used, because it has no persistent disk and your data would be wiped on every restart.

### 4. Open it

1. When the deploy shows **Live**, open the address at the top of the service page (something like `https://sourcebook-xxxx.onrender.com`).
2. A Sourcebook sign-in page appears. Enter your `APP_PASSWORD`. You stay signed in on that device for a year; **Sign out** is on the dashboard.
3. The dashboard shows **Acornhouse** and **Spoletto** with their pieces, images and drawings. Open each and check a few items.

**iPad and iPhone:** open the address in Safari, tap **Share → Add to Home Screen**, and it opens full-screen like an app.

### 5. Optional: your own domain

In the service's **Settings → Custom Domains**, add something like `sourcebook.yourstudio.com`, then add the DNS record Render shows you at your domain registrar. HTTPS is set up automatically.

---

## Everyday use

- **New project:** use **New project** on the dashboard. Each project gets its own address, e.g. `/p/harbour-loft-73nm`, which you can bookmark.
- **Archive or delete:** use the ⋯ on a project card. Archived projects move to the Archived filter. Delete asks for confirmation and can't be undone.
- **Admin portal** (`/admin`, admins only; linked from the dashboard and each project):
  - **People:** add someone with a name, an email and/or a WeChat ID (either can be used to sign in; tap the WeChat ID on their card to copy it), role and a generated password to share with them; edit their role; reset their password; sign them out on every device; disable or remove their account. Each person can change their own password from the dashboard.
  - **Project access:** a grid of projects and people. Tick who can open each project. Sourcing agents can be set to see every project (including new ones) or only the ones you tick.
  - **Roles:** Admin: everything, including people, deleting projects and backups. Sourcing agent: create, edit, import, upload, read drawings, archive. Client: only their projects; can view, approve or request changes, and comment. Internal notes and the order schedule are hidden from clients.
- **Studio password:** leaving the email / WeChat box blank and entering `APP_PASSWORD` always signs in as the owner (an admin). It's your way back in, so keep it private.

## Finding products online

Drop an image on **Add products or materials** (or open any piece and use **Find it online**). Claude searches the web for the product and shows up to four likely matches with their source. Pick one and Claude reads that product page and brings back its details (manufacturer, model, dimensions, finishes, price, lead time, spec sheet), which you tick to apply. You can also use the product photo from the site.

- Searches run on the server, so they finish even if you close the page. Cards show "Searching" and then "Matches ready".
- When you start a project from an image, tick **Find each piece online** to look up every detected piece.
- Each search uses Claude's web search on your Anthropic account: roughly 10–20¢ per piece. Web search must be allowed for the account (it is by default; see Settings → Capabilities in the Anthropic Console).
- Prices are only filled in when listed in CAD or CNY; other currencies are noted as a spec line. Always confirm prices and lead times with the supplier.

You can also drop PDFs and images straight onto a piece's **Drawings & references** section to attach them; Claude reads the first one.

## Sourcing library

Images scanned from the supplier catalogues in `G:\My Drive\LMNL\90 CHINA PRODUCTS\` (Furniture so far: 7 catalogues, 3,218 images). Each image is named `CATEGORY_Supplier_pPAGE_NN.jpg` and keeps its source PDF and page.

- **Approve** on the dashboard's **Sourcing library** tab (admins only): tick images to approve them, one at a time, a whole page, or everything shown. Nothing is shown to anyone else until it's approved. Approvals are studio-wide and saved on the server as `library/<catalogue>` = `{ on: [approved keys] }`, where key = page × 100 + image number.
- **Use** it from the dashboard tab or a project's **Sourcing library** tab. Everyone, clients included, sees approved images and can add one to a project they can open. The server builds the piece (photo, product code, the source PDF as a spec sheet and a `libSource` field) and refuses images that aren't approved. Clients don't see the internal Drive folder paths.
- **Full-size images**: the thumbnails come from `lib/sprites/` (280 px). An admin can upload the catalogue zips from Drive (`_IMAGE LIBRARY\FURNITURE\…zip`) with **Upload zips** on the dashboard's Sourcing library tab. The browser unzips them, matches images by file name, scales anything over 2400 px down, and saves them on the data disk in `lib-full/`. Opening an image then shows the full-size version (click it for full screen), and pieces added from it get a 1600 px photo. Images without a full-size copy fall back to the thumbnail. They aren't part of `/api/export`; re-upload the zips if the disk is ever replaced.
- **Add a catalogue from a PDF** (admins, dashboard Sourcing library tab): choose the PDF (or drag it onto the form or the link that opens it) and how to add it: **Scan for product images** (below) or **Import page by page**, where every page becomes one image (up to 2400 px) with that page's text and codes; the supplier, an optional catalogue name, the category and optionally the PDF's Google Drive link. The browser reads the PDF with pdf.js (vendored in `pdfjs/`), takes out the photos embedded on each page (at least 160 px, skipping blank fills, repeats and anything on three or more pages, such as logos), and uploads each full size (up to 2400 px) with a 280 px thumbnail. Images are named `CATEGORY_Supplier-Catalogue_pPAGE_NN.jpg` and start unapproved. The page's text and product codes are kept with each image. Stored on the data disk: `lib-cats/<catalogue>.json` and `.pdf`, `lib-thumbs/`, `lib-full/`. The source PDF is the spec sheet for pieces added from it (or the Drive link, if given). Limits: 300 MB and 2,000 pages per PDF. Catalogues added this way can be deleted from their tab; the scanned catalogues in `lib/` can't.
- **Product types**: the tab opens on product-type tiles (Sofas, Lounge chairs, Dining chairs, Stools & bar stools, Benches & ottomans, Coffee & side tables, Dining tables, Desks & consoles, Storage & TV units, Beds & nightstands, Lighting, Plumbing fixtures, Vanities, Mirrors, Millwork, Doors, Stone, Flooring, Wall panelling & wood, Partition systems, Glass products, Signage, Decor & accessories, Other, Not sorted yet), each with its count and a cover. Clicking one shows its images, with chips to narrow it to one catalogue. The scanned catalogues were sorted once into `lib/types.json` (`{ file: letter }`). PDF catalogues in Lighting, Plumbing fixtures, Vanities, Mirrors, Millwork, Doors, Stone, Flooring, Wall panelling, Wood products, Partition systems, Glass products and Signage take their category's type; Furniture PDFs are sorted by Claude (`ANTHROPIC_MODEL_QUICK`, 20 thumbnails per request) after the scan, and on each server start for any images still unsorted. Without a working API key they stay in **Not sorted yet**. An admin can move any image to another type from its card, or inside any product type tick several (top-left box) and pick a type from **Move selected to…** (stored as `librarytypes/<catalogue>` = `{ t: { key: letter } }`, which wins over the automatic type).
- **Favourites**: everyone, clients included, can star an image (the ☆ under each image, or the button in its card). Each person's stars are their own, saved on the server as `libraryfav/<user id>` = `{ f: [file names] }` (`GET`/`POST /api/library/fav`), and shown in the **★ Favourites** tile before the product types. Clients only see their favourites that are still approved.
- Files: `library.js` (the tab, shared by dashboard and projects), `lib/data.json` (index), `lib/types.json` (types) and `lib/sprites/` (thumbnail sheets).

### Have something you want? and TBS (to be sourced)

The box at the top of the Sourcing library takes a photo (drop it, paste it, or choose it). Claude works out what kind of product it is, compares the photo with the images in that type that the person can see (clients only search approved images) and shows the most similar ones. If nothing is similar, the photo is added to **TBS (to be sourced)**; if there are matches but none is right, "None of these?" adds it too. Each search costs a few cents of Claude usage.

TBS is a tile among the product types. New items wait there **to review**: admins get an alert in the app (a count on the Sourcing library tab, a toast, and a browser notification if alerts are on) and, with email set up, an email. An admin then presses **Send to the sourcing agent**, which emails the agent's QQ Mail address with the photo attached and a link back to the item, and shows it to sourcing agents in Sourcebook. The agent (or an admin) adds where it was found and marks it **sourced**; the person who asked sees that note. Sourcing agents only see items sent to them; clients only see their own. Inside a product type, more images load as you scroll, and **Back to all product types** in the bar returns to the tiles.

Email (Render → Environment): `SMTP_HOST`, `SMTP_PORT` (465 for SSL or 587), `SMTP_USER`, `SMTP_PASS` (the mailbox's app password or QQ Mail authorization code, not its sign-in password), optional `MAIL_FROM`, and optional `TBS_NOTIFY_EMAIL` (who hears about new TBS items; otherwise admins with an email address). Without them, TBS still works inside Sourcebook.

## Editing the project book

`index.html` is generated. Edit `tools/sourcebook.html`, then run `python3 tools/build_render.py`, which writes `index.html` (adding the head, the server shim and `library.js`) and makes Google Fonts non-blocking. Add a Chinese translation for every new string (`ZH` or `ZH_PAT` in `tools/sourcebook.html`, `T` in `dashboard.html`). The `tools/` folder isn't served.

## Product sheets and packages

Every product has two buttons at the top of its sheet:

- **Save PDF** downloads a one-page (or longer) product sheet: photo, code, manufacturer, model, dimensions, finishes, prices in CAD and CNY, specification, references, client review and notes. It follows the language you're viewing in.
- **Download package** downloads a ZIP with that product sheet PDF plus the attached drawings and spec sheets, the photo, any 3D model, and a list of web links.

Both are made in the browser, so they work without any outside service (including in China).

## 3D models

Each product can hold a 3D model that anyone can turn and zoom, with a "View in your room" button on phones and iPads.

- **Format:** GLB (glTF binary), which keeps geometry, materials and textures in one file. Up to 100 MB.
- **Rhino:** File → Export → `.glb`. Turn on "Map Rhino Z to glTF Y" and Draco compression.
- **SketchUp:** File → Export → 3D Model → GLTF Binary File (*.glb).
- **Revit:** needs an exporter add-in (for example Leia, DiRoots or SimLab glTF Exporter). Export only the element you need.
- **Optional USDZ:** for the best AR on iPhone and iPad, add a USDZ as well (SketchUp exports it directly).

## Backups

- `https://<your-address>/api/export` downloads every project's data as one JSON file. Do this regularly.
- Uploaded images and PDFs live on the Render disk. Render snapshots the disk automatically once every 24 hours and keeps each snapshot for at least seven days. You can restore one from the service's **Disks** page, but anything changed after that snapshot is lost.

## Updating the app later

Your data lives on the Render disk and the app's code lives in GitHub. An update only replaces code, so projects, images and drawings are never touched.

**The loop:**

1. **Ask for the change.** Describe it to Claude, e.g. "add a delivery-tracking tab". Claude updates the book and gives you the changed files, usually just `public/index.html`, sometimes also `server.js`, `public/claude-shim.js` or `public/dashboard.html`.
2. **Commit to GitHub.** In the repository, open the folder, choose **Add file → Upload files**, drop in the changed files (same names, same folders), and **Commit changes**. GitHub replaces the old versions.
3. **Render deploys automatically.** Each commit to the main branch starts a deploy. Watch it under the service's **Events** tab. It takes a minute or two, with a few seconds offline while the new version starts.
4. **Check it.** Reload the site (on iPad, pull to refresh or close and reopen the home-screen app).

**If something's wrong:** in Render, open **Events**, find the previous successful deploy and choose **Rollback**. The site goes back to that version while the fix is made. Data is unaffected either way.

**Faster option:** if you connect GitHub to Claude, Claude can commit the changes to the repository directly. Render then deploys on its own, and your part is just checking the site.

**Rules of thumb:**
- Never re-upload `seed/` after the first deploy. It's ignored once the disk has data, and it isn't needed.
- Download a backup from `/api/export` before a big change.
- Environment settings (password, API key) are changed in Render under **Environment**, not in GitHub. Changing one restarts the service.

## Settings (Render → Environment)

| Setting | What it does |
|---|---|
| `APP_PASSWORD` | Studio owner password (sign in with email left blank). Leaving it empty with no people set up makes the site public. Don't. |
| `ANTHROPIC_API_KEY` | Enables image detection and drawing reading. |
| `ANTHROPIC_MODEL` | Claude model used for reading images and drawings. Default `claude-sonnet-5`. |
| `DATA_DIR` | Where data is stored. Must stay on the disk's mount path. |

## Limits

- **Client prices are the quoted prices.** There's no separate supplier cost yet, so clients see the same unit prices as the quotation.
- **Password resets are done by an admin** in People. There's no email "forgot password" link.
- **One server instance.** Render disks attach to a single instance, so you can't scale out. This is fine for a studio's workload.
- **Brief downtime on each deploy.** Render stops the old instance before starting the new one when a disk is attached, so there are a few seconds of downtime.
- **Claude answers arrive all at once.** On this server they don't stream in, so detection shows its progress indicator until the whole answer is ready.

## Run it on your own computer

With Node 20+ installed:

```
APP_PASSWORD=test node server.js
```

Then open http://localhost:3000. Data is stored in a `data/` folder next to `server.js`.
