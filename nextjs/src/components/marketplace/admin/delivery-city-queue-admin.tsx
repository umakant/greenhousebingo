"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  Info,
  Loader2,
  Users,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
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
import { DASHBOARD_STAT_ICON_TINT } from "@/components/dashboard/dashboard-stat-styles";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { t } from "@/lib/admin-t";


type QueueRow = {
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
  nextDeliveryEvent: {
    id: string;
    deliveryDate: string | null;
    startTime: string | null;
    endTime: string | null;
    status: string;
  } | null;
};

type Summary = {
  totalCities: number;
  ready: number;
  waiting: number;
  scheduled: number;
  totalRevenue: number;
  companyTotal: number;
  deliveryMinimum: number;
};

const EMPTY_SCHEDULE = {
  deliveryDate: "",
  startTime: "09:00",
  endTime: "12:00",
  deliveryAddress: "",
  deliveryNotes: "",
  driverName: "",
  driverPhone: "",
};

function formatTime12h(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const [hRaw, mRaw] = value.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw ?? 0);
  if (Number.isNaN(h)) return value;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDeliveryWindow(row: QueueRow): string {
  const evt = row.nextDeliveryEvent;
  if (!evt?.deliveryDate) return t("Delivery scheduled");
  const d = new Date(evt.deliveryDate);
  const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const start = formatTime12h(evt.startTime);
  const end = formatTime12h(evt.endTime);
  if (start && end) return `${dateStr} | ${start} – ${end}`;
  if (start) return `${dateStr} | ${start}`;
  return dateStr;
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
  sub?: string;
  tint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tint}`}>{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          {sub ? <p className="truncate text-xs text-muted-foreground">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function CityQueueCard({
  row,
  variant,
  money,
  canSchedule,
  onSchedule,
}: {
  row: QueueRow;
  variant: "ready" | "waiting" | "scheduled";
  money: (n: number) => string;
  canSchedule: boolean;
  onSchedule: (row: QueueRow) => void;
}) {
  const colors = {
    ready: {
      bar: "bg-green-500",
      text: "text-green-700 dark:text-green-300",
      buckets: "text-green-700 dark:text-green-300",
    },
    waiting: {
      bar: "bg-orange-500",
      text: "text-orange-700 dark:text-orange-300",
      buckets: "text-orange-700 dark:text-orange-300",
    },
    scheduled: {
      bar: "bg-blue-500",
      text: "text-blue-700 dark:text-blue-300",
      buckets: "text-blue-700 dark:text-blue-300",
    },
  }[variant];

  const progress = Math.min(100, row.progressPercent);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">
            {row.city}, {row.state}
          </h3>
          {row.vendorName ? <p className="text-xs text-muted-foreground">{row.vendorName}</p> : null}
        </div>
        <Link
          href={`/admin/marketplace/delivery-queue/${row.param}`}
          className="text-xs font-medium text-primary hover:underline"
        >
          {t("View")}
        </Link>
      </div>

      <p className={`mt-3 text-sm font-bold ${colors.buckets}`}>
        {row.bucketsOrdered} / {row.requiredBucketMinimum} {t("Buckets")}
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${progress}%` }} />
      </div>

      {variant === "scheduled" ? (
        <p className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${colors.text}`}>
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          {formatDeliveryWindow(row)}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {row.companyCount} {row.companyCount === 1 ? t("Company") : t("Companies")}
        </span>
        <span className="inline-flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5" />
          {money(row.totalRevenue)} {t("Revenue")}
        </span>
      </div>

      {variant === "ready" && canSchedule ? (
        <Button className="mt-4 w-full bg-green-600 hover:bg-green-700" size="sm" onClick={() => onSchedule(row)}>
          <CalendarDays className="mr-2 h-4 w-4" />
          {t("Schedule Delivery")}
        </Button>
      ) : null}
    </div>
  );
}

function QueueColumn({
  title,
  subtitle,
  count,
  colorClass,
  footerClass,
  footerLabel,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  colorClass: string;
  footerClass: string;
  footerLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col rounded-xl border bg-muted/20">
      <div className="border-b bg-card/80 px-4 py-3">
        <h2 className={`text-sm font-bold uppercase tracking-wide ${colorClass}`}>
          {title} ({count})
        </h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3" style={{ maxHeight: "min(70vh, 720px)" }}>
        {children}
      </div>
      <div className="border-t bg-card/60 px-4 py-2.5">
        <button type="button" className={`text-xs font-semibold ${footerClass}`}>
          {footerLabel} →
        </button>
      </div>
    </div>
  );
}

export default function DeliveryCityQueueAdmin({
  canSchedule = false,
  apiBase = "/api/marketplace/admin",
}: {
  canSchedule?: boolean;
  apiBase?: string;
}) {
  const { settings } = useAppSettings();
  const [rows, setRows] = React.useState<QueueRow[]>([]);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [scheduleTarget, setScheduleTarget] = React.useState<QueueRow | null>(null);
  const [scheduleForm, setScheduleForm] = React.useState({ ...EMPTY_SCHEDULE });
  const [scheduling, setScheduling] = React.useState(false);

  const money = (n: number) => formatCurrency(Number(n) || 0, settings);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/delivery-queue`, { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setRows((data.items ?? []) as QueueRow[]);
        setSummary((data.summary ?? null) as Summary | null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const ready = React.useMemo(
    () =>
      rows
        .filter((r) => r.queueStatus === "ready_to_schedule")
        .sort((a, b) => b.bucketsOrdered - a.bucketsOrdered),
    [rows],
  );
  const waiting = React.useMemo(
    () =>
      rows
        .filter((r) => r.queueStatus === "waiting")
        .sort((a, b) => b.progressPercent - a.progressPercent),
    [rows],
  );
  const scheduled = React.useMemo(
    () =>
      rows
        .filter((r) => r.queueStatus === "scheduled")
        .sort((a, b) => {
          const ad = a.nextDeliveryEvent?.deliveryDate ?? "";
          const bd = b.nextDeliveryEvent?.deliveryDate ?? "";
          return ad.localeCompare(bd);
        }),
    [rows],
  );

  const openSchedule = (row: QueueRow) => {
    setScheduleTarget(row);
    setScheduleForm({
      ...EMPTY_SCHEDULE,
      deliveryAddress: `${row.city}, ${row.state}`,
    });
    setScheduleOpen(true);
  };

  const submitSchedule = async () => {
    if (!scheduleTarget) return;
    if (!scheduleForm.deliveryDate) {
      toast.error("Delivery date is required.");
      return;
    }
    setScheduling(true);
    try {
      const res = await fetch(`${apiBase}/delivery-queue/${scheduleTarget.param}/schedule`, {
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
      } else {
        toast.error(data?.message ?? "Could not schedule delivery.");
      }
    } finally {
      setScheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const min = summary?.deliveryMinimum ?? 50;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <p className="text-sm text-muted-foreground">{t("Manage city queues and schedule deliveries.")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
          label={t("Total Cities")}
          value={String(summary?.totalCities ?? rows.length)}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-muted-foreground" />}
          label={t("Ready to Schedule")}
          value={String(summary?.ready ?? ready.length)}
          sub={t("Cities reached minimum")}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-muted-foreground" />}
          label={t("Waiting for Minimum")}
          value={String(summary?.waiting ?? waiting.length)}
          sub={t("Cities below minimum")}
        />
        <StatCard
          icon={<CalendarDays className="h-5 w-5 text-muted-foreground" />}
          label={t("Scheduled")}
          value={String(summary?.scheduled ?? scheduled.length)}
          sub={t("Upcoming deliveries")}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
          label={t("Total Revenue")}
          value={money(summary?.totalRevenue ?? 0)}
          sub={`${t("From")} ${summary?.companyTotal ?? 0} ${t("companies")}`}
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <p>{t("No city queues yet.")}</p>
          <p className="mt-1 text-sm">{t("Queues are created automatically as companies place orders.")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <QueueColumn
            title={t("Ready to Schedule")}
            subtitle={t("Cities that have met the minimum")}
            count={ready.length}
            colorClass="text-muted-foreground"
            footerClass="text-muted-foreground"
            footerLabel={t("View all ready cities")}
          >
            {ready.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("No cities ready yet.")}</p>
            ) : (
              ready.map((row) => (
                <CityQueueCard
                  key={row.id}
                  row={row}
                  variant="ready"
                  money={money}
                  canSchedule={canSchedule}
                  onSchedule={openSchedule}
                />
              ))
            )}
          </QueueColumn>

          <QueueColumn
            title={t("Waiting for Minimum")}
            subtitle={t("Cities below required minimum")}
            count={waiting.length}
            colorClass="text-muted-foreground"
            footerClass="text-muted-foreground"
            footerLabel={t("View all waiting cities")}
          >
            {waiting.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("No cities waiting.")}</p>
            ) : (
              waiting.map((row) => (
                <CityQueueCard
                  key={row.id}
                  row={row}
                  variant="waiting"
                  money={money}
                  canSchedule={false}
                  onSchedule={openSchedule}
                />
              ))
            )}
          </QueueColumn>

          <QueueColumn
            title={t("Scheduled Deliveries")}
            subtitle={t("Upcoming delivery events")}
            count={scheduled.length}
            colorClass="text-muted-foreground"
            footerClass="text-muted-foreground"
            footerLabel={t("View all scheduled")}
          >
            {scheduled.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("No scheduled deliveries.")}</p>
            ) : (
              scheduled.map((row) => (
                <CityQueueCard
                  key={row.id}
                  row={row}
                  variant="scheduled"
                  money={money}
                  canSchedule={false}
                  onSchedule={openSchedule}
                />
              ))
            )}
          </QueueColumn>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {t("Delivery minimum is")} <strong>{min}</strong> {t("buckets per city.")}{" "}
          {t("Once the minimum is reached, you can schedule a delivery.")}
        </p>
      </div>

      <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {t("Schedule Delivery")}
              {scheduleTarget ? ` — ${scheduleTarget.city}, ${scheduleTarget.state}` : ""}
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
