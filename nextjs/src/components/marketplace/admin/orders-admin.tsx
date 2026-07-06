"use client";

import * as React from "react";
import { format, subDays } from "date-fns";
import {
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  DollarSign,
  Download,
  Eye,
  Filter,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import {
  formatStatusLabel,
  ORDER_TABS,
  paymentBadgeClass,
  statusBadgeClass,
  type OrderTabKey,
} from "@/lib/marketplace-order-status";
import { DASHBOARD_STAT_ICON_TINT } from "@/components/dashboard/dashboard-stat-styles";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";

const DEFAULT_PAGE_SIZE = 10;

const ORDER_STATUSES = ["pending", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"];
const DELIVERY_STATUSES = ["queued", "assigned", "in_transit", "delivered", "failed"];

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  orderStatus: string | null;
  paymentStatus: string;
  deliveryStatus: string | null;
  total: number;
  currency: string;
  createdAt: string;
  vendorId: string | null;
  vendorName: string | null;
  vendorLogoUrl: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  deliveryDate: string | null;
  deliveryWindow: string | null;
  city: string | null;
  state: string | null;
};

type Summary = {
  totalOrders: number;
  pending: number;
  processing: number;
  outForDelivery: number;
  completed: number;
  cancelled: number;
  revenueToday: number;
  revenueTodayChange: number | null;
  totalOrdersChange: number | null;
  pendingChange: number | null;
  processingChange: number | null;
  outForDeliveryChange: number | null;
  completedChange: number | null;
};

type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  lastPage: number;
  from: number;
  to: number;
};

type LineItem = {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
  sku: string | null;
};

type TimelineStep = {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
  current: boolean;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  vendorName: string | null;
  vendorLogoUrl: string | null;
  deliveryDate: string | null;
  deliveryWindow: string | null;
  deliveryAddress: string | null;
  customer: { name: string; email: string | null; phone: string | null };
  lineItems: LineItem[];
  timeline: TimelineStep[];
};

type Delivery = {
  id: string;
  status: string;
  queueName: string | null;
  events: { id: string; status: string; note: string | null; createdAt: string }[];
};

function StatCard({
  icon,
  label,
  value,
  change,
  tint = DASHBOARD_STAT_ICON_TINT,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: number | null;
  tint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tint)}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight tabular-nums">{value}</p>
          {change !== null ? (
            <p
              className={cn(
                "mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium",
                change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
              )}
            >
              {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {change >= 0 ? "+" : ""}
              {change}% {t("from yesterday")}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">{t("No change")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function CustomerAvatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {initials(name)}
    </span>
  );
}

function VendorAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-semibold text-muted-foreground">
      {initials(name)}
    </span>
  );
}

function fmtOrderDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

function fmtDeliveryDate(iso: string | null, window: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    time: window ?? "",
  };
}

