"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2 } from "lucide-react";
import { formatPhone } from "@/lib/phone";
import { t } from "@/lib/admin-t";
import {
  enrichModulesForSelect,
  inferCategoryIdForModuleId,
  moduleCategoryOptions,
  modulesForCategory,
  type EnrichedModule,
} from "@/lib/industry-module-select";

type ModuleItem = EnrichedModule;

type FormState = {
  active_plan_id: string;
  company_id: string;
  name: string;
  email: string;
  mobile_no: string;
  password: string;
  password_confirmation: string;
  status: "active" | "inactive";
  language: string;
  default_currency: string;
  company_website: string;
  company_phone: string;
  street_address: string;
  street_address_2: string;
  city: string;
  state: string;
  zip_code: string;
  business_module_id: string;
  logo: File | null;
  company_gst_vat: string;
  admin_first_name: string;
  admin_last_name: string;
};


type PlanOption = { id: string; name: string; freePlan: boolean };

const initial: FormState = {
  active_plan_id: "",
  company_id: "",
  name: "",
  email: "",
  mobile_no: "",
  password: "",
  password_confirmation: "",
  status: "active",
  language: "en",
  default_currency: "USD",
  company_website: "",
  company_phone: "",
  street_address: "",
  street_address_2: "",
  city: "",
  state: "",
  zip_code: "",
  business_module_id: "",
  logo: null,
  company_gst_vat: "",
  admin_first_name: "",
  admin_last_name: "",
};

type CurrencyOption = { code: string; name: string };
type LanguageOption = { code: string; name: string };

const DEFAULT_CURRENCIES: CurrencyOption[] = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "INR", name: "Indian Rupee" },
];

const DEFAULT_LANGUAGES: LanguageOption[] = [{ code: "en", name: "English" }];

/** Keep uploads below typical reverse-proxy limits; nginx default is often 1mb unless raised. */
const MAX_LOGO_BYTES = 8 * 1024 * 1024;

