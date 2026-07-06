export function calcHoursFromTimes(start: string | null, end: string | null): number {
  if (!start || !end) return 8;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (!Number.isFinite(sh) || !Number.isFinite(eh)) return 8;
  const mins = eh * 60 + (em || 0) - (sh * 60 + (sm || 0));
  if (mins <= 0) return 8;
  return Math.round((mins / 60) * 10) / 10;
}

export function eachDateInRange(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  if (Number.isNaN(d.getTime()) || Number.isNaN(last.getTime())) return out;
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
