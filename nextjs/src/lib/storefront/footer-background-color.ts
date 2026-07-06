/**
 * Concept footer `--color-background` uses space-separated RGB triplets (`38 64 175`).
 * Merchants often think in `#RRGGBB`; we convert for the UI while preserving triplets on save.
 */

export function rgbTripletToHex(triplet: string): string {
  const t = triplet.trim();
  if (!t) return "#2640af";
  const hexLike = t.replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(hexLike)) {
    return `#${hexLike.toLowerCase()}`;
  }
  const parts = t
    .split(/[\s,]+/)
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => Number.isFinite(n));
  if (parts.length < 3) return "#2640af";
  const [r, g, b] = parts;
  const ch = (n: number) =>
    Math.max(0, Math.min(255, Number.isFinite(n) ? n : 0))
      .toString(16)
      .padStart(2, "0");
  return `#${ch(r!)}${ch(g!)}${ch(b!)}`;
}

export function hexToRgbTriplet(hex: string): string | null {
  let h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}
