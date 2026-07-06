"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MoreHorizontal, Plus, RefreshCw, Truck } from "lucide-react";

import { appConfirm } from "@/lib/app-confirm";

import {
  StorefrontAdminErrorAlert,
  StorefrontAdminMainCard,
  StorefrontAdminPageShell,
} from "@/components/storefront/storefront-admin-page-layout";
import NoRecordsFound from "@/components/no-records-found";
import type { WebsiteRow } from "@/components/storefront/storefront-websites-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/lib/admin-t";

const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

type MethodRow = {
  id: string;
  name: string;
  methodKey: string;
  flatRate: number;
  sortOrder: number;
  isActive: boolean;
};

type ZoneRow = {
  id: string;
  websiteId: string | null;
  name: string;
  countries: unknown;
  isActive: boolean;
  sortOrder: number;
  methods: MethodRow[];
};

type ZoneTab = "all" | "active" | "inactive";

function formatCountries(c: unknown): string {
  if (Array.isArray(c)) return c.map((x) => String(x).toUpperCase()).join(", ");
  if (c && typeof c === "object" && "list" in c && Array.isArray((c as { list: unknown }).list)) {
    return (c as { list: string[] }).list.map((x) => String(x).toUpperCase()).join(", ");
  }
  if (typeof c === "string") return c;
  try {
    return JSON.stringify(c);
  } catch {
    return "—";
  }
}

function parseCountriesInput(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase().slice(0, 2))
    .filter(Boolean);
}

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

function filterByTab(zones: ZoneRow[], tab: ZoneTab): ZoneRow[] {
  if (tab === "active") return zones.filter((z) => z.isActive);
  if (tab === "inactive") return zones.filter((z) => !z.isActive);
  return zones;
}

