"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2 } from "lucide-react";
import { formatPhone } from "@/lib/phone";
import { getImagePath } from "@/utils/image-path";
import { t } from "@/lib/admin-t";
import {
  enrichModulesForSelect,
  inferCategoryIdForModuleId,
  moduleCategoryOptions,
  modulesForCategory,
  type EnrichedModule,
} from "@/lib/industry-module-select";


function ensureHttps(url: string) {
  const v = url.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

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

type ModuleItem = EnrichedModule;
type PlanOption = { id: string; name: string; freePlan: boolean };

type CompanyPayload = {
  company: {
    id: string;
    slug: string | null;
    name: string | null;
    email: string | null;
    mobileNo: string | null;
    lang: string | null;
    isEnableLogin: boolean | null;
    active_plan_id?: string;
  };
  company_settings: Record<string, string>;
  businessModule?: { id: string; name: string } | null;
};

/** Match company slug prefix (e.g. AA-0001-CO-26) to a business module when setting was never saved. */
function inferModuleIdFromCompanySlug(slug: string, moduleList: ModuleItem[]): string {
  const prefix = slug.trim().split("-")[0]?.toUpperCase() ?? "";
  if (prefix.length < 2) return "";
  const match = moduleList.find((m) => {
    const fromName = m.name.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2);
    const fromCode = (m.code ?? "").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2);
    return fromName === prefix || (fromCode.length >= 2 && fromCode === prefix);
  });
  return match?.id ?? "";
}

