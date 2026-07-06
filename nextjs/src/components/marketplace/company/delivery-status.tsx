"use client";

import * as React from "react";
import { Loader2, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type DeliveryEvent = { id: string; status: string; note: string | null; createdAt: string };
type Delivery = {
  id: string;
  orderNumber: string | null;
  queueName: string | null;
  status: string;
  scheduledAt: string | null;
  deliveredAt: string | null;
  events: DeliveryEvent[];
  address: {
    line: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  };
};

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "delivered") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function DeliveryStatus() {
  const [rows, setRows] = React.useState<Delivery[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/marketplace/shop/deliveries", { credentials: "include" });
        const data = await res.json().catch(() => null);
        if (active && data?.ok) setRows(data.items as Delivery[]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-background py-16 text-center text-muted-foreground">
        No deliveries to track yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((d) => {
        const addr = [d.address.line, d.address.city, d.address.state, d.address.postalCode, d.address.country]
          .filter(Boolean)
          .join(", ");
        return (
          <div key={d.id} className="rounded-xl border bg-background p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <Truck className="h-4 w-4 text-muted-foreground" />
                {d.orderNumber ?? `Delivery #${d.id}`}
              </div>
              <Badge variant={statusVariant(d.status)}>{d.status.replace(/_/g, " ")}</Badge>
            </div>
            {addr ? <div className="mt-1 text-xs text-muted-foreground">{addr}</div> : null}
            {d.queueName ? <div className="mt-1 text-xs text-muted-foreground">Queue: {d.queueName}</div> : null}
            <ul className="mt-3 space-y-1 border-t pt-3">
              {d.events.length === 0 ? (
                <li className="text-xs text-muted-foreground">No updates yet.</li>
              ) : (
                d.events.map((e) => (
                  <li key={e.id} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{e.status.replace(/_/g, " ")}</span>
                    {e.note ? ` — ${e.note}` : ""} · {fmtDate(e.createdAt)}
                  </li>
                ))
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
