import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Hotel, MapPin, Calendar, Plus, X, ChevronRight, Package,
  Clock, Dumbbell, Utensils, Bell, Check, Edit2, Trash2, AlertTriangle,
} from 'lucide-react';
import { useApexStore } from '../store/apexStore';
import { useToast } from '../components/Toast';

// ── Constants ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

const PACKING_CATEGORIES = ['fitness', 'nutrition', 'clothing', 'documents', 'other'];

const CATEGORY_ICONS = {
  fitness: Dumbbell,
  nutrition: Utensils,
  clothing: Package,
  documents: Bell,
  other: Package,
};

const CATEGORY_COLORS = {
  fitness: '#f59e0b',
  nutrition: '#f97316',
  clothing: '#8b5cf6',
  documents: '#6366f1',
  other: '#78716c',
};

const FITNESS_ESSENTIALS = [
  { item: 'Resistance bands', category: 'fitness' },
  { item: 'Gym shoes', category: 'fitness' },
  { item: 'Protein powder (travel packs)', category: 'nutrition' },
  { item: 'Shaker bottle', category: 'nutrition' },
  { item: 'Workout clothes (3x)', category: 'fitness' },
];

const NUTRITION_LABELS = {
  maintain: 'Maintain',
  flexible: 'Flexible',
  strict: 'Strict',
};

const TABS = ['Overview', 'Flights', 'Hotels', 'Packing', 'Itinerary'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(dateStr) {
  const now = new Date(TODAY + 'T00:00:00');
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function tripDuration(startDate, endDate) {
  const s = new Date(startDate + 'T00:00:00');
  const e = new Date(endDate + 'T00:00:00');
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
}

function isActiveTripOrUpcoming(trip) {
  return trip.endDate >= TODAY;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    background: '#111010',
    color: '#f5f4f2',
    padding: '24px 16px 100px',
    maxWidth: 700,
    margin: '0 auto',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 16,
  },
  heroCard: {
    background: 'rgba(99,102,241,0.06)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 20,
    padding: 20,
  },
  input: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 10,
    color: '#f5f4f2',
    padding: '10px 12px',
    width: '100%',
    outline: 'none',
    fontSize: 14,
  },
  label: {
    fontSize: 11,
    color: '#78716c',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: 6,
    display: 'block',
  },
  btn: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 18px',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  },
  btnGhost: {
    background: 'rgba(255,255,255,0.06)',
    color: '#f5f4f2',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 10,
    padding: '9px 14px',
    fontWeight: 500,
    fontSize: 13,
    cursor: 'pointer',
  },
  btnDanger: {
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 8,
    padding: '6px 10px',
    cursor: 'pointer',
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: '8px 12px',
  },
  muted: { color: '#78716c' },
  dimmer: { color: '#57534e' },
  amber: { color: '#f59e0b' },
  purple: { color: '#8b5cf6' },
  indigo: { color: '#6366f1' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 12px' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <span style={{ fontSize: 10, color: '#57534e', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

function WarningBanner({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 12,
      }}
    >
      <AlertTriangle size={15} style={{ color: '#f59e0b', marginTop: 1, flexShrink: 0 }} />
      <p style={{ fontSize: 13, color: '#f5f4f2', lineHeight: 1.5 }}>{children}</p>
    </motion.div>
  );
}

// ── Add Trip Modal ────────────────────────────────────────────────────────────

