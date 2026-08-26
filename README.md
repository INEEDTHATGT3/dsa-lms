# DSA Layered Study System — Web App

React + Vite SPA consuming 76 layered lesson JSONs (19 modules × 4 difficulty tiers).

**Live:** `https://<user>.github.io/dsa-lms/` (after first push)

## Local dev
```bash
npm install
npm run dev        # http://localhost:5173
```

## Deploy
Push to `main` → GitHub Actions validates content, builds, deploys Pages.
(Enable Pages once: repo Settings → Pages → Source: GitHub Actions.)

## Content updates
Content lives in the authoring workspace (`content/` + `renderer/`).
After editing lessons there:
```bash
node renderer/lint.js              # gate
node renderer/sync-content.mjs     # copy into this repo
git add src/content && git commit && git push
```
CI re-validates before shipping.

## Progress
Stored per-device in localStorage (`dsa_progress_v1`). Cross-device sync planned post-v1.
