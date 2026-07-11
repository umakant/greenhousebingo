"use client";

import * as React from "react";
import { ImageIcon, KeyRound, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { combineHolderName, splitHolderName } from "@/lib/brand-ownership-holder-name";
import {
  EMPTY_LOGIN_ACCESS,
  generateClientPassword,
  MARKETPLACE_VENDOR_PERMISSION_KEYS,
  presetPermissionsForRole,
  VENDOR_PERMISSION_LABELS,
  VENDOR_ROLE_LABELS,
  VENDOR_STAFF_ROLES,
  type VendorLoginAccessForm,
  type VendorStaffRole,
} from "@/lib/marketplace-vendor-portal-permissions-client";
import { formatPhone, normalizeMobileForStorage } from "@/lib/phone";
import { getImagePath } from "@/utils/image-path";

const MAX_LOGO_BYTES = 8 * 1024 * 1024;

type UploadedMediaItem = {
  url?: string;
};

async function uploadVendorLogo(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("files[]", file);
  const res = await fetch("/api/media", { method: "POST", body: fd, credentials: "include" });
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean;
    files?: string[];
    media?: UploadedMediaItem[];
    message?: string;
  } | null;
  if (!res.ok || !json?.ok) throw new Error(json?.message || "Upload failed.");
  const uploadedUrl = json.media?.[0]?.url;
  if (uploadedUrl) return uploadedUrl;
  const saved = Array.isArray(json.files) ? json.files[0] : undefined;
  if (!saved) throw new Error("Upload failed.");
  return `/uploads/media/${saved}`;
}

