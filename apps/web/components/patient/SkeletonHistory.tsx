// --- Skeleton historique patient ----------------------------------------------

import Skeleton from '@/components/ui/Skeleton';

export default function SkeletonHistory() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement de l'historique">

      {/* -- En-tête -- */}
      <div className="flex flex-col gap-1.5">
        <Skeleton className="w-36 h-6" rounded="md" />
        <Skeleton className="w-28 h-3" rounded="full" />
      </div>

      {/* -- Légende -- */}
      <div className="flex gap-4 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Skeleton className="w-3 h-3" rounded="full" />
            <Skeleton className="w-16 h-3" rounded="full" />
          </div>
        ))}
      </div>

      {/* -- Grille calendrier 30 jours (7 colonnes) -- */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Entêtes jours de semaine */}
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 mx-auto w-6" rounded="full" />
        ))}

        {/* Décalage de 3 cases (ex : mois commençant un jeudi) */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`sp-${i}`} />
        ))}

        {/* 30 jours */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5 py-1">
            <Skeleton className="w-7 h-7" rounded="full" />
            <Skeleton className="w-4 h-2" rounded="full" />
          </div>
        ))}
      </div>

      {/* -- Rappels grossesse -- */}
      <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: '#FDE8F3' }}>
        <Skeleton className="w-40 h-3" rounded="full" />
        <Skeleton className="w-full h-4" rounded="md" />
        <Skeleton className="w-3/4 h-4" rounded="md" />
      </div>
    </div>
  );
}
