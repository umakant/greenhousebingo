"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";

type Order = {
  id: string;
  orderNumber: string;
  vendorName: string | null;
  orderStatus: string;
  paymentStatus: string;
  deliveryStatus: string | null;
  totalBucketCount: number;
  total: number;
  city: string | null;
  state: string | null;
  createdAt: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  processing: "default",
  out_for_delivery: "default",
  delivered: "default",
  cancelled: "destructive",
};

export default function OrdersList({ companySlug }: { companySlug: string }) {
  const { settings } = useAppSettings();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/marketplace/company/${encodeURIComponent(companySlug)}/orders`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (res.ok && data?.ok) setOrders(data.items as Order[]);
        else setError(true);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [companySlug, reloadKey]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border bg-background py-16 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load your orders. Please try again.</p>
        <Button variant="outline" className="mt-4" onClick={() => setReloadKey((k) => k + 1)}>
          Retry
        </Button>
      </div>
    );
  }
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border bg-background py-16 text-center">
        <Package className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">No orders yet.</p>
        <Button asChild className="mt-4">
          <Link href={`/company/${companySlug}/marketplace`}>Browse vendors</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Vendor</th>
            <th className="px-4 py-3">Buckets</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <div className="font-medium">{o.orderNumber}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString()}
                  {o.city ? ` · ${o.city}, ${o.state ?? ""}` : ""}
                </div>
              </td>
              <td className="px-4 py-3">{o.vendorName ?? "—"}</td>
              <td className="px-4 py-3">{o.totalBucketCount}</td>
              <td className="px-4 py-3 font-medium">{formatCurrency(o.total, settings)}</td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[o.orderStatus] ?? "secondary"}>
                  {o.orderStatus.replace(/_/g, " ")}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant={o.paymentStatus === "paid" ? "default" : "secondary"}>{o.paymentStatus}</Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/company/${companySlug}/orders/${o.id}`}>View</Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
