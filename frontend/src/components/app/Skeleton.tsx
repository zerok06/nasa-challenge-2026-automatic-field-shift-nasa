/**
 * Skeletons — loading placeholders with the final layout.
 * Farmers on a slow connection see the shape of the answer instead of a blank
 * screen or a spinner that says nothing.
 */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-primary-100/70 ${className}`} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-3">
        <Skeleton className="h-20 flex-1" />
        <Skeleton className="h-20 flex-1" />
      </div>
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <Skeleton className="h-11 w-11 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/** Announces loading to screen readers while keeping the layout stable. */
export function SkeletonList({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div className="space-y-3" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonRow key={index} />
      ))}
    </div>
  );
}
