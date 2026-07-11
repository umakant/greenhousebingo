"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  OwnershipValidationBanner,
  type OwnershipValidationState,
} from "@/components/ownership/ownership-validation-banner";
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
import { combineHolderName, splitHolderName } from "@/lib/brand-ownership-holder-name";
import { validateOwnershipChange } from "@/lib/brand-ownership-validation";

export type OwnershipPartnerFormValues = {
  id?: string;
  brandId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  referralCode: string;
  currentOwnershipPercent: string;
  minimumOwnershipPercent: string;
  status: string;
  payoutMethod: string;
  payoutEmail: string;
  notes: string;
  isPrimaryBrandHolder?: boolean;
};

type BrandOption = { id: string; name: string };

type HolderPreview = { id: string; name: string; currentOwnershipPercent: number; isPrimaryBrandHolder: boolean };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  brands: BrandOption[];
  defaultBrandId?: string;
  initial?: OwnershipPartnerFormValues | null;
  existingHolders?: HolderPreview[];
  onSaved: () => void;
};

const PAYOUT_METHODS = ["", "paypal", "bank_transfer", "stripe", "manual"] as const;

const EMPTY = (brandId = ""): OwnershipPartnerFormValues => ({
  brandId,
  firstName: "",
  lastName: "",
  name: "",
  email: "",
  phone: "",
  referralCode: "",
  currentOwnershipPercent: "",
  minimumOwnershipPercent: "",
  status: "active",
  payoutMethod: "",
  payoutEmail: "",
  notes: "",
  isPrimaryBrandHolder: false,
});

