// --- Skeleton page Alertes ----------------------------------------------------

import Skeleton from '@/components/ui/Skeleton';

export default function SkeletonAlerts() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement des alertes">

      {/* -- En-tête -- */}
      <div className="flex flex-col gap-1">
        <Skeleton className="w-20 h-6" rounded="md" />
        <Skeleton className="w-32 h-3" rounded="full" />
      </div>

      {/* -- 4 cartes d'alerte -- */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        >
          {/* Header card : badge + temps + nom + bouton résoudre */}
          <div className="flex items-start justify-between gap-3 px-4 pt-4">
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-16 h-5" rounded="full" />
                <Skeleton className="w-16 h-3" rounded="full" />
              </div>
              <Skeleton className="w-36 h-4" rounded="md" />
              <Skeleton className="w-24 h-3" rounded="full" />
            </div>
            <Skeleton className="w-20 h-7 shrink-0" rounded="full" />
          </div>

          {/* Message texte : 2 lignes */}
          <div className="px-4 mt-3 flex flex-col gap-1.5">
            <Skeleton className="w-full h-3" rounded="full" />
            <Skeleton className="w-4/5 h-3" rounded="full" />
          </div>

          {/* Footer : statut livraison + actions */}
          <div className="px-4 py-3 mt-3 border-t border-gray-50 flex items-center justify-between">
            <Skeleton className="w-28 h-3" rounded="full" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-16 h-3" rounded="full" />
              <Skeleton className="w-16 h-3" rounded="full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
