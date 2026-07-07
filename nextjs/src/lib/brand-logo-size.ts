import type { CSSProperties } from "react";

export const DEFAULT_BRAND_LOGO_WIDTH = 220;
export const DEFAULT_BRAND_LOGO_HEIGHT = 65;

export type BrandLogoPosition = "left" | "center" | "right";

export const DEFAULT_BRAND_LOGO_POSITION: BrandLogoPosition = "left";

export const BRAND_LOGO_POSITIONS: BrandLogoPosition[] = ["left", "center", "right"];

export function parseBrandLogoDimension(
  value: string | undefined | null,
  fallback: number,
): number {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function brandLogoImageStyle(
  width: string | undefined | null,
  height: string | undefined | null,
): CSSProperties {
  const w = parseBrandLogoDimension(width, DEFAULT_BRAND_LOGO_WIDTH);
  const h = parseBrandLogoDimension(height, DEFAULT_BRAND_LOGO_HEIGHT);
  return {
    maxWidth: w,
    maxHeight: h,
    width: "auto",
    height: "auto",
  };
}

export function brandLogoPreviewBoxStyle(
  width: string | undefined | null,
  height: string | undefined | null,
): CSSProperties {
  const w = parseBrandLogoDimension(width, DEFAULT_BRAND_LOGO_WIDTH);
  const h = parseBrandLogoDimension(height, DEFAULT_BRAND_LOGO_HEIGHT);
  return { minHeight: h, aspectRatio: `${w} / ${h}` };
}

export function resolveBrandLogoWidth(
  settings: Record<string, string | undefined | null> | null | undefined,
): string {
  const s = settings ?? {};
  const value =
    String(s.logo_dark_width ?? "").trim() ||
    String(s.logo_light_width ?? "").trim();
  return value || String(DEFAULT_BRAND_LOGO_WIDTH);
}

export function resolveBrandLogoHeight(
  settings: Record<string, string | undefined | null> | null | undefined,
): string {
  const s = settings ?? {};
  const value =
    String(s.logo_dark_height ?? "").trim() ||
    String(s.logo_light_height ?? "").trim();
  return value || String(DEFAULT_BRAND_LOGO_HEIGHT);
}

export function syncBrandLogoDimensions(
  width: string,
  height: string,
): Record<"logo_dark_width" | "logo_dark_height" | "logo_light_width" | "logo_light_height", string> {
  return {
    logo_dark_width: width,
    logo_dark_height: height,
    logo_light_width: width,
    logo_light_height: height,
  };
}

export function resolveBrandLogoPosition(
  settings: Record<string, string | undefined | null> | null | undefined,
): BrandLogoPosition {
  const value = String(settings?.logo_position ?? "").trim().toLowerCase();
  if (value === "center" || value === "right") return value;
  return DEFAULT_BRAND_LOGO_POSITION;
}

export function brandLogoAlignClasses(position: BrandLogoPosition): {
  container: string;
  image: string;
} {
  switch (position) {
    case "center":
      return { container: "justify-center", image: "object-center" };
    case "right":
      return { container: "justify-end", image: "object-right" };
    default:
      return { container: "justify-start", image: "object-left" };
  }
}
