import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: Check,
  error: X,
  info: Info,
  warning: AlertTriangle,
};

const COLORS = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)', icon: '#10b981', dot: '#10b981' },
  error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.2)', icon: '#ef4444', dot: '#ef4444' },
  info: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.18)', icon: '#f59e0b', dot: '#f59e0b' },
  warning: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.18)', icon: '#f97316', dot: '#f97316' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success', duration = 2800) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 340 }}>
        <AnimatePresence>
          {toasts.map(t => {
            const c = COLORS[t.type] || COLORS.info;
            const Icon = ICONS[t.type] || Info;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl pointer-events-auto"
                style={{
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${c.dot}20` }}>
                  <Icon size={12} style={{ color: c.icon }} strokeWidth={2.5} />
                </div>
                <p className="text-sm flex-1" style={{ color: '#f5f4f2' }}>{t.message}</p>
                <button onClick={() => dismiss(t.id)} className="flex-shrink-0 pointer-events-auto">
                  <X size={13} style={{ color: '#57534e' }} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
