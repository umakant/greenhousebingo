"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Percent, Plus, RefreshCw } from "lucide-react";

import { appConfirm } from "@/lib/app-confirm";

import {
  StorefrontAdminErrorAlert,
  StorefrontAdminMainCard,
  StorefrontAdminPageShell,
} from "@/components/storefront/storefront-admin-page-layout";
import NoRecordsFound from "@/components/no-records-found";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WebsiteRow } from "@/components/storefront/storefront-websites-settings";
import { t } from "@/lib/admin-t";

const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Empty response from server (HTTP ${res.status}).`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.length > 120 ? `${text.slice(0, 120)}…` : text;
    throw new Error(
      res.ok ? `Invalid response from server (${preview.replace(/\s+/g, " ").trim()})` : `Request failed (HTTP ${res.status}).`,
    );
  }
}

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

type RuleRow = {
  id: string;
  websiteId: string | null;
  name: string;
  scope: string;
  kind: string;
  value: number;
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  perCustomerLimit: number | null;
  isActive: boolean;
  codes: Array<{ id: string; code: string; usesCount: number }>;
};

type DiscountTab = "all" | "active" | "scheduled" | "expired" | "inactive";

function nowMs() {
  return Date.now();
}

function isExpired(r: RuleRow, tms: number): boolean {
  if (!r.endsAt) return false;
  return new Date(r.endsAt).getTime() < tms;
}

function isScheduled(r: RuleRow, tms: number): boolean {
  if (!r.isActive || !r.startsAt) return false;
  return new Date(r.startsAt).getTime() > tms;
}

function isActiveNow(r: RuleRow, tms: number): boolean {
  if (!r.isActive) return false;
  if (isScheduled(r, tms)) return false;
  if (r.endsAt && new Date(r.endsAt).getTime() < tms) return false;
  if (r.startsAt && new Date(r.startsAt).getTime() > tms) return false;
  return true;
}

function isInactiveTab(r: RuleRow, tms: number): boolean {
  if (r.isActive) return false;
  if (isExpired(r, tms)) return false;
  return true;
}

function statusLabel(r: RuleRow, tms: number): string {
  if (isExpired(r, tms)) return t("Expired");
  if (isScheduled(r, tms)) return t("Scheduled");
  if (!r.isActive) return t("Inactive");
  return t("Active");
}

function statusVariant(r: RuleRow, tms: number): "default" | "secondary" | "outline" | "destructive" {
  if (isExpired(r, tms)) return "secondary";
  if (isScheduled(r, tms)) return "outline";
  if (!r.isActive) return "secondary";
  return "default";
}

function filterRules(rows: RuleRow[], tab: DiscountTab, tms: number): RuleRow[] {
  if (tab === "all") return rows;
  if (tab === "active") return rows.filter((r) => isActiveNow(r, tms));
  if (tab === "scheduled") return rows.filter((r) => isScheduled(r, tms));
  if (tab === "expired") return rows.filter((r) => isExpired(r, tms));
  if (tab === "inactive") return rows.filter((r) => isInactiveTab(r, tms));
  return rows;
}

function formatValue(r: RuleRow) {
  if (r.kind === "percent") return `${r.value}%`;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(r.value);
}

export function StorefrontDiscountsAdmin() {
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DiscountTab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [tick, setTick] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [draft, setDraft] = useState({
    name: "",
    kind: "percent" as "percent" | "fixed",
    scope: "order" as "order" | "line",
    value: "10",
    initialCode: "",
    websiteId: "" as string,
  });

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
    const id = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setOrgLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/storefront/organization-context", { credentials: "include" });
        const json = await readJsonResponse<OrgContext & { ok?: boolean; message?: string }>(res);
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
      const data = await readJsonResponse<{ ok?: boolean; data?: WebsiteRow[] }>(res);
      if (res.ok && data.ok) setWebsites(data.data ?? []);
    } catch {
      setWebsites([]);
    }
  }, [buildApiUrl, orgReady]);

  const load = useCallback(async () => {
    if (!orgReady) {
      setLoading(false);
      setRules([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base = buildApiUrl("/api/storefront/discount-rules");
      const u = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      if (q.trim()) u.searchParams.set("q", q.trim());
      const res = await fetch(u.pathname + u.search, { credentials: "same-origin" });
      const data = await readJsonResponse<{ ok?: boolean; rules?: RuleRow[]; message?: string }>(res);
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
    void load();
  }, [load]);

  const tms = useMemo(() => nowMs(), [rules, tick]);

  const visibleRules = useMemo(() => filterRules(rules, tab, tms), [rules, tab, tms]);

  const patchRule = async (id: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/discount-rules/${encodeURIComponent(id)}`), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJsonResponse<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const deleteRule = async (id: string) => {
    if (!(await appConfirm(t("Delete this discount rule and its codes?")))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/discount-rules/${encodeURIComponent(id)}`), {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await readJsonResponse<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const buildRowActions = (r: RuleRow): TableActionItem[] => [
    {
      label: t("Delete"),
      onSelect: () => void deleteRule(r.id),
      destructive: true,
    },
  ];

  const createRule = async () => {
    if (!draft.name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/discount-rules"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          kind: draft.kind,
          scope: draft.scope,
          value: Number(draft.value),
          initialCode: draft.initialCode.trim() || undefined,
          websiteId: draft.websiteId || undefined,
        }),
      });
      const data = await readJsonResponse<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setCreateOpen(false);
      setDraft({ name: "", kind: "percent", scope: "order", value: "10", initialCode: "", websiteId: "" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const scheduleSummary = (r: RuleRow) => {
    const parts: string[] = [];
    if (r.startsAt) parts.push(`${t("Starts")} ${new Date(r.startsAt).toLocaleDateString()}`);
    if (r.endsAt) parts.push(`${t("Ends")} ${new Date(r.endsAt).toLocaleDateString()}`);
    return parts.length ? parts.join(" · ") : t("No schedule");
  };

  const showFirstDiscountEmpty = rules.length === 0 && !q.trim() && !loading;

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
              <div className="w-full min-w-0 shrink-0 lg:max-w-[min(100%,520px)] lg:flex-1">
                <Tabs value={tab} onValueChange={(v) => setTab(v as DiscountTab)} className="w-full">
                  <TabsList className="flex h-auto min-h-10 w-full flex-wrap justify-start gap-1">
                    <TabsTrigger value="all" className="text-xs sm:text-sm">
                      {t("All")}
                    </TabsTrigger>
                    <TabsTrigger value="active" className="text-xs sm:text-sm">
                      {t("Active")}
                    </TabsTrigger>
                    <TabsTrigger value="scheduled" className="text-xs sm:text-sm">
                      {t("Scheduled")}
                    </TabsTrigger>
                    <TabsTrigger value="expired" className="text-xs sm:text-sm">
                      {t("Expired")}
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
                    placeholder={t("Search discounts")}
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
                    {t("Create discount")}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            {showFirstDiscountEmpty ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/5 px-6 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Percent className="h-8 w-8 text-muted-foreground" aria-hidden />
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{t("Create your first discount")}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {t("Offer percentage or fixed-amount savings at checkout. You can add coupon codes when you create a rule.")}
                </p>
                <Button type="button" size="sm" className="mt-8 gap-1" onClick={() => setCreateOpen(true)} disabled={!orgReady}>
                  <Plus className="h-4 w-4" />
                  {t("Create discount")}
                </Button>
              </div>
            ) : loading && rules.length === 0 ? (
              <div className="flex justify-center py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : visibleRules.length === 0 ? (
              <NoRecordsFound
                icon={Percent}
                title={t("No discounts match this view or search.")}
                description={t("Try another tab or search term, or create a new discount.")}
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
                      <th className="p-3 text-left font-medium text-muted-foreground">{t("Title")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground md:table-cell">{t("Method")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground lg:table-cell">{t("Applies to")}</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">{t("Status")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground sm:table-cell">{t("Codes")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground xl:table-cell">{t("Schedule")}</th>
                      <th className="p-3 text-right font-medium text-muted-foreground">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRules.map((r) => {
                      const items = buildRowActions(r);
                      const primaryLabel = r.isActive ? t("Deactivate") : t("Activate");
                      return (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3 font-medium">{r.name}</td>
                          <td className="hidden p-3 text-muted-foreground md:table-cell">
                            {r.kind === "percent" ? t("Percentage") : t("Fixed amount")} · {formatValue(r)}
                          </td>
                          <td className="hidden p-3 capitalize text-muted-foreground lg:table-cell">
                            {r.scope === "line" ? t("Specific products") : t("Entire order")}
                          </td>
                          <td className="p-3">
                            <Badge variant={statusVariant(r, tms)} className="font-normal">
                              {statusLabel(r, tms)}
                            </Badge>
                          </td>
                          <td className="hidden max-w-[200px] truncate p-3 text-xs text-muted-foreground sm:table-cell">
                            {r.codes.map((c) => c.code).join(", ") || "—"}
                          </td>
                          <td className="hidden p-3 text-xs text-muted-foreground xl:table-cell">{scheduleSummary(r)}</td>
                          <td className="p-3 text-right">
                            <TableActionButton
                              label={primaryLabel}
                              onPrimaryClick={() => void patchRule(r.id, { isActive: !r.isActive })}
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
            <DialogTitle>{t("Create discount")}</DialogTitle>
            <DialogDescription>{t("Define how much customers save and whether the discount applies to the whole order or matching products.")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20 py-3">
                <CardTitle className="text-sm font-semibold">{t("Method")}</CardTitle>
                <CardDescription className="text-xs">{t("Percentage off or a fixed amount in your store currency.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("Discount type")}</Label>
                    <Select value={draft.kind} onValueChange={(v) => setDraft((d) => ({ ...d, kind: v as "percent" | "fixed" }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">{t("Percentage")}</SelectItem>
                        <SelectItem value="fixed">{t("Fixed amount")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disc-value">{t("Value")}</Label>
                    <Input
                      id="disc-value"
                      type="number"
                      min={0}
                      step={draft.kind === "percent" ? 1 : "0.01"}
                      value={draft.value}
                      onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20 py-3">
                <CardTitle className="text-sm font-semibold">{t("Applies to")}</CardTitle>
                <CardDescription className="text-xs">{t("Order-wide or limited to matching line items (product scope uses API for now).")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t("Scope")}</Label>
                  <Select value={draft.scope} onValueChange={(v) => setDraft((d) => ({ ...d, scope: v as "order" | "line" }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order">{t("Entire order")}</SelectItem>
                      <SelectItem value="line">{t("Matching products")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {websites.length > 0 ? (
                  <div className="space-y-2">
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

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20 py-3">
                <CardTitle className="text-sm font-semibold">{t("Title & code")}</CardTitle>
                <CardDescription className="text-xs">{t("Name the rule for your team; add an optional first coupon code.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="disc-name">{t("Title")}</Label>
                  <Input id="disc-name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder={t("Spring sale")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disc-code">{t("Initial coupon code (optional)")}</Label>
                  <Input
                    id="disc-code"
                    value={draft.initialCode}
                    onChange={(e) => setDraft((d) => ({ ...d, initialCode: e.target.value }))}
                    placeholder="SAVE10"
                    className="font-mono uppercase"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button type="button" onClick={() => void createRule()} disabled={!draft.name.trim() || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StorefrontAdminPageShell>
  );
}
