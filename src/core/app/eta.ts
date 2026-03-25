import { CNPJA_OPEN_RATE_LIMIT_INTERVAL_MS } from "../simples/cnpja-open.constants";

export function estimateObservedRemainingMs(
  elapsedMs: number,
  completedUniqueLookups: number,
  totalUniqueLookups: number,
): number {
  if (completedUniqueLookups === 0) {
    return totalUniqueLookups * CNPJA_OPEN_RATE_LIMIT_INTERVAL_MS;
  }

  const observedAverageMs = elapsedMs / completedUniqueLookups;
  const remainingLookups = Math.max(
    0,
    totalUniqueLookups - completedUniqueLookups,
  );

  return Math.round(
    Math.max(CNPJA_OPEN_RATE_LIMIT_INTERVAL_MS, observedAverageMs) *
      remainingLookups,
  );
}
