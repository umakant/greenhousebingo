"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, Pencil, Package, MoreVertical, Trash2, Search, ArrowUpCircle, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsDark } from "@/hooks/use-is-dark";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { sortPlansForDisplay } from "@/lib/plan-display-order";
import { t } from "@/lib/admin-t";
import { refreshSessionAuthCookies } from "@/lib/refresh-session-auth-client";


type PlanItem = {
  id: string;
  name: string | null;
  description: string | null;
  numberOfUsers: number;
  storageLimit: number;
  status: boolean;
  freePlan: boolean;
  customPlan: boolean;
  modules: unknown;
  packagePriceMonthly: string;
  packagePriceYearly: string;
  pricePerUserMonthly: string;
  pricePerUserYearly: string;
  pricePerStorageMonthly: string;
  pricePerStorageYearly: string;
  trial: boolean;
  trialDays: number;
  orders_count: number;
};

type AddOnItem = {
  module: string;
  alias: string;
  image: string;
  monthly_price: string;
  yearly_price: string;
};

function toMoney(x: string) {
  const n = Number(String(x ?? "0").replace(/,/g, ""));
  const safe = Number.isFinite(n) ? n : 0;
  // Laravel formats from settings; keep USD-like for now.
  return `$${safe.toFixed(0)}`;
}

function toMoney2(x: string) {
  const n = Number(String(x ?? "0").replace(/,/g, ""));
  const safe = Number.isFinite(n) ? n : 0;
  return `$${safe.toFixed(2)}`;
}

function formatStorageBytes(storageLimitBytes: number) {
  const b = Number(storageLimitBytes ?? 0) || 0;
  const gb = Math.round(b / (1024 * 1024 * 1024));
  return `${gb} GB storage`;
}

function toModulesArray(modules: unknown): string[] {
  if (Array.isArray(modules)) return modules.filter((x): x is string => typeof x === "string");
  return [];
}

