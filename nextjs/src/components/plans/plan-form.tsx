"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Package2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


/** Default add-on icon path from API when no custom image; not served in Next.js. */
const FALLBACK_ICON_PATH = "/packages/workdo/";

function AddOnIcon({ image, alt }: { image: string; alt: string }) {
  const [failed, setFailed] = React.useState(false);
  const useFallback = failed || !image || image.startsWith(FALLBACK_ICON_PATH);

  if (useFallback) {
    return (
      <div className="w-8 h-8 border rounded bg-muted flex items-center justify-center shrink-0" title={alt}>
        <Package2 className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={image}
      alt=""
      className="w-8 h-8 border rounded object-contain shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

type PlanFormProps =
  | { mode: "create"; planId?: never }
  | { mode: "edit"; planId: string };

type AddOnItem = {
  module: string;
  alias: string;
  image: string;
  monthly_price: string;
  yearly_price: string;
};

type PlanState = {
  name: string;
  description: string;
  number_of_users: string;
  storage_limit_gb: string;
  package_price_monthly: string;
  package_price_yearly: string;
  free_plan: boolean;
  status: boolean;
  trial: boolean;
  trial_days: string;
  modules: string[];
};

const initial: PlanState = {
  name: "",
  description: "",
  number_of_users: "1",
  storage_limit_gb: "0",
  package_price_monthly: "0",
  package_price_yearly: "0",
  free_plan: false,
  status: true,
  trial: true,
  trial_days: "30",
  modules: [],
};

export default function PlanForm(props: PlanFormProps) {
  const router = useRouter();
  const [data, setData] = React.useState<PlanState>(initial);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [moduleSearch, setModuleSearch] = React.useState("");
  const [modulesLoading, setModulesLoading] = React.useState(false);
  const [activeModules, setActiveModules] = React.useState<AddOnItem[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setModulesLoading(true);
      try {
        const res = await fetch("/api/add-ons?all=1", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as any;
        if (!res.ok) throw new Error(json?.message || "Failed to load add-ons.");
        if (!cancelled) setActiveModules(Array.isArray(json?.items) ? json.items : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load add-ons.");
      } finally {
        if (!cancelled) setModulesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (props.mode !== "edit") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/plans/${props.planId}`, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as any;
        if (!res.ok) throw new Error(json?.message || "Failed to load plan.");
        const p = json?.plan;
        const storageGb = Math.round(Number(p?.storageLimit ?? 0) / (1024 * 1024 * 1024));
        if (!cancelled) {
          setData({
            name: String(p?.name ?? ""),
            description: String(p?.description ?? ""),
            number_of_users: String(p?.numberOfUsers ?? "1"),
            storage_limit_gb: String(storageGb),
            package_price_monthly: String(p?.packagePriceMonthly ?? "0"),
            package_price_yearly: String(p?.packagePriceYearly ?? "0"),
            free_plan: Boolean(p?.freePlan ?? false),
            status: Boolean(p?.status ?? true),
            trial: Boolean(p?.trial ?? false),
            trial_days: String(p?.trialDays ?? "0"),
            modules: Array.isArray(p?.modules) ? p.modules.filter((x: any) => typeof x === "string") : [],
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props]);

  function set<K extends keyof PlanState>(key: K, value: PlanState[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  const modulesInclude = (list: string[], moduleCode: string) =>
    list.some((m) => m.toLowerCase() === moduleCode.toLowerCase());

  function handleModuleChange(moduleName: string, checked: boolean) {
    setData((p) => ({
      ...p,
      modules: checked
        ? [...p.modules.filter((m) => m.toLowerCase() !== moduleName.toLowerCase()), moduleName]
        : p.modules.filter((m) => m.toLowerCase() !== moduleName.toLowerCase()),
    }));
  }

  const filteredModules = React.useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    if (!q) return activeModules;
    return activeModules.filter((m) => m.alias.toLowerCase().includes(q) || m.module.toLowerCase().includes(q));
  }, [activeModules, moduleSearch]);

  const allFilteredSelected = React.useMemo(() => {
    if (filteredModules.length === 0) return false;
    return filteredModules.every((m) => modulesInclude(data.modules, m.module));
  }, [filteredModules, data.modules]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const gb = Number(data.storage_limit_gb || "0");
      const storageLimitMb = Number.isFinite(gb) ? Math.max(0, Math.floor(gb * 1024)) : 0;
      const payload = {
        name: data.name,
        description: data.description,
        number_of_users: Number(data.number_of_users || "1"),
        storage_limit_mb: storageLimitMb,
        package_price_monthly: Number(data.package_price_monthly || "0"),
        package_price_yearly: Number(data.package_price_yearly || "0"),
        free_plan: data.free_plan,
        status: data.status,
        trial: data.trial,
        trial_days: Number(data.trial_days || "0"),
        modules: data.modules,
      };

      const res =
        props.mode === "create"
          ? await fetch("/api/plans", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/plans/${props.planId}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(json?.message || "Save failed.");
      toast.success(props.mode === "create" ? t("Plan created.") : t("Plan updated."));
      router.push("/plans");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
      toast.error(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (props.mode !== "edit") return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/plans/${props.planId}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(json?.message || "Delete failed.");
      toast.success(t("Plan deleted."));
      router.push("/plans");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
      toast.error(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-semibold">{t("Super Admin Access")}</div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("You have access to all")} {activeModules.length} {t("available add ons as a super admin.")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("Quick Settings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t("Active")}</Label>
                <Switch checked={data.status} onCheckedChange={(checked) => set("status", checked)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t("Trial")}</Label>
                <Switch checked={data.trial} onCheckedChange={(checked) => set("trial", checked)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t("Free")}</Label>
                <Switch checked={data.free_plan} onCheckedChange={(checked) => set("free_plan", checked)} />
              </div>
            </CardContent>
          </Card>

          {data.trial ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t("Trial Settings")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-xs">{t("Trial Days")}</Label>
                  <Input
                    type="number"
                    placeholder={t("Enter trial days")}
                    value={data.trial_days}
                    onChange={(e) => set("trial_days", e.target.value)}
                    min={0}
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}

          {!data.free_plan ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t("Pricing")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">{t("Monthly")} ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder={t("Enter monthly price")}
                    value={data.package_price_monthly}
                    onChange={(e) => set("package_price_monthly", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("Yearly")} ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder={t("Enter yearly price")}
                    value={data.package_price_yearly}
                    onChange={(e) => set("package_price_yearly", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="col-span-12 lg:col-span-9 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("Plan Information")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label required>{t("Plan Name")}</Label>
                  <Input placeholder={t("Enter plan name")} value={data.name} onChange={(e) => set("name", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("Max Users")}</Label>
                  <Input
                    type="number"
                    placeholder={t("Enter max users")}
                    value={data.number_of_users}
                    onChange={(e) => set("number_of_users", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t('Note: "-1" for Unlimited')}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t("Storage Limit (GB)")}</Label>
                  <Input
                    type="number"
                    placeholder={t("Enter storage limit in GB")}
                    value={data.storage_limit_gb}
                    onChange={(e) => set("storage_limit_gb", e.target.value)}
                    min={0}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("Description")}</Label>
                <Textarea
                  placeholder={t("Enter plan description")}
                  value={data.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t("Add-Ons")}
                <div className="flex items-center gap-2">
                  <Badge>{data.modules.length} {t("selected")}</Badge>
                </div>
              </CardTitle>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input value={moduleSearch} onChange={(e) => setModuleSearch(e.target.value)} placeholder={t("Search...")} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    if (filteredModules.length === 0) return;
                    if (allFilteredSelected) {
                      setData((p) => ({
                        ...p,
                        modules: p.modules.filter((m) => !filteredModules.some((fm) => fm.module.toLowerCase() === m.toLowerCase())),
                      }));
                    } else {
                      setData((p) => ({
                        ...p,
                        modules: Array.from(new Set([...p.modules, ...filteredModules.map((m) => m.module)])),
                      }));
                    }
                  }}
                  disabled={modulesLoading}
                >
                  {allFilteredSelected ? t("Uncheck All") : t("Check All")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-1 gap-3 pr-4 sm:grid-cols-2 lg:grid-cols-4">
                  {filteredModules.map((module) => (
                    <div key={module.module} className="flex items-center gap-3 p-4 border rounded hover:bg-muted/50">
                      <AddOnIcon image={module.image} alt={module.alias} />
                      <span className="text-sm truncate flex-1">{module.alias}</span>
                      <Checkbox
                        checked={modulesInclude(data.modules, module.module)}
                        onCheckedChange={(checked) => handleModuleChange(module.module, Boolean(checked))}
                      />
                    </div>
                  ))}
                  {!modulesLoading && filteredModules.length === 0 ? (
                    <div className="col-span-full py-10 text-center text-sm text-muted-foreground">{t("No add-ons found.")}</div>
                  ) : null}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? t("Saving...") : props.mode === "edit" ? t("Update") : t("Create")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          {t("Cancel")}
        </Button>
        {props.mode === "edit" ? (
          <Button type="button" variant="destructive" onClick={onDelete} disabled={loading}>
            {t("Delete")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

