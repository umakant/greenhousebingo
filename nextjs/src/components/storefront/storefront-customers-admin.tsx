"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Filter, Loader2, Mail, RefreshCw, Users } from "lucide-react";

import type { WebsiteRow } from "@/components/storefront/storefront-websites-settings";
import {
  StorefrontAdminErrorAlert,
  StorefrontAdminMainCard,
  StorefrontAdminPageShell,
} from "@/components/storefront/storefront-admin-page-layout";
import NoRecordsFound from "@/components/no-records-found";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { t } from "@/lib/admin-t";

const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

type CustomerRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  websiteId: string;
  websiteName: string;
  orderCount: number;
};

type CustomerTab = "all" | "active" | "suspended";

function tabToStatus(tab: CustomerTab): string | undefined {
  if (tab === "active") return "active";
  if (tab === "suspended") return "suspended";
  return undefined;
}

function statusBadgeVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  const v = s.toLowerCase();
  if (v === "active") return "default";
  if (v === "suspended") return "secondary";
  return "outline";
}

export function StorefrontCustomersAdmin() {
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<CustomerTab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [websiteFilter, setWebsiteFilter] = useState("");

  const [detail, setDetail] = useState<CustomerRow | null>(null);

  const [websites, setWebsites] = useState<WebsiteRow[]>([]);

  const buildApiUrl = useCallback(
    (pathname: string, extraSearch?: Record<string, string | undefined>) => {
      const u = new URL(pathname, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      if (orgCtx?.isSuperadmin && selectedOrgId) {
        u.searchParams.set("organizationId", selectedOrgId);
      }
      if (extraSearch) {
        for (const [k, v] of Object.entries(extraSearch)) {
          if (v != null && v !== "") u.searchParams.set(k, v);
        }
      }
      return u.pathname + u.search;
    },
    [orgCtx?.isSuperadmin, selectedOrgId],
  );

  const orgReady = orgCtx != null && (!orgCtx.isSuperadmin || !!selectedOrgId);

  const handleSearch = () => {
    setQ(searchInput.trim());
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setOrgLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/storefront/organization-context", { credentials: "include" });
        const json = (await res.json()) as OrgContext & { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) throw new Error(json.message ?? "Failed to load organization context");
        if (cancelled) return;
        const c: OrgContext = {
          isSuperadmin: json.isSuperadmin,
          organizations: json.organizations ?? [],
          defaultOrganizationId: json.defaultOrganizationId ?? null,
        };
        setOrgCtx(c);
        let orgId: string | null = null;
        if (c.isSuperadmin) {
          const stored = typeof window !== "undefined" ? window.localStorage.getItem(ORG_STORAGE_KEY) : null;
          const ids = new Set(c.organizations.map((o) => o.id));
          if (stored && ids.has(stored)) orgId = stored;
          else orgId = c.defaultOrganizationId;
          if (orgId) {
            try {
              window.localStorage.setItem(ORG_STORAGE_KEY, orgId);
            } catch {
              /* ignore */
            }
          }
        } else {
          orgId = c.defaultOrganizationId;
        }
        setSelectedOrgId(orgId);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadWebsites = useCallback(async () => {
    if (!orgReady) return;
    try {
      const res = await fetch(buildApiUrl("/api/storefront/websites"), { credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; data?: WebsiteRow[] };
      if (res.ok && data.ok) setWebsites(data.data ?? []);
    } catch {
      setWebsites([]);
    }
  }, [buildApiUrl, orgReady]);

  const load = useCallback(async () => {
    if (!orgReady) {
      setLoading(false);
      setCustomers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base = buildApiUrl("/api/storefront/customers");
      const u = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      if (q.trim()) u.searchParams.set("q", q.trim());
      const st = tabToStatus(tab);
      if (st) u.searchParams.set("status", st);
      if (websiteFilter.trim()) u.searchParams.set("websiteId", websiteFilter.trim());
      const res = await fetch(u.pathname + u.search, { credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; customers?: CustomerRow[]; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setCustomers(data.customers ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, orgReady, q, tab, websiteFilter]);

  useEffect(() => {
    void loadWebsites();
  }, [loadWebsites]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchStatus = async (id: string, status: "active" | "suspended") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/customers/${encodeURIComponent(id)}`), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await load();
      setDetail((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const buildRowActions = (c: CustomerRow): TableActionItem[] => {
    const items: TableActionItem[] = [];
    if (c.status.toLowerCase() === "active") {
      items.push({ label: t("Suspend"), onSelect: () => void patchStatus(c.id, "suspended") });
    } else {
      items.push({ label: t("Activate"), onSelect: () => void patchStatus(c.id, "active") });
    }
    items.push({ label: t("View orders"), href: "/storefront/orders" });
    return items;
  };

  const showNoCustomersYet =
    customers.length === 0 && !q.trim() && !loading && tab === "all" && !websiteFilter;

  const hasFilters = !!q.trim() || tab !== "all" || !!websiteFilter;

  const activeFilterCount = (tab !== "all" ? 1 : 0) + (websiteFilter ? 1 : 0);

  if (orgLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">{t("Loading…")}</span>
      </div>
    );
  }

  return (
    <StorefrontAdminPageShell>
      <StorefrontAdminErrorAlert>{error}</StorefrontAdminErrorAlert>

      <StorefrontAdminMainCard contentClassName="p-0 sm:p-0">
        <div className="space-y-0">
          <div className="border-b bg-muted/30 p-4 sm:p-6">
            {orgCtx?.isSuperadmin ? (
              <div className="mb-4 flex flex-wrap items-end gap-4 border-b border-border/60 pb-4">
                <div className="min-w-[200px] max-w-xs space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">{t("Company")}</Label>
                  <Select
                    value={selectedOrgId ?? "__none__"}
                    onValueChange={(v) => {
                      if (v === "__none__") return;
                      setSelectedOrgId(v);
                      try {
                        window.localStorage.setItem(ORG_STORAGE_KEY, v);
                      } catch {
                        /* ignore */
                      }
                      void loadWebsites();
                      void load();
                    }}
                  >
                    <SelectTrigger className="h-11 bg-background">
                      <SelectValue placeholder={t("Select company")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled>
                        {t("Select company…")}
                      </SelectItem>
                      {orgCtx.organizations.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
              <div className="min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
                <SearchInput
                  value={searchInput}
                  onChange={setSearchInput}
                  onSearch={handleSearch}
                  placeholder={t("Search customers")}
                  buttonLabel={t("Search")}
                />
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
                {websites.length > 0 ? (
                  <Select value={websiteFilter || "__all__"} onValueChange={(v) => setWebsiteFilter(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="h-9 w-full min-w-0 sm:w-[200px]">
                      <SelectValue placeholder={t("All websites")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t("All websites")}</SelectItem>
                      {websites.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="default" className="relative">
                      <Filter className="mr-2 h-4 w-4" />
                      {t("Filters")}
                      {activeFilterCount > 0 ? (
                        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-2">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("Customers")}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={tab} onValueChange={(v) => setTab(v as CustomerTab)}>
                      <DropdownMenuRadioItem value="all">{t("All")}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="active">{t("Active")}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="suspended">{t("Suspended")}</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 shrink-0"
                  onClick={() => void load()}
                  disabled={loading}
                  aria-label={t("Refresh")}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            {showNoCustomersYet ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/5 px-6 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Users className="h-8 w-8 text-muted-foreground" aria-hidden />
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{t("No customers yet")}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {t("When shoppers create an account on your storefront, they will appear here with order counts and email verification.")}
                </p>
              </div>
            ) : loading && customers.length === 0 ? (
              <div className="flex justify-center py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : customers.length === 0 ? (
              <NoRecordsFound
                icon={Users}
                title={t("No customers match this view or search.")}
                description={t("Try another tab, website, or search term.")}
                hasFilters={hasFilters}
                onClearFilters={() => {
                  setTab("all");
                  setWebsiteFilter("");
                  setSearchInput("");
                  setQ("");
                }}
              />
            ) : (
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium text-muted-foreground">{t("Customer")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground md:table-cell">{t("Website")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground sm:table-cell">{t("Orders")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground lg:table-cell">{t("Verified")}</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">{t("Status")}</th>
                      <th className="p-3 text-right font-medium text-muted-foreground">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => {
                      const items = buildRowActions(c);
                      return (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{c.name?.trim() || t("No name")}</span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                                <span className="truncate">{c.email}</span>
                              </span>
                              <span className="text-xs text-muted-foreground md:hidden">{c.websiteName}</span>
                            </div>
                          </td>
                          <td className="hidden p-3 text-muted-foreground md:table-cell">{c.websiteName}</td>
                          <td className="hidden p-3 tabular-nums sm:table-cell">{c.orderCount}</td>
                          <td className="hidden p-3 lg:table-cell">
                            {c.emailVerifiedAt ? (
                              <Badge variant="outline" className="font-normal">
                                {t("Verified")}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">{t("Not verified")}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant={statusBadgeVariant(c.status)} className="font-normal capitalize">
                              {c.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <TableActionButton
                              label={t("Details")}
                              onPrimaryClick={() => setDetail(c)}
                              items={items}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </StorefrontAdminMainCard>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{detail?.name?.trim() || t("Customer")}</DialogTitle>
            <DialogDescription className="truncate font-mono text-xs">{detail?.email}</DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{t("Website")}</span>
                <span className="text-right font-medium">{detail.websiteName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{t("Phone")}</span>
                <span className="text-right">{detail.phone?.trim() || "—"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{t("Orders")}</span>
                <span className="text-right tabular-nums">{detail.orderCount}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{t("Joined")}</span>
                <span className="text-right">{new Date(detail.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{t("Email status")}</span>
                <span className="text-right">{detail.emailVerifiedAt ? t("Verified") : t("Not verified")}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{t("Account status")}</span>
                <Badge variant={statusBadgeVariant(detail.status)} className="capitalize">
                  {detail.status}
                </Badge>
              </div>
            </div>
          ) : null}
          <Separator />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDetail(null)}>
              {t("Close")}
            </Button>
            {detail ? (
              <Button type="button" asChild variant="secondary">
                <Link href="/storefront/orders">{t("Open orders")}</Link>
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StorefrontAdminPageShell>
  );
}
