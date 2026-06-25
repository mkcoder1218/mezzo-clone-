/**
 * MatchCardSkeleton – mirrors the exact layout of MatchCard (desktop version).
 * Shows: league row, teams row, and 3-column odds grid with placeholder buttons.
 */
export default function MatchCardSkeleton({ isCompact = false }: { isCompact?: boolean }) {
  return (
    <>
      {/* Mobile skeleton */}
      <div className="lg:hidden flex flex-col bg-brand-surface border border-brand-border rounded-xl p-1 px-4 mb-2 gap-2">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1.5">
            <div className="skeleton h-3.5 w-32" />
            <div className="skeleton h-3.5 w-28" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="skeleton h-2.5 w-16" />
            <div className="skeleton h-4 w-10 rounded-sm" />
          </div>
        </div>
        <div className="flex gap-1.5 h-10">
          <div className="skeleton flex-1 h-8 rounded-[3px]" />
          <div className="skeleton flex-1 h-8 rounded-[3px]" />
          <div className="skeleton flex-1 h-8 rounded-[3px]" />
        </div>
      </div>

      {/* Desktop skeleton */}
      <div className="hidden lg:flex flex-col border-b border-white/[0.05] p-1 px-6">
        {/* Row 1: League & Time */}
        {!isCompact && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="skeleton w-3.5 h-3.5 rounded-full" />
              <div className="skeleton h-2.5 w-40" />
            </div>
            <div className="skeleton h-2.5 w-20" />
          </div>
        )}

        {/* Row 2: Teams & Side Bets */}
        <div className="flex items-center justify-between py-1">
          <div className="skeleton h-3.5 w-56" />
          {!isCompact && (
            <div className="skeleton h-5 w-28 rounded" />
          )}
        </div>

        {/* Row 3: Odds Grid – 3 groups */}
        <div className={`grid items-center border-t border-white/[0.03] ${isCompact ? "grid-cols-[1.5fr_1.5fr_1fr]" : "grid-cols-[1.5fr_1.5fr_1fr]"}`}>
          {/* Match Result */}
          <div className="flex gap-0.5 w-full pr-3 border-r border-white/50 py-2">
            <div className="skeleton flex-1 h-8 rounded-[3px]" />
            <div className="skeleton flex-1 h-8 rounded-[3px]" />
            <div className="skeleton flex-1 h-8 rounded-[3px]" />
          </div>
          {/* Double Chance */}
          <div className="flex gap-0.5 w-full px-3 border-r border-white/50 py-2">
            <div className="skeleton flex-1 h-8 rounded-[3px]" />
            <div className="skeleton flex-1 h-8 rounded-[3px]" />
            <div className="skeleton flex-1 h-8 rounded-[3px]" />
          </div>
          {/* Both Score */}
          <div className="flex gap-0.5 w-full pl-3 py-2">
            <div className="skeleton flex-1 h-8 rounded-[3px]" />
            <div className="skeleton flex-1 h-8 rounded-[3px]" />
          </div>
        </div>
      </div>
    </>
  );
}

/** Renders N skeleton cards. */
export function MatchCardSkeletonList({ count = 6, isCompact = false }: { count?: number; isCompact?: boolean }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <MatchCardSkeleton isCompact={isCompact} />
        </div>
      ))}
    </>
  );
}
