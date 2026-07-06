import type { NavItem } from "@/types";

export type NavSearchEntry = {
  id: string;
  title: string;
  href: string;
  /** Optional menu `name` (e.g. "storefront") for keyword search */
  name?: string;
  /** Parent section labels (untranslated menu titles) for matching and display context */
  breadcrumbs: string[];
  /** Optional extra keywords (settings tabs, aliases) */
  keywords?: string[];
};

function pushEntries(items: NavItem[], ancestors: string[], out: NavSearchEntry[]) {
  for (const item of items) {
    const chain = [...ancestors, item.title];
    const href = item.href?.trim();
    if (href && href !== "#") {
      out.push({
        id: `${href}::${chain.join(" › ")}`,
        title: item.title,
        href,
        name: item.name,
        breadcrumbs: ancestors,
      });
    }
    if (item.children?.length) {
      pushEntries(item.children, chain, out);
    }
  }
}

/** All navigable links the user can access, for global search / command palette. */
export function flattenNavForSearch(items: NavItem[]): NavSearchEntry[] {
  const out: NavSearchEntry[] = [];
  pushEntries(items, [], out);
  return out;
}

function normalizeHrefKey(href: string): string {
  const [pathPart, queryPart] = href.split("?");
  const path = (pathPart ?? href).replace(/\/+$/, "") || "/";
  if (!queryPart) return path;
  const params = new URLSearchParams(queryPart);
  const tab = params.get("tab")?.trim().toLowerCase();
  if (tab) return `${path}?tab=${tab}`;
  return path;
}

function entrySearchHaystack(e: NavSearchEntry): string {
  const parts = [e.title, e.name ?? "", e.href, ...e.breadcrumbs, ...(e.keywords ?? [])];
  const slugParts = e.href.split(/[/?=&-]/).filter(Boolean);
  return [...parts, ...slugParts].join(" ").toLowerCase();
}

export function filterNavSearchEntries(entries: NavSearchEntry[], query: string): NavSearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;

  const tokens = q.split(/\s+/).filter(Boolean);

  return entries.filter((e) => {
    const haystack = entrySearchHaystack(e);
    if (tokens.length > 1) return tokens.every((token) => haystack.includes(token));
    return haystack.includes(q);
  });
}

/** Prefer first-seen entry per path; superadmin + company menus may overlap. */
export function dedupeSearchEntriesByHref(entries: NavSearchEntry[]): NavSearchEntry[] {
  const seen = new Map<string, NavSearchEntry>();
  for (const e of entries) {
    const key = normalizeHrefKey(e.href);
    if (!seen.has(key)) seen.set(key, e);
  }
  return [...seen.values()];
}

export function mergeSearchEntryLists(a: NavSearchEntry[], b: NavSearchEntry[]): NavSearchEntry[] {
  return dedupeSearchEntriesByHref([...a, ...b]);
}
