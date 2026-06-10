# Manga Harbor

A fast, modern web app to **browse, read, and download manga** from
[MangaDex](https://mangadex.org) — packaged as clean **CBZ** files. This is a
ground-up rewrite of the old React + Spring Boot app as a single
**Next.js 16** application.

## Why this architecture

- **One app, one deploy.** Next.js App Router serves both the UI and the API
  (Route Handlers), replacing the separate React frontend + Java backend.
- **Zero server storage.** The old server downloaded every image to disk,
  zipped it, streamed it, then deleted it. Here, the **CBZ is built in the
  browser** (`client-zip`) and saved straight to your disk — the server only
  proxies bytes. This scales to any number of users with no disk/cleanup.
- **MangaDex done right.** All MangaDex traffic (including image bytes) goes
  through server Route Handlers because MangaDex requires a non-spoofable
  `User-Agent` that browsers can't set. A real rate limiter respects the
  5 req/s global limit, the 40/min `/at-home` limit, and `429` backoff —
  unlike the old code's no-op throttle. Image URLs are fetched fresh before
  each read/download since the `@Home` base URL expires in ~15 minutes.

```
Browser (React) ──TanStack Query──▶ /api/* Route Handlers ──▶ api.mangadex.org
        │                                /api/image (stream, no disk) ──▶ MangaDex CDN
        ▼
  download queue ──fetch via /api/image──▶ client-zip ──▶ .cbz saved to disk
```

## Features

- Browse rails (popular / latest / top-rated) + genre filters + ⌘K search
- Manga detail pages with stats, description, and a volume/chapter list
- Built-in reader (paged + long-strip, keyboard nav, prefetch)
- Download queue with real per-page progress, pause / resume / cancel
- Library: favorites, download history, continue-reading (IndexedDB)

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · TanStack Query · Zustand ·
Dexie · client-zip · Radix UI · Vitest + MSW + Playwright.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

### Scripts

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Dev server (Turbopack)                        |
| `npm run build`     | Production build                              |
| `npm start`         | Run the production build                      |
| `npm test`          | Unit / component / route tests (Vitest + MSW) |
| `npm run test:e2e`  | End-to-end tests (Playwright)                 |
| `npm run lint`      | ESLint                                        |
| `npm run typecheck` | `tsc --noEmit`                                |

### Configuration

Set a descriptive MangaDex `User-Agent` (optional — a default is used):

```bash
# .env.local
MANGADEX_USER_AGENT="MangaHarbor/1.0 (+https://your-url; contact)"
```

## Notes

- Downloads use the File System Access API where available (a real "Save As"),
  falling back to a normal download elsewhere (Firefox/Safari).
- This app supersedes the legacy `../manga-harbor` (React/Vite) and
  `../manga-harbor-server` (Spring Boot) projects.
