"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, Package, FileText, LifeBuoy } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";

const TICKET_CATEGORIES = [
  "Order issue",
  "Payment issue",
  "Delivery question",
  "Missing items",
  "Damaged items",
  "Refund request",
];

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
  createdAt: string;
  items: Item[];
};

export default function OrderDetail({
  companySlug,
  orderId,
  confirmation = false,
}: {
  companySlug: string;
  orderId: string;
  confirmation?: boolean;
}) {
  const { settings } = useAppSettings();
  const [order, setOrder] = React.useState<Order | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(
          `/api/marketplace/company/${encodeURIComponent(companySlug)}/orders/${encodeURIComponent(orderId)}`,
          { credentials: "include" },
        );
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (res.ok && data?.ok) setOrder(data.item as Order);
        else if (res.status === 404) setOrder(null);
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
  }, [companySlug, orderId, reloadKey]);

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
        <p className="text-sm text-muted-foreground">Couldn&apos;t load this order. Please try again.</p>
        <Button variant="outline" className="mt-4" onClick={() => setReloadKey((k) => k + 1)}>
          Retry
        </Button>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="rounded-xl border bg-background py-16 text-center">
        <p className="text-sm text-muted-foreground">Order not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/company/${companySlug}/orders`}>Back to orders</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {confirmation ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-300 bg-green-50 p-4 text-green-800 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-200">
          <CheckCircle2 className="h-6 w-6" />
          <div>
            <div className="font-semibold">Thank you! Your order is confirmed.</div>
            <div className="text-sm">Order {order.orderNumber} has been added to the delivery queue.</div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="rounded-xl border bg-background p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Order {order.orderNumber}</h2>
                <div className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString()}
                  {order.vendorName ? ` · ${order.vendorName}` : ""}
                </div>
              </div>
              <Badge variant={order.orderStatus === "cancelled" ? "destructive" : "default"}>
                {order.orderStatus.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"}>
                Payment: {order.paymentStatus}
              </Badge>
              {order.deliveryStatus ? <Badge variant="outline">Delivery: {order.deliveryStatus}</Badge> : null}
              {order.city ? (
                <Badge variant="outline">
                  {order.city}, {order.state ?? ""}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-background">
            <div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold">
              <Package className="h-4 w-4" /> Items
            </div>
            <div className="divide-y">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium">{it.productName}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.quantity} × {formatCurrency(it.unitPrice, settings)}
                      {it.bucketCountValue > 0
                        ? ` · ${it.bucketCountValue * it.quantity} bucket${
                            it.bucketCountValue * it.quantity === 1 ? "" : "s"
                          }`
                        : ""}
                    </div>
                  </div>
                  <div className="font-medium">{formatCurrency(it.totalPrice, settings)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="h-fit space-y-3 rounded-xl border bg-background p-4">
          <h3 className="text-sm font-semibold">Summary</h3>
          <div className="space-y-1.5 text-sm">
            <Row label="Total buckets" value={String(order.totalBucketCount)} />
            <Row label="Subtotal" value={formatCurrency(order.subtotal, settings)} />
            <Row label="Tax" value={formatCurrency(order.tax, settings)} />
            <Row label="Delivery fee" value={formatCurrency(order.deliveryFee, settings)} />
            <div className="my-2 border-t" />
            <Row label="Total" value={formatCurrency(order.total, settings)} bold />
          </div>
          {order.paymentStatus === "paid" ? (
            <Button asChild variant="outline" className="w-full">
              <Link href={`/company/${companySlug}/orders/${order.id}/receipt`}>
                <FileText className="mr-2 h-4 w-4" /> View / download receipt
              </Link>
            </Button>
          ) : null}
          <ReportIssueDialog companySlug={companySlug} orderId={order.id} />
          <Button asChild variant="outline" className="w-full">
            <Link href={`/company/${companySlug}/orders`}>All orders</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/company/${companySlug}/delivery-status`}>Delivery status</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReportIssueDialog({ companySlug, orderId }: { companySlug: string; orderId: string }) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [category, setCategory] = React.useState<string>("");
  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");

  const submit = async () => {
    if (!category) return toast.error("Please choose a category.");
    if (!subject.trim()) return toast.error("Subject is required.");
    if (!description.trim()) return toast.error("Please describe the issue.");
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/marketplace/company/${encodeURIComponent(companySlug)}/orders/${encodeURIComponent(orderId)}/support`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, subject: subject.trim(), description: description.trim() }),
        },
      );
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        toast.success(`Support ticket created${data.ticketCode ? ` (#${data.ticketCode})` : ""}`);
        setOpen(false);
        setCategory("");
        setSubject("");
        setDescription("");
      } else {
        toast.error(data?.message ?? "Could not create ticket.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <LifeBuoy className="mr-2 h-4 w-4" /> Report an issue
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
          <DialogDescription>Create a support ticket for this order.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {TICKET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ticket-subject">Subject</Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ticket-desc">Description</Label>
            <Textarea
              id="ticket-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us what went wrong"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
