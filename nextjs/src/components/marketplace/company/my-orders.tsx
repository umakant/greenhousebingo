"use client";

import * as React from "react";
import { Loader2, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";

type OrderLine = { id: string; title: string; unitPrice: number; quantity: number; lineTotal: number };
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  lines: OrderLine[];
};
type DeliveryEvent = { id: string; status: string; note: string | null; createdAt: string };
type Delivery = { id: string; status: string; queueName: string | null; events: DeliveryEvent[] };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function MyOrders() {
  const { settings } = useAppSettings();
  const [rows, setRows] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<Order | null>(null);
  const [deliveries, setDeliveries] = React.useState<Delivery[]>([]);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace/shop/orders", { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (data?.ok) setRows(data.items as Order[]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (order: Order) => {
    setDetail(order);
    setOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/marketplace/shop/orders/${order.id}`, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setDetail(data.item as Order);
        setDeliveries(data.deliveries as Delivery[]);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  You have not placed any orders yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.orderNumber}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.status.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.paymentStatus === "paid" ? "default" : "outline"}>{row.paymentStatus}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(row.total, settings)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(row.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <TableActionButton
                      label="View"
                      primaryIcon={<Eye className="h-4 w-4" />}
                      onPrimaryClick={() => void openDetail(row)}
                      className="ml-auto"
                      items={[{ label: "View", onSelect: () => void openDetail(row), icon: <Eye className="h-4 w-4" /> }]}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{detail?.orderNumber ?? "Order"}</SheetTitle>
            <SheetDescription>Order items and delivery progress.</SheetDescription>
          </SheetHeader>
          {detailLoading || !detail ? (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="rounded-md border">
                {detail.lines.map((l) => (
                  <div key={l.id} className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0">
                    <span>
                      {l.title} <span className="text-muted-foreground">× {l.quantity}</span>
                    </span>
                    <span>{formatCurrency(l.lineTotal, settings)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 text-sm font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(detail.total, settings)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold">Delivery progress</div>
                {deliveries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No delivery information yet.</p>
                ) : (
                  deliveries.map((d) => (
                    <div key={d.id} className="rounded-md border p-3">
                      <Badge variant="secondary">{d.status.replace(/_/g, " ")}</Badge>
                      <ul className="mt-2 space-y-1">
                        {d.events.map((e) => (
                          <li key={e.id} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{e.status.replace(/_/g, " ")}</span>
                            {e.note ? ` — ${e.note}` : ""} · {fmtDate(e.createdAt)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
