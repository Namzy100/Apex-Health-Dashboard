import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  syncNow as _syncNow,
  pushLocalToGist as _push,
  pullGistToLocal as _pull,
  isGistConfigured,
  pushLocalToGist,
} from '../services/gistSync';

export const SYNC_STATUS = {
  IDLE:    'idle',
  SYNCING: 'syncing',
  SYNCED:  'synced',
  ERROR:   'error',
  OFFLINE: 'offline',
};

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const [syncStatus, setSyncStatus] = useState(
    isGistConfigured() ? SYNC_STATUS.IDLE : SYNC_STATUS.IDLE,
  );
  const [lastSynced, setLastSynced] = useState(() => {
    try { return localStorage.getItem('apex.lastSynced') || null; } catch { return null; }
  });
  const [syncError, setSyncError]   = useState(null);
  const [configured, setConfigured] = useState(isGistConfigured);

  const debounceRef = useRef(null);

  // ── Core sync ────────────────────────────────────────────────────────────────

  const doSync = useCallback(async ({ silent = false } = {}) => {
    if (!isGistConfigured()) return { skipped: true };

    setSyncStatus(SYNC_STATUS.SYNCING);
    setSyncError(null);

    try {
      const result = await _syncNow();

      if (result.offline) {
        setSyncStatus(SYNC_STATUS.OFFLINE);
        return result;
      }
      if (result.skipped) {
        setSyncStatus(SYNC_STATUS.IDLE);
        return result;
      }

      const now = result.lastSynced || new Date().toISOString();
      setLastSynced(now);
      setSyncStatus(SYNC_STATUS.SYNCED);

      // Cloud won — data was written to localStorage; reload to apply in React
      if (result.winner === 'cloud') {
        sessionStorage.setItem('apex.sync.reload', '1');
        setTimeout(() => window.location.reload(), 600);
      }

      return result;
    } catch (err) {
      setSyncStatus(SYNC_STATUS.ERROR);
      setSyncError(err.message);
      return { error: err.message };
    }
  }, []);

  // ── Debounced push (called after local store changes) ─────────────────────

  const scheduleSave = useCallback(() => {
    if (!isGistConfigured()) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await pushLocalToGist();
        const now = localStorage.getItem('apex.lastSynced');
        setLastSynced(now);
        setSyncStatus(SYNC_STATUS.SYNCED);
      } catch {
        // Silent — push failures don't interrupt UX
      }
    }, 3000);
  }, []);

  // ── On mount: sync (unless we just reloaded because of a cloud pull) ───────

  useEffect(() => {
    const justReloaded = sessionStorage.getItem('apex.sync.reload');
    if (justReloaded) {
      sessionStorage.removeItem('apex.sync.reload');
      setSyncStatus(SYNC_STATUS.SYNCED);
      const ts = localStorage.getItem('apex.lastSynced');
      if (ts) setLastSynced(ts);
      return;
    }

    doSync({ silent: true });
  }, [doSync]);

  // ── Sync when tab regains focus ───────────────────────────────────────────

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') doSync({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(debounceRef.current);
    };
  }, [doSync]);

  // ── Manual ops ───────────────────────────────────────────────────────────

  const syncNow = useCallback(async () => {
    return doSync();
  }, [doSync]);

  const pushNow = useCallback(async () => {
    setSyncStatus(SYNC_STATUS.SYNCING);
    setSyncError(null);
    try {
      const now = await _push();
      setLastSynced(now);
      setSyncStatus(SYNC_STATUS.SYNCED);
    } catch (err) {
      setSyncStatus(SYNC_STATUS.ERROR);
      setSyncError(err.message);
      throw err;
    }
  }, []);

  const pullNow = useCallback(async () => {
    setSyncStatus(SYNC_STATUS.SYNCING);
    setSyncError(null);
    try {
      const now = await _pull();
      setLastSynced(now);
      setSyncStatus(SYNC_STATUS.SYNCED);
      // Pull always replaces local — reload to reflect in React
      sessionStorage.setItem('apex.sync.reload', '1');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setSyncStatus(SYNC_STATUS.ERROR);
      setSyncError(err.message);
      throw err;
    }
  }, []);

  const refreshConfigured = useCallback(() => {
    setConfigured(isGistConfigured());
  }, []);

  return (
    <SyncContext.Provider value={{
      syncStatus,
      lastSynced,
      syncError,
      configured,
      syncNow,
      pushNow,
      pullNow,
      scheduleSave,
      refreshConfigured,
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSyncContext must be used inside <SyncProvider>');
  return ctx;
}
