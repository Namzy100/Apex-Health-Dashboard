# Apex

Personal fitness and lifestyle OS — calorie tracking, weight logging, workout plans, AI-powered cooking, and daily insights. Built with React + Vite, styled with Tailwind CSS v4, backed by an Express API server.

---

## Stack

- **Frontend** — React 18, Vite, Tailwind CSS v4, Framer Motion, Recharts
- **Backend** — Express.js (API key status, server-side secrets)
- **AI** — OpenAI GPT-4o-mini (recipe generation, Focus Mode quotes)
- **Food APIs** — USDA FoodData Central, Spoonacular, Nutritionix
- **PWA** — vite-plugin-pwa, Workbox service worker
- **iOS** — Capacitor-ready (config included, native migration not yet done)

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd cut-os
npm install
```

### 2. Environment variables

Create `.env.local` in the project root (never commit this file):

```env
# Food APIs (exposed to browser via Vite)
VITE_USDA_API_KEY=your_usda_key
VITE_SPOONACULAR_API_KEY=your_spoonacular_key
VITE_NUTRITIONIX_APP_ID=your_nutritionix_app_id
VITE_NUTRITIONIX_API_KEY=your_nutritionix_key

# OpenAI — server-side only, never prefixed with VITE_
OPENAI_API_KEY=your_openai_key
```

**API key notes:**
- `OPENAI_API_KEY` is intentionally **not** prefixed with `VITE_`. Vite will not bundle it into the browser build. It is read only by the Express server.
- The Settings page fetches `/api/status` from the Express server to show which services are connected — the key values themselves are never sent to the browser.
- USDA keys are free at [fdc.nal.usda.gov](https://fdc.nal.usda.gov/api-guide.html).
- Spoonacular free tier at [spoonacular.com/food-api](https://spoonacular.com/food-api).
- Nutritionix free tier at [developer.nutritionix.com](https://developer.nutritionix.com).
- OpenAI at [platform.openai.com](https://platform.openai.com).

---

## Running locally

You need **two terminals** — the Vite dev server and the Express API server.

### Terminal 1 — Frontend

```bash
npm run dev
```

Opens at `http://localhost:5173`. Hot-reloads on save.

### Terminal 2 — API server

```bash
npm run server
```

Runs Express at `http://localhost:3001`. Vite proxies `/api/*` requests to it automatically during development.

If you skip the API server, the Settings page falls back gracefully: USDA/Spoonacular/Nutritionix status will be inferred from the `VITE_` env vars, and OpenAI will show as "unknown."

---

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Includes a Workbox service worker for offline support.

To preview the production build locally:

```bash
npm run preview
```

---

## Deployment

The frontend (`dist/`) can be deployed to any static host (Vercel, Netlify, Cloudflare Pages).

The Express server (`server/index.js`) must be deployed separately to a Node host (Railway, Fly.io, Render, etc.) so OpenAI calls remain server-side.

**Environment variables on the host:**
- Set all the same vars from `.env.local` in your host's dashboard.
- Update the Vite proxy target in `vite.config.js` (or set `VITE_API_URL`) to point to your deployed server URL in production.

---

## Installing as a PWA

On iPhone (Safari):
1. Open the app URL in Safari.
2. Tap the Share button → **Add to Home Screen**.
3. Tap **Add**. The app icon appears on your home screen.
4. Launch from the home screen — it runs fullscreen with safe-area insets handled.

On Android (Chrome):
1. Open the app URL in Chrome.
2. Tap the three-dot menu → **Add to Home screen** (or the install banner if it appears).

---

## iOS native app (future)

Capacitor is configured (`capacitor.config.json`). When ready to go native:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init
npx cap add ios
npm run build
npx cap copy ios
npx cap open ios
```

App ID: `com.naman.apex`

---

## Data persistence

All user data is stored in `localStorage` under the key `apex.data`. No account or server required. Export/import from the Settings page.

---

## Unit system

Apex stores all values in canonical imperial units (lbs, oz, miles, inches) internally. The metric/imperial toggle in Settings is display-only — switching units never modifies stored data. Conversion happens at render time via `src/utils/unitConversions.js`.
