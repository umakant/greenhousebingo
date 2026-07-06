"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, RefreshCw, ShoppingCart } from "lucide-react";

import {
  StorefrontAdminErrorAlert,
  StorefrontAdminMainCard,
  StorefrontAdminPageShell,
} from "@/components/storefront/storefront-admin-page-layout";
import NoRecordsFound from "@/components/no-records-found";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/admin-t";

const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string | null;
  fulfillmentStatus: string;
  total: number;
  currency: string;
  customerEmail: string | null;
  customerName: string | null;
  createdAt: string;
  paidAt: string | null;
  lineCount: number;
  recentEvents: Array<{ kind: string; message: string | null; createdAt: string }>;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  source?: string;
  status: string;
  paymentStatus: string | null;
  fulfillmentStatus: string;
  total: number;
  currency: string;
  subtotal?: number;
  taxTotal?: number;
  shippingTotal?: number;
  discountTotal?: number;
  taxLines?: unknown;
  discountCode?: { code: string } | null;
  accountingRevenueId?: string | null;
  accountingRevenue?: { id: string; referenceNumber: string; amount: number } | null;
  fulfillmentAssigneeUserId?: string | null;
  fulfillmentAssignee?: { id: string; name: string | null; email: string | null } | null;
  customerEmail: string | null;
  customerName: string | null;
  internalNotes: string | null;
  crmCustomer?: {
    id: string;
    customerCode: string;
    companyName: string;
    contactPersonName: string;
    contactPersonEmail: string;
  } | null;
  lines: Array<{ name: string; quantity: number; lineTotal: number }>;
  events: Array<{ kind: string; message: string | null; createdAt: string }>;
  payments: Array<{ status: string; amount: number; provider: string; createdAt: string }>;
  shipments: Array<{ status: string; carrier: string | null; trackingNumber: string | null }>;
};

type OrderTab = "all" | "unfulfilled" | "unpaid" | "fulfilled";

function isFulfilled(o: OrderRow): boolean {
  const f = (o.fulfillmentStatus ?? "").toLowerCase();
  return f === "shipped" || f === "fulfilled";
}

function isUnpaid(o: OrderRow): boolean {
  const p = (o.paymentStatus ?? "").toLowerCase();
  return p !== "paid";
}

function filterByTab(rows: OrderRow[], tab: OrderTab): OrderRow[] {
  if (tab === "all") return rows;
  if (tab === "unfulfilled") return rows.filter((o) => !isFulfilled(o));
  if (tab === "unpaid") return rows.filter((o) => isUnpaid(o));
  if (tab === "fulfilled") return rows.filter((o) => isFulfilled(o));
  return rows;
}

function paymentBadgeVariant(p: string | null): "default" | "secondary" | "destructive" | "outline" {
  const s = (p ?? "").toLowerCase();
  if (s === "paid") return "default";
  if (s === "failed") return "destructive";
  return "secondary";
}

function fulfillmentBadgeVariant(f: string): "default" | "secondary" | "outline" {
  const s = f.toLowerCase();
  if (s === "shipped" || s === "fulfilled") return "default";
  return "outline";
}

