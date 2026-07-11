"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  PlantImageThumb,
  plantStatusBadge,
} from "@/components/event-platform/event-command-center/plants/plant-panels";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { EventPlantDetail } from "@/lib/event-platform/event-plants/event-plant-types";

function Field(props: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{props.label}</p>
      <p className="text-sm font-medium">{props.value}</p>
    </div>
  );
}

type PlantDrawerProps = {
  eventId: string;
  plantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PlantDrawer(props: PlantDrawerProps) {
  const [detail, setDetail] = React.useState<EventPlantDetail | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!props.open || !props.plantId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await fetch(
        `/api/event-platform/events/${encodeURIComponent(props.eventId)}/plants/${encodeURIComponent(props.plantId!)}`,
        { credentials: "include", cache: "no-store" },
      );
      const data = (await res.json().catch(() => null)) as { ok?: boolean; detail?: EventPlantDetail };
      if (!cancelled) {
        setDetail(res.ok && data?.ok ? (data.detail ?? null) : null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.open, props.plantId, props.eventId]);

  const p = detail?.plant;

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{p?.name ?? "Plant details"}</SheetTitle>
          <SheetDescription>{p?.category ?? "Loading…"}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : p ? (
          <div className="mt-6 space-y-6">
            <div className="flex items-start gap-3">
              <PlantImageThumb imageUrl={p.imageUrl} name={p.name} />
              <div>
                {plantStatusBadge(p.status)}
                <p className="mt-1 text-xs text-muted-foreground">{p.popularityLabel}</p>
                <p className="text-sm font-medium tabular-nums">Score: {p.popularityScore}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Variety" value={p.variety ?? "—"} />
              <Field label="Supplier" value={p.supplierName ?? "—"} />
              <Field label="Purchased" value={p.quantityPurchased} />
              <Field label="Assigned" value={p.quantityAssigned} />
              <Field label="Awarded" value={p.quantityAwarded} />
              <Field label="Remaining" value={p.quantityRemaining} />
              <Field label="Unit cost" value={`$${p.unitCost.toFixed(2)}`} />
              <Field label="Total cost" value={`$${p.totalCost.toFixed(2)}`} />
              <Field label="Retail value" value={p.retailValue != null ? `$${p.retailValue.toFixed(2)}` : "—"} />
              <Field label="Requests" value={p.requestCount} />
            </div>

            {p.assignedGameLabel ? <Field label="Assigned game" value={p.assignedGameLabel} /> : null}
            {p.notes ? <Field label="Notes" value={p.notes} /> : null}

            <Separator />

            <div>
              <p className="mb-2 text-sm font-medium">Requesting attendees</p>
              {detail!.requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No requests yet.</p>
              ) : (
                <ul className="space-y-2">
                  {detail!.requests.map((r) => (
                    <li key={r.id} className="rounded-lg border p-2 text-sm">
                      <p className="font-medium">{r.attendeeName}</p>
                      <p className="text-xs text-muted-foreground">{r.attendeeEmail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {detail!.assignments.length > 0 ? (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-medium">Game assignments</p>
                  <ul className="space-y-2 text-sm">
                    {detail!.assignments.map((a) => (
                      <li key={a.id} className="rounded-lg border p-2">
                        Round {a.roundNumber}: {a.roundName} · qty {a.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <p className="mt-8 text-sm text-muted-foreground">Plant not found.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
