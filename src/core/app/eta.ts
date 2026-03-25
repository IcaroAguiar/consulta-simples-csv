export function estimateObservedRemainingMs(
  elapsedMs: number,
  completedUniqueLookups: number,
  totalUniqueLookups: number,
): number {
  if (completedUniqueLookups === 0) {
    return totalUniqueLookups * 12_000;
  }

  const observedAverageMs = elapsedMs / completedUniqueLookups;
  const remainingLookups = Math.max(
    0,
    totalUniqueLookups - completedUniqueLookups,
  );

  return Math.round(Math.max(12_000, observedAverageMs) * remainingLookups);
}
