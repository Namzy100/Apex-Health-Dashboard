import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, User, Target, Database, Download,
  Trash2, Save, CheckCircle, BarChart2, RefreshCw, FileJson,
  Smartphone, Globe, Loader2, ToggleLeft, ToggleRight, FlaskConical,
  Cloud, CloudOff, Eye, EyeOff, Upload, ArrowDownToLine, AlertTriangle, Link,
} from 'lucide-react';
import { useApexStore, exportStoreAsJSON, exportWeightCSV, resetStore } from '../store/apexStore';
import { useToast } from '../components/Toast';
import { searchAllFoods, getSourceAvailability } from '../services/foodSearch';
import { packagedFoods } from '../data/samplePackagedFoods';
import { restaurantFoods } from '../data/sampleRestaurantFoods';
import { lbsToKg, kgToLbs, inchesToCm, cmToInches } from '../utils/unitConversions';
import { useSyncContext, SYNC_STATUS } from '../contexts/SyncContext';
import { getGistConfig, saveGistConfig, testGistConnection } from '../services/gistSync';

const IS_DEV = import.meta.env.DEV;

function SectionHeader({ icon: Icon, title, color = '#f59e0b' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon size={14} style={{ color }} />
      </div>
      <h2 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>{title}</h2>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', unit, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#57534e' }}>{label}</label>
      <div className="flex items-center gap-2">
        <input type={type} value={value ?? ''}
          onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f4f2' }} />
        {unit && <span className="text-xs flex-shrink-0 font-medium" style={{ color: '#57534e' }}>{unit}</span>}
      </div>
      {hint && <p className="text-xs mt-1" style={{ color: '#3d3a36' }}>{hint}</p>}
    </div>
  );
}

function Card({ children, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
      className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {children}
    </motion.div>
  );
}

// Frontend-keyed sources read import.meta.env directly (consistent with FoodDatabaseCard).
// OpenAI is server-only — status comes from /api/status.
const API_LABELS = {
  usda:          { label: 'USDA FoodData Central', desc: 'VITE_USDA_API_KEY · fdc.nal.usda.gov',       serverOnly: false },
  openfoodfacts: { label: 'Open Food Facts',        desc: 'Always available — no key required',          serverOnly: false },
  spoonacular:   { label: 'Spoonacular',            desc: 'VITE_SPOONACULAR_API_KEY · recipe search',   serverOnly: false },
  nutritionix:   { label: 'Nutritionix',            desc: 'VITE_NUTRITIONIX_API_KEY · restaurant foods', serverOnly: false },
  openai:        { label: 'OpenAI',                 desc: 'OPENAI_API_KEY (server-only) · AI features',  serverOnly: true  },
};

function ApiStatusRow({ key: _k, name, status, meta }) {
  const isConnected = status === 'connected';
  const isLoading   = status === 'loading';
  const isError     = status === 'error';
  return (
    <div className="flex items-center justify-between p-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium" style={{ color: '#a8a29e' }}>{meta.label}</p>
          {meta.serverOnly && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>server-only</span>
          )}
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: '#3d3a36' }}>{meta.desc}</p>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0 ml-3"
        style={{
          background: isConnected ? 'rgba(16,185,129,0.1)' : isError ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isConnected ? 'rgba(16,185,129,0.2)' : isError ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)'}`,
        }}>
        {isLoading
          ? <Loader2 size={10} className="animate-spin" style={{ color: '#57534e' }} />
          : <div className="w-1.5 h-1.5 rounded-full"
              style={{ background: isConnected ? '#10b981' : isError ? '#ef4444' : '#57534e' }} />}
        <span className="text-xs" style={{ color: isConnected ? '#10b981' : isError ? '#ef4444' : '#57534e' }}>
          {isLoading ? 'Checking…' : isConnected ? 'Connected' : isError ? 'Error' : 'Not set'}
        </span>
      </div>
    </div>
  );
}

