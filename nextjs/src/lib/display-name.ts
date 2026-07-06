/** Build users.name from first + last (stored as a single column today). */
export function combineDisplayName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

/** Split users.name for edit forms (first token = first name, remainder = last name). */
export function splitDisplayName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const t = (fullName ?? "").trim();
  if (!t) return { firstName: "", lastName: "" };
  const space = t.indexOf(" ");
  if (space === -1) return { firstName: t, lastName: "" };
  return { firstName: t.slice(0, space), lastName: t.slice(space + 1).trim() };
}
