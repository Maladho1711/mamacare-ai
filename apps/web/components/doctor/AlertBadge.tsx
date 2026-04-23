'use client';

// --- AlertBadge ---------------------------------------------------------------
// Petite pastille colorée pour afficher le niveau de risque d'une patiente.

type Level = 'green' | 'orange' | 'red' | string;

const BADGE_STYLES: Record<string, string> = {
  green:  'bg-emerald-100 text-emerald-800 border-emerald-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  red:    'bg-red-100 text-red-800 border-red-200',
};

const BADGE_LABELS: Record<string, string> = {
  green:  'Stable',
  orange: 'À surveiller',
  red:    'Urgence',
};

const BADGE_DOT: Record<string, string> = {
  green:  'bg-emerald-500',
  orange: 'bg-orange-500',
  red:    'bg-red-500',
};

interface AlertBadgeProps {
  level: Level;
  className?: string;
}

export default function AlertBadge({ level, className = '' }: AlertBadgeProps) {
  const style = BADGE_STYLES[level] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const dot   = BADGE_DOT[level]   ?? 'bg-gray-400';
  const label = BADGE_LABELS[level] ?? level;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${style} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
