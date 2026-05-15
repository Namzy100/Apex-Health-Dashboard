import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, User, Target, Database, Download,
  Trash2, Save, CheckCircle, BarChart2, RefreshCw, FileJson,
} from 'lucide-react';
import { useApexStore, exportStoreAsJSON, exportWeightCSV, resetStore } from '../store/apexStore';
import { useToast } from '../components/Toast';

const API_KEYS = [
  { label: 'USDA FoodData Central', env: 'VITE_USDA_API_KEY', desc: 'Free at fdc.nal.usda.gov/api-key-signup.html' },
  { label: 'Nutritionix', env: 'VITE_NUTRITIONIX_API_KEY', desc: 'Restaurant + branded foods' },
  { label: 'Spoonacular', env: 'VITE_SPOONACULAR_API_KEY', desc: 'Recipe database, free tier available' },
  { label: 'OpenAI', env: 'VITE_OPENAI_API_KEY', desc: 'Powers AI logging and recipe builder' },
];

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

export default function Settings() {
  const [store, update] = useApexStore();
  const [saved, setSaved] = useState(false);
  const toast = useToast();

  const settings = store.settings;
  const set = (key) => (val) => update(s => ({ ...s, settings: { ...s.settings, [key]: val } }));

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
  const handleExportCSV = () => { exportWeightCSV(); toast('Weight CSV downloaded', 'success'); };

  const handleLoadSample = () => {
    toast('Sample data is already loaded on first launch', 'info');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#111010' }}>

      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon size={18} style={{ color: '#f59e0b' }} />
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#f5f4f2' }}>Settings</h1>
          </div>
          <p className="text-sm" style={{ color: '#57534e' }}>Your transformation OS, your rules.</p>
        </motion.div>
      </div>

      <div className="px-6 pb-10 max-w-3xl space-y-4">

        {/* Profile */}
        <Card delay={0.05}>
          <SectionHeader icon={User} title="Profile & Identity" />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Your Name" value={settings.name} onChange={set('name')} />
            </div>
            <Field label="Start Date" value={settings.startDate} onChange={set('startDate')} type="date" />
            <Field label="Goal Date" value={settings.goalDate} onChange={set('goalDate')} type="date" />
            <Field label="Height" value={settings.height} onChange={set('height')} type="number" unit="inches" />
          </div>
        </Card>

        {/* Weight Goals */}
        <Card delay={0.1}>
          <SectionHeader icon={Target} title="Weight Goals" color="#10b981" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Weight" value={settings.startWeight} onChange={set('startWeight')} type="number" unit="lbs" />
            <Field label="Goal Weight" value={settings.goalWeight} onChange={set('goalWeight')} type="number" unit="lbs" />
          </div>
          {settings.startWeight && settings.goalWeight && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <p className="text-xs" style={{ color: '#10b981' }}>
                Goal: lose <strong>{(settings.startWeight - settings.goalWeight).toFixed(1)} lbs</strong> by {settings.goalDate || '—'}
              </p>
            </div>
          )}
        </Card>

        {/* Daily Targets */}
        <Card delay={0.15}>
          <SectionHeader icon={BarChart2} title="Daily Nutrition Targets" color="#6366f1" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calories" value={settings.dailyCalorieTarget} onChange={set('dailyCalorieTarget')} type="number" unit="kcal" />
            <Field label="Protein" value={settings.dailyProteinTarget} onChange={set('dailyProteinTarget')} type="number" unit="g" hint="~1g per lb bodyweight" />
            <Field label="Carbs" value={settings.dailyCarbTarget} onChange={set('dailyCarbTarget')} type="number" unit="g" />
            <Field label="Fat" value={settings.dailyFatTarget} onChange={set('dailyFatTarget')} type="number" unit="g" />
            <Field label="Daily Steps" value={settings.dailyStepTarget} onChange={set('dailyStepTarget')} type="number" unit="steps" />
            <Field label="Water" value={settings.waterTarget} onChange={set('waterTarget')} type="number" unit="L" />
            <Field label="TDEE (Maintenance)" value={settings.tdee} onChange={set('tdee')} type="number" unit="kcal" hint="Used for deficit calculation" />
          </div>
        </Card>

        {/* Save button */}
        <button onClick={handleSave}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={{
            background: saved ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, #f59e0b, #f97316)',
            color: saved ? '#10b981' : '#000',
            border: saved ? '1px solid rgba(16,185,129,0.25)' : 'none',
          }}>
          {saved ? <><CheckCircle size={15} />Saved!</> : <><Save size={15} />Save Settings</>}
        </button>

        {/* API Status */}
        <Card delay={0.2}>
          <SectionHeader icon={Database} title="API & Integration Status" color="#38bdf8" />
          <p className="text-xs mb-4" style={{ color: '#57534e' }}>
            Add these keys to a <code className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#a8a29e' }}>.env.local</code> file in your project root to unlock external food databases.
          </p>
          <div className="space-y-2">
            {API_KEYS.map(api => {
              const isSet = !!import.meta.env[api.env];
              return (
                <div key={api.env} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <p className="text-xs font-medium" style={{ color: '#a8a29e' }}>{api.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#3d3a36' }}>{api.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{
                      background: isSet ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isSet ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: isSet ? '#10b981' : '#57534e' }} />
                    <span className="text-xs" style={{ color: isSet ? '#10b981' : '#57534e' }}>{isSet ? 'Connected' : 'Not set'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Data Management */}
        <Card delay={0.25}>
          <SectionHeader icon={Download} title="Data & Export" color="#a78bfa" />
          <p className="text-xs mb-4" style={{ color: '#57534e' }}>
            All data is stored locally in your browser. Nothing is sent to a server.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleExportJSON}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.18)' }}>
              <FileJson size={13} />Export JSON Backup
            </button>
            <button onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.18)' }}>
              <Download size={13} />Export Weight CSV
            </button>
            <button onClick={handleLoadSample}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.18)' }}>
              <RefreshCw size={13} />Reload Sample Data
            </button>
            <button onClick={handleClearAll}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}>
              <Trash2 size={13} />Clear All Data
            </button>
          </div>
        </Card>

        {/* Branding footer */}
        <div className="text-center py-4">
          <p className="text-xs" style={{ color: '#3d3835' }}>Apex Personal OS · Built for Naman · Summer 2026</p>
          <p className="text-xs mt-0.5" style={{ color: '#292524' }}>Your transformation. Your data. Your rules.</p>
        </div>
      </div>
    </div>
  );
}
