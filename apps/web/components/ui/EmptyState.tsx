interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Empty state — design amélioré avec illustration, fond pastel,
 * typographie claire et dark mode.
 */
export default function EmptyState({ icon = '📋', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      {/* Icône dans un cercle pastel pour plus de présence visuelle */}
      <div className="w-16 h-16 rounded-full bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center mb-4 shadow-sm">
        <span className="text-3xl" aria-hidden="true">{icon}</span>
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
