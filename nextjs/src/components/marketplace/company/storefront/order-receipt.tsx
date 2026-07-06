"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Printer, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";

type Item = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  bucketCountValue: number;
};
type Order = {
  id: string;
  orderNumber: string;
  vendorName: string | null;
  orderStatus: string;
  paymentStatus: string;
  deliveryStatus: string | null;
  city: string | null;
  state: string | null;
  totalBucketCount: number;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  currency: string;
  stripePaymentIntentId: string | null;
  createdAt: string;
  items: Item[];
};

export default function OrderReceipt({
  companySlug,
  orderId,
  autoPrint = false,
}: {
  companySlug: string;
  orderId: string;
  autoPrint?: boolean;
}) {
  const { settings } = useAppSettings();
  const [order, setOrder] = React.useState<Order | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/marketplace/company/${encodeURIComponent(companySlug)}/orders/${encodeURIComponent(orderId)}`,
          { credentials: "include" },
        );
        const data = await res.json().catch(() => null);
        if (active && data?.ok) setOrder(data.item as Order);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [companySlug, orderId]);

  React.useEffect(() => {
    if (autoPrint && order && !loading) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [autoPrint, order, loading]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="rounded-xl border bg-background py-16 text-center text-muted-foreground">Receipt not found.</div>
    );
  }

  const brand = settings.app_name || settings.site_name || "Marketplace";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link href={`/company/${companySlug}/orders/${order.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to order
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print / Download
        </Button>
      </div>

      <div
        id="marketplace-receipt-root"
        className="mx-auto max-w-2xl rounded-xl border bg-white p-8 text-sm text-gray-800 shadow-sm print:border-0 print:shadow-none"
      >
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <div className="text-xl font-bold">{brand}</div>
            <div className="text-xs text-gray-500">Receipt</div>
          </div>
          <div className="text-right">
            <div className="font-semibold">Order {order.orderNumber}</div>
            <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Vendor</div>
            <div>{order.vendorName ?? "—"}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-gray-400">Delivery to</div>
            <div>
              {order.city ? `${order.city}, ${order.state ?? ""}` : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Payment status</div>
            <div className="capitalize">{order.paymentStatus}</div>
          </div>
          {order.stripePaymentIntentId ? (
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-gray-400">Payment reference</div>
              <div className="break-all font-mono text-xs">{order.stripePaymentIntentId}</div>
            </div>
          ) : null}
        </div>

        <table className="w-full border-t text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="py-2">Item</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Unit</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="py-2">{it.productName}</td>
                <td className="py-2 text-center">{it.quantity}</td>
                <td className="py-2 text-right">{formatCurrency(it.unitPrice, settings)}</td>
                <td className="py-2 text-right">{formatCurrency(it.totalPrice, settings)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-56 space-y-1.5 border-t pt-4">
          <Line label="Subtotal" value={formatCurrency(order.subtotal, settings)} />
          <Line label="Tax" value={formatCurrency(order.tax, settings)} />
          <Line label="Delivery fee" value={formatCurrency(order.deliveryFee, settings)} />
          <div className="my-1 border-t" />
          <Line label="Total" value={formatCurrency(order.total, settings)} bold />
        </div>

        <div className="mt-8 border-t pt-4 text-center text-xs text-gray-400">
          Thank you for your order. This receipt was generated by {brand}.
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-base font-semibold" : ""}`}>
      <span className={bold ? "" : "text-gray-500"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
