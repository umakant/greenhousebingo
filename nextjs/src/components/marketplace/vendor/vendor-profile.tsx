"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProfileData = {
  user: { name: string; email: string; forcePasswordReset: boolean };
  vendor: {
    name: string;
    contactEmail: string | null;
    phone: string | null;
    description: string | null;
    logoUrl: string | null;
  };
};

export default function VendorProfile({ forceReset }: { forceReset?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [profile, setProfile] = React.useState<ProfileData | null>(null);
  const [phone, setPhone] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/marketplace/vendor/profile", { credentials: "include" });
        const data = await res.json().catch(() => null);
        if (active && data?.ok) {
          setProfile(data as ProfileData);
          setPhone(data.vendor?.phone ?? "");
          setDescription(data.vendor?.description ?? "");
          setLogoUrl(data.vendor?.logoUrl ?? "");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/marketplace/vendor/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          description,
          logoUrl,
          ...(newPassword ? { newPassword } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Save failed");
        return;
      }
      toast.success("Profile updated");
      setNewPassword("");
      setConfirmPassword("");
      if (forceReset || profile?.user.forcePasswordReset) {
        router.replace("/marketplace/vendor");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-8">
      {(forceReset || profile?.user.forcePasswordReset) ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Please set a new password before continuing.
        </div>
      ) : null}

      <section className="space-y-4 rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold">Account</h3>
        <div className="grid gap-2">
          <Label>Login email</Label>
          <Input value={profile?.user.email ?? ""} disabled />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-pw">New password</Label>
          <Input
            id="new-pw"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-pw">Confirm password</Label>
          <Input
            id="confirm-pw"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold">Vendor profile</h3>
        <div className="grid gap-2">
          <Label>Vendor name</Label>
          <Input value={profile?.vendor.name ?? ""} disabled />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="v-phone">Phone</Label>
          <Input id="v-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="v-logo">Logo URL</Label>
          <Input id="v-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="v-desc">Description</Label>
          <Textarea id="v-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </section>

      <Button onClick={() => void save()} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save changes
      </Button>
    </div>
  );
}
