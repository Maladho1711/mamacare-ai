'use client';

/**
 * --- Système Toast global ----------------------------------------------------
 *
 * Usage :
 *   const { showToast } = useToast();
 *   showToast('Patiente créée', 'success');
 *   showToast('Erreur réseau', 'error');
 *
 * Compatibilité rétroactive : l'ancienne API `toast(msg, type)` fonctionne
 * toujours grâce à l'alias exporté dans ToastContextValue.
 *
 * Design :
 *   - Mobile : colonne en bas de l'écran, slide-in depuis le bas
 *   - Desktop (md+) : colonne haut-droite, slide-in depuis la droite
 *   - Auto-dismiss : 3s success/info/warning, 5s error
 *   - Max 3 toasts simultanés
 *   - Bouton dismiss (×) toujours visible
 *   - Animations CSS uniquement (pas Framer Motion)
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from 'react';

// --- Types --------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id:      number;
  message: string;
  type:    ToastType;
}

interface ToastContextValue {
  /** API principale */
  showToast:    (message: string, type?: ToastType, duration?: number) => void;
  dismissToast: (id: number) => void;
  /** Alias rétrocompatible avec l'ancienne API */
  toast:        (message: string, type?: ToastType) => void;
}

// --- Context ------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue>({
  showToast:    () => {},
  dismissToast: () => {},
  toast:        () => {},
});

// --- Hook ---------------------------------------------------------------------

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

// --- Durées par défaut --------------------------------------------------------

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3000,
  info:    3000,
  warning: 3000,
  error:   5000,
};

// --- Design tokens par type ---------------------------------------------------

const TOAST_STYLES: Record<ToastType, { bg: string; icon: string }> = {
  success: {
    bg:   'bg-emerald-600',
    icon: '✓',
  },
  error: {
    bg:   'bg-red-600',
    icon: '✕',
  },
  warning: {
    bg:   'bg-amber-500',
    icon: '⚠',
  },
  info: {
    bg:   'bg-gray-800',
    icon: 'ℹ',
  },
};

// --- Provider -----------------------------------------------------------------

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idCounter = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      const id = ++idCounter.current;

      // Limiter à 3 toasts simultanés — supprimer le plus ancien si nécessaire
      setToasts((prev) => {
        const next = [...prev, { id, message, type }];
        return next.length > 3 ? next.slice(next.length - 3) : next;
      });

      const delay = duration ?? DEFAULT_DURATION[type];
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, delay);
    },
    [],
  );

  // Alias rétrocompatible
  const toast = useCallback(
    (message: string, type: ToastType = 'info') => showToast(message, type),
    [showToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, toast }}>
      {children}

      {/* -- Conteneur mobile : bas-centre -- */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="
          fixed bottom-20 left-1/2 -translate-x-1/2 z-50
          flex flex-col gap-2 items-center
          pointer-events-none
          md:hidden
          w-[calc(100vw-2rem)] max-w-sm
        "
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={dismissToast} mobile />
        ))}
      </div>

      {/* -- Conteneur desktop : haut-droite -- */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="
          fixed top-4 right-4 z-50
          hidden md:flex flex-col gap-2 items-end
          pointer-events-none
          w-80
        "
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={dismissToast} mobile={false} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// --- Carte toast individuelle -------------------------------------------------

interface ToastCardProps {
  item:      ToastItem;
  onDismiss: (id: number) => void;
  mobile:    boolean;
}

function ToastCard({ item, onDismiss, mobile }: ToastCardProps) {
  const { bg, icon } = TOAST_STYLES[item.type];

  return (
    <div
      role="alert"
      className={`
        pointer-events-auto
        ${bg} text-white
        rounded-xl shadow-lg
        px-4 py-3
        flex items-center gap-3
        w-full
        ${mobile ? 'toast-slide-up' : 'toast-slide-right'}
      `}
    >
      {/* Icône */}
      <span
        aria-hidden="true"
        className="shrink-0 w-5 h-5 flex items-center justify-center
          rounded-full bg-white/20 text-xs font-bold leading-none"
      >
        {icon}
      </span>

      {/* Message */}
      <p className="flex-1 text-sm font-medium leading-snug">
        {item.message}
      </p>

      {/* Bouton dismiss */}
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Fermer la notification"
        className="shrink-0 text-white/70 hover:text-white transition-colors
          text-base leading-none focus:outline-none focus:ring-2
          focus:ring-white/50 rounded px-0.5"
      >
        ×
      </button>
    </div>
  );
}