function ensureHttps(url: string) {
  const v = url.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export default function CompanyCreateForm({
  redirectOnSuccess = true,
  onSuccess,
}: {
  redirectOnSuccess?: boolean;
  onSuccess?: (createdId: string) => void;
}) {
  const router = useRouter();
  const appSettings = useAppSettingsOptional();
  const [data, setData] = React.useState<FormState>(initial);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [modules, setModules] = React.useState<ModuleItem[]>([]);
  const [moduleCategoryId, setModuleCategoryId] = React.useState("");
  const [plans, setPlans] = React.useState<PlanOption[]>([]);
  const [plansError, setPlansError] = React.useState<string | null>(null);
  const [generatingId, setGeneratingId] = React.useState(false);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fetchOpts = { cache: "no-store" as const, credentials: "include" as const };
        const [modRes, planRes] = await Promise.all([
          fetch("/api/business-modules", fetchOpts),
          fetch("/api/companies/available-plans", fetchOpts),
        ]);
        const modJson = (await modRes.json().catch(() => null)) as any;
        if (modRes.ok && Array.isArray(modJson?.items) && !cancelled) {
          setModules(enrichModulesForSelect(modJson.items as ModuleItem[]));
        }
        const planJson = (await planRes.json().catch(() => null)) as any;
        if (!cancelled && !planRes.ok) {
          setPlansError(
            (planJson?.message as string) ||
              t("Could not load subscription plans. Check your permissions or try refreshing."),
          );
          setPlans([]);
        }
        if (planRes.ok && Array.isArray(planJson?.items) && !cancelled) {
          setPlansError(null);
          setPlans(
            (planJson.items as PlanOption[]).map((p) => ({
              id: String(p.id),
              name: p.name,
              freePlan: Boolean(p.freePlan),
            })),
          );
        }
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const moduleCategoryOptionsList = React.useMemo(() => moduleCategoryOptions(modules), [modules]);
  const modulesInSelectedCategory = React.useMemo(
    () => modulesForCategory(modules, moduleCategoryId),
    [modules, moduleCategoryId],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!data.active_plan_id) {
      setError(t("Please select a subscription plan."));
      return;
    }
    if (!data.business_module_id) {
      setError(t("Please select a module."));
      return;
    }
    if (!data.name.trim()) {
      setError(t("Company name is required."));
      return;
    }
    if (!data.email.trim()) {
      setError(t("Company email is required."));
      return;
    }
    if (!data.password || data.password.length < 6) {
      setError(t("Password must be at least 6 characters."));
      return;
    }
    if (data.password !== data.password_confirmation) {
      setError(t("Passwords do not match."));
      return;
    }
    if (data.logo && data.logo.size > MAX_LOGO_BYTES) {
      setError(t("Logo file is too large. Please use an image under 8 MB."));
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (k === "logo") {
          if (v) fd.append("logo", v as any);
          return;
        }
        fd.append(k, String(v ?? ""));
      });
      // Back-compat: API accepts either key.
      fd.set("passwordConfirm", data.password_confirmation);

      const res = await fetch("/api/companies", { method: "POST", credentials: "include", body: fd });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        if (res.status === 413) {
          throw new Error(
            t(
              "Request too large (413). Try a smaller logo, or raise the upload limit on the server (e.g. nginx client_max_body_size).",
            ),
          );
        }
        throw new Error(json?.message || "Failed to create company.");
      }
      const id = String(json?.id ?? "");
      if (redirectOnSuccess) {
        router.push(id ? `/companies/${id}` : "/companies");
        router.refresh();
      } else {
        onSuccess?.(id);
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleModuleChange(moduleId: string) {
    set("business_module_id", moduleId);
    if (moduleId) {
      setModuleCategoryId(inferCategoryIdForModuleId(modules, moduleId));
    }
    if (!moduleId) {
      set("company_id", "");
      return;
    }
    setGeneratingId(true);
    try {
      const res = await fetch(`/api/companies/generate-company-id?moduleId=${encodeURIComponent(moduleId)}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as any;
      if (res.ok && json?.company_id) {
        set("company_id", String(json.company_id));
      }
    } finally {
      setGeneratingId(false);
    }
  }

  async function generateCompanyId() {
    if (!data.business_module_id) {
      setError(t("Select a module first."));
      return;
    }
    setError(null);
    setGeneratingId(true);
    try {
      const res = await fetch(`/api/companies/generate-company-id?moduleId=${encodeURIComponent(data.business_module_id)}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.message || t("Failed to generate."));
        return;
      }
      if (json?.company_id) set("company_id", String(json.company_id));
    } finally {
      setGeneratingId(false);
    }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("Company Details")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="active_plan_id">
              {t("Subscription plan")} <span className="text-destructive">*</span>
            </Label>
            <select
              id="active_plan_id"
              required
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
              value={data.active_plan_id}
              onChange={(e) => set("active_plan_id", e.target.value)}
            >
              <option value="">{t("Select a subscription plan")}</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.freePlan ? ` (${t("Free")})` : ""}
                </option>
              ))}
            </select>
            {plansError ? (
              <p className="text-xs text-destructive">{plansError}</p>
            ) : plans.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("No active plans found. Add plans under Settings → Subscription Plans.")}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="module_category_id">{t("Module category")}</Label>
            <select
              id="module_category_id"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
              value={moduleCategoryId}
              onChange={(e) => {
                setModuleCategoryId(e.target.value);
                set("business_module_id", "");
                set("company_id", "");
              }}
            >
              <option value="">{t("Select a category")}</option>
              {moduleCategoryOptionsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="business_module_id">{t("Sub-category")}</Label>
            <div className="flex gap-2">
              <select
                id="business_module_id"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                value={data.business_module_id}
                onChange={(e) => handleModuleChange(e.target.value)}
                disabled={!moduleCategoryId}
              >
                <option value="">{t("Select a sub-category")}</option>
                {modulesInSelectedCategory.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.moduleCode ? ` (${m.moduleCode})` : ""}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={generateCompanyId} disabled={generatingId}>
                {generatingId ? t("Generating...") : t("Generate ID")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Pick a category, then choose the module sub-category to generate Company ID.")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_id">{t("Company ID")}</Label>
            <Input
              id="company_id"
              value={data.company_id}
              readOnly
              placeholder={generatingId ? t("Generating...") : "AA-0001-CO-26"}
              className="cursor-not-allowed bg-muted"
              aria-readonly="true"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t("Status")}</Label>
            <select
              id="status"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
              value={data.status}
              onChange={(e) => set("status", e.target.value as any)}
            >
              <option value="active">{t("Active")}</option>
              <option value="inactive">{t("Inactive")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{t("Company Name")}</Label>
            <Input id="name" value={data.name} onChange={(e) => set("name", e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("Company Email")}</Label>
            <Input id="email" value={data.email} onChange={(e) => set("email", e.target.value)} type="email" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile_no">{t("Mobile No")}</Label>
            <Input id="mobile_no" value={data.mobile_no} onChange={(e) => set("mobile_no", formatPhone(e.target.value))} placeholder="(555) 555-5555" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">{t("Language")}</Label>
            <select
              id="language"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
              value={data.language}
              onChange={(e) => set("language", e.target.value)}
            >
              {DEFAULT_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>{t("Company Logo")}</Label>
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 shrink-0 border border-border">
                {logoPreview ? (
                  <AvatarImage src={logoPreview} alt={t("Company logo preview")} className="object-cover" />
                ) : null}
                <AvatarFallback>
                  <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden />
                </AvatarFallback>
              </Avatar>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {t("Choose Logo")}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">{t("Upload company logo (JPG, PNG, GIF)")}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > MAX_LOGO_BYTES) {
                    setError(t("Logo file is too large. Please use an image under 8 MB."));
                    e.target.value = "";
                    return;
                  }
                  setError(null);
                  set("logo", f);
                  setLogoPreview(f ? URL.createObjectURL(f) : null);
                }}
                className="hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Company Settings")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company_website">{t("Company Website")}</Label>
            <Input
              id="company_website"
              value={data.company_website}
              onChange={(e) => set("company_website", e.target.value)}
              onBlur={(e) => set("company_website", ensureHttps(e.target.value))}
              placeholder={t("example.com")}
            />
            <p className="text-xs text-muted-foreground">{t("https:// will be added automatically")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_phone">{t("Company Phone")}</Label>
            <Input
              id="company_phone"
              value={data.company_phone}
              onChange={(e) => set("company_phone", formatPhone(e.target.value))}
              placeholder={t("(000) 000-0000")}
              maxLength={14}
            />
          </div>
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">{t("Address")}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="street_address">{t("Street Address")}</Label>
                <AddressAutocomplete
                  id="street_address"
                  apiKey={appSettings?.settings?.googleMapsApiKey}
                  value={data.street_address}
                  onChange={(v) => setData((prev) => ({ ...prev, street_address: v }))}
                  onPlaceSelect={(addr) => {
                    setData((prev) => ({
                      ...prev,
                      street_address: addr.street,
                      city: addr.city,
                      state: addr.state,
                      zip_code: addr.zip,
                    }));
                  }}
                  placeholder={t("Start typing an address...")}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="street_address_2">{t("Address 2")}</Label>
                <Input
                  id="street_address_2"
                  value={data.street_address_2}
                  onChange={(e) => set("street_address_2", e.target.value)}
                  placeholder={t("Apt, suite, unit (optional)")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t("City")}</Label>
                <Input id="city" value={data.city} onChange={(e) => set("city", e.target.value)} placeholder={t("City")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">{t("State")}</Label>
                <Input id="state" value={data.state} onChange={(e) => set("state", e.target.value)} placeholder={t("State")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">{t("Zip Code")}</Label>
                <Input id="zip_code" value={data.zip_code} onChange={(e) => set("zip_code", e.target.value)} placeholder={t("Zip Code")} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_currency">{t("Default Currency")}</Label>
            <select
              id="default_currency"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
              value={data.default_currency}
              onChange={(e) => set("default_currency", e.target.value)}
            >
              {DEFAULT_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_gst_vat">{t("GST/VAT Number")}</Label>
            <Input id="company_gst_vat" value={data.company_gst_vat} onChange={(e) => set("company_gst_vat", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Admin User (Optional)")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="admin_first_name">{t("First Name")}</Label>
            <Input id="admin_first_name" value={data.admin_first_name} onChange={(e) => set("admin_first_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin_last_name">{t("Last Name")}</Label>
            <Input id="admin_last_name" value={data.admin_last_name} onChange={(e) => set("admin_last_name", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Login Credentials")}</CardTitle>
          <CardDescription>{t("Set the password for the company account login (uses Company Email above).")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password" required>
              {t("Password")}
            </Label>
            <Input id="password" value={data.password} onChange={(e) => set("password", e.target.value)} type="password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password_confirmation" required>
              {t("Confirm Password")}
            </Label>
            <Input
              id="password_confirmation"
              value={data.password_confirmation}
              onChange={(e) => set("password_confirmation", e.target.value)}
              type="password"
              required
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? t("Creating...") : t("Create company")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (redirectOnSuccess) router.push("/companies");
            else onSuccess?.("");
          }}
          disabled={loading}
        >
          {t("Cancel")}
        </Button>
      </div>
    </form>
  );
}

