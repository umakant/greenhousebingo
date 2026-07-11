"use client";

import { Leaf } from "lucide-react";

import type { EventPlantsOverview } from "@/lib/event-platform/event-plants/event-plant-types";
import { EVENT_PLANT_STATUS_LABELS } from "@/lib/event-platform/event-plants/event-plant-constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PlantSummaryCards(props: {
  summary: EventPlantsOverview["summary"] | null;
  loading?: boolean;
}) {
  if (props.loading || !props.summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="h-16 animate-pulse bg-muted/40 p-4" />
          </Card>
        ))}
      </div>
    );
  }

  const s = props.summary;
  const items = [
    { label: "Total plants", value: s.totalPlants },
    { label: "Total cost", value: `$${s.totalPlantCost.toFixed(2)}` },
    { label: "Avg unit cost", value: `$${s.averageUnitCost.toFixed(2)}` },
    { label: "Retail value", value: `$${s.estimatedRetailValue.toFixed(2)}` },
    { label: "Assigned to games", value: s.plantsAssignedToGames },
    { label: "Awarded", value: s.plantsAwarded },
    { label: "Remaining", value: s.plantsRemaining },
    { label: "Requested available", value: s.requestedPlantsAvailable },
    { label: "Inventory gaps", value: s.inventoryGaps },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label} className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-xl font-bold tabular-nums">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function InventoryGapPanel(props: {
  gaps: EventPlantsOverview["gaps"];
  canManage: boolean;
  onAddInventory: (plantId: string) => void;
}) {
  if (!props.gaps.length) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Inventory gaps</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No shortages — demand is covered by current inventory.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-amber-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-amber-800 dark:text-amber-300">Inventory gaps</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.gaps.map((gap) => (
          <div key={gap.plantId} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
            <p className="font-medium">{gap.plantName}</p>
            <p className="text-xs text-muted-foreground">
              Requests: {gap.requestCount} · Available: {gap.available} · Gap: {gap.inventoryGap}
            </p>
            {props.canManage ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-xs"
                onClick={() => props.onAddInventory(gap.plantId)}
              >
                Add inventory
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function PlantAnalyticsCharts(props: { analytics: EventPlantsOverview["analytics"] | null }) {
  if (!props.analytics) return null;
  const a = props.analytics;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartBlock title="Requests by category" items={a.requestsByCategory.map((x) => ({ label: x.label, value: x.count }))} />
      <ChartBlock
        title="Cost by category"
        items={a.costByCategory.map((x) => ({ label: x.label, value: x.cost }))}
        format={(v) => `$${v.toFixed(2)}`}
      />
      <ChartBlock
        title="Most popular plants"
        items={a.mostPopular.map((x) => ({ label: x.label, value: x.score }))}
        subtitle="Popularity score"
      />
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Assigned vs awarded vs remaining</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: "Assigned", value: a.inventoryBreakdown.assigned },
            { label: "Awarded", value: a.inventoryBreakdown.awarded },
            { label: "Remaining", value: a.inventoryBreakdown.remaining },
          ].map((item) => (
            <div key={item.label} className="flex justify-between text-sm">
              <span>{item.label}</span>
              <span className="font-medium tabular-nums">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="shadow-sm lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Inventory vs requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {a.inventoryVsRequests.length === 0 ? (
            <p className="text-xs text-muted-foreground">No plant inventory yet.</p>
          ) : (
            a.inventoryVsRequests.slice(0, 10).map((item) => {
              const max = Math.max(1, item.inventory, item.requests);
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs">
                    <span>{item.label}</span>
                    <span className="tabular-nums">
                      {item.inventory} inv · {item.requests} req
                    </span>
                  </div>
                  <div className="mt-1 flex h-1.5 gap-0.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(item.inventory / max) * 100}%` }} />
                    <div className="h-full bg-amber-500" style={{ width: `${(item.requests / max) * 100}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChartBlock(props: {
  title: string;
  subtitle?: string;
  items: Array<{ label: string; value: number }>;
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...props.items.map((i) => i.value));
  const fmt = props.format ?? ((v: number) => String(v));
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{props.title}</CardTitle>
        {props.subtitle ? <p className="text-xs text-muted-foreground">{props.subtitle}</p> : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {props.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data yet.</p>
        ) : (
          props.items.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs">
                <span>{item.label}</span>
                <span className="tabular-nums font-medium">{fmt(item.value)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function plantStatusBadge(status: string) {
  const cls =
    status === "out_of_stock"
      ? "bg-red-500/15 text-red-700 dark:text-red-400"
      : status === "low_stock"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : status === "awarded"
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : status === "removed"
            ? "bg-muted text-muted-foreground"
            : "bg-sky-500/15 text-sky-700 dark:text-sky-400";

  return (
    <Badge className={cn("border-0 text-[10px] capitalize", cls)}>
      {EVENT_PLANT_STATUS_LABELS[status as keyof typeof EVENT_PLANT_STATUS_LABELS] ?? status}
    </Badge>
  );
}

export function PlantImageThumb(props: { imageUrl: string | null; name: string }) {
  if (props.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={props.imageUrl} alt={props.name} className="h-10 w-10 rounded-md object-cover" />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
      <Leaf className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
