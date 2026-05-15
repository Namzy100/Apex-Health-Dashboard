import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

// Load .env.local too — Vite uses it, Node doesn't by default
const __dir = dirname(fileURLToPath(import.meta.url));
const envLocal = resolve(__dir, '..', '.env.local');
try {
  const raw = readFileSync(envLocal, 'utf-8');
  for (const line of raw.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
} catch {}

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json());

// ── /api/status ─────────────────────────────────────────────────────────────
// Returns which API keys are configured server-side.
// OpenAI key is NEVER exposed to the client — only its presence is reported.
app.get('/api/status', (_req, res) => {
  res.json({
    usda:        process.env.VITE_USDA_API_KEY        ? 'connected' : 'missing',
    spoonacular: process.env.VITE_SPOONACULAR_API_KEY ? 'connected' : 'missing',
    openai:      process.env.OPENAI_API_KEY            ? 'connected' : 'missing',
    nutritionix: process.env.VITE_NUTRITIONIX_API_KEY ? 'connected' : 'missing',
  });
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => console.log(`Apex API server listening on :${PORT}`));
