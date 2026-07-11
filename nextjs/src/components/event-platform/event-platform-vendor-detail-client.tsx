"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";
import type { EventVendorDto } from "@/lib/event-platform/vendors/vendor-types";
import { EVENT_VENDOR_STATUSES } from "@/lib/event-platform/vendors/vendor-types";
import {
  joinVendorContactName,
  splitVendorContactName,
} from "@/lib/event-platform/vendors/vendor-contact-name";
import { formatPhone, normalizeMobileForStorage } from "@/lib/phone";

export function EventPlatformVendorDetailClient(props: { vendorId: string }) {
  const { vendorId } = props;
  const [item, setItem] = React.useState<EventVendorDto | null>(null);
  const [contactFirstName, setContactFirstName] = React.useState("");
  const [contactLastName, setContactLastName] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/event-platform/vendors/${vendorId}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; item?: EventVendorDto } | null;
      if (res.ok && data?.ok && data.item) {
        setItem({ ...data.item, phone: formatPhone(data.item.phone ?? "") });
        const { firstName, lastName } = splitVendorContactName(data.item.contactName);
        setContactFirstName(firstName);
        setContactLastName(lastName);
      }
      setLoading(false);
    })();
  }, [vendorId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/event-platform/vendors/${vendorId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...item,
          contactName: joinVendorContactName(contactFirstName, contactLastName),
          phone: normalizeMobileForStorage(item.phone ?? ""),
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; item?: EventVendorDto; message?: string } | null;
      if (!res.ok || !data?.ok || !data.item) throw new Error(data?.message ?? "Save failed.");
      setItem(data.item);
      toast.success("Vendor saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading vendor…
      </div>
    );
  }

  if (!item) {
    return <p className="text-sm text-destructive">Vendor not found.</p>;
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={EVENT_PLATFORM_PATHS.vendors}>← Back to vendors</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{item.vendorName}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void save(e)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Vendor name</Label>
              <Input value={item.vendorName} onChange={(e) => setItem({ ...item, vendorName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input value={item.companyName ?? ""} onChange={(e) => setItem({ ...item, companyName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>First name</Label>
              <Input value={contactFirstName} onChange={(e) => setContactFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last name</Label>
              <Input value={contactLastName} onChange={(e) => setContactLastName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={item.email ?? ""} onChange={(e) => setItem({ ...item, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={item.phone ?? ""}
                onChange={(e) => setItem({ ...item, phone: formatPhone(e.target.value) })}
                placeholder="(000) 000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={item.status} onValueChange={(v) => setItem({ ...item, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_VENDOR_STATUSES.filter((s) => s !== "archived").map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Default commission %</Label>
              <Input
                value={item.defaultCommissionRate ?? ""}
                onChange={(e) => setItem({ ...item, defaultCommissionRate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Override commission %</Label>
              <Input
                value={item.overrideCommissionRate ?? ""}
                onChange={(e) => setItem({ ...item, overrideCommissionRate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={item.notes ?? ""} onChange={(e) => setItem({ ...item, notes: e.target.value })} rows={3} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
