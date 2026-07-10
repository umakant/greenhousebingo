/** Builds the stored/display name for a host record. */
export function buildEventHostDisplayName(input: {
  firstName: string;
  lastName: string;
}): string {
  return [input.firstName.trim(), input.lastName.trim()].filter(Boolean).join(" ");
}

export function splitEventHostDisplayName(displayName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = displayName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim(),
  };
}
