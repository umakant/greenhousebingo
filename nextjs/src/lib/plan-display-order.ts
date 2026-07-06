/** Minimal fields needed to order subscription tiers: Free → lowest paid → highest paid. */
export type PlanDisplaySortable = {
  freePlan?: boolean | null;
  packagePriceMonthly?: string | number | null;
  id?: string | number | bigint | null;
};

/** Free plan first, then ascending monthly price (e.g. Free → $25 → $99). */
export function sortPlansForDisplay<T extends PlanDisplaySortable>(plans: T[]): T[] {
  return [...plans].sort((a, b) => {
    const aFree = Boolean(a.freePlan);
    const bFree = Boolean(b.freePlan);
    if (aFree !== bFree) return aFree ? -1 : 1;

    const priceA = Number(a.packagePriceMonthly ?? 0);
    const priceB = Number(b.packagePriceMonthly ?? 0);
    if (priceA !== priceB) return priceA - priceB;

    const idA = String(a.id ?? "");
    const idB = String(b.id ?? "");
    return idA.localeCompare(idB, undefined, { numeric: true });
  });
}
