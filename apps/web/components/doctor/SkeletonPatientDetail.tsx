// ─── Skeleton fiche patiente ──────────────────────────────────────────────────

import Skeleton from '@/components/ui/Skeleton';

export default function SkeletonPatientDetail() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Chargement de la patiente">

      {/* ── Card en-tête : back + titre + badge ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-14 h-4" rounded="full" />
          <Skeleton className="w-40 h-5" rounded="md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-14 h-4" rounded="full" />
          <Skeleton className="w-16 h-6" rounded="full" />
        </div>
      </div>

      {/* ── Card identité : grille 2x2 + notes ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="w-20 h-3" rounded="full" />
              <Skeleton className="w-28 h-4" rounded="md" />
            </div>
          ))}
        </div>
        {/* Notes cliniques */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-2">
          <Skeleton className="w-24 h-3" rounded="full" />
          <Skeleton className="w-full h-4" rounded="md" />
          <Skeleton className="w-3/4 h-4" rounded="md" />
        </div>
        {/* Badge check aujourd'hui */}
        <Skeleton className="w-full h-10" rounded="xl" />
      </div>

      {/* ── Résumé IA ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
        <Skeleton className="w-40 h-3" rounded="full" />
        <Skeleton className="w-full h-12" rounded="xl" />
      </div>

      {/* ── Graphique évolution 30 jours ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="w-36 h-3" rounded="full" />
          <Skeleton className="w-36 h-3" rounded="full" />
        </div>
        {/* Barres du graphique */}
        <Skeleton className="w-full h-12" rounded="md" />
        <div className="flex justify-between">
          <Skeleton className="w-8 h-3" rounded="full" />
          <Skeleton className="w-16 h-3" rounded="full" />
        </div>
      </div>

      {/* ── Calendrier 30 jours ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
        <Skeleton className="w-28 h-3" rounded="full" />
        {/* Entêtes jours */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-4 mx-auto w-5" rounded="full" />
          ))}
          {/* Cellules calendrier */}
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5 py-1">
              <Skeleton className="w-6 h-6" rounded="full" />
              <Skeleton className="w-4 h-2" rounded="full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
