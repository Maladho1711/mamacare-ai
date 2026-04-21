'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export default function Modal({ open, onClose, title, children, actions }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm" />

      {/* Carte */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl dark:shadow-black/40 w-full max-w-md p-6 animate-in fade-in zoom-in-95 border border-transparent dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">{title}</h2>
        <div className="text-sm text-gray-600 dark:text-gray-300">{children}</div>
        {actions && (
          <div className="flex gap-2 mt-5 justify-end">{actions}</div>
        )}
      </div>
    </div>
  );
}