export default function OrdersAdmin({
  canManage,
  canCreateEvents,
  apiBase = "/api/marketplace/admin",
  vendorMode = false,
}: {
  canManage: boolean;
  canCreateEvents: boolean;
  apiBase?: string;
  vendorMode?: boolean;
}) {
  const { settings } = useAppSettings();
  const today = React.useMemo(() => new Date(), []);

  const [rows, setRows] = React.useState<OrderRow[]>([]);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [tabCounts, setTabCounts] = React.useState<Record<OrderTabKey, number>>({
    all: 0,
    pending: 0,
    processing: 0,
    out_for_delivery: 0,
    completed: 0,
    cancelled: 0,
  });
  const [vendors, setVendors] = React.useState<{ id: string; name: string }[]>([]);
  const [pagination, setPagination] = React.useState<PaginationMeta>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    lastPage: 1,
    from: 0,
    to: 0,
  });
  const [loading, setLoading] = React.useState(true);

  const [search, setSearch] = React.useState("");
  const [vendorFilter, setVendorFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [paymentFilter, setPaymentFilter] = React.useState("all");
  const [activeTab, setActiveTab] = React.useState<OrderTabKey>("all");
  const [dateFrom, setDateFrom] = React.useState(() => format(subDays(today, 8), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = React.useState(() => format(today, "yyyy-MM-dd"));
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const [open, setOpen] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<OrderDetail | null>(null);
  const [deliveries, setDeliveries] = React.useState<Delivery[]>([]);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const [eventStatus, setEventStatus] = React.useState("in_transit");
  const [eventNote, setEventNote] = React.useState("");
  const [eventDeliveryId, setEventDeliveryId] = React.useState("");

  const money = (n: number) => formatCurrency(Number(n) || 0, settings);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`${apiBase}/orders`, window.location.origin);
      if (search.trim()) url.searchParams.set("search", search.trim());
      if (vendorFilter !== "all") url.searchParams.set("vendorId", vendorFilter);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      if (paymentFilter !== "all") url.searchParams.set("paymentStatus", paymentFilter);
      if (activeTab !== "all") url.searchParams.set("tab", activeTab);
      if (dateFrom) url.searchParams.set("from", dateFrom);
      if (dateTo) url.searchParams.set("to", dateTo);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));

      const res = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setRows((data.items ?? []) as OrderRow[]);
        setSummary((data.summary ?? null) as Summary);
        if (data.tabCounts) setTabCounts(data.tabCounts as Record<OrderTabKey, number>);
        if (data.filters?.vendors) setVendors(data.filters.vendors as { id: string; name: string }[]);
        if (data.pagination) setPagination(data.pagination as PaginationMeta);
        setSelected(new Set());
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, search, vendorFilter, statusFilter, paymentFilter, activeTab, dateFrom, dateTo, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [search, vendorFilter, statusFilter, paymentFilter, activeTab, dateFrom, dateTo, pageSize]);

  const openDetail = async (order: OrderRow) => {
    setActiveId(order.id);
    setOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`${apiBase}/orders/${order.id}`, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setDetail(data.item as OrderDetail);
        setDeliveries(data.deliveries as Delivery[]);
        setEventDeliveryId((data.deliveries as Delivery[])?.[0]?.id ?? "");
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const updateOrder = async (patch: Record<string, unknown>) => {
    if (!detail) return;
    const res = await fetch(`${apiBase}/orders/${detail.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      toast.success("Order updated");
      void load();
      void openDetail({ id: detail.id } as OrderRow);
    } else {
      toast.error(data?.message ?? "Update failed");
    }
  };

  const addEvent = async () => {
    if (!eventDeliveryId) {
      toast.error("No delivery to update.");
      return;
    }
    const res = await fetch(`/api/marketplace/admin/deliveries/${eventDeliveryId}/events`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: eventStatus, note: eventNote }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      toast.success("Delivery event added");
      setEventNote("");
      if (detail) void openDetail({ id: detail.id } as OrderRow);
    } else {
      toast.error(data?.message ?? "Failed to add event");
    }
  };

  const exportCsv = async () => {
    const url = new URL("/api/marketplace/admin/orders", window.location.origin);
    if (search.trim()) url.searchParams.set("search", search.trim());
    if (vendorFilter !== "all") url.searchParams.set("vendorId", vendorFilter);
    if (paymentFilter !== "all") url.searchParams.set("paymentStatus", paymentFilter);
    if (activeTab !== "all") url.searchParams.set("tab", activeTab);
    url.searchParams.set("page", "1");
    url.searchParams.set("pageSize", "500");

    const res = await fetch(url.toString(), { credentials: "include" });
    const data = await res.json().catch(() => null);
    const exportRows = (data?.items ?? []) as OrderRow[];

    const header = ["Order", "Customer", "Vendor", "Status", "Payment", "Total", "Placed"];
    const lines = exportRows.map((r) =>
      [
        r.orderNumber,
        r.customerName,
        r.vendorName ?? "",
        r.status,
        r.paymentStatus,
        String(r.total),
        r.createdAt,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "orders.csv";
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const activeFilterCount =
    (!vendorMode && vendorFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (paymentFilter !== "all" ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setVendorFilter("all");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateFrom(format(subDays(today, 8), "yyyy-MM-dd"));
    setDateTo(format(today, "yyyy-MM-dd"));
  };

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("Manage and track all marketplace orders.")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => void exportCsv()}>
            <Upload className="h-3.5 w-3.5" />
            {t("Export Orders")}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => toast.info("Manual order creation is coming soon.")}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("Create Order")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          icon={<ShoppingCart className="h-5 w-5 text-muted-foreground" />}
          label={t("Total Orders")}
          value={String(summary?.totalOrders ?? 0)}
          change={summary?.totalOrdersChange ?? null}
        />
        <StatCard
          icon={<Package className="h-5 w-5 text-muted-foreground" />}
          label={t("Pending")}
          value={String(summary?.pending ?? 0)}
          change={summary?.pendingChange ?? null}
        />
        <StatCard
          icon={<Loader2 className="h-5 w-5 text-muted-foreground" />}
          label={t("Processing")}
          value={String(summary?.processing ?? 0)}
          change={summary?.processingChange ?? null}
        />
        <StatCard
          icon={<Truck className="h-5 w-5 text-muted-foreground" />}
          label={t("Out for Delivery")}
          value={String(summary?.outForDelivery ?? 0)}
          change={summary?.outForDeliveryChange ?? null}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-muted-foreground" />}
          label={t("Completed")}
          value={String(summary?.completed ?? 0)}
          change={summary?.completedChange ?? null}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
          label={t("Revenue Today")}
          value={money(summary?.revenueToday ?? 0)}
          change={summary?.revenueTodayChange ?? null}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="space-y-3 border-b p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search by order number, customer...")}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!vendorMode ? (
                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder={t("Vendor")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Vendors")}</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder={t("Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All Status")}</SelectItem>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatStatusLabel(s)}
                    </SelectItem>
                  ))}
                  <SelectItem value="paid">{t("Paid")}</SelectItem>
                  <SelectItem value="scheduled">{t("Scheduled")}</SelectItem>
                  <SelectItem value="delivered">{t("Delivered")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder={t("Payment")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All Payment Status")}</SelectItem>
                  {PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 w-[118px] border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 w-[118px] border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
              >
                <Filter className="h-3.5 w-3.5" />
                {t("Filters")}
                {activeFilterCount > 0 ? (
                  <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-t pt-3">
            {ORDER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {t(tab.label)} ({tabCounts[tab.key] ?? 0})
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[1180px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-6">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => {
                      if (v) setSelected(new Set(rows.map((r) => r.id)));
                      else setSelected(new Set());
                    }}
                    aria-label={t("Select all")}
                  />
                </TableHead>
                <TableHead>{t("Order")}</TableHead>
                <TableHead>{t("Customer")}</TableHead>
                {!vendorMode ? <TableHead>{t("Vendor")}</TableHead> : null}
                <TableHead>{t("Delivery Date")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead>{t("Payment")}</TableHead>
                <TableHead className="text-right">{t("Total")}</TableHead>
                <TableHead className="pr-6 text-right">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    {t("No orders found.")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const placed = fmtOrderDate(row.createdAt);
                  const delivery = fmtDeliveryDate(row.deliveryDate, row.deliveryWindow);
                  const displayStatus = row.orderStatus ?? row.status;
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(activeId === row.id && "bg-primary/5")}
                      onClick={() => void openDetail(row)}
                    >
                      <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(row.id)}
                          onCheckedChange={(v) => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (v) next.add(row.id);
                              else next.delete(row.id);
                              return next;
                            });
                          }}
                          aria-label={`Select ${row.orderNumber}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {placed.date} {placed.time}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CustomerAvatar name={row.customerName} />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{row.customerName}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {row.customerPhone ?? row.customerEmail ?? "—"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      {!vendorMode ? (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <VendorAvatar name={row.vendorName ?? "?"} logoUrl={row.vendorLogoUrl} />
                            <span className="truncate">{row.vendorName ?? "—"}</span>
                          </div>
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <div className="text-sm">{delivery.date}</div>
                        {delivery.time ? (
                          <div className="text-xs text-muted-foreground">{delivery.time}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                            statusBadgeClass(displayStatus),
                          )}
                        >
                          {formatStatusLabel(displayStatus)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                            paymentBadgeClass(row.paymentStatus),
                          )}
                        >
                          {formatStatusLabel(row.paymentStatus)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{money(row.total)}</TableCell>
                      <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <TableActionButton
                          label={t("View")}
                          primaryIcon={<Eye className="h-4 w-4" />}
                          onPrimaryClick={() => void openDetail(row)}
                          className="ml-auto"
                          items={[
                            { label: t("View"), onSelect: () => void openDetail(row), icon: <Eye className="h-4 w-4" /> },
                            ...(canManage
                              ? [
                                  {
                                    label: t("Edit status"),
                                    onSelect: () => void openDetail(row),
                                    icon: <Pencil className="h-4 w-4" />,
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && pagination.total > 0 ? (
          <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <Pagination
              page={pagination.page}
              lastPage={pagination.lastPage}
              total={pagination.total}
              from={pagination.from}
              to={pagination.to}
              onPageChange={setPage}
              entityLabel={t("orders")}
            />
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">{t("10 per page")}</SelectItem>
                <SelectItem value="25">{t("25 per page")}</SelectItem>
                <SelectItem value="50">{t("50 per page")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("Order Details")}</SheetTitle>
          </SheetHeader>

          {detailLoading || !detail ? (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{detail.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{fmtOrderDate(detail.createdAt).date}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    statusBadgeClass(detail.status),
                  )}
                >
                  {formatStatusLabel(detail.status)}
                </span>
              </div>

              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Customer Information")}
                </p>
                <div className="flex items-center gap-3">
                  <CustomerAvatar name={detail.customer.name} />
                  <div>
                    <p className="font-medium">{detail.customer.name}</p>
                    {detail.customer.email ? (
                      <p className="text-xs text-muted-foreground">{detail.customer.email}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              {detail.deliveryAddress ? (
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("Delivery Address")}
                  </p>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{detail.deliveryAddress}</span>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Order Items")}</p>
                <div className="space-y-2">
                  {detail.lineItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border p-2">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="h-12 w-12 rounded object-cover" />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs font-semibold text-muted-foreground">
                          {initials(item.title)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium tabular-nums">{money(item.lineTotal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 rounded-lg border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Subtotal")}</span>
                  <span className="tabular-nums">{money(detail.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Delivery Fee")}</span>
                  <span className="tabular-nums">{money(detail.deliveryFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Tax")}</span>
                  <span className="tabular-nums">{money(detail.tax)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>{t("Total")}</span>
                  <span className="tabular-nums">{money(detail.total)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Order Timeline")}
                </p>
                <ul className="space-y-3">
                  {detail.timeline.map((step) => (
                    <li key={step.key} className="flex items-start gap-3">
                      <span className="mt-0.5">
                        {step.done ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : step.active ? (
                          <Circle className="h-4 w-4 fill-primary text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </span>
                      <span className={cn("text-sm", step.done || step.active ? "font-medium" : "text-muted-foreground")}>
                        {step.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {canManage ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-muted-foreground">{t("Order status")}</label>
                    <Select value={detail.status} onValueChange={(v) => void updateOrder({ status: v })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {formatStatusLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-muted-foreground">{t("Payment status")}</label>
                    <Select value={detail.paymentStatus} onValueChange={(v) => void updateOrder({ paymentStatus: v })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {formatStatusLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              {canCreateEvents && deliveries.length > 0 ? (
                <div className="rounded-lg border p-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("Add delivery event")}
                  </p>
                  {deliveries.length > 1 ? (
                    <Select value={eventDeliveryId} onValueChange={setEventDeliveryId}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {deliveries.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            Delivery #{d.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Select value={eventStatus} onValueChange={setEventStatus}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatStatusLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder={t("Note (optional)")} value={eventNote} onChange={(e) => setEventNote(e.target.value)} />
                  <Button size="sm" onClick={() => void addEvent()}>
                    {t("Add event")}
                  </Button>
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => window.print()}>
                  <Download className="h-3.5 w-3.5" />
                  {t("Print Invoice")}
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => void openDetail({ id: detail.id } as OrderRow)}>
                  {t("Refresh")}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
