/** Shared CSV helpers for Event Platform exports. */

export function escapeCsvCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csvRow(cells: unknown[]): string {
  return cells.map(escapeCsvCell).join(",");
}

export function csvFromRows(headers: string[], rows: unknown[][]): string {
  return [csvRow(headers), ...rows.map((r) => csvRow(r))].join("\n");
}
