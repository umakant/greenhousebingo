"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { formatPhone, normalizeMobileForStorage } from "@/lib/phone";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

export type PartnerFormValues = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  brandName: string;
  slug: string;
  status: string;
  commissionRate: string;
  payoutMethod: string;
  payoutEmail: string;
  notes: string;
};

const STATUSES = ["active", "pending", "inactive", "suspended"] as const;
const PAYOUT_METHODS = ["", "paypal", "bank_transfer", "stripe", "manual"] as const;

const EMPTY: PartnerFormValues = {
  name: "",
  email: "",
  phone: "",
  brandName: "",
  slug: "",
  status: "active",
  commissionRate: "",
  payoutMethod: "",
  payoutEmail: "",
  notes: "",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: PartnerFormValues | null;
  onSaved: () => void;
};

export function PartnerFormSheet({ open, onOpenChange, mode, initial, onSaved }: Props) {
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<PartnerFormValues>(EMPTY);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [createLogin, setCreateLogin] = React.useState(true);
  const [password, setPassword] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setForm({
        ...initial,
        phone: formatPhone(initial.phone ?? ""),
      });
      const parts = (initial.name ?? "").trim().split(/\s+/).filter(Boolean);
      setFirstName(parts.shift() ?? "");
      setLastName(parts.join(" "));
    } else {
      setForm(EMPTY);
      setFirstName("");
      setLastName("");
      setCreateLogin(true);
      setPassword("");
    }
  }, [open, mode, initial]);

  const updateName = (first: string, last: string) => {
    setFirstName(first);
    setLastName(last);
    setForm((f) => ({ ...f, name: `${first} ${last}`.trim() }));
  };

  const save = async () => {
    if (!firstName.trim()) {
      toast.error("First name is required.");
      return;
    }
    if (mode === "create" && createLogin) {
      if (!form.email.trim()) {
        toast.error("Email is required to create a partner login.");
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters.");
        return;
      }
    }
    setSaving(true);
    try {
      const url = mode === "edit" && form.id ? `/api/partnerships/partners/${form.id}` : "/api/partnerships/partners";
      const payload: Record<string, unknown> = {
        name: `${firstName} ${lastName}`.trim(),
        email: form.email,
        phone: normalizeMobileForStorage(form.phone),
        brandName: form.brandName,
        status: form.status,
        commissionRate: form.commissionRate === "" ? null : Number(form.commissionRate),
        payoutMethod: form.payoutMethod,
        payoutEmail: form.payoutEmail,
        notes: form.notes,
      };
      if (mode === "create") {
        payload.slug = form.slug;
        payload.createLogin = createLogin;
        if (createLogin) payload.password = password;
      }
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          <SheetDescription>Manage partner profile, commission, and payout details.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="p-first-name">First name</Label>
              <Input
                id="p-first-name"
                value={firstName}
                onChange={(e) => updateName(e.target.value, lastName)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-last-name">Last name</Label>
              <Input
                id="p-last-name"
                value={lastName}
                onChange={(e) => updateName(firstName, e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-brand">Brand name</Label>
            <Input
              id="p-brand"
              value={form.brandName}
              onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-email">Email</Label>
            <Input
              id="p-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-phone">Phone</Label>
            <Input
              id="p-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(000) 000-0000"
              maxLength={14}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
            />
          </div>
          {mode === "create" && (
            <div className="grid gap-2">
              <Label htmlFor="p-slug">Slug (optional)</Label>
              <Input
                id="p-slug"
                placeholder="auto-generated from name"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
          )}
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
            <Label htmlFor="p-rate">Commission rate (%)</Label>
            <Input
              id="p-rate"
              type="number"
              min={0}
              max={100}
              step={0.5}
              placeholder="Leave blank to use platform default"
              value={form.commissionRate}
              onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Payout method</Label>
            <Select value={form.payoutMethod} onValueChange={(v) => setForm((f) => ({ ...f, payoutMethod: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYOUT_METHODS.filter((m) => m).map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-payout-email">Payout email</Label>
            <Input
              id="p-payout-email"
              value={form.payoutEmail}
              onChange={(e) => setForm((f) => ({ ...f, payoutEmail: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-notes">Notes</Label>
            <Textarea
              id="p-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          {mode === "create" && (
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="p-create-login" className="cursor-pointer">
                  Create partner login
                </Label>
                <Switch id="p-create-login" checked={createLogin} onCheckedChange={setCreateLogin} />
              </div>
              {createLogin && (
                <div className="grid gap-2">
                  <Label htmlFor="p-password">Password</Label>
                  <Input
                    id="p-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
