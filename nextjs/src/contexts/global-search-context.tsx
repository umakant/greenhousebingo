"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Search, User } from "lucide-react";

import { getGlobalSearchEntries } from "@/utils/menu";
import { filterNavSearchEntries, type NavSearchEntry } from "@/utils/flatten-nav-for-search";
import { useTranslation } from "@/contexts/translation-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type GlobalSearchUser = {
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
};

type GlobalSearchContextValue = {
  openSearch: () => void;
};

const GlobalSearchContext = React.createContext<GlobalSearchContextValue | null>(null);

export function useGlobalSearch(): GlobalSearchContextValue {
  const ctx = React.useContext(GlobalSearchContext);
  if (!ctx) {
    throw new Error("useGlobalSearch must be used within GlobalSearchProvider");
  }
  return ctx;
}

function searchShortcutLabel(): string {
  if (typeof navigator === "undefined") return "Ctrl+K";
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘K" : "Ctrl+K";
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

type SearchRow =
  | { kind: "nav"; entry: NavSearchEntry }
  | {
      kind: "company";
      id: string;
      title: string;
      subtitle: string | null;
      href: string;
      planName: string | null;
    }
  | { kind: "user"; id: string; title: string; subtitle: string | null; href: string };

function GlobalSearchDialog({
  open,
  onOpenChange,
  entries,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: NavSearchEntry[];
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(query, 280);

  const [entityLoading, setEntityLoading] = React.useState(false);
  const [companies, setCompanies] = React.useState<
    { id: string; title: string; subtitle: string | null; href: string; planName: string | null }[]
  >([]);
  const [users, setUsers] = React.useState<{ id: string; title: string; subtitle: string | null; href: string }[]>([]);

  const navFiltered = React.useMemo(() => filterNavSearchEntries(entries, query), [entries, query]);

  React.useEffect(() => {
    if (!open) return;
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setCompanies([]);
      setUsers([]);
      setEntityLoading(false);
      return;
    }

    let cancelled = false;
    setEntityLoading(true);
    fetch(`/api/global-search?q=${encodeURIComponent(q)}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data: { ok?: boolean; companies?: typeof companies; users?: typeof users }) => {
        if (cancelled || !data?.ok) return;
        setCompanies(data.companies ?? []);
        setUsers(data.users ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setCompanies([]);
          setUsers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setEntityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  const rows: SearchRow[] = React.useMemo(() => {
    const out: SearchRow[] = [];
    for (const e of navFiltered) out.push({ kind: "nav", entry: e });
    for (const c of companies) {
      out.push({
        kind: "company",
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        href: c.href,
        planName: c.planName,
      });
    }
    for (const u of users) {
      out.push({ kind: "user", id: u.id, title: u.title, subtitle: u.subtitle, href: u.href });
    }
    return out;
  }, [navFiltered, companies, users]);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setCompanies([]);
      setUsers([]);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  React.useEffect(() => {
    setSelected((i) => (rows.length === 0 ? 0 : Math.min(i, rows.length - 1)));
  }, [rows.length, query]);

  const go = React.useCallback(
    (row: SearchRow) => {
      onOpenChange(false);
      router.push(row.kind === "nav" ? row.entry.href : row.href);
    },
    [onOpenChange, router],
  );

  const onKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      if (!rows.length) return;
      setSelected((i) => (i + 1) % rows.length);
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      if (!rows.length) return;
      setSelected((i) => (i - 1 + rows.length) % rows.length);
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      const row = rows[selected];
      if (row) go(row);
    }
  };

  const hasEntityGroups = companies.length > 0 || users.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[12%] max-h-[min(560px,85vh)] translate-y-0 sm:max-w-lg gap-3 p-0 overflow-hidden flex flex-col"
        onKeyDown={onKeyDown}
        aria-describedby={undefined}
      >
        <DialogHeader className="px-4 pt-4 pb-0 space-y-1">
          <DialogTitle className="sr-only">{t("Search")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("Search pages, companies, and users")}
          </DialogDescription>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search pages, companies, users, plans…")}
              autoComplete="off"
              className="pl-9 h-11"
              aria-controls="global-search-results"
            />
          </div>
        </DialogHeader>
        <ScrollArea className="h-[min(320px,45vh)] border-t">
          <div id="global-search-results" className="p-2 pb-3" role="listbox" aria-label={t("Search results")}>
            {entityLoading && query.trim().length >= 2 ? (
              <p className="text-xs text-muted-foreground px-2 py-1">{t("Searching directory…")}</p>
            ) : null}

            {rows.length === 0 && !entityLoading ? (
              <p className="text-sm text-muted-foreground px-2 py-6 text-center">{t("No results")}</p>
            ) : (
              rows.map((row, index) => {
                const isFirstNav = row.kind === "nav" && (index === 0 || rows[index - 1]?.kind !== "nav");
                const showPagesGroup = isFirstNav && hasEntityGroups;
                const companyHeader = row.kind === "company" && (index === 0 || rows[index - 1]?.kind !== "company");
                const userHeader = row.kind === "user" && (index === 0 || rows[index - 1]?.kind !== "user");

                return (
                  <React.Fragment key={row.kind === "nav" ? row.entry.id : `${row.kind}-${row.id}`}>
                    {showPagesGroup ? (
                      <div className="px-2 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("Pages")}
                      </div>
                    ) : null}
                    {companyHeader ? (
                      <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-3 w-3" aria-hidden />
                        {t("Companies")}
                      </div>
                    ) : null}
                    {userHeader ? (
                      <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <User className="h-3 w-3" aria-hidden />
                        {t("Users")}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      role="option"
                      aria-selected={index === selected}
                      className={cn(
                        "flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
                        index === selected ? "bg-accent text-accent-foreground" : "hover:bg-muted/80",
                      )}
                      onMouseEnter={() => setSelected(index)}
                      onClick={() => go(row)}
                    >
                      {row.kind === "nav" ? (
                        <>
                          <span className="font-medium">{t(row.entry.title)}</span>
                          {row.entry.breadcrumbs.length > 0 ? (
                            <span className="text-xs text-muted-foreground truncate">
                              {row.entry.breadcrumbs.map((b) => t(b)).join(" › ")}
                            </span>
                          ) : null}
                          <span className="text-[11px] text-muted-foreground/80 font-mono truncate">{row.entry.href}</span>
                        </>
                      ) : row.kind === "company" ? (
                        <>
                          <span className="font-medium">{row.title}</span>
                          {row.subtitle ? (
                            <span className="text-xs text-muted-foreground truncate">{row.subtitle}</span>
                          ) : null}
                          {row.planName ? (
                            <span className="text-[11px] text-muted-foreground">
                              {t("Plan")}: {row.planName}
                            </span>
                          ) : null}
                          <span className="text-[11px] text-muted-foreground/80 font-mono truncate">{row.href}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{row.title}</span>
                          {row.subtitle ? (
                            <span className="text-xs text-muted-foreground truncate">{row.subtitle}</span>
                          ) : null}
                          <span className="text-[11px] text-muted-foreground/80 font-mono truncate">{row.href}</span>
                        </>
                      )}
                    </button>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </ScrollArea>
        <div className="px-4 py-2 border-t text-[11px] text-muted-foreground">
          {t("Arrow keys to select · Enter to open · Esc to close")}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GlobalSearchProvider({
  children,
  user,
}: React.PropsWithChildren<{ user: GlobalSearchUser }>) {
  const [open, setOpen] = React.useState(false);

  const entries = React.useMemo(
    () =>
      getGlobalSearchEntries({
        roles: user.roles,
        permissions: user.permissions,
        activatedPackages: user.activatedPackages ?? [],
      }),
    [user.roles, user.permissions, user.activatedPackages],
  );

  const openSearch = React.useCallback(() => setOpen(true), []);

  React.useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.defaultPrevented) return;
      const isK = ev.key === "k" || ev.key === "K";
      if (!isK || !(ev.metaKey || ev.ctrlKey)) return;
      const target = ev.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
          return;
        }
      }
      ev.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = React.useMemo(() => ({ openSearch }), [openSearch]);

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
      <GlobalSearchDialog open={open} onOpenChange={setOpen} entries={entries} />
    </GlobalSearchContext.Provider>
  );
}

export { searchShortcutLabel };
