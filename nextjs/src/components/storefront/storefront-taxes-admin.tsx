"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MoreHorizontal, Plus, Receipt, RefreshCw, Search } from "lucide-react";

import { appConfirm } from "@/lib/app-confirm";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/lib/admin-t";

const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

type RuleRow = {
  id: string;
  websiteId: string | null;
  country: string;
  region: string | null;
  ratePercent: number;
  isActive: boolean;
  sortOrder: number;
};

type RuleTab = "all" | "active" | "inactive";

function jurisdictionLabel(r: RuleRow): string {
  return r.region ? `${r.country} · ${r.region}` : r.country;
}

function filterByTab(rules: RuleRow[], tab: RuleTab): RuleRow[] {
  if (tab === "active") return rules.filter((r) => r.isActive);
  if (tab === "inactive") return rules.filter((r) => !r.isActive);
  return rules;
}

function formatRate(p: number) {
  return `${p % 1 === 0 ? p.toFixed(0) : p.toFixed(2)}%`;
}

export function StorefrontTaxesAdmin() {
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<RuleTab>("all");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  const [inclusive, setInclusive] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ country: "US", region: "", rate: "8", websiteId: "" as string });

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

  useEffect(() => {
    const tmr = setTimeout(() => setQ(qInput), 350);
    return () => clearTimeout(tmr);
  }, [qInput]);

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

  const loadSettings = useCallback(async () => {
    if (!orgReady) return;
    try {
      const res = await fetch(buildApiUrl("/api/storefront/tax-settings"), { credentials: "same-origin" });
      const sJson = (await res.json()) as { ok?: boolean; settings?: { priceMode?: string } | null };
      if (res.ok && sJson.ok) {
        setInclusive(sJson.settings?.priceMode === "inclusive");
        setSettingsDirty(false);
      }
    } catch {
      /* ignore */
    }
  }, [buildApiUrl, orgReady]);

  const loadRules = useCallback(async () => {
    if (!orgReady) {
      setLoading(false);
      setRules([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base = buildApiUrl("/api/storefront/tax-rules");
      const u = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      if (q.trim()) u.searchParams.set("q", q.trim());
      const res = await fetch(u.pathname + u.search, { credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; rules?: RuleRow[]; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setRules(data.rules ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, orgReady, q]);

  useEffect(() => {
    void loadWebsites();
  }, [loadWebsites]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const visibleRules = useMemo(() => filterByTab(rules, tab), [rules, tab]);

  const saveTaxSettings = async () => {
    if (!orgReady) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/tax-settings"), {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priceMode: inclusive ? "inclusive" : "exclusive" }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setSettingsDirty(false);
      await loadSettings();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const patchRule = async (id: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/tax-rules/${encodeURIComponent(id)}`), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await loadRules();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const deleteRule = async (id: string) => {
    if (!(await appConfirm(t("Delete this tax rate?")))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/tax-rules/${encodeURIComponent(id)}`), {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await loadRules();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const createRule = async () => {
    const country = draft.country.trim().toUpperCase().slice(0, 2);
    if (country.length !== 2 || Number.isNaN(Number(draft.rate))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/tax-rules"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          country,
          region: draft.region.trim() || null,
          ratePercent: Number(draft.rate),
          websiteId: draft.websiteId || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setCreateOpen(false);
      setDraft({ country: "US", region: "", rate: "8", websiteId: "" });
      await loadRules();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const websiteName = (id: string | null) => {
    if (!id) return t("All websites");
    const w = websites.find((x) => x.id === id);
    return w?.name ?? id;
  };

  const trulyEmpty = rules.length === 0 && !q.trim() && !loading;

  if (orgLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">{t("Loading…")}</span>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      ) : null}

      <div className="mb-6 flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        {orgCtx?.isSuperadmin ? (
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
                void loadSettings();
                void loadRules();
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
        ) : null}
        <Button type="button" className="h-11 w-full gap-2 sm:w-auto" onClick={() => setCreateOpen(true)} disabled={!orgReady || loading}>
          <Plus className="h-4 w-4" />
          {t("Add tax rate")}
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/15 pb-4">
          <CardTitle className="text-base font-semibold">{t("Tax calculation")}</CardTitle>
          <CardDescription>{t("Choose whether catalog prices include tax before customers reach checkout.")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <Switch
              id="tax-inclusive"
              checked={inclusive}
              onCheckedChange={(v) => {
                setInclusive(v === true);
                setSettingsDirty(true);
              }}
            />
            <div className="space-y-1">
              <Label htmlFor="tax-inclusive" className="text-sm font-medium leading-none">
                {t("Tax-inclusive display prices")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("When on, product prices are shown with tax included (common in EU).")}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-10 shrink-0 sm:min-w-[100px]"
            disabled={!orgReady || loading || !settingsDirty}
            onClick={() => void saveTaxSettings()}
          >
            {loading && settingsDirty ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <Tabs value={tab} onValueChange={(v) => setTab(v as RuleTab)} className="w-full xl:flex-1">
              <TabsList className="flex h-auto min-h-10 w-full flex-wrap justify-start gap-1">
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
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:max-w-md">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  className="h-10 pl-9"
                  placeholder={t("Search by country or region")}
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  aria-label={t("Search tax rates")}
                />
              </div>
              <Button type="button" variant="outline" size="icon" className="h-10 shrink-0" onClick={() => void loadRules()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {trulyEmpty ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/5 px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Receipt className="h-8 w-8 text-muted-foreground" aria-hidden />
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight">{t("Add your first tax rate")}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {t("Define a percentage for each country (and optional region) so checkout can calculate tax consistently.")}
              </p>
              <Button type="button" className="mt-8 gap-2" onClick={() => setCreateOpen(true)} disabled={!orgReady}>
                <Plus className="h-4 w-4" />
                {t("Add tax rate")}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>{t("Jurisdiction")}</TableHead>
                    <TableHead>{t("Rate")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("Website")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                    <TableHead className="w-12 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRules.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                        {t("No rates match this view or search.")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {visibleRules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{jurisdictionLabel(r)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatRate(r.ratePercent)}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{websiteName(r.websiteId)}</TableCell>
                      <TableCell>
                        <Badge variant={r.isActive ? "default" : "secondary"} className="font-normal">
                          {r.isActive ? t("Active") : t("Inactive")}
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
                            {r.isActive ? (
                              <DropdownMenuItem onClick={() => void patchRule(r.id, { isActive: false })}>{t("Deactivate")}</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => void patchRule(r.id, { isActive: true })}>{t("Activate")}</DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => void deleteRule(r.id)}>
                              {t("Delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {loading && rules.length === 0 && !trulyEmpty ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Add tax rate")}</DialogTitle>
            <DialogDescription>{t("Use a two-letter country code and an optional region code for state- or province-level rates.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20 py-3">
                <CardTitle className="text-sm font-semibold">{t("Jurisdiction")}</CardTitle>
                <CardDescription className="text-xs">{t("Rates apply to shipping or billing addresses that match.")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tx-country">{t("Country")}</Label>
                  <Input
                    id="tx-country"
                    value={draft.country}
                    onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value.toUpperCase() }))}
                    maxLength={2}
                    className="font-mono uppercase"
                    placeholder="US"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tx-region">{t("Region (optional)")}</Label>
                  <Input id="tx-region" value={draft.region} onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value }))} placeholder={t("e.g. CA")} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="tx-rate">{t("Rate %")}</Label>
                  <Input id="tx-rate" type="number" min={0} step="0.01" value={draft.rate} onChange={(e) => setDraft((d) => ({ ...d, rate: e.target.value }))} />
                </div>
                {websites.length > 0 ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{t("Website (optional)")}</Label>
                    <Select value={draft.websiteId || "__all__"} onValueChange={(v) => setDraft((d) => ({ ...d, websiteId: v === "__all__" ? "" : v }))}>
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
              onClick={() => void createRule()}
              disabled={draft.country.trim().length !== 2 || Number.isNaN(Number(draft.rate)) || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
