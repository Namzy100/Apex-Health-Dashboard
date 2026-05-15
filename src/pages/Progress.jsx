import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Plus, X, ArrowLeftRight, Upload, ImageIcon, TrendingDown } from 'lucide-react';
import { useApexStore, addProgressPhoto, deleteProgressPhoto, getProgressPhotos } from '../store/apexStore';
import { useToast } from '../components/Toast';

export default function Progress() {
  const [store] = useApexStore();
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const fileRef = useRef();
  const toast = useToast();

  const photos = getProgressPhotos();
  const settings = store.settings;
  const latestWeight = store.weightLogs?.[store.weightLogs.length - 1]?.weight || settings.startWeight;
  const totalLost = (settings.startWeight - latestWeight).toFixed(1);

  const addPhoto = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const photo = {
        id: Date.now(),
        date: new Date().toISOString().slice(0, 10),
        dataUrl: e.target.result,
        caption,
        weight: latestWeight,
      };
      addProgressPhoto(photo);
      setCaption('');
      setUploading(false);
      toast('📸 Progress photo saved!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleFile = (e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); };
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f?.type.startsWith('image/')) addPhoto(f);
  };

  const removePhoto = (id) => {
    deleteProgressPhoto(id);
    if (compareA?.id === id) setCompareA(null);
    if (compareB?.id === id) setCompareB(null);
    toast('Photo removed', 'info');
  };

  const handleCompareClick = (photo) => {
    if (!compareMode) return;
    if (!compareA) { setCompareA(photo); return; }
    if (!compareB && compareA.id !== photo.id) { setCompareB(photo); return; }
    setCompareA(photo); setCompareB(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#111010' }}>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ height: 220 }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0d1a10 0%, #111010 50%, #1a1208 100%)' }} />
        <div className="absolute" style={{ top: -40, right: 80, width: 300, height: 300, background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 65%)', filter: 'blur(40px)' }} />
        <div className="absolute" style={{ bottom: -20, left: 80, width: 200, height: 200, background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 65%)', filter: 'blur(30px)' }} />
        <div className="absolute inset-0 flex flex-col justify-center px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 mb-2">
              <Camera size={18} style={{ color: '#10b981' }} />
              <p className="text-sm font-medium" style={{ color: '#4a7c5c' }}>Your visual record</p>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: '#f5f4f2' }}>Progress Photos</h1>
            <p className="text-sm" style={{ color: '#78716c' }}>Every photo tells your story. Document it all.</p>
          </motion.div>
        </div>
        {/* Stats */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex gap-3">
          {[
            { label: 'Total lost', value: `−${totalLost} lbs`, color: '#10b981' },
            { label: 'Photos', value: photos.length, color: '#f59e0b' },
            { label: 'Current', value: `${latestWeight} lbs`, color: '#a8a29e' },
          ].map(s => (
            <div key={s.label} className="text-center p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', minWidth: 80 }}>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>{s.label}</p>
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: 'linear-gradient(to bottom, transparent, #111010)' }} />
      </div>

      <div className="px-6 pb-10" style={{ marginTop: -8 }}>

        {/* Action buttons */}
        <div className="flex gap-2 mb-5">
          <button onClick={() => { setUploading(true); setCompareMode(false); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Plus size={14} />Add Photo
          </button>
          {photos.length >= 2 && (
            <button onClick={() => { setCompareMode(!compareMode); setUploading(false); if (!compareMode) { setCompareA(null); setCompareB(null); } }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{
                background: compareMode ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                color: compareMode ? '#818cf8' : '#78716c',
                border: `1px solid ${compareMode ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}>
              <ArrowLeftRight size={14} />Compare
            </button>
          )}
        </div>

        {/* Upload panel */}
        <AnimatePresence>
          {uploading && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-5 overflow-hidden">
              <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Add Progress Photo</h3>
                  <button onClick={() => setUploading(false)}><X size={16} style={{ color: '#57534e' }} /></button>
                </div>
                <div
                  className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-12 cursor-pointer mb-4 transition-all"
                  style={{ borderColor: dragOver ? '#10b981' : 'rgba(255,255,255,0.1)', background: dragOver ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)' }}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}>
                  <Upload size={28} style={{ color: dragOver ? '#10b981' : '#57534e', marginBottom: 10 }} />
                  <p className="text-sm font-medium" style={{ color: '#a8a29e' }}>{dragOver ? 'Drop it!' : 'Click or drag to upload'}</p>
                  <p className="text-xs mt-1" style={{ color: '#57534e' }}>JPG, PNG, WEBP</p>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </div>
                <input value={caption} onChange={e => setCaption(e.target.value)}
                  placeholder="Caption (optional — e.g. 'Day 14, feeling leaner')"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f4f2' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compare panel */}
        <AnimatePresence>
          {compareMode && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mb-6">
              <div className="p-5 rounded-2xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <p className="text-sm font-semibold mb-4" style={{ color: '#818cf8' }}>Before vs After — click photos below to select</p>
                <div className="grid grid-cols-2 gap-4">
                  {[{ label: 'Before', photo: compareA, tag: 'A' }, { label: 'After', photo: compareB, tag: 'B' }].map(({ label, photo, tag }) => (
                    <div key={tag} className="rounded-2xl overflow-hidden aspect-[3/4] relative"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {photo ? (
                        <>
                          <img src={photo.dataUrl} alt={label} className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                            <p className="text-xs font-semibold" style={{ color: '#f5f4f2' }}>{photo.date} · {photo.weight} lbs</p>
                            {photo.caption && <p className="text-xs italic" style={{ color: '#a8a29e' }}>{photo.caption}</p>}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                          <ImageIcon size={28} style={{ color: '#57534e' }} />
                          <p className="text-xs mt-2" style={{ color: '#57534e' }}>Select {label}</p>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: tag === 'A' ? '#f59e0b' : '#10b981', color: '#000' }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
                {compareA && compareB && (
                  <div className="mt-4 p-3 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <p className="text-sm font-semibold" style={{ color: '#10b981' }}>
                      {compareA.weight && compareB.weight ? `−${(compareA.weight - compareB.weight).toFixed(1)} lbs` : ''}
                    </p>
                    <p className="text-xs" style={{ color: '#57534e' }}>from {compareA.date} to {compareB.date}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Photo gallery */}
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
            <Camera size={40} style={{ color: '#3d3835', marginBottom: 16 }} />
            <p className="text-sm font-medium" style={{ color: '#57534e' }}>No photos yet</p>
            <p className="text-xs mt-2 max-w-xs text-center" style={{ color: '#3d3835' }}>
              Looking back on where you started is one of the most powerful motivators on any transformation journey.
            </p>
            <button onClick={() => setUploading(true)}
              className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              <Plus size={14} />Add First Photo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence>
              {photos.map((photo, i) => (
                <motion.div key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative rounded-2xl overflow-hidden aspect-[3/4] group cursor-pointer"
                  style={{
                    border: `2px solid ${compareA?.id === photo.id ? '#f59e0b' : compareB?.id === photo.id ? '#10b981' : 'transparent'}`,
                  }}
                  onClick={() => handleCompareClick(photo)}>
                  <img src={photo.dataUrl} alt={photo.caption || photo.date} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)' }} />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-xs font-semibold" style={{ color: '#f5f4f2' }}>{photo.date}</p>
                    <p className="text-xs" style={{ color: '#a8a29e' }}>{photo.weight} lbs</p>
                    {photo.caption && <p className="text-xs italic mt-0.5" style={{ color: '#78716c' }}>"{photo.caption}"</p>}
                  </div>
                  {!compareMode && (
                    <button onClick={e => { e.stopPropagation(); removePhoto(photo.id); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full items-center justify-center hidden group-hover:flex"
                      style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <X size={12} style={{ color: '#f5f4f2' }} />
                    </button>
                  )}
                  {compareMode && (
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                      style={{
                        background: compareA?.id === photo.id ? '#f59e0b' : compareB?.id === photo.id ? '#10b981' : 'rgba(0,0,0,0.4)',
                        color: '#000',
                        border: '2px solid rgba(255,255,255,0.2)',
                      }}>
                      {compareA?.id === photo.id ? 'B' : compareB?.id === photo.id ? 'A' : ''}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
