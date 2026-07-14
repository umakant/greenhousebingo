"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  AlertTriangle,
  Award,
  BadgeDollarSign,
  CircleDollarSign,
  Flame,
  Gift,
  Leaf,
  Package,
  PackageCheck,
  Percent,
  Sprout,
  Tag,
  TrendingUp,
  Users,
} from "lucide-react";

import type {
  EventPlantDto,
  EventPlantRequestDto,
  EventPlantRequestType,
  EventPlantsOverview,
} from "@/lib/event-platform/event-plants/event-plant-types";
import { EVENT_PLANT_REQUEST_TYPE_LABELS } from "@/lib/event-platform/event-plants/event-plant-types";
import { EVENT_PLANT_STATUS_LABELS } from "@/lib/event-platform/event-plants/event-plant-constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function RequestTypeBadge({ type }: { type: EventPlantRequestType }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 px-1.5 text-[10px] font-medium",
        type === "take_home"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
      )}
    >
      {EVENT_PLANT_REQUEST_TYPE_LABELS[type]}
    </Badge>
  );
}

const CATEGORY_COLORS = [
  "hsl(142 71% 45%)",
  "hsl(160 60% 45%)",
  "hsl(258 90% 66%)",
  "hsl(217 19% 70%)",
  "hsl(340 82% 60%)",
  "hsl(38 92% 50%)",
  "hsl(199 89% 48%)",
];

function money(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Popularity tone + icon by label. */
export function popularityMeta(label: string): { color: string; icon: React.ReactNode } {
  const l = label.toLowerCase();
  if (l.includes("very")) return { color: "text-red-500", icon: <Flame className="h-3.5 w-3.5" /> };
  if (l === "high") return { color: "text-emerald-500", icon: <TrendingUp className="h-3.5 w-3.5" /> };
  if (l === "medium") return { color: "text-amber-500", icon: <Sprout className="h-3.5 w-3.5" /> };
  return { color: "text-sky-500", icon: <Leaf className="h-3.5 w-3.5" /> };
}

export function healthLabel(percent: number): string {
  if (percent >= 90) return "Excellent";
  if (percent >= 75) return "Good";
  if (percent >= 50) return "Fair";
  return "Needs attention";
}

function StatCard(props: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-start justify-between gap-2 p-3 sm:p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
          <p className="text-xl font-bold tabular-nums tracking-tight">{props.value}</p>
          <p className="text-[11px] text-muted-foreground">{props.hint}</p>
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", props.iconClass)}>
          {props.icon}
        </span>
      </CardContent>
    </Card>
  );
}

