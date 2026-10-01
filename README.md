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
- **Sharing:** anyone with the address and password sees every project. See "Limits" for more.

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
| `APP_PASSWORD` | Password for the whole site. Leaving it empty makes the site public. Don't. |
| `ANTHROPIC_API_KEY` | Enables image detection and drawing reading. |
| `ANTHROPIC_MODEL` | Claude model used for reading images and drawings. Default `claude-sonnet-5`. |
| `DATA_DIR` | Where data is stored. Must stay on the disk's mount path. |

## Limits

- **One shared password, no individual accounts.** Everyone who signs in can see and change everything. Per-person logins would need a proper login system.
- **One server instance.** Render disks attach to a single instance, so you can't scale out. This is fine for a studio's workload.
- **Brief downtime on each deploy.** Render stops the old instance before starting the new one when a disk is attached, so there are a few seconds of downtime.
- **Claude answers arrive all at once.** On this server they don't stream in, so detection shows its progress indicator until the whole answer is ready.

## Run it on your own computer

With Node 20+ installed:

```
APP_PASSWORD=test node server.js
```

Then open http://localhost:3000. Data is stored in a `data/` folder next to `server.js`.
