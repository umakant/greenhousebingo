/** Display full name for CRM leads (lists, emails, dashboard). */
export function formatCrmLeadFullName(firstName: string, lastName: string | null | undefined): string {
  const f = (firstName ?? "").trim();
  const l = (lastName ?? "").trim();
  if (!f && !l) return "—";
  return [f, l].filter(Boolean).join(" ");
}

/** Split a single full-name string from storefront forms into first + last. */
export function parseFullNameToLeadParts(fullName: string): { firstName: string; lastName: string | null } {
  const t = fullName.trim();
  if (!t) return { firstName: "", lastName: null };
  const i = t.indexOf(" ");
  if (i === -1) return { firstName: t, lastName: null };
  const first = t.slice(0, i).trim();
  const rest = t.slice(i + 1).trim();
  return { firstName: first || t, lastName: rest || null };
}
