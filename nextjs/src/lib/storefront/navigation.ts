/** Day 20 — navigation trees stored on `Website.metadata.navigation` JSON. */
export type StorefrontNavLinkType = "page" | "product" | "collection" | "external" | "help";

export type StorefrontNavItem = {
  id: string;
  label: string;
  sortOrder: number;
  type: StorefrontNavLinkType;
  href?: string;
  targetId?: string;
  children?: StorefrontNavItem[];
};

export type StorefrontWebsiteNavigation = {
  main: StorefrontNavItem[];
  footer: StorefrontNavItem[];
  updatedAt?: string;
};

export function emptyNavigation(): StorefrontWebsiteNavigation {
  return { main: [], footer: [] };
}

export function parseWebsiteNavigationMetadata(raw: unknown): StorefrontWebsiteNavigation {
  if (!raw || typeof raw !== "object") return emptyNavigation();
  const o = raw as Record<string, unknown>;
  const main = Array.isArray(o.navigationMain) ? o.navigationMain : (o as { main?: unknown }).main;
  const footer = Array.isArray(o.navigationFooter) ? o.navigationFooter : (o as { footer?: unknown }).footer;
  if (Array.isArray(main) || Array.isArray(footer)) {
    return {
      main: Array.isArray(main) ? (main as StorefrontNavItem[]) : [],
      footer: Array.isArray(footer) ? (footer as StorefrontNavItem[]) : [],
    };
  }
  const nav = (o as { navigation?: unknown }).navigation;
  if (nav && typeof nav === "object") {
    const n = nav as StorefrontWebsiteNavigation;
    return { main: n.main ?? [], footer: n.footer ?? [] };
  }
  return emptyNavigation();
}

export function mergeNavigationIntoMetadata(
  existing: unknown,
  navigation: StorefrontWebsiteNavigation,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  base.navigation = navigation;
  return base;
}