function AddTripModal({ onClose, onSave, editTrip }) {
  const [destination, setDestination] = useState(editTrip?.destination || '');
  const [emoji, setEmoji] = useState(editTrip?.emoji || '✈️');
  const [startDate, setStartDate] = useState(editTrip?.startDate || TODAY);
  const [endDate, setEndDate] = useState(editTrip?.endDate || TODAY);

  function handleSave() {
    if (!destination.trim()) return;
    onSave({
      id: editTrip?.id || `trip-${uid()}`,
      destination: destination.trim(),
      emoji: emoji || '✈️',
      startDate,
      endDate: endDate >= startDate ? endDate : startDate,
      flights: editTrip?.flights || [],
      hotels: editTrip?.hotels || [],
      packingList: editTrip?.packingList || [],
      itinerary: editTrip?.itinerary || [],
      notes: editTrip?.notes || '',
      gymAccess: editTrip?.gymAccess ?? true,
      nutritionPlan: editTrip?.nutritionPlan || 'maintain',
      timezoneNote: editTrip?.timezoneNote || '',
    });
  }

  return (
    <ModalSheet onClose={onClose} title={editTrip ? 'Edit Trip' : 'Plan a Trip'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ width: 72 }}>
            <label style={S.label}>Emoji</label>
            <input
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              style={{ ...S.input, textAlign: 'center', fontSize: 22 }}
              maxLength={4}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Destination</label>
            <input
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="e.g. New York City"
              style={S.input}
              autoFocus
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={S.label}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ ...S.input, colorScheme: 'dark' }}
            />
          </div>
          <div>
            <label style={S.label}>End Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              style={{ ...S.input, colorScheme: 'dark' }}
            />
          </div>
        </div>

        <button onClick={handleSave} style={{ ...S.btn, width: '100%', marginTop: 4 }}>
          {editTrip ? 'Save Changes' : 'Create Trip'}
        </button>
      </div>
    </ModalSheet>
  );
}

// ── Modal Sheet ───────────────────────────────────────────────────────────────

function ModalSheet({ onClose, title, children }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 680,
            background: '#1a1917',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px 20px 0 0',
            padding: '20px 20px 36px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f5f4f2' }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer' }}>
              <X size={16} style={{ color: '#78716c' }} />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ trip, onUpdate }) {
  const daysAway = daysUntil(trip.startDate);
  const isActive = trip.startDate <= TODAY && trip.endDate >= TODAY;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Warnings */}
      {!trip.gymAccess && daysAway <= 7 && daysAway >= 0 && (
        <WarningBanner>
          No gym access planned for this trip. Consider bodyweight workouts or searching for a local gym at {trip.destination}.
        </WarningBanner>
      )}
      {daysAway <= 3 && daysAway >= 0 && (() => {
        const total = trip.packingList?.length || 0;
        const done = trip.packingList?.filter(i => i.done).length || 0;
        if (total > 0 && done / total < 0.5) {
          return (
            <WarningBanner>
              Trip is in {daysAway === 0 ? 'less than a day' : `${daysAway} day${daysAway !== 1 ? 's' : ''}`} and packing is only {Math.round((done / total) * 100)}% done. Time to pack!
            </WarningBanner>
          );
        }
        return null;
      })()}

      {/* Gym access */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Dumbbell size={16} style={{ color: '#f59e0b' }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#f5f4f2' }}>Gym Access</p>
              <p style={{ fontSize: 12, color: '#78716c' }}>Will you have access to a gym?</p>
            </div>
          </div>
          <button
            onClick={() => onUpdate({ gymAccess: !trip.gymAccess })}
            style={{
              width: 48, height: 26, borderRadius: 13,
              background: trip.gymAccess ? '#f59e0b' : 'rgba(255,255,255,0.1)',
              border: 'none', cursor: 'pointer', transition: 'background 0.2s',
              position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: trip.gymAccess ? 25 : 3,
              width: 20, height: 20, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
            }} />
          </button>
        </div>
      </div>

      {/* Nutrition plan */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Utensils size={15} style={{ color: '#f97316' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#f5f4f2' }}>Nutrition Plan</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['maintain', 'flexible', 'strict']).map(plan => (
            <button
              key={plan}
              onClick={() => onUpdate({ nutritionPlan: plan })}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer',
                fontWeight: 600, fontSize: 12,
                background: trip.nutritionPlan === plan ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                border: trip.nutritionPlan === plan ? '1px solid rgba(249,115,22,0.35)' : '1px solid rgba(255,255,255,0.07)',
                color: trip.nutritionPlan === plan ? '#f97316' : '#78716c',
                transition: 'all 0.15s',
              }}
            >
              {NUTRITION_LABELS[plan]}
            </button>
          ))}
        </div>
      </div>

      {/* Timezone note */}
      <div style={S.card}>
        <label style={S.label}>Timezone Note</label>
        <input
          value={trip.timezoneNote || ''}
          onChange={e => onUpdate({ timezoneNote: e.target.value })}
          placeholder="e.g. EST → PST, -3 hours. Adjust sleep accordingly."
          style={S.input}
        />
      </div>

      {/* Trip notes */}
      <div style={S.card}>
        <label style={S.label}>Trip Notes</label>
        <textarea
          value={trip.notes || ''}
          onChange={e => onUpdate({ notes: e.target.value })}
          placeholder="Anything to keep in mind for this trip..."
          rows={3}
          style={{
            ...S.input,
            resize: 'vertical',
            lineHeight: 1.6,
          }}
        />
      </div>

      {/* AI tip */}
      <div style={{
        background: 'rgba(99,102,241,0.06)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 16 }}>💡</span>
        <p style={{ fontSize: 13, color: '#a8a29e', lineHeight: 1.6 }}>
          During travel weeks, prioritize protein and sleep over perfect training. Consistency over perfection — even a 20-minute workout counts.
        </p>
      </div>
    </div>
  );
}

