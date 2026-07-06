export type TimePeriod = "AM" | "PM";

export function parseTime24(value: string): { hour12: number; minute: number; period: TimePeriod } {
  const [hRaw, mRaw] = (value || "09:00").split(":");
  const h24 = Number(hRaw);
  const minute = Math.min(59, Math.max(0, Number.isNaN(Number(mRaw)) ? 0 : Number(mRaw)));
  const period: TimePeriod = !Number.isNaN(h24) && h24 >= 12 ? "PM" : "AM";
  let hour12 = !Number.isNaN(h24) ? h24 % 12 : 9;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, period };
}

export function toTime24(hour12: number, minute: number, period: TimePeriod): string {
  const h = Math.min(12, Math.max(1, hour12));
  const m = Math.min(59, Math.max(0, minute));
  let h24: number;
  if (period === "AM") {
    h24 = h === 12 ? 0 : h;
  } else {
    h24 = h === 12 ? 12 : h + 12;
  }
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatTime12h(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const { hour12, minute, period } = parseTime24(value);
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}
