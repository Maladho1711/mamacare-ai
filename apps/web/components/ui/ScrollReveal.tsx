'use client';

/**
 * --- ScrollReveal --------------------------------------------------------------
 *
 * Composant client minimal qui observe l'entrée dans le viewport et déclenche
 * l'animation CSS `animate-in` (définie dans globals.css).
 * Zéro dépendance externe — IntersectionObserver natif.
 *
 * Usage :
 *   <ScrollReveal>
 *     <section>...</section>
 *   </ScrollReveal>
 *
 *   <ScrollReveal delayMs={150}>
 *     <div>...</div>
 *   </ScrollReveal>
 */

import { useEffect, useRef } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  /** Délai d'animation en millisecondes */
  delayMs?: number;
  className?: string;
  /** Seuil de visibilité (0-1). Default 0.1 */
  threshold?: number;
}

export default function ScrollReveal({
  children,
  delayMs = 0,
  className = '',
  threshold = 0.1,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          const animate = () => {
            el.classList.remove('sr-hidden');
            el.classList.add('animate-in');
          };
          if (delayMs > 0) {
            setTimeout(animate, delayMs);
          } else {
            animate();
          }
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delayMs, threshold]);

  return (
    <div ref={ref} className={`sr-hidden ${className}`}>
      {children}
    </div>
  );
}
