/**
 * GitHub Gist sync — single-user, no backend, no auth server.
 * Stores ONE file "apex-data.json" in a private Gist.
 * Token + Gist ID live only in localStorage, never leave the browser.
 */
import { readStore, writeStore } from '../store/apexStore.js';

const TOKEN_KEY      = 'apex.gist.token';
const GIST_ID_KEY    = 'apex.gist.id';
const LAST_SYNC_KEY  = 'apex.lastSynced';
const BACKUP_KEY     = 'apex.backup.conflict';
const FILE_NAME      = 'apex-data.json';
const GITHUB_API     = 'https://api.github.com';

// ── Config ────────────────────────────────────────────────────────────────────

export function getGistConfig() {
  try {
    return {
      token:  localStorage.getItem(TOKEN_KEY)   || '',
      gistId: localStorage.getItem(GIST_ID_KEY) || '',
    };
  } catch {
    return { token: '', gistId: '' };
  }
}

export function saveGistConfig(token, gistId) {
  localStorage.setItem(TOKEN_KEY,   token.trim());
  localStorage.setItem(GIST_ID_KEY, gistId.trim());
}

export function isGistConfigured() {
  const { token, gistId } = getGistConfig();
  return Boolean(token && gistId);
}

// ── GitHub API helpers ────────────────────────────────────────────────────────

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept:        'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

// ── Test connection ───────────────────────────────────────────────────────────

export async function testGistConnection() {
  const { token, gistId } = getGistConfig();
  if (!token || !gistId) return { ok: false, error: 'Token and Gist ID required' };

  try {
    const res = await fetch(`${GITHUB_API}/gists/${gistId}`, {
      headers: ghHeaders(token),
    });
    if (res.status === 401) return { ok: false, error: 'Invalid token — check permissions' };
    if (res.status === 404) return { ok: false, error: 'Gist not found — check Gist ID' };
    if (!res.ok)           return { ok: false, error: `GitHub error ${res.status}` };

    const data = await res.json();
    const hasFile = Boolean(data.files?.[FILE_NAME]);
    return {
      ok: true,
      hasFile,
      description: data.description || '(no description)',
      isPublic: data.public,
    };
  } catch {
    return { ok: false, error: 'Network error — check connection' };
  }
}

// ── Load from Gist ────────────────────────────────────────────────────────────

export async function loadCloudData() {
  const { token, gistId } = getGistConfig();
  if (!token || !gistId) return null;

  const res = await fetch(`${GITHUB_API}/gists/${gistId}`, {
    headers: ghHeaders(token),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);

  const gist = await res.json();
  const file = gist.files?.[FILE_NAME];
  if (!file) return null;

  // Large gists: content may be truncated — fetch raw URL
  const content = file.truncated
    ? await (await fetch(file.raw_url, { headers: { Authorization: `Bearer ${token}` } })).text()
    : file.content;

  return JSON.parse(content);
}

// ── Save to Gist ──────────────────────────────────────────────────────────────

export async function saveCloudData(apexData) {
  const { token, gistId } = getGistConfig();
  if (!token || !gistId) throw new Error('Gist not configured');

  const res = await fetch(`${GITHUB_API}/gists/${gistId}`, {
    method:  'PATCH',
    headers: ghHeaders(token),
    body:    JSON.stringify({
      files: { [FILE_NAME]: { content: JSON.stringify(apexData, null, 2) } },
    }),
  });
  if (!res.ok) throw new Error(`GitHub PATCH failed: ${res.status}`);
}

// ── Conflict resolution ───────────────────────────────────────────────────────

function toMs(ts) {
  if (!ts) return 0;
  const t = new Date(ts).getTime();
  return isNaN(t) ? 0 : t;
}

export function mergeApexData(local, cloud) {
  const localTs = toMs(local?._meta?.lastUpdatedAt);
  const cloudTs = toMs(cloud?._meta?.lastUpdatedAt);

  if (localTs >= cloudTs) {
    // Local wins — stash cloud as backup (don't lose it)
    if (cloud) {
      try {
        localStorage.setItem(BACKUP_KEY, JSON.stringify({
          data: cloud, savedAt: new Date().toISOString(), winner: 'local',
        }));
      } catch {}
    }
    return { winner: 'local', data: local };
  }

  // Cloud wins — stash local as backup
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({
      data: local, savedAt: new Date().toISOString(), winner: 'cloud',
    }));
  } catch {}
  return { winner: 'cloud', data: cloud };
}

// ── Push local → Gist (force) ─────────────────────────────────────────────────

export async function pushLocalToGist() {
  const local = readStore();
  if (!local) throw new Error('No local data to push');

  await saveCloudData(local);

  const now = new Date().toISOString();
  localStorage.setItem(LAST_SYNC_KEY, now);
  return now;
}

// ── Pull Gist → local (force, then reload) ────────────────────────────────────

export async function pullGistToLocal() {

  const cloud = await loadCloudData();
  if (!cloud) throw new Error('No data found in Gist');

  // Backup local before overwrite
  const local = readStore();
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({
      data: local, savedAt: new Date().toISOString(), winner: 'cloud',
    }));
  } catch {}

  writeStore(cloud);

  const now = new Date().toISOString();
  localStorage.setItem(LAST_SYNC_KEY, now);
  // Signal that a fresh-from-cloud reload is about to happen
  sessionStorage.setItem('apex.sync.reload', '1');
  return now;
}

// ── Bidirectional sync (smart merge) ─────────────────────────────────────────

export async function syncNow() {
  if (!isGistConfigured()) return { skipped: true };

  const local = readStore();

  let cloud;
  try {
    cloud = await loadCloudData();
  } catch {
    // Network/GitHub unavailable — stay local, never throw
    return { offline: true };
  }

  if (!cloud) {
    // First sync ever — push local up to create the file
    await saveCloudData(local);
    const now = new Date().toISOString();
    localStorage.setItem(LAST_SYNC_KEY, now);
    return { direction: 'upload', winner: 'local', lastSynced: now };
  }

  const { winner, data } = mergeApexData(local, cloud);

  if (winner === 'cloud') {
    // Apply cloud data locally, then re-push so both devices agree
    writeStore(data);
    try { await saveCloudData(data); } catch {}
  } else {
    // Push local up to cloud
    try { await saveCloudData(local); } catch {}
  }

  const now = new Date().toISOString();
  localStorage.setItem(LAST_SYNC_KEY, now);
  return { direction: winner === 'cloud' ? 'download' : 'upload', winner, lastSynced: now };
}