function Segmented({
  items,
  value,
  onChange,
  activePadding = "px-6 py-2",
  inactivePadding = "px-6 py-2",
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  activePadding?: string;
  inactivePadding?: string;
}) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            className={[
              "rounded-md text-sm font-medium transition-all duration-200",
              active
                ? `${activePadding} bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm`
                : `${inactivePadding} text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white`,
            ].join(" ")}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function AddOnEditDialog({
  addOn,
  open,
  onOpenChange,
  onSaved,
}: {
  addOn: AddOnItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [monthly, setMonthly] = React.useState("");
  const [yearly, setYearly] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    if (!addOn) return;
    setError(null);
    setName(addOn.alias ?? "");
    setMonthly(String(addOn.monthly_price ?? "0"));
    setYearly(String(addOn.yearly_price ?? "0"));
    setFile(null);
  }, [addOn]);

  async function save() {
    if (!addOn) return;
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("monthly_price", monthly);
      fd.set("yearly_price", yearly);
      if (file) fd.set("image", file);
      const res = await fetch(`/api/add-ons/${encodeURIComponent(addOn.module)}`, { method: "PATCH", body: fd });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(json?.message || "Save failed.");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Edit Add-On Price")}</DialogTitle>
          <DialogDescription>{addOn ? addOn.alias : ""}</DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        ) : null}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("Add-On Name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("Add-On Image")}</Label>
            <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("Monthly Price")}</Label>
              <Input type="number" min={0} step="0.01" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("Yearly Price")}</Label>
              <Input type="number" min={0} step="0.01" value={yearly} onChange={(e) => setYearly(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("Cancel")}
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? t("Saving...") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreatePlanDialog({
  open,
  onOpenChange,
  onSaved,
  availableModules,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  availableModules: AddOnItem[];
}) {
  const empty = {
    name: "",
    description: "",
    number_of_users: "10",
    storage_limit_mb: "0",
    package_price_monthly: "0",
    package_price_yearly: "0",
    status: true,
    free_plan: false,
    trial: true,
    trial_days: "30",
    modules: [] as string[],
  };
  const [form, setForm] = React.useState(empty);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) { setForm(empty); setError(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k: string, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }));

  function toggleModule(mod: string) {
    setForm((prev) => {
      const has = prev.modules.includes(mod);
      return { ...prev, modules: has ? prev.modules.filter((m) => m !== mod) : [...prev.modules, mod] };
    });
  }

  async function save() {
    if (!form.name.trim()) { setError("Plan name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        number_of_users: Number(form.number_of_users) || 1,
        storage_limit_mb: Number(form.storage_limit_mb) || 0,
        package_price_monthly: Number(form.package_price_monthly) || 0,
        package_price_yearly: Number(form.package_price_yearly) || 0,
        status: form.status,
        free_plan: form.free_plan,
        trial: form.trial,
        trial_days: form.trial ? Number(form.trial_days) || 0 : 0,
        modules: form.modules,
      };
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Create failed.");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const uniqueModules = React.useMemo(() => {
    const seen = new Set<string>();
    return availableModules.filter((m) => { if (seen.has(m.module)) return false; seen.add(m.module); return true; });
  }, [availableModules]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Create New Plan")}</DialogTitle>
          <DialogDescription>{t("Fill in the details to create a new subscription plan.")}</DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}
        <div className="space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Plan Name")} <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("e.g. Business Pro")} />
            </div>
            <div className="space-y-2">
              <Label>{t("Description")}</Label>
              <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={t("Short description...")} />
            </div>
            <div className="space-y-2">
              <Label>{t("Number of Users")}</Label>
              <Input type="number" min={-1} step={1} value={form.number_of_users} onChange={(e) => set("number_of_users", e.target.value)} placeholder="-1 for unlimited" />
            </div>
            <div className="space-y-2">
              <Label>{t("Storage Limit (MB)")}</Label>
              <Input type="number" min={0} step={1} value={form.storage_limit_mb} onChange={(e) => set("storage_limit_mb", e.target.value)} />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">{t("Pricing")}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("Monthly Price ($)")}</Label>
                <Input type="number" min={0} step="0.01" value={form.package_price_monthly} onChange={(e) => set("package_price_monthly", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("Yearly Price ($)")}</Label>
                <Input type="number" min={0} step="0.01" value={form.package_price_yearly} onChange={(e) => set("package_price_yearly", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Flags */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.status} onChange={(e) => set("status", e.target.checked)} className="rounded" />
              <span className="text-sm">{t("Active")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.free_plan} onChange={(e) => set("free_plan", e.target.checked)} className="rounded" />
              <span className="text-sm">{t("Free Plan")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.trial} onChange={(e) => set("trial", e.target.checked)} className="rounded" />
              <span className="text-sm">{t("Trial")}</span>
            </label>
          </div>
          {form.trial && (
            <div className="space-y-2">
              <Label>{t("Trial Days")}</Label>
              <Input type="number" min={1} step={1} value={form.trial_days} onChange={(e) => set("trial_days", e.target.value)} className="w-40" />
            </div>
          )}

          {/* Module selection */}
          {uniqueModules.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{t("Included Modules")}</div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm((p) => ({ ...p, modules: uniqueModules.map((m) => m.module) }))}>
                    {t("All")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm((p) => ({ ...p, modules: [] }))}>
                    {t("None")}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                {uniqueModules.map((m) => (
                  <label key={m.module} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.modules.includes(m.module)}
                      onChange={() => toggleModule(m.module)}
                      className="rounded"
                    />
                    <span className="text-sm truncate" title={m.alias}>{m.alias}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">{form.modules.length}/{uniqueModules.length} {t("modules selected")}</div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("Cancel")}
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? t("Creating...") : t("Create Plan")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanPricingDialog({
  plan,
  open,
  onOpenChange,
  onSaved,
}: {
  plan: PlanItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [monthly, setMonthly] = React.useState("0");
  const [yearly, setYearly] = React.useState("0");
  const [ppuM, setPpuM] = React.useState("0");
  const [ppuY, setPpuY] = React.useState("0");
  const [ppsM, setPpsM] = React.useState("0");
  const [ppsY, setPpsY] = React.useState("0");

  React.useEffect(() => {
    if (!plan) return;
    setError(null);
    setMonthly(String(plan.packagePriceMonthly ?? "0"));
    setYearly(String(plan.packagePriceYearly ?? "0"));
    setPpuM(String(plan.pricePerUserMonthly ?? "0"));
    setPpuY(String(plan.pricePerUserYearly ?? "0"));
    setPpsM(String(plan.pricePerStorageMonthly ?? "0"));
    setPpsY(String(plan.pricePerStorageYearly ?? "0"));
  }, [plan]);

  async function save() {
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        package_price_monthly: Number(monthly || "0"),
        package_price_yearly: Number(yearly || "0"),
        price_per_user_monthly: Number(ppuM || "0"),
        price_per_user_yearly: Number(ppuY || "0"),
        price_per_storage_monthly: Number(ppsM || "0"),
        price_per_storage_yearly: Number(ppsY || "0"),
      };
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(json?.message || "Save failed.");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Edit Plan Pricing")}</DialogTitle>
          <DialogDescription>{plan?.name ?? ""}</DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        ) : null}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("Package price (monthly)")}</Label>
              <Input type="number" min={0} step="0.01" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("Package price (yearly)")}</Label>
              <Input type="number" min={0} step="0.01" value={yearly} onChange={(e) => setYearly(e.target.value)} />
            </div>
          </div>

          {plan?.customPlan ? (
            <div className="space-y-3">
              <div className="text-sm font-semibold">{t("Usage pricing")}</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("Price per user (monthly)")}</Label>
                  <Input type="number" min={0} step="0.01" value={ppuM} onChange={(e) => setPpuM(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("Price per user (yearly)")}</Label>
                  <Input type="number" min={0} step="0.01" value={ppuY} onChange={(e) => setPpuY(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("Price per storage (monthly)")}</Label>
                  <Input type="number" min={0} step="0.01" value={ppsM} onChange={(e) => setPpsM(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("Price per storage (yearly)")}</Label>
                  <Input type="number" min={0} step="0.01" value={ppsY} onChange={(e) => setPpsY(e.target.value)} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("Cancel")}
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? t("Saving...") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type UserSubscriptionInfo = {
  activePlanId: string | null;
  activePlanName?: string | null;
  /** YYYY-MM-DD when the current plan period started (usually company signup or last plan assignment). */
  planStartDate?: string | null;
  planExpireDate: string | null;
  trialExpireDate: string | null;
  isTrialDone: boolean;
};

export default function SubscriptionSetting({
  role,
  canCreate,
  canEdit,
  canDelete,
  userSubscriptionInfo,
  companyPlanAssignment,
}: {
  role: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  userSubscriptionInfo?: UserSubscriptionInfo | null;
  /** Superadmin: manage subscription for this company (company detail page). */
  companyPlanAssignment?: { companyId: string; hideTopSummary?: boolean } | null;
}) {
  const router = useRouter();
  const isDark = useIsDark();
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d ?? null, settings);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [plans, setPlans] = React.useState<PlanItem[]>([]);
  const [addOns, setAddOns] = React.useState<AddOnItem[]>([]);

  const [subscriptionType, setSubscriptionType] = React.useState<"pre-package" | "usage">("pre-package");
  const [pricingPeriod, setPricingPeriod] = React.useState<"monthly" | "yearly">("monthly");

  const [editingAddOn, setEditingAddOn] = React.useState<AddOnItem | null>(null);
  const [editingPlan, setEditingPlan] = React.useState<PlanItem | null>(null);
  const [createPlanOpen, setCreatePlanOpen] = React.useState(false);
  const [usageSearch, setUsageSearch] = React.useState("");
  const [deletePlanId, setDeletePlanId] = React.useState<string | null>(null);
  const [deletePlanProcessing, setDeletePlanProcessing] = React.useState(false);
  const [showAllPlans, setShowAllPlans] = React.useState(false);
  const [assigningPlanId, setAssigningPlanId] = React.useState<string | null>(null);

  const panelBg = isDark ? "bg-[#21243B]" : "bg-white";
  const panelBorder = isDark ? "border-gray-700" : "border-gray-200";
  const panelText = isDark ? "text-white" : "text-gray-900";
  const panelMutedText = isDark ? "text-gray-300" : "text-gray-500";
  const dividerBorder = isDark ? "border-gray-600" : "border-gray-200";
  const crossBg = isDark ? "bg-gray-700" : "bg-gray-200";
  const crossFg = isDark ? "text-gray-300" : "text-gray-500";

  const activePlanBorderClass = isDark
    ? "border-[#4C88FF] ring-2 ring-[#4C88FF]/25 shadow-[0_0_0_4px_rgba(76,136,255,0.18)]"
    : "border-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]";
  const activePlanBadgeClass = isDark
    ? "bg-emerald-600 text-white border border-emerald-500/40"
    : "bg-emerald-500 text-white border border-emerald-500/40";

  const accentDotClass = isDark ? "bg-[#4C88FF]" : "bg-emerald-500";
  const freeTextClass = isDark ? "text-[#4C88FF]" : "text-emerald-600";
  const trialTextClass = isDark ? "text-green-400" : "text-emerald-600";

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [pRes, aRes] = await Promise.all([
        fetch("/api/plans", { cache: "no-store" }),
        fetch("/api/add-ons?all=1", { cache: "no-store" }),
      ]);
      const pJson = (await pRes.json().catch(() => null)) as any;
      const aJson = (await aRes.json().catch(() => null)) as any;
      if (!pRes.ok) throw new Error(pJson?.message || "Failed to load plans.");
      if (!aRes.ok) throw new Error(aJson?.message || "Failed to load add-ons.");
      setPlans(Array.isArray(pJson?.items) ? pJson.items : []);
      setAddOns(Array.isArray(aJson?.items) ? aJson.items : []);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
  }, []);

  const activePlans = React.useMemo(() => {
    const filtered = plans.filter((p) => {
      const typeOk = subscriptionType === "pre-package" ? p.status && !p.customPlan : p.status && p.customPlan;
      return typeOk;
    });
    return sortPlansForDisplay(filtered);
  }, [plans, subscriptionType]);

  const isCompanyUser = role !== "superadmin";
  const isSubscriptionSubject = Boolean(companyPlanAssignment) || isCompanyUser;
  const activePlanId = userSubscriptionInfo?.activePlanId ?? null;
  const activePlanName = userSubscriptionInfo?.activePlanName ?? null;
  const planExpireDate = userSubscriptionInfo?.planExpireDate ?? null;
  const trialExpireDate = userSubscriptionInfo?.trialExpireDate ?? null;
  const isTrialDone = userSubscriptionInfo?.isTrialDone ?? false;

  const hasActiveSubscription =
    isSubscriptionSubject &&
    Boolean(activePlanId) &&
    (!planExpireDate || new Date(planExpireDate) > new Date());

  const displayPlans = React.useMemo(() => {
    // Company detail (superadmin assigning a plan): always list every pre-package plan so they can switch.
    const onlyCurrent =
      hasActiveSubscription && !showAllPlans && activePlanId && !companyPlanAssignment;
    if (onlyCurrent) {
      return activePlans.filter((p) => String(p.id) === String(activePlanId));
    }
    return activePlans;
  }, [hasActiveSubscription, showAllPlans, activePlanId, activePlans, companyPlanAssignment]);

  const isCurrentlySubscribed = React.useCallback(
    (plan: PlanItem) => {
      if (!isSubscriptionSubject || !activePlanId) return false;
      if (String(activePlanId) !== String(plan.id)) return false;
      if (!planExpireDate) return true;
      return new Date(planExpireDate) > new Date();
    },
    [isSubscriptionSubject, activePlanId, planExpireDate]
  );

  const isOnTrialForPlan = React.useCallback(
    (plan: PlanItem) => {
      if (companyPlanAssignment || !isCompanyUser || !trialExpireDate || String(activePlanId) !== String(plan.id))
        return false;
      return true;
    },
    [companyPlanAssignment, isCompanyUser, trialExpireDate, activePlanId]
  );

  const canStartTrial = React.useCallback(
    (plan: PlanItem) => {
      return (
        isSubscriptionSubject &&
        !companyPlanAssignment &&
        Boolean(plan.trial && plan.trialDays > 0) &&
        !isTrialDone
      );
    },
    [isSubscriptionSubject, companyPlanAssignment, isTrialDone]
  );

  async function assignPlanToCompany(planId: string) {
    if (!companyPlanAssignment) return;
    setAssigningPlanId(planId);
    setError(null);
    try {
      const res = await fetch(
        `/api/companies/${encodeURIComponent(companyPlanAssignment.companyId)}/subscription`,
        {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          active_plan_id: planId,
          pricing_period: pricingPeriod,
        }),
      },
      );
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to update plan.");
      await refreshSessionAuthCookies();
      router.refresh();
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update plan.";
      setError(msg);
    } finally {
      setAssigningPlanId(null);
    }
  }

  const displayAddOns = React.useMemo(() => {
    const seen = new Set<string>();
    return addOns.filter((m) => {
      if (seen.has(m.module)) return false;
      seen.add(m.module);
      return true;
    });
  }, [addOns]);

  function openDeleteConfirm(planId: string) {
    if (!canDelete) return;
    setDeletePlanId(planId);
  }

  async function confirmDeletePlan() {
    if (!deletePlanId || !canDelete) return;
    setDeletePlanProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans/${deletePlanId}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Delete failed.");
      setDeletePlanId(null);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Delete failed.");
    } finally {
      setDeletePlanProcessing(false);
    }
  }

  const gridGapPx = 24; // gap-6
  const featureColPx = 300;
  const planColPx = 280;
  const matrixMinWidth = React.useMemo(() => {
    if (displayPlans.length === 0) return featureColPx;
    return featureColPx + displayPlans.length * planColPx + (displayPlans.length - 1) * gridGapPx;
  }, [displayPlans.length]);

  const hasModule = React.useCallback((plan: PlanItem, moduleCode: string) => {
    const mods = toModulesArray(plan.modules).map((m) => m.toLowerCase());
    return mods.includes(moduleCode.toLowerCase());
  }, []);

  const scrollToPlansRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onShowAllPlans = () => {
      setShowAllPlans(true);
      if (subscriptionType !== "pre-package") {
        setSubscriptionType("pre-package");
      }
      window.setTimeout(() => {
        scrollToPlansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    };
    window.addEventListener("subscription:show-all-plans", onShowAllPlans);
    return () => window.removeEventListener("subscription:show-all-plans", onShowAllPlans);
  }, [subscriptionType]);

  const scrollToPlans = React.useCallback(() => {
    if (subscriptionType !== "pre-package") {
      setSubscriptionType("pre-package");
      setTimeout(() => {
        scrollToPlansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else {
      scrollToPlansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [subscriptionType]);

  return (
    <div className="space-y-6">
      {/* Top controls + Upgrade Plan (company users) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center justify-center space-x-6 flex-wrap">
          <Segmented
            value={subscriptionType}
            onChange={(v) => setSubscriptionType(v as any)}
            items={[
              { value: "pre-package", label: t("Pre Package Subscription") },
              { value: "usage", label: t("Usage Subscription") },
            ]}
            activePadding="px-6 py-2"
            inactivePadding="px-6 py-2"
          />
          <Segmented
            value={pricingPeriod}
            onChange={(v) => setPricingPeriod(v as any)}
            items={[
              { value: "monthly", label: t("Monthly") },
              { value: "yearly", label: t("Yearly") },
            ]}
            activePadding="px-4 py-2"
            inactivePadding="px-4 py-2"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {role === "superadmin" && canCreate && (
            <Button onClick={() => setCreatePlanOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              {t("Create Plan")}
            </Button>
          )}
          {isSubscriptionSubject && !hasActiveSubscription && (
            <Button onClick={scrollToPlans} className="bg-[#4C88FF] hover:bg-[#3B7BFF] text-white">
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              {t("Upgrade Plan")}
            </Button>
          )}
        </div>
      </div>

      {hasActiveSubscription && !companyPlanAssignment?.hideTopSummary && (
        <Card className={["rounded-xl border-2 p-4 sm:p-5", panelBg, panelBorder].join(" ")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={["rounded-lg p-2", isDark ? "bg-[#4C88FF]/20" : "bg-emerald-100"].join(" ")}>
                <Package className={isDark ? "text-[#4C88FF]" : "text-emerald-600"} size={24} />
              </div>
              <div>
                <p className={["text-sm font-medium", panelMutedText].join(" ")}>
                  {companyPlanAssignment ? t("Current plan") : t("Your current plan")}
                </p>
                <p className={["text-lg font-bold", panelText].join(" ")}>
                  {activePlanName || (activePlanId ? `${t("Plan")} #${activePlanId}` : t("Plan"))}
                </p>
                {planExpireDate && (
                  <p className={["text-sm mt-0.5", panelMutedText].join(" ")}>
                    {t("Expires on")} {fmtDate(planExpireDate)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => {
                  setShowAllPlans(true);
                  setTimeout(() => scrollToPlansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                }}
                variant="outline"
                size="sm"
              >
                {t("Change plan")}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      {subscriptionType === "pre-package" ? (
        <div ref={scrollToPlansRef} className="space-y-6 overflow-x-auto pt-6" id="subscription-plans">
          {displayPlans.length === 0 && hasActiveSubscription ? (
            <div className={["rounded-xl border p-6 text-center", panelBg, panelBorder].join(" ")}>
              <p className={["text-sm", panelMutedText].join(" ")}>
                {companyPlanAssignment ? t("Current plan") : t("Your current plan")}:{" "}
                <span className={["font-semibold", panelText].join(" ")}>{activePlanName || activePlanId}</span>
                {planExpireDate && ` · ${t("Expires on")} ${fmtDate(planExpireDate)}`}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setShowAllPlans(true)}
              >
                {t("View other plans")}
              </Button>
            </div>
          ) : (
          <>
          {/* Header cards (Laravel parity) */}
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: `300px repeat(${displayPlans.length || 1}, 280px)`,
              minWidth: `${matrixMinWidth}px`,
            }}
          >
            <div
              className={["rounded-2xl p-6 border sticky left-0 z-20", panelBg, panelBorder].join(" ")}
            >
              <div className="flex items-center justify-center space-x-3">
                <h3 className={["text-xl font-bold", panelText].join(" ")}>{t("Features & Add-Ons")}</h3>
              </div>
            </div>

            {displayPlans.map((plan) => {
              const isActivePlan = isCurrentlySubscribed(plan);
              const price = plan.freePlan
                ? { main: t("Free"), sub: t("Forever"), slash: "" }
                : pricingPeriod === "monthly"
                  ? { main: toMoney(plan.packagePriceMonthly).replace(".00", ""), sub: t("mo"), slash: "/" }
                  : { main: toMoney(plan.packagePriceYearly).replace(".00", ""), sub: t("mo"), slash: "/" }; // Laravel uses /mo for yearly too in UI

              return (
                <div
                  key={plan.id}
                  className={[
                    "relative rounded-2xl p-6 border-2",
                    panelBg,
                    isActivePlan ? activePlanBorderClass : panelBorder,
                  ].join(" ")}
                >
                  {isActivePlan ? (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className={[activePlanBadgeClass, "px-4 py-2 text-sm font-bold shadow-lg"].join(" ")}>
                        {t("Active plan")}
                      </Badge>
                    </div>
                  ) : null}

                  {role === "superadmin" && (canEdit || canDelete) ? (
                    <div className="absolute top-4 right-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={["h-8 w-8 p-0", isDark ? "text-white hover:bg-white/10" : "text-gray-700 hover:bg-gray-100"].join(" ")}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit ? (
                            <DropdownMenuItem asChild>
                              <Link href={`/plans/${plan.id}/edit`} className="flex items-center">
                                <Pencil className="w-4 h-4 mr-2" />
                                {t("Edit")}
                              </Link>
                            </DropdownMenuItem>
                          ) : null}
                          {canDelete ? (
                            <DropdownMenuItem
                              onClick={() => openDeleteConfirm(plan.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t("Delete")}
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : null}

                  <div className="text-center space-y-4">
                    <div>
                      <h3 className={["text-lg font-bold mb-1", panelText].join(" ")}>{plan.name ?? "-"}</h3>
                      <p className={["text-xs", panelMutedText].join(" ")}>{plan.description ?? ""}</p>
                    </div>

                    <div className="space-y-2">
                      {plan.freePlan ? (
                        <div>
                          <div className={["text-5xl font-black mb-1", freeTextClass].join(" ")}>{t("Free")}</div>
                          <div className={["font-semibold", freeTextClass].join(" ")}>{t("Forever")}</div>
                        </div>
                      ) : (
                        <div className="flex items-baseline justify-center space-x-1 mb-2">
                          <span className={["text-5xl font-black", panelText].join(" ")}>{price.main}</span>
                          <span className={["text-xl font-semibold", isDark ? "text-gray-400" : "text-gray-500"].join(" ")}>
                            {price.slash}
                            {price.sub}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <div className={["w-2 h-2 rounded-full flex-shrink-0", accentDotClass].join(" ")} />
                        <span className={["text-sm font-medium", panelMutedText].join(" ")}>
                          {plan.numberOfUsers === -1 ? t("Unlimited users") : `${plan.numberOfUsers} ${t("users")}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <div className={["w-2 h-2 rounded-full flex-shrink-0", accentDotClass].join(" ")} />
                        <span className={["text-sm font-medium", panelMutedText].join(" ")}>
                          {formatStorageBytes(plan.storageLimit)}
                        </span>
                      </div>
                      {plan.trial && plan.trialDays > 0 ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className={["text-sm font-medium", trialTextClass].join(" ")}>
                            {plan.trialDays}d {t("trial")}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Subscribe / Trial / Active plan actions for company users (or superadmin managing a company) */}
                    {isSubscriptionSubject && (
                      <div className={["pt-4 border-t space-y-2 mt-4", panelBorder].join(" ")}>
                        {isCurrentlySubscribed(plan) ? (
                          <div className="space-y-2">
                            <Button
                              disabled
                              className={["w-full cursor-default", isDark ? "bg-green-900/40 border-green-700 text-green-200" : "bg-green-100 border-green-300 text-green-800"].join(" ")}
                              variant="outline"
                              size="sm"
                            >
                              {t("Active plan")}
                            </Button>
                            <div className={["text-center p-2 rounded-lg border", isDark ? "bg-green-900/20 border-green-800" : "bg-green-50 border-green-200"].join(" ")}>
                              <p className={["text-xs", isDark ? "text-green-300" : "text-green-600"].join(" ")}>
                                {planExpireDate ? (
                                  <>
                                    {t("Expires on")} {fmtDate(planExpireDate)}
                                  </>
                                ) : (
                                  <>{t("No expiry date set")}</>
                                )}
                              </p>
                            </div>
                          </div>
                        ) : isOnTrialForPlan(plan) && trialExpireDate ? (
                          <div className={["text-center p-2 rounded-lg border", isDark ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"].join(" ")}>
                            <p className={["text-xs", isDark ? "text-blue-300" : "text-blue-600"].join(" ")}>
                              {t("Trial expires on")} {fmtDate(trialExpireDate)}
                            </p>
                          </div>
                        ) : companyPlanAssignment ? (
                          <>
                            <Button
                              className="w-full"
                              size="sm"
                              disabled={!!assigningPlanId}
                              onClick={() => assignPlanToCompany(String(plan.id))}
                            >
                              {assigningPlanId === String(plan.id) ? t("Applying...") : t("Assign plan")}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button asChild className="w-full" size="sm">
                              <Link href={`/plans/${plan.id}/subscribe`}>
                                {t("Subscribe to Plan")}
                              </Link>
                            </Button>
                            {canStartTrial(plan) && (
                              <Button variant="outline" className="w-full" size="sm" asChild>
                                <Link href={`/plans/${plan.id}/subscribe?trial=1`}>
                                  {t("Start Trial")} ({plan.trialDays}d)
                                </Link>
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison cards (Laravel parity) */}
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: `300px repeat(${displayPlans.length || 1}, 280px)`,
              minWidth: `${matrixMinWidth}px`,
            }}
          >
            <div className={["rounded-2xl p-6 border sticky left-0 z-20", panelBg, panelBorder].join(" ")}>
              <div className="space-y-3">
                <div className={["flex items-center justify-center py-2 h-10 border-b mb-3", dividerBorder].join(" ")}>
                  <span className={["font-semibold text-sm", panelText].join(" ")}>{t("Add-Ons")}</span>
                </div>
                {displayAddOns.map((m) => (
                  <div key={m.module} className="flex items-center justify-center py-0.5 h-6">
                    <span className={[panelMutedText, "capitalize text-center leading-none"].join(" ")}>{m.alias}</span>
                  </div>
                ))}
                {displayAddOns.length === 0 && !loading ? (
                  <div className={["text-sm text-center", panelMutedText].join(" ")}>{t("No add-ons found.")}</div>
                ) : null}
              </div>
            </div>

            {displayPlans.map((plan) => {
              const enabledCount = displayAddOns.filter((m) => hasModule(plan, m.module)).length;
              const total = displayAddOns.length;
              const isActivePlan = isCurrentlySubscribed(plan);
              return (
                <div
                  key={plan.id}
                  className={[
                    "rounded-2xl p-6 border-2",
                    panelBg,
                    isActivePlan ? activePlanBorderClass : panelBorder,
                  ].join(" ")}
                >
                  <div className="space-y-3">
                    <div className={["flex items-center justify-center py-2 h-10 border-b mb-3", dividerBorder].join(" ")}>
                      <span className={["font-semibold text-sm", panelText].join(" ")}>
                        {enabledCount}/{total} {t("Enabled")}
                      </span>
                    </div>
                    {displayAddOns.map((m) => {
                      const enabled = hasModule(plan, m.module);
                      return (
                        <div key={m.module} className="flex items-center justify-center py-0.5 h-6">
                          {enabled ? (
                            <div
                              className={[
                                "inline-flex items-center justify-center w-5 h-5 rounded-full",
                                isDark ? "bg-green-900/40" : "bg-emerald-100",
                              ].join(" ")}
                            >
                              <Check className={["w-3 h-3", isDark ? "text-green-400" : "text-emerald-600"].join(" ")} />
                            </div>
                          ) : (
                            <div className={["inline-flex items-center justify-center w-5 h-5 rounded-full", crossBg].join(" ")}>
                              <X className={["w-3 h-3", crossFg].join(" ")} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {hasActiveSubscription && showAllPlans && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowAllPlans(false)}>
                {companyPlanAssignment ? t("Show only current plan") : t("Show only my plan")}
              </Button>
            </div>
          )}
          </>
          )}
        </div>
      ) : (
        <div className={["rounded-xl border", isDark ? "bg-[#1E2035] border-gray-700" : "bg-white border-gray-200"].join(" ")}>
          {(() => {
            const customPlan = activePlans[0] ?? null;
            const price = customPlan
              ? pricingPeriod === "monthly"
                ? {
                    pkg: customPlan.packagePriceMonthly,
                    perUser: customPlan.pricePerUserMonthly,
                    perStorage: customPlan.pricePerStorageMonthly,
                    periodLabel: t("Monthly"),
                  }
                : {
                    pkg: customPlan.packagePriceYearly,
                    perUser: customPlan.pricePerUserYearly,
                    perStorage: customPlan.pricePerStorageYearly,
                    periodLabel: t("Yearly"),
                  }
              : null;

            const q = usageSearch.trim().toLowerCase();
            const filteredAddOns = q
              ? addOns.filter((a) => (a.alias ?? "").toLowerCase().includes(q) || (a.module ?? "").toLowerCase().includes(q))
              : addOns;

            return (
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className={["text-lg font-semibold", panelText].join(" ")}>{customPlan?.name ?? t("Custom Plan")}</div>
                    <div className={["text-sm", panelMutedText].join(" ")}>
                      {customPlan?.description ?? t("Tailored solution for specific business needs")}
                    </div>
                  </div>

                  {role === "superadmin" && canEdit && customPlan ? (
                    <Button
                      size="sm"
                      className={["shrink-0", isDark ? "" : "bg-primary text-primary-foreground hover:bg-primary/90"].join(" ")}
                      onClick={() => setEditingPlan(customPlan)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      {t("Edit Pricing")}
                    </Button>
                  ) : null}
                </div>

                {customPlan && price ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className={["rounded-lg border p-4 text-center", isDark ? "border-gray-700 bg-white/5" : "border-gray-200 bg-gray-50"].join(" ")}>
                      <div className={["text-2xl font-semibold", panelText].join(" ")}>{toMoney2(price.pkg)}</div>
                      <div className={["text-xs mt-1", panelMutedText].join(" ")}>
                        {price.periodLabel} {t("Package")}
                      </div>
                    </div>
                    <div className={["rounded-lg border p-4 text-center", isDark ? "border-gray-700 bg-white/5" : "border-gray-200 bg-gray-50"].join(" ")}>
                      <div className={["text-2xl font-semibold", panelText].join(" ")}>{toMoney2(price.perUser)}</div>
                      <div className={["text-xs mt-1", panelMutedText].join(" ")}>
                        {t("Per User")} {price.periodLabel}
                      </div>
                    </div>
                    <div className={["rounded-lg border p-4 text-center", isDark ? "border-gray-700 bg-white/5" : "border-gray-200 bg-gray-50"].join(" ")}>
                      <div className={["text-2xl font-semibold", panelText].join(" ")}>{toMoney2(price.perStorage)}</div>
                      <div className={["text-xs mt-1", panelMutedText].join(" ")}>
                        {t("Per Storage")} {price.periodLabel}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={["rounded-lg border px-4 py-3 text-sm", isDark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"].join(" ")}>
                    {t("No custom usage plan found.")}
                  </div>
                )}

                <div className="pt-2">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className={["text-sm font-semibold", panelText].join(" ")}>{t("Active Add-Ons")}</div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={usageSearch}
                          onChange={(e) => setUsageSearch(e.target.value)}
                          placeholder={t("Search add-ons...")}
                          className="pl-9"
                        />
                      </div>
                      <Button type="button" size="sm" onClick={() => null} className="shrink-0">
                        {t("Search")}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredAddOns.map((m) => {
                      const priceLabel = pricingPeriod === "monthly" ? m.monthly_price : m.yearly_price;
                      const period = pricingPeriod === "monthly" ? t("monthly") : t("yearly");
                      return (
                        <div
                          key={m.module}
                          className={["rounded-lg border p-4 relative", isDark ? "border-gray-700 bg-white/5" : "border-gray-200 bg-white"].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={["h-9 w-9 rounded-lg flex items-center justify-center border", isDark ? "border-gray-700 bg-black/10" : "border-gray-200 bg-gray-50"].join(" ")}>
                                <Package className={["h-4 w-4", isDark ? "text-gray-300" : "text-gray-600"].join(" ")} />
                              </div>
                              <div className={["font-semibold text-sm truncate", panelText].join(" ")} title={m.alias}>
                                {m.alias}
                              </div>
                            </div>

                            {role === "superadmin" && canEdit ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={["h-8 w-8", isDark ? "text-gray-300 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"].join(" ")}
                                onClick={() => setEditingAddOn(m)}
                                aria-label={t("Edit")}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>

                          <div className="mt-3">
                            <div className={["text-sm font-semibold", panelText].join(" ")}>{toMoney2(priceLabel)}</div>
                            <div className={["text-xs", panelMutedText].join(" ")}>
                              /{period}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredAddOns.length === 0 && !loading ? (
                      <div className={["col-span-full text-sm text-center py-8", panelMutedText].join(" ")}>{t("No add-ons found.")}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <AddOnEditDialog addOn={editingAddOn} open={!!editingAddOn} onOpenChange={(v) => (!v ? setEditingAddOn(null) : null)} onSaved={refresh} />
      <PlanPricingDialog plan={editingPlan} open={!!editingPlan} onOpenChange={(v) => (!v ? setEditingPlan(null) : null)} onSaved={refresh} />
      <CreatePlanDialog open={createPlanOpen} onOpenChange={setCreatePlanOpen} onSaved={refresh} availableModules={addOns} />

      <Dialog open={!!deletePlanId} onOpenChange={(open) => !open && setDeletePlanId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Delete Plan")}</DialogTitle>
            <DialogDescription>{t("Are you sure you want to delete this plan? This action cannot be undone.")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePlanId(null)} disabled={deletePlanProcessing}>
              {t("Cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDeletePlan} disabled={deletePlanProcessing}>
              {deletePlanProcessing ? t("Deleting...") : t("Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

