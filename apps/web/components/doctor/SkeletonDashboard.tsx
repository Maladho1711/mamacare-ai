// ─── Skeleton Dashboard médecin ──────────────────────────────────────────────
// Reproduit visuellement la structure du dashboard pendant le chargement.

import Skeleton from '@/components/ui/Skeleton';

export default function SkeletonDashboard() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Chargement du dashboard">

      {/* ── Header : titre + bouton ── */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="w-32 h-6" rounded="md" />
          <Skeleton className="w-24 h-3" rounded="full" />
        </div>
        <Skeleton className="w-24 h-9" rounded="xl" />
      </div>

      {/* ── 4 stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 border border-transparent flex flex-col gap-2"
          >
            <Skeleton className="w-10 h-7" rounded="md" />
            <Skeleton className="w-20 h-3" rounded="full" />
          </div>
        ))}
      </div>

      {/* ── Filtres : 2 lignes de chips ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-16 h-3" rounded="full" />
          <Skeleton className="w-20 h-7" rounded="full" />
          <Skeleton className="w-20 h-7" rounded="full" />
          <Skeleton className="w-20 h-7" rounded="full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-16 h-3" rounded="full" />
          <Skeleton className="w-24 h-7" rounded="full" />
          <Skeleton className="w-28 h-7" rounded="full" />
          <Skeleton className="w-24 h-7" rounded="full" />
        </div>
      </div>

      {/* ── Tableau : 5 lignes ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="w-40 h-4" rounded="md" />
          <div className="flex gap-3">
            <Skeleton className="w-10 h-3" rounded="full" />
            <Skeleton className="w-16 h-3" rounded="full" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 ${i < 4 ? 'border-b border-gray-50' : ''}`}
            >
              {/* Avatar */}
              <Skeleton className="w-8 h-8 shrink-0" rounded="full" />
              {/* Nom */}
              <Skeleton className="flex-1 h-4" rounded="full" />
              {/* SA */}
              <Skeleton className="w-10 h-3" rounded="full" />
              {/* Dernier check */}
              <Skeleton className="w-16 h-3 hidden sm:block" rounded="full" />
              {/* Badge risque */}
              <Skeleton className="w-14 h-5" rounded="full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