export function OwnershipPartnerFormSheet({
  open,
  onOpenChange,
  mode,
  brands,
  defaultBrandId,
  initial,
  existingHolders = [],
  onSaved,
}: Props) {
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<OwnershipPartnerFormValues>(EMPTY(defaultBrandId));
  const [createLogin, setCreateLogin] = React.useState(false);
  const [brandHolders, setBrandHolders] = React.useState<HolderPreview[]>([]);
  const [holdersLoading, setHoldersLoading] = React.useState(false);
  const [serverValidation, setServerValidation] = React.useState<OwnershipValidationState | null>(null);

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
      });
    } else {
      setForm(EMPTY(defaultBrandId ?? brands[0]?.id ?? ""));
    }
    setCreateLogin(false);
    setServerValidation(null);
  }, [open, mode, initial, defaultBrandId, brands]);

  React.useEffect(() => {
    if (!open || !form.brandId) {
      setBrandHolders([]);
      return;
    }

    let cancelled = false;
    setHoldersLoading(true);
    void fetch(`/api/ownership/brands/${form.brandId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.ok) return;
        const holders = (data.summary?.holders ?? []) as Array<{
          id: string;
          name: string;
          currentOwnershipPercent: number;
          isPrimaryBrandHolder: boolean;
        }>;
        setBrandHolders(
          holders.map((h) => ({
            id: h.id,
            name: h.name,
            currentOwnershipPercent: h.currentOwnershipPercent,
            isPrimaryBrandHolder: h.isPrimaryBrandHolder,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setBrandHolders([]);
      })
      .finally(() => {
        if (!cancelled) setHoldersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, form.brandId]);

  const current = Number(form.currentOwnershipPercent);
  const minimum = Number(form.minimumOwnershipPercent);

  const validation = React.useMemo((): OwnershipValidationState | null => {
    if (!Number.isFinite(current) || !Number.isFinite(minimum)) return null;
    return validateOwnershipChange(
      brandHolders,
      mode === "edit" && form.id ? form.id : null,
      current,
      minimum,
    );
  }, [brandHolders, current, minimum, mode, form.id]);

  const isEditingPrimaryHolder = mode === "edit" && Boolean(form.isPrimaryBrandHolder);

  const displayName = React.useMemo(() => {
    if (mode === "edit") return form.name.trim();
    return combineHolderName(form.firstName, form.lastName) || form.name.trim();
  }, [mode, form.firstName, form.lastName, form.name]);

  const activeHolders = React.useMemo(
    () => brandHolders.filter((h) => !(mode === "edit" && form.id && h.id === form.id)),
    [brandHolders, mode, form.id],
  );

  const previewRows = React.useMemo(() => {
    const rows = activeHolders.map((h) => ({
      name: h.name,
      value: h.currentOwnershipPercent,
      isPrimary: h.isPrimaryBrandHolder,
    }));

    if (Number.isFinite(current) && current > 0 && displayName) {
      rows.push({
        name: mode === "edit" ? displayName : `${displayName} (new)`,
        value: current,
        isPrimary: false,
      });
    }

    const total = rows.reduce((s, r) => s + r.value, 0);
    return { rows, total };
  }, [activeHolders, mode, displayName, current]);

  const saveDisabled = saving || holdersLoading || !validation?.isValid || !displayName;

  const onCurrentOwnershipChange = (value: string) => {
    setForm((f) => {
      const next = { ...f, currentOwnershipPercent: value };
      const currentNum = Number(value);
      const minimumNum = Number(f.minimumOwnershipPercent);
      if (
        value !== "" &&
        Number.isFinite(currentNum) &&
        Number.isFinite(minimumNum) &&
        currentNum < minimumNum
      ) {
        next.minimumOwnershipPercent = value;
      }
      return next;
    });
  };

  const onMinimumOwnershipChange = (value: string) => {
    setForm((f) => {
      const next = { ...f, minimumOwnershipPercent: value };
      const minimumNum = Number(value);
      const currentNum = Number(f.currentOwnershipPercent);
      if (
        value !== "" &&
        Number.isFinite(minimumNum) &&
        Number.isFinite(currentNum) &&
        minimumNum > currentNum
      ) {
        next.currentOwnershipPercent = value;
      }
      return next;
    });
  };

  const syncCurrentToMinimum = () => {
    if (!form.minimumOwnershipPercent.trim()) return;
    setForm((f) => ({ ...f, currentOwnershipPercent: f.minimumOwnershipPercent }));
  };

  const save = async () => {
    if (!displayName) {
      toast.error(mode === "create" ? "First or last name is required." : "Holder name is missing.");
      return;
    }
    if (!form.brandId) {
      toast.error("Brand is required.");
      return;
    }
    if (mode === "create" && !form.email.trim()) {
      toast.error("Email is required to send the partnership agreement.");
      return;
    }
    if (!validation?.isValid) {
      toast.error("Resolve ownership conflicts before saving.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: displayName,
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        email: form.email.trim() || null,
        phone: normalizeMobileForStorage(form.phone),
        referralCode: form.referralCode.trim() || null,
        currentOwnershipPercent: current,
        minimumOwnershipPercent: minimum,
        status: form.status,
        payoutMethod: form.payoutMethod || null,
        payoutEmail: form.payoutEmail.trim() || null,
        notes: form.notes.trim() || null,
        createLogin,
      };

      const url =
        mode === "edit" && form.id
          ? `/api/ownership/holders/${form.id}`
          : `/api/ownership/brands/${form.brandId}/holders`;
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        emailSent?: boolean;
        emailError?: string;
        validation?: OwnershipValidationState;
      };
      if (res.ok && data?.ok) {
        if (mode === "create") {
          if (data.emailSent) {
            toast.success("Partner added. Partnership agreement email sent.");
          } else {
            toast.warning(
              data.emailError ?? "Partner added, but the agreement email could not be sent.",
            );
          }
        } else {
          toast.success("Partner updated.");
        }
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(data?.message ?? "Save failed.");
        if (data?.validation) setServerValidation(data.validation as OwnershipValidationState);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {mode === "create"
              ? "Add Partner"
              : isEditingPrimaryHolder
                ? "Edit Brand Ownership"
                : "Edit Ownership"}
          </SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Add a new partner. A partnership agreement email will be sent for them to sign."
              : isEditingPrimaryHolder
                ? "Update ownership percentages for the primary brand company holder."
                : "Update ownership percentages for this partner."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {mode === "create" ? (
            <div className="space-y-2">
              <Label>Brand *</Label>
              <Select
                value={form.brandId}
                onValueChange={(v) => setForm((f) => ({ ...f, brandId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {mode === "create" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="op-first-name">First Name *</Label>
                  <Input
                    id="op-first-name"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="op-last-name">Last Name *</Label>
                  <Input
                    id="op-last-name"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="op-email">Email *</Label>
                  <Input
                    id="op-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="op-phone">Phone</Label>
                  <Input
                    id="op-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(000) 000-0000"
                    maxLength={14}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
                  />
                </div>
              </div>
            </>
          ) : isEditingPrimaryHolder ? (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Primary Brand Holder
              </p>
              <p className="mt-1 text-sm font-semibold">{form.name}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                This is the company entity that holds initial brand ownership—not an individual partner.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Partner</p>
                <p className="text-sm font-medium">{form.name}</p>
              </div>
              {form.email.trim() ? (
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm">{form.email}</p>
                </div>
              ) : null}
              {form.phone.trim() ? (
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm">{form.phone}</p>
                </div>
              ) : null}
            </div>
          )}

          {mode === "create" ? (
            <div className="space-y-2">
              <Label htmlFor="op-referral">Referral Code (optional)</Label>
              <Input
                id="op-referral"
                value={form.referralCode}
                onChange={(e) => setForm((f) => ({ ...f, referralCode: e.target.value }))}
              />
            </div>
          ) : null}

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
            <p className="text-sm font-medium">Ownership</p>
            <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
              <div className="space-y-2">
                <Label htmlFor="op-current" className="leading-none">
                  Current Ownership (%) *
                </Label>
                <Input
                  id="op-current"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={form.currentOwnershipPercent}
                  onChange={(e) => onCurrentOwnershipChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="op-minimum" className="leading-none">
                  Minimum Ownership (%) *
                </Label>
                <Input
                  id="op-minimum"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={form.minimumOwnershipPercent}
                  onChange={(e) => onMinimumOwnershipChange(e.target.value)}
                />
                {form.minimumOwnershipPercent.trim() &&
                form.currentOwnershipPercent.trim() &&
                form.currentOwnershipPercent !== form.minimumOwnershipPercent ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={syncCurrentToMinimum}
                  >
                    Match current to minimum
                  </button>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Current ownership can be the same as minimum ownership. If you lower current below minimum,
              minimum adjusts automatically; if you raise minimum above current, current adjusts automatically.
            </p>
            {mode === "create" ? (
              <p className="text-xs text-muted-foreground">
                Brand holdings ownership will not be adjusted automatically. Resolve conflicts manually before saving.
              </p>
            ) : null}
          </div>

          <OwnershipValidationBanner
            validation={serverValidation ?? validation}
            loading={holdersLoading}
          />

          {(() => {
            const assignedExisting = validation?.currentAssignedOwnership ?? activeHolders.reduce(
              (s, h) => s + h.currentOwnershipPercent,
              0,
            );
            const newPartner = validation?.requestedOwnership ?? (Number.isFinite(current) ? current : 0);
            const totalAfterSave = validation?.totalAfterChange ?? assignedExisting + newPartner;
            const availableAfterSave = Math.max(0, 100 - totalAfterSave);
            return (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2 text-sm">
                <p className="font-medium">Ownership Preview</p>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Current Assigned</span>
                  <span className="font-medium tabular-nums">{assignedExisting}%</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {mode === "edit"
                      ? isEditingPrimaryHolder
                        ? "Updated Brand Holder"
                        : "Updated Partner"
                      : "New Partner"}
                  </span>
                  <span className="font-medium tabular-nums">{newPartner}%</span>
                </div>
                <div className="flex justify-between gap-2 border-t pt-2 font-medium">
                  <span>Total After Save</span>
                  <span className={totalAfterSave > 100 ? "text-destructive tabular-nums" : "tabular-nums"}>
                    {totalAfterSave}%
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Available After Save</span>
                  <span
                    className={
                      totalAfterSave > 100
                        ? "font-semibold tabular-nums text-destructive"
                        : "font-semibold tabular-nums text-emerald-600 dark:text-emerald-400"
                    }
                  >
                    {availableAfterSave}%
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium mb-3">Preview Ownership Distribution</p>
            <ul className="space-y-1 text-sm">
              {previewRows.rows.map((r) => (
                <li key={r.name} className="flex justify-between gap-2">
                  <span className="truncate text-muted-foreground">{r.name}</span>
                  <span className="font-medium tabular-nums">{r.value}%</span>
                </li>
              ))}
              <li className="flex justify-between gap-2 border-t pt-2 font-medium">
                <span>Total</span>
                <span className={previewRows.total > 100 ? "text-destructive" : ""}>{previewRows.total}%</span>
              </li>
              {previewRows.total < 100 ? (
                <li className="flex justify-between gap-2 text-xs text-muted-foreground">
                  <span>Remaining unassigned</span>
                  <span>{100 - previewRows.total}%</span>
                </li>
              ) : null}
            </ul>
          </div>

          {mode === "create" ? (
            <>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payout Method</Label>
                  <Select
                    value={form.payoutMethod || "none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, payoutMethod: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {PAYOUT_METHODS.filter(Boolean).map((m) => (
                        <SelectItem key={m} value={m}>
                          {m.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="op-payout-email">Payout Email</Label>
                  <Input
                    id="op-payout-email"
                    value={form.payoutEmail}
                    onChange={(e) => setForm((f) => ({ ...f, payoutEmail: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Create Partner Login</p>
                  <p className="text-xs text-muted-foreground">Optional — requires email</p>
                </div>
                <Switch checked={createLogin} onCheckedChange={setCreateLogin} />
              </div>
            </>
          ) : isEditingPrimaryHolder ? null : (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="op-notes">Notes</Label>
            <Textarea
              id="op-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saveDisabled}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "edit" ? "Save Changes" : "Save Partner"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
