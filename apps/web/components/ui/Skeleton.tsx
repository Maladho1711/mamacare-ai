// ─── Skeleton — composant générique animé ────────────────────────────────────
// Usage :
//   <Skeleton className="w-full h-4" />                  → barre
//   <Skeleton className="w-10 h-10" rounded="full" />    → cercle avatar
//   <Skeleton className="w-full h-32" rounded="xl" />    → carte

interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const ROUNDED: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  sm:   'rounded-sm',
  md:   'rounded-md',
  lg:   'rounded-lg',
  xl:   'rounded-xl',
  '2xl':'rounded-2xl',
  full: 'rounded-full',
};

export default function Skeleton({ className = '', rounded = 'md' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`bg-gray-200 animate-pulse ${ROUNDED[rounded]} ${className}`}
    />
  );
}
