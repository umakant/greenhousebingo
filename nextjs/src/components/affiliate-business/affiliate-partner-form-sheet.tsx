"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type AffiliatePartnerFormValues = {
  id?: string;
  name: string;
  email: string;
  referralCode: string;
  tier: string;
  status: string;
  commissionRate: number;
};

const TIERS = ["standard", "silver", "gold", "platinum"] as const;
const STATUSES = ["active", "pending", "suspended"] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: AffiliatePartnerFormValues | null;
  onSaved: () => void;
};

export function AffiliatePartnerFormSheet({ open, onOpenChange, mode, initial, onSaved }: Props) {
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<AffiliatePartnerFormValues>({
    name: "",
    email: "",
    referralCode: "",
    tier: "standard",
    status: "pending",
    commissionRate: 10,
  });

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setForm(initial);
    } else {
      setForm({
        name: "",
        email: "",
        referralCode: "",
        tier: "standard",
        status: "pending",
        commissionRate: 10,
      });
    }
  }, [open, mode, initial]);

  const save = async () => {
    if (!form.name.trim() || !form.referralCode.trim()) {
      toast.error("Name and referral code are required.");
      return;
    }
    setSaving(true);
    try {
      const url =
        mode === "edit" && form.id
          ? `/api/affiliate-business/partners/${form.id}`
          : "/api/affiliate-business/partners";
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Save failed");
        return;
      }
      toast.success(mode === "edit" ? "Partner updated" : "Partner created");
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{mode === "edit" ? "Edit partner" : "Add partner"}</SheetTitle>
          <SheetDescription>Manage affiliate partner details and referral code.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="ap-name">Name</Label>
            <Input
              id="ap-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ap-email">Email</Label>
            <Input
              id="ap-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ap-code">Referral code</Label>
            <Input
              id="ap-code"
              value={form.referralCode}
              onChange={(e) => setForm((f) => ({ ...f, referralCode: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Tier</Label>
            <Select value={form.tier} onValueChange={(v) => setForm((f) => ({ ...f, tier: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ap-rate">Commission rate (%)</Label>
            <Input
              id="ap-rate"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.commissionRate}
              onChange={(e) => setForm((f) => ({ ...f, commissionRate: Number(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