function formatMoney(currency: string, amount: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatOrderDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function StorefrontOrdersAdmin() {
  const [orgCtx, setOrgCtx] = React.useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = React.useState<string | null>(null);
  const [orgLoading, setOrgLoading] = React.useState(true);

  const [allOrders, setAllOrders] = React.useState<OrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<OrderTab>("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());

  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<OrderDetail | null>(null);
  const [notesDraft, setNotesDraft] = React.useState("");
  const [assigneeDraft, setAssigneeDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const buildApiUrl = React.useCallback(
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

  React.useEffect(() => {
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
        // The superadmin Store is bound to the dedicated Water Ice Express store org
        // (returned as defaultOrganizationId); no company switching here.
        const orgId: string | null = c.defaultOrganizationId;
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

  const load = React.useCallback(async () => {
    if (!orgReady) {
      setLoading(false);
      setAllOrders([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base = buildApiUrl("/api/storefront/commerce-orders");
      const u = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      u.searchParams.set("limit", "100");
      if (q.trim()) u.searchParams.set("q", q.trim());
      const res = await fetch(u.pathname + u.search, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; orders?: OrderRow[]; error?: string };
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? t("Could not load orders"));
        setAllOrders([]);
        return;
      }
      setAllOrders(data.orders ?? []);
      setSelected(new Set());
    } catch {
      setError(t("Network error"));
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, orgReady, q]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = React.useMemo(() => filterByTab(allOrders, tab), [allOrders, tab]);

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((o) => selected.has(o.id));

  const toggleSelect = (id: string, on: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  };

  const toggleSelectAllVisible = (on: boolean) => {
    if (on) setSelected(new Set(visibleRows.map((o) => o.id)));
    else setSelected(new Set());
  };

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetail(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/commerce-orders/${encodeURIComponent(id)}`), { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; order?: OrderDetail };
      if (res.ok && data?.ok && data.order) {
        setDetail(data.order);
        setNotesDraft(data.order.internalNotes ?? "");
        setAssigneeDraft(data.order.fulfillmentAssigneeUserId ?? "");
      }
    } catch {
      setDetail(null);
    }
  };

  const saveNotes = async () => {
    if (!detailId) return;
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/commerce-orders/${encodeURIComponent(detailId)}`), {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ internalNotes: notesDraft }),
      });
      if (res.ok) {
        void load();
        void openDetail(detailId);
      }
    } finally {
      setSaving(false);
    }
  };

  const showNoOrdersYet = allOrders.length === 0 && !q.trim() && !loading;

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
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
              <div className="w-full shrink-0 lg:w-auto">
                <Tabs value={tab} onValueChange={(v) => setTab(v as OrderTab)} className="w-full sm:w-auto">
                  <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:flex sm:h-10 sm:w-auto">
                    <TabsTrigger value="all" className="text-xs sm:text-sm">
                      {t("All")}
                    </TabsTrigger>
                    <TabsTrigger value="unfulfilled" className="text-xs sm:text-sm">
                      {t("Unfulfilled")}
                    </TabsTrigger>
                    <TabsTrigger value="unpaid" className="text-xs sm:text-sm">
                      {t("Unpaid")}
                    </TabsTrigger>
                    <TabsTrigger value="fulfilled" className="text-xs sm:text-sm">
                      {t("Fulfilled")}
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
                    placeholder={t("Search by order number, name, or email")}
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
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            {selected.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm">
                <span className="font-medium">
                  {selected.size} {t("selected")}
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  {t("Clear selection")}
                </Button>
              </div>
            ) : null}

            {showNoOrdersYet ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/5 px-6 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground" aria-hidden />
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{t("No orders yet")}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {t("When customers complete checkout on your storefront, their orders will appear in this list.")}
                </p>
              </div>
            ) : loading && allOrders.length === 0 ? (
              <div className="flex justify-center py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : visibleRows.length === 0 ? (
              <NoRecordsFound
                icon={ShoppingCart}
                title={t("No orders match this view or search.")}
                description={t("Try another tab or search term.")}
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
                      <th className="w-10 p-3 text-left font-medium">
                        <Checkbox
                          checked={allVisibleSelected}
                          onCheckedChange={(c) => toggleSelectAllVisible(c === true)}
                          aria-label={t("Select all on page")}
                        />
                      </th>
                      <th className="min-w-[100px] p-3 text-left font-medium text-muted-foreground">{t("Order")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground md:table-cell">{t("Date")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground lg:table-cell">{t("Customer")}</th>
                      <th className="p-3 text-right font-medium text-muted-foreground">{t("Total")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground sm:table-cell">{t("Payment")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground xl:table-cell">{t("Fulfillment")}</th>
                      <th className="w-[120px] p-3 text-right font-medium text-muted-foreground">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((o) => (
                      <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30" data-state={selected.has(o.id) ? "selected" : undefined}>
                        <td className="p-3">
                          <Checkbox
                            checked={selected.has(o.id)}
                            onCheckedChange={(c) => toggleSelect(o.id, c === true)}
                            aria-label={t("Select order")}
                          />
                        </td>
                        <td className="p-3 font-medium">{o.orderNumber}</td>
                        <td className="hidden p-3 text-muted-foreground md:table-cell">{formatOrderDate(o.createdAt)}</td>
                        <td className="hidden max-w-[200px] truncate p-3 text-muted-foreground lg:table-cell">
                          {o.customerName ?? o.customerEmail ?? "—"}
                        </td>
                        <td className="p-3 text-right font-medium tabular-nums">{formatMoney(o.currency, o.total)}</td>
                        <td className="hidden p-3 sm:table-cell">
                          <Badge variant={paymentBadgeVariant(o.paymentStatus)} className="font-normal">
                            {o.paymentStatus ?? t("Unknown")}
                          </Badge>
                        </td>
                        <td className="hidden p-3 xl:table-cell">
                          <Badge variant={fulfillmentBadgeVariant(o.fulfillmentStatus)} className="font-normal">
                            {o.fulfillmentStatus}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <TableActionButton
                            label={t("View")}
                            onPrimaryClick={() => void openDetail(o.id)}
                            items={[]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </StorefrontAdminMainCard>

      <Sheet open={detailId != null} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg lg:max-w-xl">
          <SheetHeader className="border-b px-6 py-4 text-left">
            <SheetTitle>{detail ? `${t("Order")} ${detail.orderNumber}` : t("Order")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {detail ? (
              <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <span>{t("Source")}</span>
                <span>{detail.source ?? "storefront"}</span>
                <span>{t("Payment")}</span>
                <span>{detail.paymentStatus ?? "—"}</span>
                <span>{t("Fulfillment")}</span>
                <span>{detail.fulfillmentStatus}</span>
                {detail.crmCustomer ? (
                  <>
                    <span>{t("CRM contact")}</span>
                    <span className="text-left text-foreground">
                      {detail.crmCustomer.companyName} ({detail.crmCustomer.customerCode})
                      <br />
                      <span className="text-xs">{detail.crmCustomer.contactPersonEmail}</span>
                    </span>
                  </>
                ) : null}
                {detail.discountCode ? (
                  <>
                    <span>{t("Coupon")}</span>
                    <span>{detail.discountCode.code}</span>
                  </>
                ) : null}
                {detail.accountingRevenue ? (
                  <>
                    <span>{t("Accounting")}</span>
                    <span className="text-foreground">
                      {detail.accountingRevenue.referenceNumber} ({formatMoney(detail.currency, detail.accountingRevenue.amount)})
                      <span className="block text-xs text-muted-foreground">
                        ID {detail.accountingRevenue.id}
                        <Link href="/account/revenues" className="ml-2 text-primary underline-offset-4 hover:underline">
                          {t("Revenue")}
                        </Link>
                      </span>
                    </span>
                  </>
                ) : null}
                {detail.fulfillmentAssignee ? (
                  <>
                    <span>{t("Assigned to")}</span>
                    <span>
                      {detail.fulfillmentAssignee.name ?? detail.fulfillmentAssignee.email ?? detail.fulfillmentAssignee.id}
                    </span>
                  </>
                ) : null}
                <span>{t("Subtotal")}</span>
                <span className="tabular-nums text-foreground">
                  {formatMoney(detail.currency, detail.subtotal ?? detail.lines.reduce((s, l) => s + l.lineTotal, 0))}
                </span>
                <span>{t("Discount")}</span>
                <span className="tabular-nums">{formatMoney(detail.currency, detail.discountTotal ?? 0)}</span>
                <span>{t("Shipping")}</span>
                <span className="tabular-nums">{formatMoney(detail.currency, detail.shippingTotal ?? 0)}</span>
                <span>{t("Tax")}</span>
                <span className="tabular-nums">{formatMoney(detail.currency, detail.taxTotal ?? 0)}</span>
                <span>{t("Total")}</span>
                <span className="tabular-nums font-medium text-foreground">{formatMoney(detail.currency, detail.total)}</span>
              </div>
              <div>
                <p className="font-medium">{t("Line items")}</p>
                <ul className="mt-1 space-y-1">
                  {detail.lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>
                        {l.name} × {l.quantity}
                      </span>
                      <span className="tabular-nums">{formatMoney(detail.currency, l.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {detail.payments.length > 0 ? (
                <div>
                  <p className="font-medium">{t("Payments")}</p>
                  <ul className="mt-1 text-muted-foreground">
                    {detail.payments.map((p, i) => (
                      <li key={i}>
                        {p.provider} — {p.status} — {formatMoney(detail.currency, p.amount)} — {formatOrderDate(p.createdAt)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div>
                <p className="font-medium">{t("Timeline")}</p>
                <ul className="mt-1 max-h-40 overflow-y-auto text-muted-foreground">
                  {detail.events.map((e, i) => (
                    <li key={i}>
                      {e.kind}: {e.message ?? ""}{" "}
                      <span className="text-xs">({formatOrderDate(e.createdAt)})</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">{t("Internal notes")}</Label>
                <Textarea id="notes" value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={3} />
                <Button type="button" size="sm" disabled={saving} onClick={() => void saveNotes()}>
                  {saving ? t("Saving…") : t("Save notes")}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignee">{t("Fulfillment assignee (staff user id)")}</Label>
                <Input
                  id="assignee"
                  value={assigneeDraft}
                  onChange={(e) => setAssigneeDraft(e.target.value)}
                  placeholder={t("Numeric user id or leave empty")}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={saving || !detailId}
                  onClick={() => {
                    if (!detailId) return;
                    const raw = assigneeDraft.trim();
                    const body =
                      raw === ""
                        ? { fulfillmentAssigneeUserId: null }
                        : /^\d+$/.test(raw)
                          ? { fulfillmentAssigneeUserId: raw }
                          : null;
                    if (!body) return;
                    setSaving(true);
                    void fetch(buildApiUrl(`/api/storefront/commerce-orders/${encodeURIComponent(detailId)}`), {
                      method: "PATCH",
                      credentials: "include",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(body),
                    })
                      .then(() => {
                        void load();
                        void openDetail(detailId);
                      })
                      .finally(() => setSaving(false));
                  }}
                >
                  {t("Save assignee")}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="track">{t("Tracking #")}</Label>
                  <Input
                    id="track"
                    placeholder={t("Carrier tracking")}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (!v || !detailId) return;
                      void fetch(buildApiUrl(`/api/storefront/commerce-orders/${encodeURIComponent(detailId)}`), {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          fulfillmentStatus: "shipped",
                          shipment: { trackingNumber: v, status: "shipped" },
                        }),
                      }).then(() => {
                        void load();
                        void openDetail(detailId);
                      });
                    }}
                  />
                </div>
              </div>
              </div>
            ) : (
              <p className="text-muted-foreground">{t("Loading…")}</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </StorefrontAdminPageShell>
  );
}
