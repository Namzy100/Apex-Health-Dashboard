import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Reusable detail modal.
 * Mobile: slides up full-screen from bottom.
 * Desktop: centered modal with backdrop.
 *
 * Props:
 *   open        boolean
 *   onClose     () => void
 *   title       string
 *   subtitle?   string
 *   emoji?      string
 *   children    ReactNode
 *   actions?    ReactNode  — rendered in sticky footer
 *   maxWidth?   string     — default '520px'
 */
export default function DetailModal({ open, onClose, title, subtitle, emoji, children, actions, maxWidth = '520px' }) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
          />

          {/* Mobile: slide up sheet */}
          <motion.div
            key="sheet-mobile"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col md:hidden"
            style={{
              background: '#1a1815',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px 20px 0 0',
              maxHeight: '92svh',
              paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <ModalContent title={title} subtitle={subtitle} emoji={emoji} actions={actions} onClose={onClose}>
              {children}
            </ModalContent>
          </motion.div>

          {/* Desktop: centered modal */}
          <motion.div
            key="modal-desktop"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="fixed inset-0 z-50 hidden md:flex items-center justify-center p-6"
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="relative flex flex-col"
              style={{
                width: '100%',
                maxWidth,
                maxHeight: '85vh',
                background: '#1a1815',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20,
                pointerEvents: 'all',
              }}
            >
              <ModalContent title={title} subtitle={subtitle} emoji={emoji} actions={actions} onClose={onClose}>
                {children}
              </ModalContent>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ModalContent({ title, subtitle, emoji, children, actions, onClose }) {
  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3 min-w-0">
          {emoji && <span style={{ fontSize: 28 }}>{emoji}</span>}
          <div className="min-w-0">
            <h2 className="font-bold text-base leading-tight truncate" style={{ color: '#f5f4f2' }}>{title}</h2>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>{subtitle}</p>}
          </div>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-3 transition-all hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          <X size={14} style={{ color: '#78716c' }} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {children}
      </div>

      {/* Footer actions */}
      {actions && (
        <div className="flex-shrink-0 px-5 pt-3 pb-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {actions}
        </div>
      )}
    </>
  );
}
