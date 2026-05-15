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

### Vercel (frontend)

Deploy the frontend to Vercel normally (`vercel deploy` or connect the repo). Set these environment variables in the Vercel dashboard:

```
VITE_USDA_API_KEY          ← required for live USDA food search
VITE_SPOONACULAR_API_KEY   ← required for Spoonacular recipes
VITE_NUTRITIONIX_APP_ID    ← optional
VITE_NUTRITIONIX_API_KEY   ← optional
```

**Do NOT add `OPENAI_API_KEY` to Vercel frontend env vars** — it would be exposed in the browser bundle. OpenAI must go through the Express backend (see below).

**Important:** Vercel does **not** automatically run `server/index.js`. The Express server is a separate process and will not be available at `/api/*` when deployed to Vercel's static/serverless hosting. This means:

- Food search (USDA, Open Food Facts) works — those use `VITE_` keys in the browser.
- AI recipe builder and NL food logging will fall back to **local heuristics** on Vercel unless you deploy the backend separately.
- The Settings page will show a warning: "API server not running."

### Backend (for AI features on Vercel)

To enable OpenAI features in production, deploy the Express server separately:

**Option A — Railway / Fly.io / Render (recommended):**
```bash
# Deploy server/index.js as a Node app
# Set environment variables: OPENAI_API_KEY + all VITE_ keys
```

Then update `vite.config.js` proxy target to your deployed backend URL before building for production.

**Option B — Vercel Serverless Functions (future):**
Migrate `server/index.js` routes to `api/` directory as Vercel Functions (`.js` files). The existing Express routes map 1:1 to serverless function handlers.

### Graceful fallback

If the backend is unavailable (e.g. Vercel without a separate Express deployment):
- AI Log tab falls back to local keyword matching.
- Cook Something falls back to 4 hardcoded high-protein recipes.
- Settings shows "API server not running — AI backend not deployed. Local fallback active."
- All food tracking, weight logging, and charting continue to work fully offline.

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
