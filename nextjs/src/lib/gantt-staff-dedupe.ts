export function ganttStaffMergeKey(row: { name: string; email?: string | null }): string {
  const email = row.email?.trim().toLowerCase();
  if (email) return `email:${email}`;
  return `name:${row.name.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

export function dedupeGanttStaffList<T extends { id: string; name: string; email?: string | null }>(
  rows: T[],
): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = ganttStaffMergeKey(row);
    if (!map.has(key)) map.set(key, row);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
