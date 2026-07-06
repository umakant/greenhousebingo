"use client";

import * as React from "react";
import { Loader2, Truck, MapPin, CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type Queue = {
  id: string;
  vendorName: string | null;
  city: string;
  state: string;
  requiredBucketMinimum: number;
  currentBucketTotal: number;
  bucketsRemaining: number;
  companyCount: number;
  queueStatus: string;
};
type EventItem = {
  id: string;
  city: string;
  state: string;
  deliveryDate: string | null;
  startTime: string | null;
  endTime: string | null;
  driverName: string | null;
  status: string;
};
type OrderRow = {
  id: string;
  orderNumber: string;
  city: string | null;
  state: string | null;
  deliveryStatus: string;
  totalBucketCount: number;
};

export default function DeliveryStatus({ companySlug }: { companySlug: string }) {
  const [queues, setQueues] = React.useState<Queue[]>([]);
  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/marketplace/company/${encodeURIComponent(companySlug)}/delivery-status`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => null);
        if (active && data?.ok) {
          setQueues(data.queues as Queue[]);
          setEvents(data.events as EventItem[]);
          setOrders(data.orders as OrderRow[]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [companySlug]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border bg-background py-16 text-center text-muted-foreground">
        <Truck className="mx-auto h-8 w-8" />
        <p className="mt-3 text-sm">No deliveries to track yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <MapPin className="h-4 w-4" /> City delivery queues
        </h3>
        {queues.length === 0 ? (
          <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
            No active queues for your orders.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {queues.map((q) => {
              const pct = Math.min(
                100,
                q.requiredBucketMinimum > 0
                  ? Math.round((q.currentBucketTotal / q.requiredBucketMinimum) * 100)
                  : 100,
              );
              return (
                <div key={q.id} className="rounded-xl border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {q.city}, {q.state}
                    </div>
                    <Badge variant={q.queueStatus === "ready" ? "default" : "secondary"}>{q.queueStatus}</Badge>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {q.currentBucketTotal} / {q.requiredBucketMinimum} buckets
                    </span>
                    <span>{q.companyCount} companies</span>
                  </div>
                  {q.bucketsRemaining > 0 ? (
                    <div className="mt-1 text-xs text-amber-700">
                      {q.bucketsRemaining} more buckets needed to schedule delivery.
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-green-700">Ready for delivery scheduling.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {events.length > 0 ? (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="h-4 w-4" /> Scheduled deliveries
          </h3>
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl border bg-background p-4 text-sm">
                <div>
                  <div className="font-medium">
                    {e.city}, {e.state}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {e.deliveryDate ? new Date(e.deliveryDate).toLocaleDateString() : "TBD"}
                    {e.startTime ? ` · ${e.startTime}${e.endTime ? `–${e.endTime}` : ""}` : ""}
                    {e.driverName ? ` · ${e.driverName}` : ""}
                  </div>
                </div>
                <Badge variant="outline">{e.status}</Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Truck className="h-4 w-4" /> Your orders
        </h3>
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Buckets</th>
                <th className="px-4 py-3">Delivery</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.city ? `${o.city}, ${o.state ?? ""}` : "—"}</td>
                  <td className="px-4 py-3">{o.totalBucketCount}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{o.deliveryStatus.replace(/_/g, " ")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
