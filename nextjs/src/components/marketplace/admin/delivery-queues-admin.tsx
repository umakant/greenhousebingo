"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Clock,
  DollarSign,
  Loader2,
  Map,
  MapPin,
  Truck,
  ListOrdered,
  CheckCircle2,
  Filter,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CityPlacesSearchInput } from "@/components/ui/city-places-search-input";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DASHBOARD_STAT_ICON_TINT } from "@/components/dashboard/dashboard-stat-styles";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { TimeInput12h } from "@/components/ui/time-input-12h";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import DeliveryQueuesMap from "@/components/marketplace/admin/delivery-queues-map";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { coordsForCity } from "@/lib/marketplace/city-coords";
import { t } from "@/lib/admin-t";


type QueueItem = {
  id: string;
  param: string;
  vendorId: string;
  vendorName: string | null;
  city: string;
  state: string;
  bucketsOrdered: number;
  requiredBucketMinimum: number;
  progressPercent: number;
  companyCount: number;
  totalRevenue: number;
  currency: string;
  queueStatus: string;
  isReady: boolean;
};

type CityDetail = {
  vendor: { id: string; name: string };
  queue: {
    city: string;
    state: string;
    bucketsOrdered: number;
    requiredBucketMinimum: number;
    progressPercent: number;
    companyCount: number;
    queueStatus: string;
    currency: string;
  };
  revenueCollected: number;
  orders: Array<{
    id: string;
    orderNumber: string;
    companyName: string | null;
    orderStatus: string;
    totalBucketCount: number | null;
  }>;
  scheduledEvents: Array<{
    id: string;
    status: string;
    deliveryDate: string | null;
    startTime: string | null;
    endTime: string | null;
    driverName: string | null;
    orderCount: number;
  }>;
};

const STATUS_META: Record<
  string,
  { label: string; pin: string; text: string; dot: string; chip: string }
> = {
  ready_to_schedule: {
    label: "Ready to Deliver",
    pin: "#16a34a",
    text: "text-green-700 dark:text-green-300",
    dot: "bg-green-500",
    chip: "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300",
  },
  waiting: {
    label: "Waiting for Minimum",
    pin: "#f97316",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
    chip: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
  },
  scheduled: {
    label: "Scheduled",
    pin: "#2563eb",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
    chip: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  },
};

function statusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.waiting;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tint = DASHBOARD_STAT_ICON_TINT,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tint}`}>{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
    </div>
  );
}

const EMPTY_SCHEDULE = {
  deliveryDate: "",
  startTime: "09:00",
  endTime: "12:00",
  deliveryAddress: "",
  deliveryNotes: "",
  driverName: "",
  driverPhone: "",
};

export default function DeliveryQueuesAdmin({ canManage }: { canManage: boolean }) {
  const { settings } = useAppSettings();
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [cityFilter, setCityFilter] = React.useState("all");
  const [vendorFilter, setVendorFilter] = React.useState("all");
  const [pickDate, setPickDate] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [selectedParam, setSelectedParam] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<CityDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [scheduleForm, setScheduleForm] = React.useState({ ...EMPTY_SCHEDULE });
  const [scheduling, setScheduling] = React.useState(false);

  const money = (n: number) => formatCurrency(Number(n) || 0, settings);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace/admin/delivery-queue", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        const list = (data.items ?? []) as QueueItem[];
        setItems(list);
        setSelectedParam((prev) => {
          if (prev && list.some((i) => i.param === prev)) return prev;
          const ready = list.find((i) => i.queueStatus === "ready_to_schedule");
          return (ready ?? list[0])?.param ?? null;
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const loadDetail = React.useCallback(async (param: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/marketplace/admin/delivery-queue/${param}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) setDetail(data as CityDetail);
      else setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedParam) void loadDetail(selectedParam);
    else setDetail(null);
  }, [selectedParam, loadDetail]);

  const cities = React.useMemo(
    () => [...new Set(items.map((i) => `${i.city}, ${i.state}`))].sort(),
    [items],
  );
  const vendors = React.useMemo(
    () => [...new Set(items.map((i) => i.vendorName).filter(Boolean) as string[])].sort(),
    [items],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== "all" && i.queueStatus !== statusFilter) return false;
      if (cityFilter !== "all" && `${i.city}, ${i.state}` !== cityFilter) return false;
      if (vendorFilter !== "all" && i.vendorName !== vendorFilter) return false;
      if (!q) return true;
      const hay = [i.city, i.state, i.vendorName].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, statusFilter, cityFilter, vendorFilter]);

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (cityFilter !== "all" ? 1 : 0) +
    (vendorFilter !== "all" ? 1 : 0) +
    (pickDate ? 1 : 0);

  const stats = React.useMemo(() => {
    const ready = items.filter((i) => i.queueStatus === "ready_to_schedule").length;
    const waiting = items.filter((i) => i.queueStatus === "waiting").length;
    const scheduled = items.filter((i) => i.queueStatus === "scheduled").length;
    const revenue = items.reduce((s, i) => s + i.totalRevenue, 0);
    const companies = items.reduce((s, i) => s + i.companyCount, 0);
    return { ready, waiting, scheduled, revenue, companies };
  }, [items]);

  const offMap = filtered.filter((i) => coordsForCity(i.city, i.state) == null);

  const topCities = React.useMemo(
    () => [...items].sort((a, b) => b.bucketsOrdered - a.bucketsOrdered).slice(0, 5),
    [items],
  );

  const selected = items.find((i) => i.param === selectedParam) ?? null;

  const openSchedule = () => {
    setScheduleForm({ ...EMPTY_SCHEDULE, deliveryAddress: selected ? `${selected.city}, ${selected.state}` : "" });
    setScheduleOpen(true);
  };

  const handleCityPlaceSelected = React.useCallback(
    (pick: { city: string; state: string; label: string }) => {
      if (pick.city && pick.state) {
        const cityKey = `${pick.city}, ${pick.state}`;
        if (cities.includes(cityKey)) setCityFilter(cityKey);
      }

      const match = items.find((i) => {
        const stateMatch = pick.state
          ? i.state.toLowerCase() === pick.state.toLowerCase()
          : true;
        if (!pick.city) return stateMatch;
        return (
          stateMatch && i.city.toLowerCase() === pick.city.toLowerCase()
        );
      });
      if (match) setSelectedParam(match.param);
    },
    [cities, items],
  );

  const submitSchedule = async () => {
    if (!selectedParam) return;
    if (!scheduleForm.deliveryDate) {
      toast.error("Delivery date is required.");
      return;
    }
    setScheduling(true);
    try {
      const res = await fetch(`/api/marketplace/admin/delivery-queue/${selectedParam}/schedule`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduleForm),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        toast.success(`Delivery scheduled for ${data.scheduledOrders ?? 0} order(s).`);
        setScheduleOpen(false);
        await load();
        if (selectedParam) await loadDetail(selectedParam);
      } else {
        toast.error(data?.message ?? "Could not schedule delivery.");
      }
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <p className="text-sm text-muted-foreground">
        {t("Visual overview of delivery queues across the United States.")}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
          label={t("Total Cities")}
          value={String(items.length)}
          sub={t("Across all regions")}
        />
        <StatCard
          icon={<Truck className="h-5 w-5 text-muted-foreground" />}
          label={t("Ready to Deliver")}
          value={String(stats.ready)}
          sub={t("Cities reached minimum")}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-muted-foreground" />}
          label={t("Waiting for Minimum")}
          value={String(stats.waiting)}
          sub={t("Cities below minimum")}
        />
        <StatCard
          icon={<CalendarDays className="h-5 w-5 text-muted-foreground" />}
          label={t("Scheduled")}
          value={String(stats.scheduled)}
          sub={t("Upcoming deliveries")}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
          label={t("Revenue Collected")}
          value={money(stats.revenue)}
          sub={`${t("From")} ${stats.companies} ${t("companies")}`}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pr-4">
          <div className="flex items-center gap-2 border-b px-5 py-3.5 sm:border-0">
            <Map className="h-4 w-4 text-primary" />
            <span className="border-b-2 border-primary pb-0.5 text-sm font-medium">{t("Map View")}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-0 sm:pb-0">
            <Input
              type="date"
              value={pickDate}
              onChange={(e) => setPickDate(e.target.value)}
              className="h-8 w-[150px] shrink-0 text-sm"
              aria-label={t("Pick a date")}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => setFiltersOpen((v) => !v)}>
              <Filter className="mr-2 h-4 w-4" />
              {t("Filters")}
              {activeFilterCount > 0 ? (
                <Badge variant="secondary" className="ml-2 h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                  {activeFilterCount}
                </Badge>
              ) : null}
            </Button>
            {canManage ? (
              <Button asChild size="sm">
                <Link href="/admin/marketplace/delivery-queue">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("Schedule Delivery")}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col gap-3 border-b bg-muted/20 p-4 lg:flex-row lg:flex-wrap lg:items-center",
            !filtersOpen && "hidden sm:flex",
          )}
        >
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <CityPlacesSearchInput
              className="bg-background pl-9"
              placeholder={t("Search by city, vendor, or state...")}
              value={search}
              onChange={setSearch}
              onCitySelected={handleCityPlaceSelected}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full bg-background lg:w-[140px]">
              <SelectValue placeholder={t("Status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Status")}</SelectItem>
              <SelectItem value="ready_to_schedule">{t("Ready to Deliver")}</SelectItem>
              <SelectItem value="waiting">{t("Waiting for Minimum")}</SelectItem>
              <SelectItem value="scheduled">{t("Scheduled")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-full bg-background lg:w-[150px]">
              <SelectValue placeholder={t("City")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Cities")}</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger className="w-full bg-background lg:w-[150px]">
              <SelectValue placeholder={t("Vendor")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Vendors")}</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex h-[420px] items-center justify-center rounded-xl border bg-muted/30 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-[420px] flex-col items-center justify-center gap-2 rounded-xl border bg-muted/30 text-center text-muted-foreground">
              <MapPin className="h-8 w-8 opacity-40" />
              <p>{t("No delivery queues yet.")}</p>
              <p className="text-xs">{t("City queues are created automatically as companies place orders.")}</p>
            </div>
          ) : (
            <DeliveryQueuesMap
              markers={filtered}
              selectedParam={selectedParam}
              onSelect={setSelectedParam}
              stats={{ ready: stats.ready, waiting: stats.waiting, scheduled: stats.scheduled }}
            />
          )}

          {/* Off-map cities */}
          {offMap.length > 0 ? (
            <div className="mt-2 rounded-lg border bg-card p-2.5 text-xs">
              <span className="text-muted-foreground">{t("Cities without map coordinates:")} </span>
              {offMap.map((i) => (
                <button
                  key={i.param}
                  type="button"
                  onClick={() => setSelectedParam(i.param)}
                  className={`mx-0.5 my-0.5 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium ${statusMeta(i.queueStatus).chip}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusMeta(i.queueStatus).dot}`} />
                  {i.city}, {i.state}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Detail panel */}
        <div className="space-y-3">
          {selected ? (
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-semibold">
                    {selected.city}, {selected.state}
                  </span>
                </div>
                <Badge variant="outline" className={`capitalize ${statusMeta(selected.queueStatus).chip}`}>
                  {statusMeta(selected.queueStatus).label}
                </Badge>
              </div>
              {selected.vendorName ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{selected.vendorName}</p>
              ) : null}

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <span className={`text-3xl font-bold ${statusMeta(selected.queueStatus).text}`}>
                    {selected.bucketsOrdered}
                  </span>
                  <span className="text-lg font-semibold text-muted-foreground">
                    {" "}
                    / {selected.requiredBucketMinimum}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {selected.progressPercent}% {t("of minimum")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{selected.companyCount}</p>
                  <p className="text-xs text-muted-foreground">{t("Companies")}</p>
                </div>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${
                    selected.queueStatus === "ready_to_schedule"
                      ? "bg-green-500"
                      : selected.queueStatus === "scheduled"
                        ? "bg-blue-500"
                        : "bg-orange-500"
                  }`}
                  style={{ width: `${Math.min(100, selected.progressPercent)}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                <div>
                  <p className="text-sm font-bold">{money(selected.totalRevenue)}</p>
                  <p className="text-[11px] text-muted-foreground">{t("Revenue")}</p>
                </div>
                <div>
                  <p className="text-sm font-bold">{detail?.orders.length ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground">{t("Orders")}</p>
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {detail && detail.orders.length
                      ? Math.round((selected.bucketsOrdered / detail.orders.length) * 10) / 10
                      : "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{t("Avg Order")}</p>
                </div>
              </div>

              {/* Companies in queue */}
              <div className="mt-4 border-t pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold">{t("Recent Companies in Queue")}</p>
                </div>
                {detailLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : detail && detail.orders.length ? (
                  <ul className="space-y-1.5">
                    {detail.orders.slice(0, 6).map((o) => (
                      <li key={o.id} className="flex items-center gap-2 text-sm">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[11px] font-semibold">
                          {(o.companyName ?? "?").charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{o.companyName ?? o.orderNumber}</span>
                        <span className="text-xs text-muted-foreground">
                          {o.totalBucketCount ?? 0} {t("buckets")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-2 text-center text-xs text-muted-foreground">{t("No orders in this queue yet.")}</p>
                )}
              </div>

              {/* Next actions */}
              <div className="mt-4 border-t pt-3">
                <p className="mb-2 text-xs font-semibold">{t("Next Actions")}</p>
                {selected.queueStatus === "scheduled" ? (
                  <p className="mb-2 inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("This city is already scheduled for delivery.")}
                  </p>
                ) : selected.isReady ? (
                  <p className="mb-2 text-xs text-muted-foreground">
                    {t("This city has reached the minimum required buckets.")}
                  </p>
                ) : (
                  <p className="mb-2 text-xs text-muted-foreground">
                    {selected.requiredBucketMinimum - selected.bucketsOrdered} {t("more buckets needed to schedule.")}
                  </p>
                )}
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    disabled={!canManage || !selected.isReady}
                    onClick={openSchedule}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {t("Schedule Delivery")}
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/marketplace/admin/orders">
                      <ListOrdered className="mr-2 h-4 w-4" />
                      {t("View All Orders")}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
              {t("Select a city pin to see its delivery queue details.")}
            </div>
          )}

          {/* Delivery minimum hint */}
          {selected ? (
            <div className="flex items-center justify-between rounded-xl border bg-card p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t("Delivery Minimum")}</p>
                <p className="text-lg font-bold">
                  {selected.requiredBucketMinimum} {t("buckets")}
                </p>
                <p className={`text-xs ${selected.isReady ? "text-green-600 dark:text-green-300" : "text-muted-foreground"}`}>
                  {selected.isReady ? t("You've reached the minimum!") : t("Accumulating orders...")}
                </p>
              </div>
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  selected.isReady ? "bg-green-100 dark:bg-green-950/50" : "bg-muted"
                }`}
              >
                <CheckCircle2
                  className={`h-6 w-6 ${selected.isReady ? "text-green-600" : "text-muted-foreground"}`}
                />
              </span>
            </div>
          ) : null}
        </div>
        </div>
      </div>

      {/* Top cities */}
      {topCities.length > 0 ? (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("Top Cities by Buckets Ordered")}</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {topCities.map((c, idx) => (
              <button
                key={c.param}
                type="button"
                onClick={() => setSelectedParam(c.param)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
                  c.param === selectedParam ? "border-primary" : ""
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {c.city}, {c.state}
                  </p>
                  <p className={`text-xs font-semibold ${statusMeta(c.queueStatus).text}`}>
                    {c.bucketsOrdered} / {c.requiredBucketMinimum}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Schedule delivery sheet */}
      <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {t("Schedule Delivery")}
              {selected ? ` — ${selected.city}, ${selected.state}` : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label required>{t("Delivery date")}</Label>
              <Input
                type="date"
                value={scheduleForm.deliveryDate}
                onChange={(e) => setScheduleForm((f) => ({ ...f, deliveryDate: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("Start time")}</Label>
                <TimeInput12h
                  value={scheduleForm.startTime}
                  onChange={(startTime) => setScheduleForm((f) => ({ ...f, startTime }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("End time")}</Label>
                <TimeInput12h
                  value={scheduleForm.endTime}
                  onChange={(endTime) => setScheduleForm((f) => ({ ...f, endTime }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Delivery address")}</Label>
              <Input
                value={scheduleForm.deliveryAddress}
                onChange={(e) => setScheduleForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("Driver name")}</Label>
                <Input
                  value={scheduleForm.driverName}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, driverName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Driver phone")}</Label>
                <PhoneInput
                  value={scheduleForm.driverPhone}
                  onChange={(v) => setScheduleForm((f) => ({ ...f, driverPhone: v }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Delivery notes")}</Label>
              <Textarea
                rows={3}
                value={scheduleForm.deliveryNotes}
                onChange={(e) => setScheduleForm((f) => ({ ...f, deliveryNotes: e.target.value }))}
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={scheduling}>
              {t("Cancel")}
            </Button>
            <Button onClick={submitSchedule} disabled={scheduling}>
              {scheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("Schedule Delivery")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
