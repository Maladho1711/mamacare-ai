// ─── Skeleton liste des patientes ────────────────────────────────────────────

import Skeleton from '@/components/ui/Skeleton';

export default function SkeletonPatientList() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement des patientes">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <Skeleton className="w-28 h-6" rounded="md" />
        <Skeleton className="w-24 h-9" rounded="lg" />
      </div>

      {/* ── Barre de recherche ── */}
      <Skeleton className="w-full h-12" rounded="xl" />

      {/* ── Filtres statut + tri ── */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="w-16 h-7" rounded="full" />
        <Skeleton className="w-24 h-7" rounded="full" />
        <Skeleton className="w-24 h-7" rounded="full" />
        <div className="flex-1" />
        <Skeleton className="w-28 h-7" rounded="full" />
      </div>

      {/* ── Filtres avancés ── */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <Skeleton className="w-16 h-3" rounded="full" />
          <Skeleton className="w-20 h-7" rounded="full" />
          <Skeleton className="w-20 h-7" rounded="full" />
          <Skeleton className="w-20 h-7" rounded="full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-20 h-3" rounded="full" />
          <Skeleton className="w-24 h-7" rounded="full" />
          <Skeleton className="w-28 h-7" rounded="full" />
          <Skeleton className="w-24 h-7" rounded="full" />
        </div>
      </div>

      {/* ── Compteur + export ── */}
      <div className="flex items-center justify-between">
        <Skeleton className="w-24 h-3" rounded="full" />
        <Skeleton className="w-24 h-3" rounded="full" />
      </div>

      {/* ── Tableau : 6 lignes ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-3 ${i < 5 ? 'border-b border-gray-50' : ''}`}
          >
            <Skeleton className="w-8 h-8 shrink-0" rounded="full" />
            <Skeleton className="flex-1 h-4" rounded="full" />
            <Skeleton className="w-10 h-3" rounded="full" />
            <Skeleton className="w-16 h-3 hidden sm:block" rounded="full" />
            <Skeleton className="w-14 h-5" rounded="full" />
          </div>
        ))}
      </div>
    </div>
  );
}