export function PlantSummaryCards(props: {
  summary: EventPlantsOverview["summary"] | null;
  requestsCount?: number;
  healthPercent?: number;
  loading?: boolean;
}) {
  if (props.loading || !props.summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="h-[76px] animate-pulse bg-muted/40 p-4" />
          </Card>
        ))}
      </div>
    );
  }

  const s = props.summary;
  const health = props.healthPercent ?? 100;

  const items: Array<React.ComponentProps<typeof StatCard>> = [
    { label: "Total Plants", value: s.totalPlants, hint: "Plant Varieties", icon: <Leaf className="h-4 w-4" />, iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    { label: "Total Cost", value: money(s.totalPlantCost), hint: "Total Spent", icon: <CircleDollarSign className="h-4 w-4" />, iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
    { label: "Avg Unit Cost", value: money(s.averageUnitCost), hint: "Per Plant", icon: <Tag className="h-4 w-4" />, iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
    { label: "Retail Value", value: money(s.estimatedRetailValue), hint: "Estimated Value", icon: <BadgeDollarSign className="h-4 w-4" />, iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    { label: "Assigned to Games", value: s.plantsAssignedToGames, hint: "Plants in Games", icon: <Gift className="h-4 w-4" />, iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
    { label: "Awarded", value: s.plantsAwarded, hint: "Plants Won", icon: <Award className="h-4 w-4" />, iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    { label: "Remaining", value: s.plantsRemaining, hint: "Available Inventory", icon: <PackageCheck className="h-4 w-4" />, iconClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
    { label: "Requested", value: props.requestsCount ?? s.requestedPlantsAvailable, hint: "Attendee Requests", icon: <Users className="h-4 w-4" />, iconClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
    { label: "Inventory Gaps", value: s.inventoryGaps, hint: s.inventoryGaps > 0 ? "Shortages" : "No Shortages", icon: <AlertTriangle className="h-4 w-4" />, iconClass: s.inventoryGaps > 0 ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-muted text-muted-foreground" },
  ];

  const healthTone =
    health >= 90 ? "bg-emerald-500" : health >= 75 ? "bg-sky-500" : health >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <StatCard key={item.label} {...item} />
      ))}
      <Card className="shadow-sm">
        <CardContent className="flex flex-col justify-center gap-1.5 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Inventory Health</p>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold leading-none">{healthLabel(health)}</p>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", healthTone)} style={{ width: `${health}%` }} />
            </div>
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">{health}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PlantInventoryOverview(props: { plants: EventPlantDto[] }) {
  const byCategory = new Map<string, number>();
  for (const p of props.plants) {
    const key = p.category?.trim() || "Other";
    byCategory.set(key, (byCategory.get(key) ?? 0) + p.quantityPurchased);
  }
  const total = [...byCategory.values()].reduce((a, b) => a + b, 0);
  const segments = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Inventory Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="relative h-[120px] w-[120px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={total > 0 ? segments : [{ name: "None", value: 1, color: "#e5e7eb" }]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={56}
                  paddingAngle={2}
                  stroke="none"
                >
                  {(total > 0 ? segments : [{ color: "#e5e7eb" }]).map((seg, i) => (
                    <Cell key={i} fill={seg.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold leading-none tabular-nums">{total}</span>
              <span className="text-[10px] text-muted-foreground">plants</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            {segments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No inventory yet.</p>
            ) : (
              segments.map((seg) => {
                const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
                return (
                  <div key={seg.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="flex-1 truncate text-muted-foreground">{seg.name}</span>
                    <span className="font-semibold tabular-nums">{seg.value}</span>
                    <span className="w-9 text-right text-muted-foreground tabular-nums">{pct}%</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlantTopRequested(props: {
  plants: EventPlantDto[];
  onView?: (plantId: string) => void;
}) {
  const top = props.plants
    .filter((p) => p.requestCount > 0)
    .sort((a, b) => b.requestCount - a.requestCount)
    .slice(0, 5);
  const max = Math.max(1, ...top.map((p) => p.requestCount));

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">Top Requested Plants</CardTitle>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="text-xs text-muted-foreground">No plant requests yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {top.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-2.5"
                onClick={() => props.onView?.(p.id)}
                role={props.onView ? "button" : undefined}
              >
                <span className="w-4 shrink-0 text-center text-sm font-bold tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <PlantImageThumb imageUrl={p.imageUrl} name={p.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${(p.requestCount / max) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums">{p.requestCount}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function PlantAttendeeRequests(props: {
  requests: EventPlantRequestDto[];
  canManage: boolean;
  onAdd: () => void;
}) {
  const [typeFilter, setTypeFilter] = React.useState<"all" | EventPlantRequestType>("all");
  const filtered =
    typeFilter === "all"
      ? props.requests
      : props.requests.filter((r) => r.requestType === typeFilter);

  const grouped = new Map<
    string,
    {
      name: string;
      plants: Array<{ name: string; type: EventPlantRequestType; qty: number }>;
      count: number;
    }
  >();
  for (const r of filtered) {
    const entry = grouped.get(r.attendeeName) ?? { name: r.attendeeName, plants: [], count: 0 };
    entry.plants.push({ name: r.plantName, type: r.requestType, qty: r.quantity });
    entry.count += r.quantity;
    grouped.set(r.attendeeName, entry);
  }
  const rows = [...grouped.values()].slice(0, 8);
  const takeHomeCount = props.requests.filter((r) => r.requestType === "take_home").length;
  const winningCount = props.requests.filter((r) => r.requestType === "winning").length;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-semibold">Attendee Requests</CardTitle>
        {props.canManage ? (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={props.onAdd}>
            Add request
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "all", label: `All (${props.requests.length})` },
              { id: "take_home", label: `Take-home (${takeHomeCount})` },
              { id: "winning", label: `Winning (${winningCount})` },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTypeFilter(opt.id)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                typeFilter === opt.id
                  ? "border-foreground/20 bg-foreground text-background"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No plant requests yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((r) => (
              <li key={r.name} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                  {initials(r.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.plants.map((p, i) => (
                      <span
                        key={`${p.name}-${p.type}-${i}`}
                        className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px]"
                      >
                        <RequestTypeBadge type={p.type} />
                        <span className="max-w-[100px] truncate">{p.name}</span>
                        {p.qty > 1 ? <span className="text-muted-foreground">×{p.qty}</span> : null}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {r.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function PlantBottomStats(props: { plants: EventPlantDto[] }) {
  const plants = props.plants;

  const mostPopular = plants.reduce<EventPlantDto | null>(
    (best, p) => (!best || p.requestCount > best.requestCount ? p : best),
    null,
  );
  const highestValue = plants.reduce<{ plant: EventPlantDto; value: number } | null>((best, p) => {
    const value = (p.retailValue ?? 0) * p.quantityPurchased;
    return !best || value > best.value ? { plant: p, value } : best;
  }, null);
  const mostAwarded = plants.reduce<EventPlantDto | null>(
    (best, p) => (!best || p.quantityAwarded > best.quantityAwarded ? p : best),
    null,
  );
  const bestMargin = plants.reduce<{ plant: EventPlantDto; margin: number } | null>((best, p) => {
    if (!p.retailValue || p.unitCost <= 0) return best;
    const margin = ((p.retailValue - p.unitCost) / p.unitCost) * 100;
    return !best || margin > best.margin ? { plant: p, margin } : best;
  }, null);
  const lowStock = plants.filter((p) => p.status === "low_stock" || p.status === "out_of_stock").length;

  const cards: Array<{
    label: string;
    value: string;
    hint: string;
    icon: React.ReactNode;
    iconClass: string;
  }> = [
    {
      label: "Most Popular",
      value: mostPopular?.name ?? "—",
      hint: mostPopular ? `${mostPopular.requestCount} requests` : "No requests",
      icon: <Flame className="h-4 w-4" />,
      iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    },
    {
      label: "Highest Value",
      value: highestValue ? money(highestValue.value) : "—",
      hint: highestValue ? highestValue.plant.name : "Total retail value",
      icon: <BadgeDollarSign className="h-4 w-4" />,
      iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    },
    {
      label: "Most Awarded",
      value: mostAwarded ? String(mostAwarded.quantityAwarded) : "0",
      hint: mostAwarded && mostAwarded.quantityAwarded > 0 ? mostAwarded.name : "None awarded",
      icon: <Award className="h-4 w-4" />,
      iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Best Margin",
      value: bestMargin ? `${Math.round(bestMargin.margin)}%` : "—",
      hint: bestMargin ? bestMargin.plant.name : "Avg. retail margin",
      icon: <Percent className="h-4 w-4" />,
      iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    },
    {
      label: "Low Stock Alerts",
      value: String(lowStock),
      hint: lowStock === 0 ? "No low stock items" : "Needs restock",
      icon: <AlertTriangle className="h-4 w-4" />,
      iconClass: lowStock > 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label} className="shadow-sm">
          <CardContent className="flex items-start justify-between gap-2 p-3 sm:p-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
              <p className="truncate text-base font-bold tracking-tight">{c.value}</p>
              <p className="truncate text-[11px] text-muted-foreground">{c.hint}</p>
            </div>
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", c.iconClass)}>
              {c.icon}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function plantStatusBadge(status: string) {
  const cls =
    status === "out_of_stock"
      ? "bg-red-500/15 text-red-700 dark:text-red-400"
      : status === "low_stock"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : status === "removed"
          ? "bg-muted text-muted-foreground"
          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";

  const label =
    status === "available" || status === "assigned" || status === "reserved"
      ? "Healthy"
      : (EVENT_PLANT_STATUS_LABELS[status as keyof typeof EVENT_PLANT_STATUS_LABELS] ?? status);

  return <Badge className={cn("border-0 text-[10px] capitalize", cls)}>{label}</Badge>;
}

export function PlantImageThumb(props: { imageUrl: string | null; name: string; size?: "sm" | "md" }) {
  const dim = props.size === "sm" ? "h-8 w-8" : "h-10 w-10";
  if (props.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={props.imageUrl} alt={props.name} className={cn("shrink-0 rounded-md object-cover", dim)} />
    );
  }
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-md bg-muted", dim)}>
      <Leaf className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
