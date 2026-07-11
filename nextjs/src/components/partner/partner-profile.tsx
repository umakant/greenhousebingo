"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Profile = {
  name: string;
  email: string | null;
  phone: string | null;
  brandName: string | null;
  notes: string | null;
  payoutMethod: string | null;
  payoutEmail: string | null;
  slug: string;
  referralCode: string;
};

const PAYOUT_METHODS = ["paypal", "bank_transfer", "stripe", "manual"] as const;

/** Shared profile form. When `mode = "payout"` only payout fields are shown. */
export default function PartnerProfile({ mode = "profile" }: { mode?: "profile" | "payout" }) {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/partner/profile", { credentials: "include" });
        const d = await res.json();
        if (d?.ok) setProfile(d.item as Profile);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (patch: Partial<Profile>) => setProfile((p) => (p ? { ...p, ...patch } : p));

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const payload =
        mode === "payout"
          ? { payoutMethod: profile.payoutMethod, payoutEmail: profile.payoutEmail }
          : {
              name: profile.name,
              phone: profile.phone,
              brandName: profile.brandName,
              notes: profile.notes,
            };
      const res = await fetch("/api/partner/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) toast.success("Saved");
      else toast.error(d?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!profile) return <p className="text-muted-foreground">Profile not found.</p>;

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">{mode === "payout" ? "Payout settings" : "Profile settings"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "profile" ? (
          <>
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={profile.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Brand name</Label>
              <Input value={profile.brandName ?? ""} onChange={(e) => update({ brandName: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={profile.email ?? ""} disabled />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <PhoneInput value={profile.phone ?? ""} onChange={(v) => update({ phone: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Slug</Label>
                <Input value={profile.slug} disabled />
              </div>
              <div className="grid gap-2">
                <Label>Referral code</Label>
                <Input value={profile.referralCode} disabled />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={profile.notes ?? ""} onChange={(e) => update({ notes: e.target.value })} />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-2">
              <Label>Payout method</Label>
              <Select
                value={profile.payoutMethod ?? ""}
                onValueChange={(v) => update({ payoutMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYOUT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Payout email / account</Label>
              <Input value={profile.payoutEmail ?? ""} onChange={(e) => update({ payoutEmail: e.target.value })} />
            </div>
          </>
        )}
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
