/** Builds the stored/display name for a sponsor record. */
export function buildEventSponsorName(input: {
  firstName: string;
  lastName: string;
  company?: string | null;
}): string {
  const company = input.company?.trim();
  if (company) return company;
  return [input.firstName.trim(), input.lastName.trim()].filter(Boolean).join(" ");
}

export function formatEventSponsorPersonName(input: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  return [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean).join(" ");
}