function FoodDatabaseCard() {
  const [testResults, setTestResults] = useState(null);
  const [testing, setTesting]         = useState(false);
  const avail = getSourceAvailability();
  const localCount = packagedFoods.length + restaurantFoods.length;

  const runTest = async () => {
    setTesting(true);
    setTestResults(null);
    const counts = {};
    const all = await searchAllFoods('coffee', {
      savedMeals: [], recentFoods: [], remote: true,
      onProgress: () => {},
    });
    all.forEach(f => { counts[f.source] = (counts[f.source] || 0) + 1; });
    setTestResults({ counts, total: all.length });
    setTesting(false);
  };

  const sourceRows = [
    { key: 'local',         label: 'Local Database',       available: true,             note: `${localCount} foods` },
    { key: 'usda',          label: 'USDA FoodData Central', available: avail.usda,       note: avail.usda ? 'Key set' : 'Set VITE_USDA_API_KEY' },
    { key: 'openfoodfacts', label: 'Open Food Facts',       available: true,             note: 'No key needed' },
    { key: 'spoonacular',   label: 'Spoonacular',           available: avail.spoonacular, note: avail.spoonacular ? 'Key set' : 'Set VITE_SPOONACULAR_API_KEY' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.4 }}
      className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Database size={14} style={{ color: '#10b981' }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Food Database</h2>
        </div>
        <button onClick={runTest} disabled={testing}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all min-touch"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
          {testing ? <Loader2 size={11} className="animate-spin" /> : <FlaskConical size={11} />}
          Test Search
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {sourceRows.map(row => (
          <div key={row.key} className="flex items-center justify-between p-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: row.available ? '#10b981' : '#57534e' }} />
              <span className="text-xs" style={{ color: '#a8a29e' }}>{row.label}</span>
            </div>
            <span className="text-[10px]" style={{ color: row.available ? '#57534e' : '#3d3835' }}>{row.note}</span>
          </div>
        ))}
      </div>

      {testResults && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#f59e0b' }}>
            Search "coffee" → {testResults.total} results
          </p>
          {Object.entries(testResults.counts).map(([src, count]) => (
            <p key={src} className="text-[10px]" style={{ color: '#78716c' }}>
              {src}: {count} result{count !== 1 ? 's' : ''}
            </p>
          ))}
          {testResults.total === 0 && (
            <p className="text-[10px]" style={{ color: '#57534e' }}>No results — check API keys or try another query.</p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Cloud Sync Card (GitHub Gist) ─────────────────────────────────────────────

const STATUS_CFG = {
  [SYNC_STATUS.IDLE]:    { color: '#57534e', dot: '#57534e', label: 'Not synced' },
  [SYNC_STATUS.SYNCING]: { color: '#f59e0b', dot: '#f59e0b', label: 'Syncing…'  },
  [SYNC_STATUS.SYNCED]:  { color: '#10b981', dot: '#10b981', label: 'Synced'    },
  [SYNC_STATUS.ERROR]:   { color: '#ef4444', dot: '#ef4444', label: 'Error'     },
  [SYNC_STATUS.OFFLINE]: { color: '#78716c', dot: '#78716c', label: 'Offline'   },
};

function GistSyncCard() {
  const { syncStatus, lastSynced, syncError, configured, syncNow, pushNow, pullNow, refreshConfigured } = useSyncContext();
  const toast = useToast();

  const cfg = getGistConfig();
  const [token,  setToken]  = useState(cfg.token);
  const [gistId, setGistId] = useState(cfg.gistId);
  const [showToken, setShowToken] = useState(false);
  const [testing,   setTesting]   = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [activeOp,  setActiveOp]  = useState(null); // 'sync' | 'push' | 'pull'
  const [configDirty, setConfigDirty] = useState(false);

  const handleTokenChange  = v => { setToken(v);  setConfigDirty(true); setTestResult(null); };
  const handleGistIdChange = v => { setGistId(v); setConfigDirty(true); setTestResult(null); };

  const handleSaveConfig = () => {
    saveGistConfig(token, gistId);
    refreshConfigured();
    setConfigDirty(false);
    setTestResult(null);
    toast('Config saved', 'success');
  };

  const handleTest = async () => {
    if (configDirty) { toast('Save config first', 'info'); return; }
    setTesting(true);
    setTestResult(null);
    const res = await testGistConnection();
    setTestResult(res);
    setTesting(false);
  };

  const handleOp = async (name, fn) => {
    setActiveOp(name);
    try {
      await fn();
      const labels = { sync: 'Synced ✓', push: 'Pushed to Gist ✓', pull: 'Pulling from Gist — reloading…' };
      toast(labels[name] || 'Done', 'success');
    } catch (err) {
      toast(err.message || 'Sync failed', 'error');
    } finally {
      setActiveOp(null);
    }
  };

  const fmtTime = iso => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      + ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const sc = STATUS_CFG[syncStatus] || STATUS_CFG[SYNC_STATUS.IDLE];
  const busy = !!activeOp || syncStatus === SYNC_STATUS.SYNCING;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.4 }}
      className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
            {configured ? <Cloud size={14} style={{ color: '#818cf8' }} /> : <CloudOff size={14} style={{ color: '#57534e' }} />}
          </div>
          <h2 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Cloud Sync</h2>
        </div>
        {configured && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: `${sc.dot}18`, border: `1px solid ${sc.dot}30` }}>
            {syncStatus === SYNC_STATUS.SYNCING
              ? <Loader2 size={9} className="animate-spin" style={{ color: sc.dot }} />
              : <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />}
            <span className="text-xs" style={{ color: sc.color }}>{sc.label}</span>
          </div>
        )}
      </div>

      {/* Personal use warning */}
      <div className="flex items-start gap-2 p-3 rounded-xl mb-4"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
        <AlertTriangle size={12} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
        <p className="text-[10px] leading-relaxed" style={{ color: '#a8896e' }}>
          Personal use only. Token stored in this browser only. Never shared, never logged.
          Use a <strong>private</strong> Gist.
        </p>
      </div>

      {/* Config fields */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#57534e' }}>
            GitHub Personal Access Token
          </label>
          <div className="flex items-center gap-2">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => handleTokenChange(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="flex-1 px-3 py-2.5 rounded-xl text-xs font-mono outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f4f2' }}
            />
            <button onClick={() => setShowToken(v => !v)}
              className="flex-shrink-0 p-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#57534e' }}>
              {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <p className="text-[10px] mt-1" style={{ color: '#3d3a36' }}>
            Fine-grained token with Gist read+write scope
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#57534e' }}>Gist ID</label>
          <input
            type="text"
            value={gistId}
            onChange={e => handleGistIdChange(e.target.value)}
            placeholder="a1b2c3d4e5f6..."
            className="w-full px-3 py-2.5 rounded-xl text-xs font-mono outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f4f2' }}
          />
          <p className="text-[10px] mt-1" style={{ color: '#3d3a36' }}>
            From gist.github.com — the hash in the URL of your private Gist
          </p>
        </div>
      </div>

      {/* Save + Test row */}
      <div className="flex gap-2 mb-4">
        <button onClick={handleSaveConfig} disabled={!token || !gistId}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: configDirty ? 'linear-gradient(135deg, #6366f1, #818cf8)' : 'rgba(99,102,241,0.12)',
            color: configDirty ? '#fff' : '#818cf8',
            opacity: (!token || !gistId) ? 0.4 : 1,
          }}>
          <CheckCircle size={12} />Save Config
        </button>
        <button onClick={handleTest} disabled={testing || configDirty || !token || !gistId}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            color: '#a8a29e',
            border: '1px solid rgba(255,255,255,0.08)',
            opacity: (testing || configDirty || !token || !gistId) ? 0.4 : 1,
          }}>
          {testing ? <Loader2 size={12} className="animate-spin" /> : <Link size={12} />}
          Test Connection
        </button>
      </div>

      {/* Test result */}
      {testResult && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl"
          style={{
            background: testResult.ok ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
            border: `1px solid ${testResult.ok ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.15)'}`,
          }}>
          <p className="text-xs font-medium mb-1" style={{ color: testResult.ok ? '#10b981' : '#ef4444' }}>
            {testResult.ok ? '✓ Connected' : '✗ ' + testResult.error}
          </p>
          {testResult.ok && (
            <p className="text-[10px]" style={{ color: '#57534e' }}>
              {testResult.hasFile ? `apex-data.json found` : 'No apex-data.json yet — first Sync Now will create it'}
              {testResult.isPublic && <span style={{ color: '#f59e0b' }}> · Warning: Gist is public!</span>}
            </p>
          )}
        </motion.div>
      )}

      {/* Sync actions — only when configured */}
      {configured && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button onClick={() => handleOp('sync', syncNow)} disabled={busy}
              className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-[10px] font-medium transition-all"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.18)', opacity: busy ? 0.5 : 1 }}>
              {activeOp === 'sync' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Sync Now
            </button>
            <button onClick={() => handleOp('push', pushNow)} disabled={busy}
              className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-[10px] font-medium transition-all"
              style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.15)', opacity: busy ? 0.5 : 1 }}>
              {activeOp === 'push' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              Push Local
            </button>
            <button onClick={() => handleOp('pull', pullNow)} disabled={busy}
              className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-[10px] font-medium transition-all"
              style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.15)', opacity: busy ? 0.5 : 1 }}>
              {activeOp === 'pull' ? <Loader2 size={13} className="animate-spin" /> : <ArrowDownToLine size={13} />}
              Pull Cloud
            </button>
          </div>

          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px]" style={{ color: '#3d3a36' }}>
              Last synced: <span style={{ color: '#57534e' }}>{fmtTime(lastSynced)}</span>
            </span>
            {syncError && (
              <span className="text-[10px]" style={{ color: '#ef4444' }}>
                {syncError.slice(0, 40)}
              </span>
            )}
          </div>

          <p className="text-[10px] mt-2 px-0.5 leading-relaxed" style={{ color: '#3d3a36' }}>
            Sync Now merges both (newest wins). Push forces local → Gist. Pull forces Gist → local (reloads app).
          </p>
        </>
      )}
    </motion.div>
  );
}

