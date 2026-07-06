/**
 * Recursively convert values so `NextResponse.json` / `JSON.stringify` never hits a raw `bigint`
 * (Prisma `BigInt` fields). Also stringifies Prisma `Decimal` for JSON.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function jsonSafe(v: any): any {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(jsonSafe);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && v.constructor?.name === "Decimal") return v.toString();
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v)) out[k] = jsonSafe(v[k]);
    return out;
  }
  return v;
}
