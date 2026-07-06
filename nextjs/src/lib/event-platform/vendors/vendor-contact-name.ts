export function splitVendorContactName(full: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const value = String(full ?? "").trim();
  if (!value) return { firstName: "", lastName: "" };
  const space = value.indexOf(" ");
  if (space === -1) return { firstName: value, lastName: "" };
  return {
    firstName: value.slice(0, space),
    lastName: value.slice(space + 1).trim(),
  };
}

export function joinVendorContactName(first: string, last: string): string | null {
  const joined = [first.trim(), last.trim()].filter(Boolean).join(" ");
  return joined || null;
}
