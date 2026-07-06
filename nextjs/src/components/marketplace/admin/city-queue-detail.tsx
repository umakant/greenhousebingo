"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Loader2, Package, Truck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimeInput12h } from "@/components/ui/time-input-12h";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";

type Detail = {
  vendor: { id: string; name: string };
  queue: {
    city: string;
    state: string;
    bucketsOrdered: number;
    requiredBucketMinimum: number;
    progressPercent: number;
    companyCount: number;
    queueStatus: string;
    exists: boolean;
    currency: string;
  };
  revenueCollected: number;
  orders: Array<{
    id: string;
    orderNumber: string;
    companyName: string | null;
    companyEmail: string | null;
    orderStatus: string;
    deliveryStatus: string | null;
    totalBucketCount: number;
    createdAt: string;
  }>;
  productBreakdown: Array<{ productName: string; quantity: number; buckets: number; revenue: number }>;
  scheduledEvents: Array<{
    id: string;
    status: string;
    deliveryDate: string | null;
    startTime: string | null;
    endTime: string | null;
    driverName: string | null;
    orderCount: number;
    createdAt: string;
  }>;
};

type ScheduleForm = {
  deliveryDate: string;
  startTime: string;
  endTime: string;
  deliveryAddress: string;
  deliveryNotes: string;
  driverName: string;
  driverPhone: string;
};

const EMPTY_FORM: ScheduleForm = {
  deliveryDate: "",
  startTime: "",
  endTime: "",
  deliveryAddress: "",
  deliveryNotes: "",
  driverName: "",
  driverPhone: "",
};

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function CityQueueDetail({ param, canSchedule }: { param: string; canSchedule: boolean }) {
  const { settings } = useAppSettings();
  const [detail, setDetail] = React.useState<Detail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState<ScheduleForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace/admin/delivery-queue/${param}`, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (data?.ok) setDetail(data as Detail);
      else toast.error(data?.message ?? "Failed to load city queue.");
    } finally {
      setLoading(false);
    }
  }, [param]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.deliveryDate) {
      toast.error("Delivery date is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/admin/delivery-queue/${param}/schedule`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        toast.success(`Delivery scheduled for ${data.scheduledOrders} order(s). Companies notified.`);
        setForm(EMPTY_FORM);
        void load();
      } else {
        toast.error(data?.message ?? "Failed to schedule delivery.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/marketplace/delivery-queue">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to delivery queue
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">City queue not found.</p>
      </div>
    );
  }

  const { queue } = detail;
  const currency = queue.currency || "USD";
  const alreadyScheduled = queue.queueStatus === "scheduled";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/marketplace/delivery-queue">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to delivery queue
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{detail.vendor.name}</span>
          <Badge variant={alreadyScheduled ? "outline" : queue.queueStatus === "ready_to_schedule" ? "default" : "secondary"}>
            {queue.queueStatus.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Truck className="h-5 w-5" />
          {queue.city}, {queue.state}
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total buckets" value={queue.bucketsOrdered} />
        <Stat label="Required minimum" value={queue.requiredBucketMinimum} />
        <Stat label="Revenue collected" value={formatCurrency(detail.revenueCollected, settings)} />
        <Stat label="Companies" value={queue.companyCount} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Progress to minimum</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Progress value={queue.progressPercent} className="h-2.5" />
            <span className="w-12 text-right text-sm font-medium tabular-nums">{queue.progressPercent}%</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {queue.bucketsOrdered} of {queue.requiredBucketMinimum} buckets
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4" />
              Orders in queue ({detail.orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Buckets</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      No orders in this city yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  detail.orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.orderNumber}</TableCell>
                      <TableCell className="text-sm">{o.companyName ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{o.totalBucketCount}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{(o.orderStatus ?? "").replace(/_/g, " ")}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Product breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Buckets</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.productBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      No products yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  detail.productBreakdown.map((p) => (
                    <TableRow key={p.productName}>
                      <TableCell className="font-medium">{p.productName}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.buckets}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(p.revenue, settings)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {detail.scheduledEvents.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4" />
              Scheduled deliveries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.scheduledEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <div className="font-medium">
                    {ev.deliveryDate ? new Date(ev.deliveryDate).toLocaleDateString() : "—"}
                    {ev.startTime ? ` · ${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ""}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ev.orderCount} order(s){ev.driverName ? ` · Driver: ${ev.driverName}` : ""}
                  </div>
                </div>
                <Badge variant="outline">{ev.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {canSchedule ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4" />
              Schedule delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alreadyScheduled ? (
              <p className="mb-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                This city queue is already marked scheduled. Submitting again will create another delivery event and
                re-notify companies.
              </p>
            ) : null}
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="deliveryDate">Delivery date</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={form.deliveryDate}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="startTime">Start time</Label>
                  <TimeInput12h
                    id="startTime"
                    value={form.startTime || "09:00"}
                    onChange={(startTime) => setForm((f) => ({ ...f, startTime }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endTime">End time</Label>
                  <TimeInput12h
                    id="endTime"
                    value={form.endTime || "12:00"}
                    onChange={(endTime) => setForm((f) => ({ ...f, endTime }))}
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="deliveryAddress">Delivery address</Label>
                <Input
                  id="deliveryAddress"
                  value={form.deliveryAddress}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
                  placeholder="Central drop-off / staging address"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="driverName">Driver name</Label>
                <Input
                  id="driverName"
                  value={form.driverName}
                  onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="driverPhone">Driver phone</Label>
                <Input
                  id="driverPhone"
                  value={form.driverPhone}
                  onChange={(e) => setForm((f) => ({ ...f, driverPhone: e.target.value }))}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="deliveryNotes">Delivery notes</Label>
                <Textarea
                  id="deliveryNotes"
                  rows={3}
                  value={form.deliveryNotes}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryNotes: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submitting || detail.orders.length === 0}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
                  Schedule delivery & notify {queue.companyCount} compan{queue.companyCount === 1 ? "y" : "ies"}
                </Button>
                {detail.orders.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">No paid orders to schedule yet.</p>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
