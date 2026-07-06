export function getPackageAlias(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  // Match Laravel UX: human-readable labels for module/type codes.
  return raw
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

