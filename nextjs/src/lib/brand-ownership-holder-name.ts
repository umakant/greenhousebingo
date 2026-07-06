export function splitHolderName(
  fullName: string,
  firstName?: string | null,
  lastName?: string | null,
): { firstName: string; lastName: string } {
  if (firstName?.trim() || lastName?.trim()) {
    return { firstName: firstName?.trim() ?? "", lastName: lastName?.trim() ?? "" };
  }
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) return { firstName: trimmed, lastName: "" };
  return { firstName: trimmed.slice(0, spaceIdx), lastName: trimmed.slice(spaceIdx + 1).trim() };
}

export function combineHolderName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}
