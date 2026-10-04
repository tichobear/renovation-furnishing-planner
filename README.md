# Renovation & Furnishing Planner

A lightweight, local-first web app for managing home renovation costs, comparing shopping options, and testing furnishing scenarios.

## Run locally

Serve the `dist` folder with any static web server, then open the local URL in a browser. For example, with Node.js installed:

```powershell
node scripts/preview.mjs
```

Then open `http://127.0.0.1:4173`.

To reproduce the GitHub Pages repository-subfolder URL locally, run:

```powershell
node scripts/preview.mjs --base=/renovation-furnishing-planner/
```

Then open `http://127.0.0.1:4173/renovation-furnishing-planner/`.

Data is stored in the browser's local storage, so each browser/device keeps its own copy.

Use **Settings → Export / Backup** to download Excel-friendly CSV files, export a complete dated JSON backup, or restore a backup after reviewing the replacement warning.

## Install the app

- **Android:** Open the published site in Chrome, open the browser menu, then choose **Install app** or **Add to Home screen**.
- **iPhone or iPad:** Open the published site in Safari, tap **Share**, choose **Add to Home Screen**, then tap **Add**.

Open the app online once after an update so its latest files are cached. After that, the planner interface and data already saved on that device remain available offline.

## Deploy to GitHub Pages

The included GitHub Actions workflow publishes only the ready-to-serve `dist` folder. Relative app, manifest, icon, and service-worker paths allow the PWA to run from a project URL such as `https://YOUR-USERNAME.github.io/renovation-furnishing-planner/`.

### 1. Back up data from the current site

Browser storage belongs to a specific website address and will not automatically move to the new GitHub Pages address. In the current planner, open **Settings → Export / Backup** and click **Export All Data**. Keep the downloaded JSON file so you can restore it after deployment.

### 2. Create the repository

1. Sign in to GitHub and open [Create a new repository](https://github.com/new).
2. Use `renovation-furnishing-planner` as the repository name.
3. Choose **Public** for a publicly accessible site.
4. Leave the README, `.gitignore`, and license initialization options unchecked, then create the repository.

### 3. Commit and push this project

Open PowerShell in this project's root folder and run the commands below. Replace `YOUR-USERNAME` with your GitHub username.

```powershell
git init
git add .
git commit -m "Prepare planner for GitHub Pages"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/renovation-furnishing-planner.git
git push -u origin main
```

If this folder already has an `origin` remote, replace the `git remote add` command with:

```powershell
git remote set-url origin https://github.com/YOUR-USERNAME/renovation-furnishing-planner.git
```

### 4. Enable Pages

1. On GitHub, open the repository and choose **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open the repository's **Actions** tab and wait for **Deploy planner to GitHub Pages** to finish with a green check. Pushing to `main` starts this workflow automatically; it can also be run manually.

### 5. Open, restore, and install the planner

Your project-site address will normally be:

```text
https://YOUR-USERNAME.github.io/renovation-furnishing-planner/
```

The exact address also appears in **Settings → Pages** and in the completed deployment. Open it once while online, then use **Settings → Export / Backup** to import the JSON backup from step 1. Confirm the replacement only after checking the selected backup summary.

Finally, install the PWA using Chrome's **Install app / Add to Home screen** option on Android or Safari's **Share → Add to Home Screen** option on iPhone or iPad.

Every later push to `main` redeploys the site. After a deployment, open the installed app while online once so the updated offline cache can activate.

## Structure

- `dist/index.html` — application layout, navigation, forms, and dialogs
- `dist/styles.css` — warm responsive visual system and component styles
- `dist/app.js` — sample data, calculations, persistence, and interactions
- `dist/portability.js` — CSV generation plus JSON backup validation and restore helpers
- `dist/manifest.webmanifest` — install metadata and app icon declarations
- `dist/service-worker.js` — offline app-shell caching and update handling
- `dist/pwa.js` — service-worker registration and connection messages
- `dist/icons/` — Android, maskable, and Apple home-screen icons
- `.github/workflows/deploy-pages.yml` — GitHub Pages deployment workflow
- `scripts/preview.mjs` — dependency-free local server with repository-subfolder simulation
- `.openai/hosting.json` — static hosting configuration
