import type { ReaderMode } from "@/lib/store/reader";

/**
 * Group page indices into the "spreads" the reader paginates over.
 *
 * - single / strip → one page per spread: `[[0],[1],[2],…]`
 * - double         → two pages per spread, optionally leaving the first page
 *                    (the cover) on its own: `[[0],[1,2],[3,4],…]`
 *
 * Pure (no DOM/React) so it can be unit-tested and shared with the strip view.
 */
export function buildSpreads(
  total: number,
  mode: ReaderMode,
  doubleCover: boolean,
): number[][] {
  if (total <= 0) return [];
  if (mode !== "double") {
    return Array.from({ length: total }, (_, i) => [i]);
  }

  const spreads: number[][] = [];
  let i = 0;
  if (doubleCover) {
    spreads.push([0]);
    i = 1;
  }
  for (; i < total; i += 2) {
    spreads.push(i + 1 < total ? [i, i + 1] : [i]);
  }
  return spreads;
}

/** Index of the spread that contains `page` (0 if not found). */
export function spreadIndexForPage(spreads: number[][], page: number): number {
  const idx = spreads.findIndex((s) => s.includes(page));
  return idx === -1 ? 0 : idx;
}
