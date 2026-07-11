/**
 * Pure calculation helpers for event reports and scorecards.
 * Covered by unit tests — keep free of DB/IO.
 */

export function remainingCapacity(capacity: number | null, registrations: number): number | null {
  if (capacity == null) return null;
  return Math.max(0, capacity - registrations);
}

export function checkInRate(checkedIn: number, registered: number): number | null {
  if (registered <= 0) return null;
  return Math.round((checkedIn / registered) * 1000) / 10;
}

export function grossRevenue(parts: { ticket: number; bonus: number; sponsor: number; other: number }): number {
  return round2(parts.ticket + parts.bonus + parts.sponsor + parts.other);
}

export function totalExpenses(categories: Record<string, number>): number {
  return round2(Object.values(categories).reduce((s, v) => s + v, 0));
}

export function netProfit(gross: number, expenses: number): number {
  return round2(gross - expenses);
}

export function profitMarginPercent(gross: number, net: number): number | null {
  if (gross <= 0) return null;
  return Math.round((net / gross) * 1000) / 10;
}

export function breakEvenGap(breakEvenRevenue: number, collected: number): number {
  return round2(breakEvenRevenue - collected);
}

export function bonusCardAverage(counts: number[]): number | null {
  const buyers = counts.filter((c) => c > 0);
  if (buyers.length === 0) return null;
  return round2(buyers.reduce((s, c) => s + c, 0) / buyers.length);
}

export function plantRemaining(purchased: number, awarded: number, removed: number): number {
  return Math.max(0, purchased - awarded - removed);
}

export function inventoryGap(requested: number, available: number): number {
  return Math.max(0, requested - available);
}

export function average(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  return round2(nums.reduce((s, v) => s + v, 0) / nums.length);
}

export function marketingRoi(revenue: number, spend: number): number | null {
  if (spend <= 0) return null;
  return Math.round(((revenue - spend) / spend) * 1000) / 10;
}

export function attendanceScore(checkInRatePct: number | null, capacityPct: number | null): number {
  let score = 50;
  if (checkInRatePct != null) score += Math.min(30, Math.round(checkInRatePct * 0.3));
  if (capacityPct != null) score += Math.min(20, Math.round(capacityPct * 0.2));
  return Math.min(100, Math.max(0, score));
}

export function profitabilityScore(marginPct: number | null, netProfit: number): number {
  if (netProfit < 0) return Math.max(0, 30 + Math.round(netProfit / 100));
  if (marginPct == null) return netProfit > 0 ? 70 : 40;
  if (marginPct >= 30) return 95;
  if (marginPct >= 15) return 80;
  if (marginPct >= 5) return 65;
  return 50;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