export default function CompanyEditForm({
  companyId,
  redirectOnSuccess = true,
  onSuccess,
}: {
  companyId: string;
  redirectOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const appSettings = useAppSettingsOptional();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [modules, setModules] = React.useState<ModuleItem[]>([]);
  const [moduleCategoryId, setModuleCategoryId] = React.useState("");
  const [plans, setPlans] = React.useState<PlanOption[]>([]);
  const [plansError, setPlansError] = React.useState<string | null>(null);
  const [generatingId, setGeneratingId] = React.useState(false);

  const [active_plan_id, setActivePlanId] = React.useState("");
  const [company_id, setCompanyId] = React.useState("");
  const [status, setStatus] = React.useState<"active" | "inactive">("active");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [mobile_no, setMobile] = React.useState("");
  const [language, setLanguage] = React.useState("en");
  const [business_module_id, setBusinessModuleId] = React.useState("");

  const [company_website, setWebsite] = React.useState("");
  const [company_phone, setPhone] = React.useState("");
  const [street_address, setStreet] = React.useState("");
  const [street_address_2, setStreet2] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [zip_code, setZip] = React.useState("");
  const [default_currency, setCurrency] = React.useState("USD");
  const [company_gst_vat, setCompanyGstVat] = React.useState("");

  const [logo, setLogo] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchOpts = { cache: "no-store" as const, credentials: "include" as const };
        const [cRes, mRes, planRes] = await Promise.all([
          fetch(`/api/companies/${companyId}`, fetchOpts),
          fetch("/api/business-modules", fetchOpts),
          fetch("/api/companies/available-plans", fetchOpts),
        ]);
        const cJson = (await cRes.json().catch(() => null)) as Record<string, unknown> | null;
        if (!cRes.ok) throw new Error((cJson?.message as string) || "Failed to load company.");

        const modsJson = (await mRes.json().catch(() => null)) as { items?: ModuleItem[] } | null;
        const planJson = (await planRes.json().catch(() => null)) as { items?: PlanOption[]; message?: string } | null;

        const rawModules = Array.isArray(modsJson?.items) ? modsJson.items : [];
        const enrichedModules = enrichModulesForSelect(rawModules);

        if (!cancelled && mRes.ok) {
          setModules(enrichedModules);
        }

        if (!cancelled) {
          if (!planRes.ok) {
            setPlansError(
              planJson?.message ||
                t("Could not load subscription plans. Check your permissions or try refreshing."),
            );
            setPlans([]);
          } else if (Array.isArray(planJson?.items)) {
            setPlansError(null);
            setPlans(
              planJson.items.map((p) => ({
                id: String(p.id),
                name: p.name,
                freePlan: Boolean(p.freePlan),
              })),
            );
          }
        }

        const payload = cJson as CompanyPayload;
        const cs = payload.company_settings ?? {};
        const c = payload.company;
        const moduleList = enrichedModules;

        if (!cancelled) {
          const existingSlug = c.slug ?? "";
          let moduleId =
            cs.businessModuleId?.trim() || payload.businessModule?.id?.trim() || "";
          if (!moduleId && existingSlug && moduleList.length > 0) {
            moduleId = inferModuleIdFromCompanySlug(existingSlug, moduleList);
          }

          setActivePlanId(c.active_plan_id ?? "");
          setCompanyId(existingSlug);
          setStatus(c.isEnableLogin === false ? "inactive" : "active");
          setName(c.name ?? "");
          setEmail(c.email ?? "");
          setMobile(formatPhone(c.mobileNo ?? ""));
          setLanguage(c.lang ?? "en");

          setWebsite(cs.companyWebsite ?? "");
          setPhone(formatPhone(cs.companyPhone ?? ""));
          setStreet(cs.companyAddress ?? "");
          setStreet2(cs.companyAddress2 ?? "");
          setCity(cs.companyCity ?? "");
          setState(cs.companyState ?? "");
          setZip(cs.companyZipCode ?? "");
          setCurrency(cs.defaultCurrency || "USD");
          setCompanyGstVat(cs.companyGstVat ?? "");
          setBusinessModuleId(moduleId);
          if (moduleId) {
            setModuleCategoryId(inferCategoryIdForModuleId(enrichedModules, moduleId));
          }

          const existingLogo = String(cs.logo_light ?? cs.logo_dark ?? "").trim();
          setLogoPreview(existingLogo ? getImagePath(existingLogo) : null);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const moduleCategoryOptionsList = React.useMemo(() => moduleCategoryOptions(modules), [modules]);
  const modulesInSelectedCategory = React.useMemo(
    () => modulesForCategory(modules, moduleCategoryId),
    [modules, moduleCategoryId],
  );

  async function handleModuleChange(moduleId: string) {
    setBusinessModuleId(moduleId);
    if (moduleId) {
      setModuleCategoryId(inferCategoryIdForModuleId(modules, moduleId));
    }
    if (!moduleId) {
      return;
    }
    setGeneratingId(true);
    try {
      const res = await fetch(`/api/companies/generate-company-id?moduleId=${encodeURIComponent(moduleId)}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as { company_id?: string } | null;
      if (res.ok && json?.company_id) {
        setCompanyId(String(json.company_id));
      }
    } finally {
      setGeneratingId(false);
    }
  }

  async function generateCompanyId() {
    if (!business_module_id) {
      setError(t("Select a module first."));
      return;
    }
    setError(null);
    setGeneratingId(true);
    try {
      const res = await fetch(`/api/companies/generate-company-id?moduleId=${encodeURIComponent(business_module_id)}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as { company_id?: string; message?: string };
      if (!res.ok) {
        setError(json?.message || t("Failed to generate."));
        return;
      }
      if (json?.company_id) setCompanyId(String(json.company_id));
    } finally {
      setGeneratingId(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!active_plan_id) {
      setError(t("Please select a subscription plan."));
      return;
    }
    const hasExistingCompanyId = company_id.trim().length > 0;
    if (!hasExistingCompanyId && !business_module_id.trim()) {
      setError(t("Please select a module."));
      return;
    }
    if (!name.trim()) {
      setError(t("Company name is required."));
      return;
    }
    if (!email.trim()) {
      setError(t("Company email is required."));
      return;
    }

    setSaving(true);
    try {
      const settings: Record<string, string> = {
        companyWebsite: company_website,
        companyPhone: company_phone,
        companyAddress: street_address,
        companyAddress2: street_address_2,
        companyCity: city,
        companyState: state,
        companyZipCode: zip_code,
        defaultCurrency: default_currency,
        companyGstVat: company_gst_vat,
      };
      if (business_module_id.trim()) {
        settings.businessModuleId = business_module_id.trim();
      }

      const fd = new FormData();
      fd.append("status", status);
      fd.append("name", name.trim());
      fd.append("email", email.trim().toLowerCase());
      fd.append("mobile_no", mobile_no);
      fd.append("company_id", company_id);
      fd.append("language", language);
      fd.append("active_plan_id", active_plan_id);
      fd.append("settings", JSON.stringify(settings));
      if (logo) fd.append("logo", logo);

      const res = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        body: fd,
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.message || `Failed to save (${res.status}).`);
      }
      if (redirectOnSuccess) {
        router.push(`/companies/${companyId}`);
        router.refresh();
      } else {
        onSuccess?.();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">{t("Loading...")}</div>;

  return (
    <form onSubmit={save} className="space-y-6">
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
            <Label htmlFor="edit_active_plan_id">
              {t("Subscription plan")} <span className="text-destructive">*</span>
            </Label>
            <select
              id="edit_active_plan_id"
              required
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
              value={active_plan_id}
              onChange={(e) => setActivePlanId(e.target.value)}
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
            <Label htmlFor="edit_module_category_id">{t("Module category")}</Label>
            <select
              id="edit_module_category_id"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
              value={moduleCategoryId}
              onChange={(e) => {
                setModuleCategoryId(e.target.value);
                setBusinessModuleId("");
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
            <Label htmlFor="edit_business_module_id">{t("Sub-category")}</Label>
            <div className="flex gap-2">
              <select
                id="edit_business_module_id"
                className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                value={business_module_id}
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
              {company_id.trim()
                ? t("Module is optional when a Company ID already exists. Select a category and sub-category only to generate a new ID.")
                : t("Pick a category, then choose the module sub-category to generate Company ID.")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_company_id">{t("Company ID")}</Label>
            <Input
              id="edit_company_id"
              value={company_id}
              readOnly
              placeholder={generatingId ? t("Generating...") : "AA-0001-CO-26"}
              className="cursor-not-allowed bg-muted"
              aria-readonly="true"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_status">{t("Status")}</Label>
            <select
              id="edit_status"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
            >
              <option value="active">{t("Active")}</option>
              <option value="inactive">{t("Inactive")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_name">
              {t("Company Name")} <span className="text-destructive">*</span>
            </Label>
            <Input id="edit_name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_email">
              {t("Company Email")} <span className="text-destructive">*</span>
            </Label>
            <Input id="edit_email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_mobile_no">{t("Mobile No")}</Label>
            <Input
              id="edit_mobile_no"
              value={mobile_no}
              onChange={(e) => setMobile(formatPhone(e.target.value))}
              placeholder="(000) 000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_language">{t("Language")}</Label>
            <select
              id="edit_language"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
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
                <p className="mt-1 text-xs text-muted-foreground">{t("Upload company logo (JPG, PNG, GIF)")}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setLogo(f);
                  setLogoPreview(f ? URL.createObjectURL(f) : logoPreview);
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
          <CardDescription>{t("Stored in company settings (Laravel parity).")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit_company_website">{t("Company Website")}</Label>
            <Input
              id="edit_company_website"
              value={company_website}
              onChange={(e) => setWebsite(e.target.value)}
              onBlur={(e) => setWebsite(ensureHttps(e.target.value))}
              placeholder={t("example.com")}
            />
            <p className="text-xs text-muted-foreground">{t("https:// will be added automatically")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_company_phone">{t("Company Phone")}</Label>
            <Input
              id="edit_company_phone"
              value={company_phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder={t("(000) 000-0000")}
              maxLength={14}
            />
          </div>
          <div className="md:col-span-2">
            <h3 className="mb-3 border-b pb-2 text-sm font-semibold text-foreground">{t("Address")}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit_street_address">{t("Street Address")}</Label>
                <AddressAutocomplete
                  id="edit_street_address"
                  apiKey={appSettings?.settings?.googleMapsApiKey}
                  value={street_address}
                  onChange={setStreet}
                  onPlaceSelect={(addr) => {
                    setStreet(addr.street);
                    setCity(addr.city);
                    setState(addr.state);
                    setZip(addr.zip);
                  }}
                  placeholder={t("Start typing an address...")}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit_street_address_2">{t("Address 2")}</Label>
                <Input
                  id="edit_street_address_2"
                  value={street_address_2}
                  onChange={(e) => setStreet2(e.target.value)}
                  placeholder={t("Apt, suite, unit (optional)")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_city">{t("City")}</Label>
                <Input id="edit_city" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("City")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_state">{t("State")}</Label>
                <Input id="edit_state" value={state} onChange={(e) => setState(e.target.value)} placeholder={t("State")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_zip_code">{t("Zip Code")}</Label>
                <Input id="edit_zip_code" value={zip_code} onChange={(e) => setZip(e.target.value)} placeholder={t("Zip Code")} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_default_currency">{t("Default Currency")}</Label>
            <select
              id="edit_default_currency"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
              value={default_currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {DEFAULT_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_company_gst_vat">{t("GST/VAT Number")}</Label>
            <Input id="edit_company_gst_vat" value={company_gst_vat} onChange={(e) => setCompanyGstVat(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? t("Saving...") : t("Save changes")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (redirectOnSuccess) router.push(`/companies/${companyId}`);
            else onSuccess?.();
          }}
          disabled={saving}
        >
          {t("Cancel")}
        </Button>
      </div>
    </form>
  );
}
