/**
 * FilterChip — chip cliquable pour les filtres du dashboard et de la liste patientes.
 * Actif = couleur selon variant. Inactif = fond adapté selon le thème.
 */

type FilterChipVariant = 'default' | 'red' | 'orange' | 'green';

interface FilterChipProps {
  label:    string;
  active:   boolean;
  onClick:  () => void;
  variant?: FilterChipVariant;
}

const ACTIVE_STYLES: Record<FilterChipVariant, string> = {
  default: 'bg-[#E91E8C] text-white border-[#E91E8C] shadow-sm shadow-pink-200',
  red:     'bg-red-600   text-white border-red-600   shadow-sm shadow-red-200',
  orange:  'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-200',
  green:   'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200',
};

const HOVER_STYLES: Record<FilterChipVariant, string> = {
  default: 'hover:border-[#E91E8C] hover:text-[#E91E8C] dark:hover:border-[#E91E8C] dark:hover:text-[#E91E8C]',
  red:     'hover:border-red-500   hover:text-red-600   dark:hover:border-red-500   dark:hover:text-red-400',
  orange:  'hover:border-orange-400 hover:text-orange-600 dark:hover:border-orange-400 dark:hover:text-orange-400',
  green:   'hover:border-emerald-500 hover:text-emerald-600 dark:hover:border-emerald-500 dark:hover:text-emerald-400',
};

export default function FilterChip({ label, active, onClick, variant = 'default' }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all
        active:scale-95
        ${active
          ? ACTIVE_STYLES[variant]
          : `bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 ${HOVER_STYLES[variant]}`
        }
      `}
    >
      {label}
    </button>
  );
}