export default function Settings() {
  const [store, update] = useApexStore();
  const [saved, setSaved] = useState(false);
  const [apiStatus, setApiStatus] = useState({
    usda: 'loading', openfoodfacts: 'connected', spoonacular: 'loading', nutritionix: 'loading', openai: 'loading',
  });
  const [apiError, setApiError] = useState(false);
  const toast = useToast();

  const settings = store.settings;
  const set = (key) => (val) => update(s => ({ ...s, settings: { ...s.settings, [key]: val } }));

  // Frontend keys are read directly from import.meta.env — same source as FoodDatabaseCard.
  // OpenAI is server-only; its status is fetched from /api/status.
  const fetchApiStatus = async () => {
    const frontendStatus = {
      usda:          import.meta.env.VITE_USDA_API_KEY        ? 'connected' : 'missing',
      openfoodfacts: 'connected', // always available, no key
      spoonacular:   import.meta.env.VITE_SPOONACULAR_API_KEY ? 'connected' : 'missing',
      nutritionix:   import.meta.env.VITE_NUTRITIONIX_API_KEY ? 'connected' : 'missing',
      openai:        'loading',
    };
    setApiStatus(frontendStatus);
    setApiError(false);

    // Only the OpenAI key lives server-side
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error('unreachable');
      const data = await res.json();
      setApiStatus(prev => ({ ...prev, openai: data.openai ?? 'unknown' }));
    } catch {
      setApiError(true);
      setApiStatus(prev => ({ ...prev, openai: 'unknown' }));
    }
  };

  useEffect(() => { fetchApiStatus(); }, []);

  const handleSave = () => {
    setSaved(true);
    toast('Settings saved', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearAll = () => {
    if (confirm('This will delete ALL your Apex data — weight logs, food logs, photos, everything. This cannot be undone.\n\nAre you absolutely sure?')) {
      resetStore();
      toast('All data cleared. Reloading...', 'info');
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const handleExportJSON = () => { exportStoreAsJSON(); toast('JSON backup downloaded', 'success'); };
  const handleExportCSV  = () => { exportWeightCSV();   toast('Weight CSV downloaded',  'success'); };

  const isMetric   = settings.units === 'metric';
  const toggleUnits = () => set('units')(isMetric ? 'imperial' : 'metric');

  // Detect if running as installed PWA
  const isPWA = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  return (
    <div style={{ minHeight: '100vh', background: '#111010' }}>

      {/* Header */}
      <div className="px-4 md:px-6 pt-8 pb-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon size={18} style={{ color: '#f59e0b' }} />
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#f5f4f2' }}>Settings</h1>
          </div>
          <p className="text-sm" style={{ color: '#57534e' }}>Your transformation OS, your rules.</p>
        </motion.div>
      </div>

      <div className="px-4 md:px-6 pb-24 md:pb-10 max-w-3xl space-y-4">

        {/* Profile */}
        <Card delay={0.05}>
          <SectionHeader icon={User} title="Profile & Identity" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Your Name" value={settings.name} onChange={set('name')} />
            </div>
            <Field label="Start Date" value={settings.startDate} onChange={set('startDate')} type="date" />
            <Field label="Goal Date"  value={settings.goalDate}  onChange={set('goalDate')}  type="date" />
            <Field
              label="Height"
              value={isMetric
                ? (settings.height ? inchesToCm(settings.height) : '')
                : (settings.height ?? '')}
              onChange={v => set('height')(isMetric ? cmToInches(v) : v)}
              type="number"
              unit={isMetric ? 'cm' : 'in'}
            />
          </div>
        </Card>

        {/* Unit system */}
        <Card delay={0.08}>
          <SectionHeader icon={Globe} title="Measurement System" color="#6366f1" />
          <p className="text-xs mb-4" style={{ color: '#57534e' }}>
            Display-only — all data stays in canonical imperial internally (lbs, oz, miles, inches).
            Switching to Metric converts values on screen without changing stored data.
          </p>
          <div className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>
                {isMetric ? 'Metric' : 'Imperial'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>
                {isMetric ? 'kg · cm · ml · km' : 'lbs · in · oz · mi'}
              </p>
            </div>
            <button onClick={toggleUnits} className="flex-shrink-0 min-touch">
              {isMetric
                ? <ToggleRight size={32} style={{ color: '#6366f1' }} />
                : <ToggleLeft  size={32} style={{ color: '#57534e' }} />}
            </button>
          </div>
        </Card>

        {/* Weight Goals */}
        <Card delay={0.1}>
          <SectionHeader icon={Target} title="Weight Goals" color="#10b981" />
          <p className="text-xs mb-3" style={{ color: '#57534e' }}>
            {isMetric ? 'Values displayed in kg.' : 'Values in lbs.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Start Weight"
              value={isMetric
                ? (settings.startWeight ? lbsToKg(settings.startWeight) : '')
                : (settings.startWeight ?? '')}
              onChange={v => set('startWeight')(isMetric ? kgToLbs(v) : v)}
              type="number"
              unit={isMetric ? 'kg' : 'lbs'}
            />
            <Field
              label="Goal Weight"
              value={isMetric
                ? (settings.goalWeight ? lbsToKg(settings.goalWeight) : '')
                : (settings.goalWeight ?? '')}
              onChange={v => set('goalWeight')(isMetric ? kgToLbs(v) : v)}
              type="number"
              unit={isMetric ? 'kg' : 'lbs'}
            />
          </div>
          {settings.startWeight && settings.goalWeight && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <p className="text-xs" style={{ color: '#10b981' }}>
                {isMetric ? (
                  <>Goal: lose <strong>{((settings.startWeight - settings.goalWeight) * 0.453592).toFixed(1)} kg</strong> by {settings.goalDate || '—'}</>
                ) : (
                  <>Goal: lose <strong>{(settings.startWeight - settings.goalWeight).toFixed(1)} lbs</strong> by {settings.goalDate || '—'}</>
                )}
              </p>
            </div>
          )}
        </Card>

        {/* Daily Targets */}
        <Card delay={0.15}>
          <SectionHeader icon={BarChart2} title="Daily Nutrition Targets" color="#6366f1" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Calories"           value={settings.dailyCalorieTarget} onChange={set('dailyCalorieTarget')} type="number" unit="kcal" />
            <Field label="Protein"            value={settings.dailyProteinTarget} onChange={set('dailyProteinTarget')} type="number" unit="g" hint="~1g per lb bodyweight" />
            <Field label="Carbs"              value={settings.dailyCarbTarget}    onChange={set('dailyCarbTarget')}    type="number" unit="g" />
            <Field label="Fat"                value={settings.dailyFatTarget}     onChange={set('dailyFatTarget')}     type="number" unit="g" />
            <Field label="Daily Steps"        value={settings.dailyStepTarget}    onChange={set('dailyStepTarget')}    type="number" unit="steps" />
            <Field label="TDEE (Maintenance)" value={settings.tdee}              onChange={set('tdee')}               type="number" unit="kcal" hint="Used for deficit calculation" />
          </div>
        </Card>

        {/* Save button */}
        <button onClick={handleSave}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all min-touch"
          style={{
            background: saved ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, #f59e0b, #f97316)',
            color: saved ? '#10b981' : '#000',
            border: saved ? '1px solid rgba(16,185,129,0.25)' : 'none',
          }}>
          {saved ? <><CheckCircle size={15} />Saved!</> : <><Save size={15} />Save Settings</>}
        </button>

        {/* Cloud Sync */}
        <GistSyncCard />

        {/* API Status */}
        <Card delay={0.2}>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader icon={Database} title="API & Integration Status" color="#38bdf8" />
            <button onClick={fetchApiStatus}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#57534e' }}>
              <RefreshCw size={11} />Refresh
            </button>
          </div>
          {apiError && (
            <div className="mb-3 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', color: '#a8896e' }}>
              {IS_DEV
                ? <>Backend not running. Start with <code className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.06)' }}>npm run server</code>. OpenAI status requires the server.</>
                : <>API server unreachable. OpenAI status unavailable — the AI features may still work if the server is configured.</>
              }
            </div>
          )}
          <p className="text-xs mb-3" style={{ color: '#57534e' }}>
            Add keys to <code className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#a8a29e' }}>.env.local</code>.
            <span style={{ color: '#818cf8' }}> Server-only</span> keys are never exposed in the browser.
          </p>
          <div className="space-y-2">
            {Object.entries(API_LABELS).map(([key, meta]) => (
              <ApiStatusRow key={key} name={key} status={apiStatus[key] ?? 'loading'} meta={meta} />
            ))}
          </div>
        </Card>

        {/* Food Database */}
        <FoodDatabaseCard />

        {/* App Mode */}
        <Card delay={0.25}>
          <SectionHeader icon={Smartphone} title="App Mode" color="#10b981" />
          <div className="space-y-2">
            {[
              {
                label: 'Web App',
                active: !isPWA,
                desc: 'Running in browser. Add to home screen to install as app.',
                color: '#f59e0b',
              },
              {
                label: isPWA ? 'Installed PWA ✓' : 'Installable PWA',
                active: isPWA,
                desc: isPWA
                  ? 'Running as installed app. Offline capable.'
                  : 'Open in Safari → Share → Add to Home Screen to install.',
                color: '#10b981',
              },
              {
                label: 'Native iOS App (Coming Soon)',
                active: false,
                desc: 'Future: Capacitor build for App Store. Config ready at capacitor.config.json.',
                color: '#6366f1',
              },
            ].map(m => (
              <div key={m.label} className="flex items-start gap-3 p-3 rounded-xl"
                style={{
                  background: m.active ? `${m.color}08` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${m.active ? `${m.color}20` : 'rgba(255,255,255,0.05)'}`,
                }}>
                <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                  style={{ background: m.active ? m.color : '#3d3835' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: m.active ? '#f5f4f2' : '#57534e' }}>{m.label}</p>
                  <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: '#3d3a36' }}>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Data Management */}
        <Card delay={0.3}>
          <SectionHeader icon={Download} title="Data & Export" color="#a78bfa" />
          <p className="text-xs mb-4" style={{ color: '#57534e' }}>
            All data lives in your browser. GitHub Gist sync is opt-in — configure above.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleExportJSON}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all min-touch"
              style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.18)' }}>
              <FileJson size={13} />Export JSON
            </button>
            <button onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all min-touch"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.18)' }}>
              <Download size={13} />Weight CSV
            </button>
            <button onClick={handleClearAll}
              className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all min-touch"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}>
              <Trash2 size={13} />Clear All Data
            </button>
          </div>
        </Card>

        {/* Branding footer */}
        <div className="text-center py-4">
          <p className="text-xs" style={{ color: '#3d3835' }}>Apex Personal OS · Summer 2026</p>
          <p className="text-xs mt-0.5" style={{ color: '#292524' }}>Your transformation. Your data. Your rules.</p>
        </div>
      </div>
    </div>
  );
}