// ── Flights Tab ───────────────────────────────────────────────────────────────

function FlightsTab({ trip, onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ airline: '', flightNo: '', fromCity: '', toCity: '', departure: '', arrival: '' });

  function handleAdd() {
    if (!form.airline.trim() || !form.flightNo.trim()) return;
    const newFlight = { id: `fl-${uid()}`, ...form };
    onUpdate({ flights: [...(trip.flights || []), newFlight] });
    setForm({ airline: '', flightNo: '', fromCity: '', toCity: '', departure: '', arrival: '' });
    setAdding(false);
  }

  function handleDelete(id) {
    onUpdate({ flights: trip.flights.filter(f => f.id !== id) });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(!trip.flights || trip.flights.length === 0) && !adding && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Plane size={28} style={{ color: '#3d3a36', margin: '0 auto 10px' }} />
          <p style={{ color: '#57534e', fontSize: 14 }}>No flights added yet</p>
        </div>
      )}

      <AnimatePresence>
        {(trip.flights || []).map(f => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={S.card}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Plane size={13} style={{ color: '#6366f1' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#f5f4f2' }}>{f.airline}</span>
                  <span style={{ fontSize: 12, color: '#57534e', fontFamily: 'monospace' }}>{f.flightNo}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#a8a29e' }}>{f.fromCity}</span>
                  <ChevronRight size={12} style={{ color: '#3d3a36' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#a8a29e' }}>{f.toCity}</span>
                </div>
                {(f.departure || f.arrival) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <Clock size={11} style={{ color: '#57534e' }} />
                    {f.departure && <span style={{ fontSize: 12, color: '#57534e' }}>{f.departure}</span>}
                    {f.departure && f.arrival && <span style={{ fontSize: 12, color: '#3d3a36' }}>→</span>}
                    {f.arrival && <span style={{ fontSize: 12, color: '#57534e' }}>{f.arrival}</span>}
                  </div>
                )}
              </div>
              <button onClick={() => handleDelete(f.id)} style={S.btnDanger}>
                <Trash2 size={13} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {adding && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f4f2', marginBottom: 4 }}>New Flight</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={S.label}>Airline</label>
              <input value={form.airline} onChange={e => setForm(f => ({ ...f, airline: e.target.value }))} placeholder="Delta" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Flight No.</label>
              <input value={form.flightNo} onChange={e => setForm(f => ({ ...f, flightNo: e.target.value }))} placeholder="DL 403" style={S.input} />
            </div>
            <div>
              <label style={S.label}>From</label>
              <input value={form.fromCity} onChange={e => setForm(f => ({ ...f, fromCity: e.target.value }))} placeholder="LAX" style={S.input} />
            </div>
            <div>
              <label style={S.label}>To</label>
              <input value={form.toCity} onChange={e => setForm(f => ({ ...f, toCity: e.target.value }))} placeholder="JFK" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Departure</label>
              <input value={form.departure} onChange={e => setForm(f => ({ ...f, departure: e.target.value }))} placeholder="Jun 10, 8:30 AM" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Arrival</label>
              <input value={form.arrival} onChange={e => setForm(f => ({ ...f, arrival: e.target.value }))} placeholder="Jun 10, 4:45 PM" style={S.input} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={handleAdd} style={{ ...S.btn, flex: 1 }}>Add Flight</button>
            <button onClick={() => setAdding(false)} style={S.btnGhost}>Cancel</button>
          </div>
        </motion.div>
      )}

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          style={{ ...S.btnGhost, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', width: '100%' }}
        >
          <Plus size={14} />
          Add Flight
        </button>
      )}
    </div>
  );
}

// ── Hotels Tab ────────────────────────────────────────────────────────────────

function HotelsTab({ trip, onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', checkIn: '', checkOut: '', confirmNo: '' });

  function handleAdd() {
    if (!form.name.trim()) return;
    const newHotel = { id: `ht-${uid()}`, ...form };
    onUpdate({ hotels: [...(trip.hotels || []), newHotel] });
    setForm({ name: '', address: '', checkIn: '', checkOut: '', confirmNo: '' });
    setAdding(false);
  }

  function handleDelete(id) {
    onUpdate({ hotels: trip.hotels.filter(h => h.id !== id) });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(!trip.hotels || trip.hotels.length === 0) && !adding && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Hotel size={28} style={{ color: '#3d3a36', margin: '0 auto 10px' }} />
          <p style={{ color: '#57534e', fontSize: 14 }}>No hotels added yet</p>
        </div>
      )}

      <AnimatePresence>
        {(trip.hotels || []).map(h => (
          <motion.div
            key={h.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={S.card}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Hotel size={13} style={{ color: '#8b5cf6' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#f5f4f2' }}>{h.name}</span>
                </div>
                {h.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <MapPin size={11} style={{ color: '#57534e' }} />
                    <span style={{ fontSize: 12, color: '#78716c' }}>{h.address}</span>
                  </div>
                )}
                {(h.checkIn || h.checkOut) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Calendar size={11} style={{ color: '#57534e' }} />
                    <span style={{ fontSize: 12, color: '#57534e' }}>
                      {h.checkIn && formatDateShort(h.checkIn)}
                      {h.checkIn && h.checkOut && ' → '}
                      {h.checkOut && formatDateShort(h.checkOut)}
                    </span>
                  </div>
                )}
                {h.confirmNo && (
                  <p style={{ fontSize: 11, color: '#3d3a36', fontFamily: 'monospace' }}>Conf: {h.confirmNo}</p>
                )}
              </div>
              <button onClick={() => handleDelete(h.id)} style={S.btnDanger}>
                <Trash2 size={13} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {adding && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f4f2', marginBottom: 4 }}>New Hotel</p>
          <div>
            <label style={S.label}>Hotel Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Marriott Downtown" style={S.input} autoFocus />
          </div>
          <div>
            <label style={S.label}>Address</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, New York, NY" style={S.input} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={S.label}>Check-in</label>
              <input type="date" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} style={{ ...S.input, colorScheme: 'dark' }} />
            </div>
            <div>
              <label style={S.label}>Check-out</label>
              <input type="date" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} style={{ ...S.input, colorScheme: 'dark' }} />
            </div>
          </div>
          <div>
            <label style={S.label}>Confirmation #</label>
            <input value={form.confirmNo} onChange={e => setForm(f => ({ ...f, confirmNo: e.target.value }))} placeholder="ABC12345" style={S.input} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={handleAdd} style={{ ...S.btn, flex: 1 }}>Add Hotel</button>
            <button onClick={() => setAdding(false)} style={S.btnGhost}>Cancel</button>
          </div>
        </motion.div>
      )}

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          style={{ ...S.btnGhost, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', width: '100%' }}
        >
          <Plus size={14} />
          Add Hotel
        </button>
      )}
    </div>
  );
}

// ── Packing Tab ───────────────────────────────────────────────────────────────

function PackingTab({ trip, onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [newCategory, setNewCategory] = useState('other');

  const packingList = trip.packingList || [];
  const total = packingList.length;
  const done = packingList.filter(i => i.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const grouped = useMemo(() => {
    const g = {};
    PACKING_CATEGORIES.forEach(cat => { g[cat] = []; });
    packingList.forEach(item => {
      const cat = item.category || 'other';
      if (!g[cat]) g[cat] = [];
      g[cat].push(item);
    });
    return g;
  }, [packingList]);

  function toggleItem(id) {
    onUpdate({ packingList: packingList.map(i => i.id === id ? { ...i, done: !i.done } : i) });
  }

  function deleteItem(id) {
    onUpdate({ packingList: packingList.filter(i => i.id !== id) });
  }

  function handleAdd() {
    if (!newItem.trim()) return;
    const item = { id: `pk-${uid()}`, item: newItem.trim(), done: false, category: newCategory };
    onUpdate({ packingList: [...packingList, item] });
    setNewItem('');
    setAdding(false);
  }

  function addFitnessEssentials() {
    const existing = new Set(packingList.map(i => i.item.toLowerCase()));
    const toAdd = FITNESS_ESSENTIALS
      .filter(e => !existing.has(e.item.toLowerCase()))
      .map(e => ({ id: `pk-${uid()}`, item: e.item, done: false, category: e.category }));
    if (toAdd.length > 0) {
      onUpdate({ packingList: [...packingList, ...toAdd] });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Progress bar */}
      {total > 0 && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f5f4f2' }}>Packing Progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? '#10b981' : '#f59e0b' }}>
              {done}/{total} items
            </span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                height: '100%',
                borderRadius: 3,
                background: pct === 100 ? '#10b981' : 'linear-gradient(90deg, #f59e0b, #f97316)',
              }}
            />
          </div>
          {pct === 100 && (
            <p style={{ fontSize: 11, color: '#10b981', marginTop: 6, fontWeight: 600 }}>All packed! You're ready to go. ✓</p>
          )}
        </div>
      )}

      {/* Quick add fitness essentials */}
      <button
        onClick={addFitnessEssentials}
        style={{
          ...S.btnGhost,
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', justifyContent: 'center',
          borderColor: 'rgba(245,158,11,0.2)',
          color: '#f59e0b',
        }}
      >
        <Dumbbell size={13} style={{ color: '#f59e0b' }} />
        Add Fitness Essentials
      </button>

      {/* Grouped items */}
      {PACKING_CATEGORIES.map(cat => {
        const items = grouped[cat] || [];
        if (items.length === 0) return null;
        const CatIcon = CATEGORY_ICONS[cat] || Package;
        const catColor = CATEGORY_COLORS[cat] || '#78716c';

        return (
          <div key={cat}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <CatIcon size={12} style={{ color: catColor }} />
              <span style={{ fontSize: 11, color: catColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {cat}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <AnimatePresence>
                {items.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 10, padding: '9px 12px',
                    }}
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        background: item.done ? '#f59e0b' : 'transparent',
                        border: item.done ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.15)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {item.done && <Check size={10} style={{ color: '#000' }} strokeWidth={3} />}
                    </button>
                    <span style={{
                      flex: 1, fontSize: 13, color: item.done ? '#57534e' : '#f5f4f2',
                      textDecoration: item.done ? 'line-through' : 'none',
                      transition: 'color 0.15s',
                    }}>
                      {item.item}
                    </span>
                    <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <X size={12} style={{ color: '#3d3a36' }} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      {packingList.length === 0 && !adding && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Package size={28} style={{ color: '#3d3a36', margin: '0 auto 10px' }} />
          <p style={{ color: '#57534e', fontSize: 14 }}>Nothing packed yet</p>
        </div>
      )}

      {/* Add item form */}
      {adding && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div>
            <label style={S.label}>Item</label>
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. Protein bars"
              style={S.input}
              autoFocus
            />
          </div>
          <div>
            <label style={S.label}>Category</label>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              style={{ ...S.input, cursor: 'pointer' }}
            >
              {PACKING_CATEGORIES.map(cat => (
                <option key={cat} value={cat} style={{ background: '#1a1917' }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} style={{ ...S.btn, flex: 1 }}>Add Item</button>
            <button onClick={() => setAdding(false)} style={S.btnGhost}>Cancel</button>
          </div>
        </motion.div>
      )}

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          style={{ ...S.btnGhost, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', width: '100%' }}
        >
          <Plus size={14} />
          Add Item
        </button>
      )}
    </div>
  );
}

// ── Itinerary Tab ─────────────────────────────────────────────────────────────

function ItineraryTab({ trip, onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: trip.startDate || TODAY, time: '', activity: '', notes: '' });

  const itinerary = trip.itinerary || [];

  const grouped = useMemo(() => {
    const g = {};
    itinerary.forEach(item => {
      if (!g[item.date]) g[item.date] = [];
      g[item.date].push(item);
    });
    // Sort each day's items by time
    Object.keys(g).forEach(date => {
      g[date].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    });
    const sortedDates = Object.keys(g).sort();
    return { dates: sortedDates, byDate: g };
  }, [itinerary]);

  function handleAdd() {
    if (!form.activity.trim()) return;
    const newItem = { id: `it-${uid()}`, ...form };
    onUpdate({ itinerary: [...itinerary, newItem] });
    setForm({ date: trip.startDate || TODAY, time: '', activity: '', notes: '' });
    setAdding(false);
  }

  function handleDelete(id) {
    onUpdate({ itinerary: itinerary.filter(i => i.id !== id) });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {grouped.dates.length === 0 && !adding && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Calendar size={28} style={{ color: '#3d3a36', margin: '0 auto 10px' }} />
          <p style={{ color: '#57534e', fontSize: 14 }}>No activities planned yet</p>
        </div>
      )}

      {grouped.dates.map(date => (
        <div key={date}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#78716c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {formatDate(date)}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grouped.byDate[date].map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}
              >
                {/* Timeline dot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                  {idx < grouped.byDate[date].length - 1 && (
                    <div style={{ width: 1, flex: 1, background: 'rgba(99,102,241,0.2)', minHeight: 20, marginTop: 4 }} />
                  )}
                </div>

                <div style={{
                  flex: 1, ...S.card, padding: '10px 12px', marginBottom: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      {item.time && (
                        <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, marginBottom: 3 }}>{item.time}</p>
                      )}
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#f5f4f2' }}>{item.activity}</p>
                      {item.notes && (
                        <p style={{ fontSize: 12, color: '#78716c', marginTop: 4, lineHeight: 1.4 }}>{item.notes}</p>
                      )}
                    </div>
                    <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                      <X size={12} style={{ color: '#3d3a36' }} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {adding && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f4f2', marginBottom: 4 }}>New Activity</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={S.label}>Date</label>
              <input
                type="date"
                value={form.date}
                min={trip.startDate}
                max={trip.endDate}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={{ ...S.input, colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label style={S.label}>Time</label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                style={{ ...S.input, colorScheme: 'dark' }}
              />
            </div>
          </div>
          <div>
            <label style={S.label}>Activity</label>
            <input
              value={form.activity}
              onChange={e => setForm(f => ({ ...f, activity: e.target.value }))}
              placeholder="e.g. Morning workout at hotel gym"
              style={S.input}
              autoFocus
            />
          </div>
          <div>
            <label style={S.label}>Notes</label>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional details..."
              style={S.input}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={handleAdd} style={{ ...S.btn, flex: 1 }}>Add Activity</button>
            <button onClick={() => setAdding(false)} style={S.btnGhost}>Cancel</button>
          </div>
        </motion.div>
      )}

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          style={{ ...S.btnGhost, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', width: '100%' }}
        >
          <Plus size={14} />
          Add Activity
        </button>
      )}
    </div>
  );
}

// ── Hero Card ─────────────────────────────────────────────────────────────────

function TripHeroCard({ trip, activeTab, onTabChange, onEdit, onDelete, onUpdate }) {
  const daysAway = daysUntil(trip.startDate);
  const isActive = trip.startDate <= TODAY && trip.endDate >= TODAY;
  const total = trip.packingList?.length || 0;
  const done = trip.packingList?.filter(i => i.done).length || 0;
  const duration = tripDuration(trip.startDate, trip.endDate);

  let daysLabel;
  if (isActive) {
    daysLabel = 'Active now';
  } else if (daysAway === 0) {
    daysLabel = 'Departing today';
  } else if (daysAway === 1) {
    daysLabel = 'Tomorrow';
  } else {
    daysLabel = `In ${daysAway} days`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={S.heroCard}
    >
      {/* Trip header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 28 }}>{trip.emoji || '✈️'}</span>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f5f4f2', letterSpacing: '-0.02em' }}>
              {trip.destination}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#78716c' }}>
              {formatDateShort(trip.startDate)} – {formatDateShort(trip.endDate)}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, color: isActive ? '#10b981' : '#6366f1',
              background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.12)',
              border: `1px solid ${isActive ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.25)'}`,
              borderRadius: 6, padding: '2px 8px',
            }}>
              {daysLabel}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onEdit} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: 7, cursor: 'pointer' }}>
            <Edit2 size={13} style={{ color: '#78716c' }} />
          </button>
          <button onClick={onDelete} style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: 7, cursor: 'pointer' }}>
            <Trash2 size={13} style={{ color: '#ef4444' }} />
          </button>
        </div>
      </div>

      {/* Stat chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 }}>
        <div style={S.chip}>
          <Plane size={12} style={{ color: '#6366f1' }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f5f4f2' }}>{trip.flights?.length || 0}</p>
            <p style={{ fontSize: 10, color: '#57534e' }}>Flights</p>
          </div>
        </div>
        <div style={S.chip}>
          <Hotel size={12} style={{ color: '#8b5cf6' }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f5f4f2' }}>{trip.hotels?.length || 0}</p>
            <p style={{ fontSize: 10, color: '#57534e' }}>Hotels</p>
          </div>
        </div>
        <div style={S.chip}>
          <Package size={12} style={{ color: '#f59e0b' }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f5f4f2' }}>{done}/{total}</p>
            <p style={{ fontSize: 10, color: '#57534e' }}>Packed</p>
          </div>
        </div>
        <div style={S.chip}>
          <Calendar size={12} style={{ color: '#f97316' }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f5f4f2' }}>{duration}</p>
            <p style={{ fontSize: 10, color: '#57534e' }}>Days</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        paddingBottom: 2,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        marginBottom: 18,
      }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            style={{
              padding: '7px 14px', borderRadius: 20, flexShrink: 0,
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
              transition: 'all 0.15s',
              background: activeTab === tab ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)',
              border: activeTab === tab ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.07)',
              color: activeTab === tab ? '#a5b4fc' : '#78716c',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'Overview' && <OverviewTab trip={trip} onUpdate={onUpdate} />}
          {activeTab === 'Flights' && <FlightsTab trip={trip} onUpdate={onUpdate} />}
          {activeTab === 'Hotels' && <HotelsTab trip={trip} onUpdate={onUpdate} />}
          {activeTab === 'Packing' && <PackingTab trip={trip} onUpdate={onUpdate} />}
          {activeTab === 'Itinerary' && <ItineraryTab trip={trip} onUpdate={onUpdate} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ── Past Trips List ───────────────────────────────────────────────────────────

function PastTripCard({ trip, onSelect, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        ...S.card,
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
      }}
      onClick={() => onSelect(trip)}
    >
      <span style={{ fontSize: 24, flexShrink: 0 }}>{trip.emoji || '✈️'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f4f2' }}>{trip.destination}</p>
        <p style={{ fontSize: 12, color: '#57534e' }}>
          {formatDateShort(trip.startDate)} – {formatDateShort(trip.endDate)}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#3d3a36' }}>Past</span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(trip.id); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <Trash2 size={13} style={{ color: '#3d3a36' }} />
        </button>
        <ChevronRight size={14} style={{ color: '#3d3a36' }} />
      </div>
    </motion.div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ textAlign: 'center', padding: '60px 24px' }}
    >
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <Plane size={32} style={{ color: '#6366f1' }} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f5f4f2', marginBottom: 10, letterSpacing: '-0.02em' }}>
        Plan your next trip
      </h2>
      <p style={{ fontSize: 14, color: '#78716c', maxWidth: 280, margin: '0 auto 28px', lineHeight: 1.6 }}>
        Stay consistent no matter where you go. Track flights, hotels, packing, and keep your habits on track.
      </p>
      <button onClick={onAdd} style={{ ...S.btn, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Plus size={16} />
        Plan a Trip
      </button>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Travel() {
  const [store, updateStore] = useApexStore();
  const toast = useToast();

  const travelPlans = store.travelPlans || [];

  const [activeTab, setActiveTab] = useState('Overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [selectedPastTrip, setSelectedPastTrip] = useState(null);

  // Sort: upcoming/active first, then past
  const upcomingTrips = useMemo(
    () => travelPlans.filter(isActiveTripOrUpcoming).sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [travelPlans]
  );
  const pastTrips = useMemo(
    () => travelPlans.filter(t => !isActiveTripOrUpcoming(t)).sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [travelPlans]
  );

  const activeTrip = upcomingTrips[0] || null;

  // The "focused" trip for view (active/upcoming or a selected past trip)
  const focusedTrip = selectedPastTrip || activeTrip;

  function handleSaveTrip(plan) {
    const id = plan.id;
    updateStore(prev => {
      const plans = prev.travelPlans || [];
      const idx = plans.findIndex(p => p.id === id);
      const item = { ...plan, updatedAt: new Date().toISOString() };
      const updated = idx >= 0 ? plans.map((p, i) => i === idx ? item : p) : [item, ...plans];
      return { ...prev, travelPlans: updated };
    });
    setShowAddModal(false);
    setEditingTrip(null);
    toast(editingTrip ? 'Trip updated.' : 'Trip created!', 'success');
  }

  function handleDeleteTrip(id) {
    updateStore(prev => ({
      ...prev,
      travelPlans: (prev.travelPlans || []).filter(p => p.id !== id),
    }));
    if (selectedPastTrip?.id === id) setSelectedPastTrip(null);
    toast('Trip deleted.', 'info');
  }

  function handleUpdateTrip(updates) {
    if (!focusedTrip) return;
    const id = focusedTrip.id;
    const merged = { ...focusedTrip, ...updates, updatedAt: new Date().toISOString() };
    updateStore(prev => {
      const plans = prev.travelPlans || [];
      const idx = plans.findIndex(p => p.id === id);
      if (idx < 0) return prev;
      return { ...prev, travelPlans: plans.map((p, i) => i === idx ? merged : p) };
    });
    // Keep selectedPastTrip in sync
    if (selectedPastTrip?.id === id) setSelectedPastTrip(merged);
  }

  function handleEditTrip(trip) {
    setEditingTrip(trip);
    setShowAddModal(true);
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f5f4f2', letterSpacing: '-0.03em' }}>
            ✈️ Travel Mode
          </h1>
          <p style={{ fontSize: 13, color: '#57534e', marginTop: 2 }}>
            Stay consistent wherever you go
          </p>
        </div>
        <button
          onClick={() => { setEditingTrip(null); setShowAddModal(true); }}
          style={{ ...S.btn, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
        >
          <Plus size={14} />
          Add Trip
        </button>
      </div>

      {/* Main content */}
      {travelPlans.length === 0 ? (
        <EmptyState onAdd={() => { setEditingTrip(null); setShowAddModal(true); }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active/upcoming trip hero */}
          {focusedTrip && (
            <TripHeroCard
              trip={focusedTrip}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onEdit={() => handleEditTrip(focusedTrip)}
              onDelete={() => handleDeleteTrip(focusedTrip.id)}
              onUpdate={handleUpdateTrip}
            />
          )}

          {/* Other upcoming trips */}
          {upcomingTrips.length > 1 && (
            <>
              <SectionDivider label="Also Upcoming" />
              {upcomingTrips.slice(1).map(trip => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    ...S.card,
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    border: selectedPastTrip?.id === trip.id ? '1px solid rgba(99,102,241,0.3)' : undefined,
                  }}
                  onClick={() => { setSelectedPastTrip(trip); setActiveTab('Overview'); }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{trip.emoji || '✈️'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f4f2' }}>{trip.destination}</p>
                    <p style={{ fontSize: 12, color: '#57534e' }}>
                      {formatDateShort(trip.startDate)} – {formatDateShort(trip.endDate)} · In {daysUntil(trip.startDate)} days
                    </p>
                  </div>
                  <ChevronRight size={14} style={{ color: '#57534e' }} />
                </motion.div>
              ))}
            </>
          )}

          {/* Past trips */}
          {pastTrips.length > 0 && (
            <>
              <SectionDivider label="Past Trips" />
              {pastTrips.map(trip => (
                <PastTripCard
                  key={trip.id}
                  trip={trip}
                  onSelect={t => { setSelectedPastTrip(t); setActiveTab('Overview'); }}
                  onDelete={handleDeleteTrip}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Add/Edit trip modal */}
      {showAddModal && (
        <AddTripModal
          onClose={() => { setShowAddModal(false); setEditingTrip(null); }}
          onSave={handleSaveTrip}
          editTrip={editingTrip}
        />
      )}
    </div>
  );
}
