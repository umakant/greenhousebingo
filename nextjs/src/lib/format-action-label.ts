/**
 * Title-cases each word in action menu labels (first letter uppercase, rest lowercase).
 * e.g. "change password" → "Change Password", "login history" → "Login History".
 */
export function formatActionMenuLabel(text: string): string {
  const trimmed = text.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return trimmed;
  return parts
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}