function VendorLogoField({
  value,
  onChange,
  uploading,
  onUploadingChange,
}: {
  value: string;
  onChange: (url: string) => void;
  uploading: boolean;
  onUploadingChange: (busy: boolean) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const pick = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo file is too large. Please use an image under 8 MB.");
      return;
    }
    onUploadingChange(true);
    try {
      const url = await uploadVendorLogo(file);
      onChange(url);
      toast.success("Logo uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      onUploadingChange(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>Logo</Label>
      <div className="flex items-start gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getImagePath(value)} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => void pick(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {value ? "Replace logo" : "Upload logo"}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={() => onChange("")}
              >
                <X className="mr-2 h-4 w-4" />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP, or SVG (max 8 MB)</p>
        </div>
      </div>
    </div>
  );
}

export type VendorFormValues = {
  id?: string;
  firstName: string;
  lastName: string;
  name: string;
  contactEmail: string;
  phone: string;
  description: string;
  logoUrl: string;
  commissionRate: string;
  status: string;
  loginAccess: VendorLoginAccessForm;
};

const STATUSES = ["active", "inactive", "suspended"] as const;

const EMPTY: VendorFormValues = {
  firstName: "",
  lastName: "",
  name: "",
  contactEmail: "",
  phone: "",
  description: "",
  logoUrl: "",
  commissionRate: "",
  status: "active",
  loginAccess: { ...EMPTY_LOGIN_ACCESS, permissions: { ...EMPTY_LOGIN_ACCESS.permissions } },
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: VendorFormValues | null;
  onSaved: () => void;
};

export function VendorFormSheet({ open, onOpenChange, mode, initial, onSaved }: Props) {
  const [saving, setSaving] = React.useState(false);
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [form, setForm] = React.useState<VendorFormValues>(EMPTY);

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      const parts = splitHolderName(initial.name, initial.firstName, initial.lastName);
      setForm({
        ...initial,
        firstName: parts.firstName,
        lastName: parts.lastName,
        name: initial.name,
        phone: formatPhone(initial.phone ?? ""),
        loginAccess: {
          ...initial.loginAccess,
          permissions: { ...initial.loginAccess.permissions },
        },
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, mode, initial]);

  const setLogin = (patch: Partial<VendorLoginAccessForm>) => {
    setForm((f) => ({ ...f, loginAccess: { ...f.loginAccess, ...patch } }));
  };

  const onContactEmailChange = (contactEmail: string) => {
    setForm((f) => {
      const next = { ...f, contactEmail };
      if (!f.loginAccess.loginEmail.trim() || f.loginAccess.loginEmail === f.contactEmail) {
        next.loginAccess = { ...f.loginAccess, loginEmail: contactEmail };
      }
      return next;
    });
  };

  const onRoleChange = (vendorRole: VendorStaffRole) => {
    setLogin({ vendorRole, permissions: presetPermissionsForRole(vendorRole) });
  };

  const togglePermission = (key: string, checked: boolean) => {
    setLogin({
      permissions: { ...form.loginAccess.permissions, [key]: checked },
    });
  };

  const displayName = React.useMemo(
    () => combineHolderName(form.firstName, form.lastName) || form.name.trim(),
    [form.firstName, form.lastName, form.name],
  );

  const save = async () => {
    if (!displayName) {
      toast.error("First or last name is required.");
      return;
    }
    if (form.loginAccess.enabled) {
      if (!form.loginAccess.loginEmail.trim()) {
        toast.error("Login email is required when vendor login is enabled.");
        return;
      }
      if (mode === "create" && !form.loginAccess.temporaryPassword.trim()) {
        toast.error("Temporary password is required for new vendor login.");
        return;
      }
    }

    setSaving(true);
    try {
      const enabledKeys = MARKETPLACE_VENDOR_PERMISSION_KEYS.filter((k) => form.loginAccess.permissions[k]);
      const url =
        mode === "edit" && form.id
          ? `/api/marketplace/admin/vendors/${form.id}`
          : "/api/marketplace/admin/vendors";
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          firstName: form.firstName.trim() || null,
          lastName: form.lastName.trim() || null,
          contactEmail: form.contactEmail,
          phone: normalizeMobileForStorage(form.phone),
          description: form.description,
          logoUrl: form.logoUrl.trim() || null,
          status: form.status,
          commissionRate: form.commissionRate === "" ? null : Number(form.commissionRate),
          loginAccess: {
            enabled: form.loginAccess.enabled,
            loginEmail: form.loginAccess.loginEmail || form.contactEmail,
            temporaryPassword: form.loginAccess.temporaryPassword || null,
            sendInviteEmail: form.loginAccess.sendInviteEmail,
            vendorRole: form.loginAccess.vendorRole,
            permissions: enabledKeys,
          },
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Save failed");
        return;
      }
      toast.success(mode === "edit" ? "Vendor updated" : "Vendor created");
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{mode === "edit" ? "Edit vendor" : "Add vendor"}</SheetTitle>
          <SheetDescription>Manage vendor profile, login access, and permissions.</SheetDescription>
        </SheetHeader>

        <div className="grid gap-6 py-4">
          <section className="space-y-4 rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Vendor details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="v-first-name">First Name *</Label>
                <Input
                  id="v-first-name"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  autoComplete="given-name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="v-last-name">Last Name *</Label>
                <Input
                  id="v-last-name"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="v-email">Contact email</Label>
              <Input
                id="v-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => onContactEmailChange(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="v-phone">Phone</Label>
              <PhoneInput
                id="v-phone"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              />
            </div>
            <VendorLogoField
              value={form.logoUrl}
              onChange={(logoUrl) => setForm((f) => ({ ...f, logoUrl }))}
              uploading={logoUploading}
              onUploadingChange={setLogoUploading}
            />
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
              <Label htmlFor="v-rate">Commission rate (%)</Label>
              <Input
                id="v-rate"
                type="number"
                min={0}
                max={100}
                step={0.5}
                placeholder="Optional"
                value={form.commissionRate}
                onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="v-desc">Description</Label>
              <Textarea
                id="v-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Vendor Login Access</h3>
                <p className="text-xs text-muted-foreground">Create a portal login for this vendor.</p>
              </div>
              <Switch
                checked={form.loginAccess.enabled}
                onCheckedChange={(enabled) => setLogin({ enabled })}
              />
            </div>

            {form.loginAccess.enabled ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="v-login-email">Login email</Label>
                  <Input
                    id="v-login-email"
                    type="email"
                    value={form.loginAccess.loginEmail}
                    onChange={(e) => setLogin({ loginEmail: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="v-temp-pw">Temporary password</Label>
                  <div className="flex gap-2">
                    <Input
                      id="v-temp-pw"
                      type="text"
                      autoComplete="new-password"
                      placeholder={mode === "edit" ? "Leave blank to keep current" : "Required"}
                      value={form.loginAccess.temporaryPassword}
                      onChange={(e) => setLogin({ temporaryPassword: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Generate password"
                      onClick={() => setLogin({ temporaryPassword: generateClientPassword() })}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="v-send-invite"
                    checked={form.loginAccess.sendInviteEmail}
                    onCheckedChange={(v) => setLogin({ sendInviteEmail: Boolean(v) })}
                  />
                  <Label htmlFor="v-send-invite" className="font-normal">
                    Send invite email
                  </Label>
                </div>
                <div className="grid gap-2">
                  <Label>Vendor role</Label>
                  <Select value={form.loginAccess.vendorRole} onValueChange={(v) => onRoleChange(v as VendorStaffRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VENDOR_STAFF_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {VENDOR_ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
          </section>

          {form.loginAccess.enabled ? (
            <section className="space-y-4 rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Permissions</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {MARKETPLACE_VENDOR_PERMISSION_KEYS.map((key) => (
                  <label key={key} className="flex cursor-pointer items-start gap-2 text-sm">
                    <Checkbox
                      checked={Boolean(form.loginAccess.permissions[key])}
                      onCheckedChange={(v) => togglePermission(key, Boolean(v))}
                    />
                    <span>{VENDOR_PERMISSION_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving || logoUploading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