export function StorefrontShippingAdmin() {
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ZoneTab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [zoneDraft, setZoneDraft] = useState({ name: "", countries: "US", websiteId: "" as string });

  const [ratesZoneId, setRatesZoneId] = useState<string | null>(null);
  const [methodDraft, setMethodDraft] = useState({ name: "Standard", methodKey: "standard", flatRate: "5" });

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

  const ratesZone = useMemo(() => zones.find((z) => z.id === ratesZoneId) ?? null, [zones, ratesZoneId]);

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
      setZones([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base = buildApiUrl("/api/storefront/shipping-zones");
      const u = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      if (q.trim()) u.searchParams.set("q", q.trim());
      const res = await fetch(u.pathname + u.search, { credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; zones?: ZoneRow[]; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setZones(data.zones ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, orgReady, q]);

  useEffect(() => {
    void loadWebsites();
  }, [loadWebsites]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleZones = useMemo(() => filterByTab(zones, tab), [zones, tab]);

  const patchZone = async (id: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/shipping-zones/${encodeURIComponent(id)}`), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const deleteZone = async (id: string) => {
    if (!(await appConfirm(t("Delete this zone and all of its shipping rates?")))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/shipping-zones/${encodeURIComponent(id)}`), {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      if (ratesZoneId === id) setRatesZoneId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const buildZoneRowActions = (z: ZoneRow): TableActionItem[] => {
    const items: TableActionItem[] = [];
    if (z.isActive) {
      items.push({ label: t("Deactivate zone"), onSelect: () => void patchZone(z.id, { isActive: false }) });
    } else {
      items.push({ label: t("Activate zone"), onSelect: () => void patchZone(z.id, { isActive: true }) });
    }
    items.push({ label: t("Delete zone"), onSelect: () => void deleteZone(z.id), destructive: true });
    return items;
  };

  const createZone = async () => {
    const countries = parseCountriesInput(zoneDraft.countries);
    if (!zoneDraft.name.trim() || countries.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/shipping-zones"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: zoneDraft.name.trim(),
          countries,
          websiteId: zoneDraft.websiteId || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setCreateOpen(false);
      setZoneDraft({ name: "", countries: "US", websiteId: "" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const createMethod = async (zoneId: string) => {
    if (!zoneId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/shipping-methods"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          zoneId,
          name: methodDraft.name.trim(),
          methodKey: methodDraft.methodKey.trim().toLowerCase(),
          flatRate: Number(methodDraft.flatRate),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setMethodDraft({ name: "Standard", methodKey: "standard", flatRate: "5" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const patchMethod = async (id: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/shipping-methods/${encodeURIComponent(id)}`), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const deleteMethod = async (id: string) => {
    if (!(await appConfirm(t("Remove this shipping rate?")))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/shipping-methods/${encodeURIComponent(id)}`), {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const showFirstZoneEmpty = zones.length === 0 && !q.trim() && !loading;

  const hasFilters = !!q.trim() || tab !== "all";

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
              <div className="w-full shrink-0 lg:w-auto">
                <Tabs value={tab} onValueChange={(v) => setTab(v as ZoneTab)} className="w-full sm:w-auto">
                  <TabsList className="grid h-auto w-full grid-cols-3 gap-1 sm:flex sm:h-10 sm:w-auto">
                    <TabsTrigger value="all" className="text-xs sm:text-sm">
                      {t("All")}
                    </TabsTrigger>
                    <TabsTrigger value="active" className="text-xs sm:text-sm">
                      {t("Active")}
                    </TabsTrigger>
                    <TabsTrigger value="inactive" className="text-xs sm:text-sm">
                      {t("Inactive")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex min-w-0 w-full max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:max-w-2xl lg:flex-1 lg:justify-end">
                <div className="min-w-0 w-full max-w-full sm:max-w-md lg:flex-1">
                  <SearchInput
                    value={searchInput}
                    onChange={setSearchInput}
                    onSearch={handleSearch}
                    placeholder={t("Search zones")}
                    buttonLabel={t("Search")}
                  />
                </div>
                <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
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
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1"
                    onClick={() => setCreateOpen(true)}
                    disabled={!orgReady || loading}
                  >
                    <Plus className="h-4 w-4" />
                    {t("Add delivery zone")}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            {showFirstZoneEmpty ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/5 px-6 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Truck className="h-8 w-8 text-muted-foreground" aria-hidden />
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{t("Set up shipping zones")}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {t("Create a zone for each region you ship to, then add flat rates with checkout keys your storefront can use.")}
                </p>
                <Button type="button" size="sm" className="mt-8 gap-1" onClick={() => setCreateOpen(true)} disabled={!orgReady}>
                  <Plus className="h-4 w-4" />
                  {t("Add delivery zone")}
                </Button>
              </div>
            ) : loading && zones.length === 0 ? (
              <div className="flex justify-center py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : visibleZones.length === 0 ? (
              <NoRecordsFound
                icon={Truck}
                title={t("No zones match this view or search.")}
                description={t("Try another tab or search term, or add a new zone.")}
                hasFilters={hasFilters}
                onClearFilters={() => {
                  setTab("all");
                  setSearchInput("");
                  setQ("");
                }}
              />
            ) : (
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium text-muted-foreground">{t("Zone")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground md:table-cell">{t("Markets")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground sm:table-cell">{t("Rates")}</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">{t("Status")}</th>
                      <th className="p-3 text-right font-medium text-muted-foreground">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleZones.map((z) => {
                      const items = buildZoneRowActions(z);
                      return (
                        <tr key={z.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3 font-medium">
                            <div className="flex flex-col gap-0.5">
                              <span>{z.name}</span>
                              <span className="text-xs font-normal text-muted-foreground md:hidden">{formatCountries(z.countries)}</span>
                            </div>
                          </td>
                          <td className="hidden max-w-[220px] truncate p-3 text-muted-foreground md:table-cell">
                            {formatCountries(z.countries)}
                          </td>
                          <td className="hidden p-3 text-muted-foreground sm:table-cell">
                            {z.methods.length === 0
                              ? t("None")
                              : `${z.methods.length} ${z.methods.length === 1 ? t("rate") : t("rates")}`}
                          </td>
                          <td className="p-3">
                            <Badge variant={z.isActive ? "default" : "secondary"} className="font-normal">
                              {z.isActive ? t("Active") : t("Inactive")}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <TableActionButton
                              label={t("Manage rates")}
                              onPrimaryClick={() => setRatesZoneId(z.id)}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Add delivery zone")}</DialogTitle>
            <DialogDescription>{t("Name the zone and list ISO country codes. Customers in those markets can use the rates you attach next.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20 py-3">
                <CardTitle className="text-sm font-semibold">{t("Zone")}</CardTitle>
                <CardDescription className="text-xs">{t("Markets are matched using two-letter country codes.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="sz-name">{t("Zone name")}</Label>
                  <Input
                    id="sz-name"
                    value={zoneDraft.name}
                    onChange={(e) => setZoneDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder={t("Domestic")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sz-countries">{t("Countries (comma-separated ISO codes)")}</Label>
                  <Input
                    id="sz-countries"
                    value={zoneDraft.countries}
                    onChange={(e) => setZoneDraft((d) => ({ ...d, countries: e.target.value }))}
                    placeholder="US, CA"
                  />
                </div>
                {websites.length > 0 ? (
                  <div className="space-y-2">
                    <Label>{t("Website (optional)")}</Label>
                    <Select value={zoneDraft.websiteId || "__all__"} onValueChange={(v) => setZoneDraft((d) => ({ ...d, websiteId: v === "__all__" ? "" : v }))}>
                      <SelectTrigger>
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
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
          <Separator />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void createZone()}
              disabled={!zoneDraft.name.trim() || parseCountriesInput(zoneDraft.countries).length === 0 || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!ratesZoneId}
        onOpenChange={(open) => {
          if (!open) setRatesZoneId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ratesZone ? `${t("Rates")}: ${ratesZone.name}` : t("Rates")}</DialogTitle>
            <DialogDescription>
              {ratesZone ? (
                <>
                  {t("Markets")}: <span className="font-medium text-foreground">{formatCountries(ratesZone.countries)}</span>
                </>
              ) : (
                t("Flat rates shown at checkout for this zone.")
              )}
            </DialogDescription>
          </DialogHeader>

          {ratesZone ? (
            <div className="space-y-6 py-2">
              <div className="rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>{t("Name")}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t("Checkout key")}</TableHead>
                      <TableHead>{t("Price")}</TableHead>
                      <TableHead>{t("Status")}</TableHead>
                      <TableHead className="w-12 text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ratesZone.methods.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                          {t("No rates yet. Add one below.")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      ratesZone.methods.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-0.5">
                              <span>{m.name}</span>
                              <span className="font-mono text-xs font-normal text-muted-foreground sm:hidden">{m.methodKey}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden font-mono text-sm text-muted-foreground sm:table-cell">{m.methodKey}</TableCell>
                          <TableCell>{money(m.flatRate)}</TableCell>
                          <TableCell>
                            <Badge variant={m.isActive ? "default" : "secondary"} className="font-normal">
                              {m.isActive ? t("Active") : t("Inactive")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={t("Actions")}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                {m.isActive ? (
                                  <DropdownMenuItem onClick={() => void patchMethod(m.id, { isActive: false })}>{t("Deactivate")}</DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => void patchMethod(m.id, { isActive: true })}>{t("Activate")}</DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => void deleteMethod(m.id)}>
                                  {t("Delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <Card className="border-border/80 shadow-sm">
                <CardHeader className="border-b border-border/60 bg-muted/20 py-3">
                  <CardTitle className="text-sm font-semibold">{t("Add rate")}</CardTitle>
                  <CardDescription className="text-xs">{t("Label is shown to customers; the checkout key must be unique within this zone.")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("Rate name")}</Label>
                    <Input value={methodDraft.name} onChange={(e) => setMethodDraft((d) => ({ ...d, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Checkout key")}</Label>
                    <Input
                      className="font-mono"
                      value={methodDraft.methodKey}
                      onChange={(e) => setMethodDraft((d) => ({ ...d, methodKey: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{t("Flat rate (USD)")}</Label>
                    <Input type="number" min={0} step="0.01" value={methodDraft.flatRate} onChange={(e) => setMethodDraft((d) => ({ ...d, flatRate: e.target.value }))} />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <Separator />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRatesZoneId(null)}>
              {t("Close")}
            </Button>
            {ratesZone ? (
              <Button
                type="button"
                onClick={() => void createMethod(ratesZone.id)}
                disabled={!methodDraft.name.trim() || !methodDraft.methodKey.trim() || Number.isNaN(Number(methodDraft.flatRate)) || loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Add rate")}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StorefrontAdminPageShell>
  );
}
