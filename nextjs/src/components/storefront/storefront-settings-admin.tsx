"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CreditCard,
  Globe,
  Loader2,
  Palette,
  Save,
  Search,
  Settings as SettingsIcon,
  Shield,
  ShoppingBag,
  Tags,
} from "lucide-react";

import MediaPicker from "@/components/MediaPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  STOREFRONT_MERCHANT_SETTINGS_DEFAULTS,
  type StorefrontMerchantSettingKey,
} from "@/lib/storefront/storefront-settings-keys";
import { cn } from "@/lib/utils";
import { getImagePath } from "@/utils/image-path";
import { t } from "@/lib/admin-t";

const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

type MerchantForm = Record<StorefrontMerchantSettingKey, string>;

type SettingsTab = "store" | "brand" | "seo" | "payments" | "advanced";

function defaultForm(): MerchantForm {
  return { ...STOREFRONT_MERCHANT_SETTINGS_DEFAULTS };
}

async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Empty response (HTTP ${res.status}).`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.length > 160 ? `${text.slice(0, 160)}…` : text;
    throw new Error(res.ok ? `Invalid JSON: ${preview}` : `HTTP ${res.status}: ${preview}`);
  }
}

const KEYS_STORE: StorefrontMerchantSettingKey[] = [
  "sf_store_name",
  "sf_site_tagline",
  "sf_display_site_title_tagline",
  "sf_support_email",
  "sf_default_locale",
  "sf_currency_display",
];
const KEYS_BRAND: StorefrontMerchantSettingKey[] = [
  "sf_logo_url",
  "sf_favicon_url",
  "sf_checkout_brand_primary",
  "sf_checkout_brand_accent",
];
const KEYS_SEO: StorefrontMerchantSettingKey[] = ["sf_seo_default_title", "sf_seo_default_description"];
const KEYS_PAYMENTS: StorefrontMerchantSettingKey[] = [
  "sf_stripe_enabled",
  "sf_stripe_mode",
  "sf_stripe_publishable_key_sandbox",
  "sf_stripe_secret_key_sandbox",
  "sf_stripe_publishable_key_live",
  "sf_stripe_secret_key_live",
  "sf_paypal_enabled",
  "sf_paypal_mode",
  "sf_paypal_client_id_sandbox",
  "sf_paypal_client_secret_sandbox",
  "sf_paypal_client_id_live",
  "sf_paypal_client_secret_live",
];
const KEYS_PREFS: StorefrontMerchantSettingKey[] = ["sf_maintenance_mode", "sf_customer_accounts_enabled"];

const KEYS_ALL: StorefrontMerchantSettingKey[] = [...KEYS_STORE, ...KEYS_BRAND, ...KEYS_SEO, ...KEYS_PAYMENTS, ...KEYS_PREFS];

function previewImgSrc(raw: string): string {
  const u = raw?.trim();
  if (!u) return "";
  if (u.startsWith("http")) return u;
  return getImagePath(u);
}

export function StorefrontSettingsAdmin() {
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [form, setForm] = useState<MerchantForm>(() => defaultForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("store");

  const [mediaTagsOpen, setMediaTagsOpen] = useState(false);
  const [mediaTagsList, setMediaTagsList] = useState<string[]>([]);

  const buildApiUrl = useCallback(
    (pathname: string, extraSearch?: Record<string, string | undefined>) => {
      const u = new URL(pathname, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      if (orgCtx?.isSuperadmin && selectedOrgId) {
        u.searchParams.set("organizationId", selectedOrgId);
      }
      if (extraSearch) {
        for (const [k, v] of Object.entries(extraSearch)) {
          if (v != null && v !== "") u.searchParams.set(k, v);
        }
      }
      return u.pathname + u.search;
    },
    [orgCtx?.isSuperadmin, selectedOrgId],
  );

  const orgReady = orgCtx != null && (!orgCtx.isSuperadmin || !!selectedOrgId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setOrgLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/storefront/organization-context", { credentials: "include" });
        const json = await readJsonResponse<OrgContext & { ok?: boolean; message?: string }>(res);
        if (!res.ok || !json.ok) throw new Error(json.message ?? "Failed to load organization context");
        if (cancelled) return;
        const c: OrgContext = {
          isSuperadmin: json.isSuperadmin,
          organizations: json.organizations ?? [],
          defaultOrganizationId: json.defaultOrganizationId ?? null,
        };
        setOrgCtx(c);
        let orgId: string | null = null;
        if (c.isSuperadmin) {
          const stored = typeof window !== "undefined" ? window.localStorage.getItem(ORG_STORAGE_KEY) : null;
          const ids = new Set(c.organizations.map((o) => o.id));
          if (stored && ids.has(stored)) orgId = stored;
          else orgId = c.defaultOrganizationId;
          if (orgId) {
            try {
              window.localStorage.setItem(ORG_STORAGE_KEY, orgId);
            } catch {
              /* ignore */
            }
          }
        } else {
          orgId = c.defaultOrganizationId;
        }
        setSelectedOrgId(orgId);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMerchant = useCallback(async () => {
    if (!orgReady) {
      setLoading(false);
      setForm(defaultForm());
      return;
    }
    setLoading(true);
    setError(null);
    setToast(null);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/merchant-settings"), { credentials: "same-origin" });
      const data = await readJsonResponse<{ ok?: boolean; data?: Partial<MerchantForm>; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setForm({ ...defaultForm(), ...(data.data ?? {}) });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setForm(defaultForm());
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, orgReady]);

  useEffect(() => {
    void loadMerchant();
  }, [loadMerchant]);

  const saveAll = async () => {
    if (!orgReady) return;
    setSaving(true);
    setError(null);
    setToast(null);
    try {
      const body: Record<string, string> = {};
      for (const k of KEYS_ALL) {
        body[k] = form[k] ?? "";
      }
      const res = await fetch(buildApiUrl("/api/storefront/merchant-settings"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJsonResponse<{ ok?: boolean; data?: Partial<MerchantForm>; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setForm((prev) => ({ ...prev, ...(data.data ?? {}) }));
      setToast(t("Saved"));
      window.setTimeout(() => setToast(null), 2500);
      window.dispatchEvent(new Event("pf:storefront-brand-updated"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const loadMediaTags = async () => {
    try {
      const res = await fetch(buildApiUrl("/api/storefront/media-tags"), { credentials: "same-origin" });
      const data = await readJsonResponse<{ ok?: boolean; data?: { tags?: string[] } }>(res);
      if (res.ok && data.ok && data.data?.tags) setMediaTagsList(data.data.tags);
      else setMediaTagsList([]);
    } catch {
      setMediaTagsList([]);
    }
  };

  const patch = (key: StorefrontMerchantSettingKey, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const tabMeta: Record<SettingsTab, { title: string; description: string }> = {
    store: {
      title: t("Store details"),
      description: t("Name, customer-facing contact, language, and how prices show."),
    },
    brand: {
      title: t("Brand"),
      description: t("Logo, favicon, and checkout accent colors."),
    },
    seo: {
      title: t("Search engine listing"),
      description: t("Default title and meta description when pages do not set their own."),
    },
    payments: {
      title: t("Payment gateways"),
      description: t("Stripe and PayPal. Sandbox and Live credentials stay on file; checkout uses the environment you select."),
    },
    advanced: {
      title: t("Advanced"),
      description: t("Maintenance mode, customer accounts, and storefront media tags."),
    },
  };

  if (orgLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">{t("Loading…")}</span>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      ) : null}
      {toast ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {toast}
        </div>
      ) : null}

      <Card className="overflow-hidden border-border/80 shadow-md">
        <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex gap-3">
            <Globe className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight">{t("Storefront settings")}</CardTitle>
              <CardDescription className="mt-1 text-sm leading-relaxed">
                {t(
                  "Customize your storefront identity, branding, SEO, payments (Stripe, PayPal), and availability.",
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:max-w-md sm:flex-row sm:flex-wrap sm:justify-end">
            {orgCtx?.isSuperadmin ? (
              <div className="min-w-[160px] flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">{t("Company")}</Label>
                <Select
                  value={selectedOrgId ?? "__none__"}
                  onValueChange={(v) => {
                    if (v === "__none__") return;
                    setSelectedOrgId(v);
                    try {
                      window.localStorage.setItem(ORG_STORAGE_KEY, v);
                    } catch {
                      /* ignore */
                    }
                    void loadMerchant();
                  }}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder={t("Select company")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>
                      {t("Select company…")}
                    </SelectItem>
                    {orgCtx.organizations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <Button asChild variant="outline" size="sm" className={cn("gap-2", orgCtx?.isSuperadmin ? "h-10 shrink-0" : "h-10")}>
              <Link href="/settings">
                {t("Organization settings")}
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button type="button" size="sm" className="h-10 gap-2 shrink-0" disabled={!orgReady || saving} onClick={() => void saveAll()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? t("Saving…") : t("Save changes")}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col xl:flex-row xl:items-stretch">
            <aside
              className="shrink-0 border-b border-border/80 bg-muted/30 xl:w-[220px] xl:border-b-0 xl:border-r"
              aria-label={t("Settings sections")}
            >
              <nav className="flex gap-1 overflow-x-auto p-3 xl:flex-col xl:gap-0.5 xl:overflow-visible xl:p-3 xl:py-4">
                {(
                  [
                    ["store", t("Store"), ShoppingBag],
                    ["brand", t("Brand"), Palette],
                    ["seo", t("SEO"), Search],
                    ["payments", t("Payments"), CreditCard],
                    ["advanced", t("Advanced"), SettingsIcon],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <Button
                    key={id}
                    type="button"
                    variant={activeTab === id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab(id)}
                    disabled={!orgReady}
                    className={cn(
                      "h-10 shrink-0 justify-start gap-3 rounded-lg px-3 font-medium xl:w-full",
                      activeTab !== id && "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    {label}
                  </Button>
                ))}
              </nav>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col border-b border-border/80 xl:border-b-0">
              <div className="flex-1 p-4 sm:p-6 xl:p-8">
                {!loading || !orgReady ? (
                  <div className="mb-6 space-y-1 border-b border-border/60 pb-5">
                    <h2 className="text-lg font-semibold tracking-tight">{tabMeta[activeTab].title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{tabMeta[activeTab].description}</p>
                  </div>
                ) : null}

                <div className="space-y-6">
                {loading && orgReady ? (
                  <div className="flex justify-center py-16 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <>
                    {activeTab === "store" ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="sf_store_name">{t("Store name")}</Label>
                        <Input
                          id="sf_store_name"
                          value={form.sf_store_name}
                          onChange={(e) => patch("sf_store_name", e.target.value)}
                          disabled={!orgReady}
                          placeholder={t("My Paper Flight store")}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="sf_site_tagline">{t("Tagline")}</Label>
                        <Input
                          id="sf_site_tagline"
                          value={form.sf_site_tagline}
                          onChange={(e) => patch("sf_site_tagline", e.target.value)}
                          disabled={!orgReady}
                          placeholder={t("Optional — shown with your store name where the theme supports it")}
                        />
                      </div>
                      <div className="flex items-start gap-3 sm:col-span-2">
                        <Switch
                          id="sf_display_site_title_tagline"
                          checked={form.sf_display_site_title_tagline !== "0"}
                          onCheckedChange={(v) => patch("sf_display_site_title_tagline", v ? "1" : "0")}
                          disabled={!orgReady}
                        />
                        <div className="space-y-1">
                          <Label htmlFor="sf_display_site_title_tagline" className="text-sm font-medium">
                            {t("Display site title and tagline")}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {t("When off, the lightweight shop header can show only your logo (if set).")}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="sf_support_email">{t("Support email")}</Label>
                        <Input
                          id="sf_support_email"
                          type="email"
                          value={form.sf_support_email}
                          onChange={(e) => patch("sf_support_email", e.target.value)}
                          disabled={!orgReady}
                          placeholder="support@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("Default locale")}</Label>
                        <Select
                          value={form.sf_default_locale || "en"}
                          onValueChange={(v) => patch("sf_default_locale", v)}
                          disabled={!orgReady}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="de">Deutsch</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("Currency display")}</Label>
                        <Select
                          value={form.sf_currency_display || "symbol"}
                          onValueChange={(v) => patch("sf_currency_display", v)}
                          disabled={!orgReady}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="symbol">{t("Symbol ($)")}</SelectItem>
                            <SelectItem value="code">{t("Code (USD)")}</SelectItem>
                            <SelectItem value="narrow">{t("Narrow symbol")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeTab === "brand" ? (
                  <div className="space-y-8">
                    <div className="grid gap-8 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label>{t("Logo")}</Label>
                        <p className="text-xs text-muted-foreground">{t("Shown in Liquid themes and the lightweight shop chrome. Recommended: wide horizontal logo.")}</p>
                        <div className="flex flex-col gap-3">
                          <div className="flex h-32 items-center justify-center rounded-md border bg-muted/30 p-4">
                            {form.sf_logo_url.trim() ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={previewImgSrc(form.sf_logo_url)} alt="" className="max-h-full max-w-full object-contain object-left" />
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                                <div className="flex h-12 w-28 items-center justify-center rounded-md border border-dashed text-xs font-medium">{t("Logo")}</div>
                                <span className="text-xs">{t("No logo selected")}</span>
                              </div>
                            )}
                          </div>
                          <MediaPicker
                            value={form.sf_logo_url}
                            onChange={(url) =>
                              patch("sf_logo_url", Array.isArray(url) ? (url[0] ?? "").trim() : String(url ?? "").trim())
                            }
                            placeholder={t("Select logo from media library or paste URL")}
                            showPreview={false}
                            disabled={!orgReady}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>{t("Favicon")}</Label>
                        <p className="text-xs text-muted-foreground">{t("Browser tab icon. Square image, PNG or ICO.")}</p>
                        <div className="flex flex-col gap-3">
                          <div className="flex h-28 items-center justify-center rounded-md border bg-muted/30 p-4">
                            {form.sf_favicon_url.trim() ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={previewImgSrc(form.sf_favicon_url)}
                                alt=""
                                className="h-14 w-14 rounded-md border object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed text-[10px] font-medium">{t("Icon")}</div>
                                <span className="text-xs">{t("No favicon selected")}</span>
                              </div>
                            )}
                          </div>
                          <MediaPicker
                            value={form.sf_favicon_url}
                            onChange={(url) =>
                              patch("sf_favicon_url", Array.isArray(url) ? (url[0] ?? "").trim() : String(url ?? "").trim())
                            }
                            placeholder={t("Select favicon…")}
                            showPreview={false}
                            disabled={!orgReady}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="mb-4 flex items-center gap-2 text-base font-medium">
                        <Palette className="h-4 w-4 text-muted-foreground" aria-hidden />
                        {t("Checkout accent")}
                      </h3>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="sf_checkout_brand_primary">{t("Checkout primary")}</Label>
                          <div className="flex gap-2">
                            <Input
                              id="sf_checkout_brand_primary"
                              value={form.sf_checkout_brand_primary}
                              onChange={(e) => patch("sf_checkout_brand_primary", e.target.value)}
                              disabled={!orgReady}
                              placeholder="#0f172a"
                              className="font-mono"
                            />
                            <input
                              type="color"
                              aria-label={t("Checkout primary")}
                              className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background"
                              value={/^#[0-9A-Fa-f]{6}$/.test(form.sf_checkout_brand_primary) ? form.sf_checkout_brand_primary : "#000000"}
                              onChange={(e) => patch("sf_checkout_brand_primary", e.target.value)}
                              disabled={!orgReady}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sf_checkout_brand_accent">{t("Checkout accent")}</Label>
                          <div className="flex gap-2">
                            <Input
                              id="sf_checkout_brand_accent"
                              value={form.sf_checkout_brand_accent}
                              onChange={(e) => patch("sf_checkout_brand_accent", e.target.value)}
                              disabled={!orgReady}
                              placeholder="#6366f1"
                              className="font-mono"
                            />
                            <input
                              type="color"
                              aria-label={t("Checkout accent")}
                              className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background"
                              value={/^#[0-9A-Fa-f]{6}$/.test(form.sf_checkout_brand_accent) ? form.sf_checkout_brand_accent : "#6366f1"}
                              onChange={(e) => patch("sf_checkout_brand_accent", e.target.value)}
                              disabled={!orgReady}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeTab === "seo" ? (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="sf_seo_default_title">{t("Home title")}</Label>
                      <Input
                        id="sf_seo_default_title"
                        value={form.sf_seo_default_title}
                        onChange={(e) => patch("sf_seo_default_title", e.target.value)}
                        disabled={!orgReady}
                      />
                      <p className="text-xs text-muted-foreground">{t("Default page title when a page does not set its own.")}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sf_seo_default_description">{t("Meta description")}</Label>
                      <Textarea
                        id="sf_seo_default_description"
                        rows={5}
                        value={form.sf_seo_default_description}
                        onChange={(e) => patch("sf_seo_default_description", e.target.value)}
                        disabled={!orgReady}
                        className="min-h-[120px] resize-y"
                      />
                    </div>
                  </div>
                ) : null}

                {activeTab === "payments" ? (
                  <div className="space-y-8">
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/80">
                            <CreditCard className="h-5 w-5 text-primary" aria-hidden />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold leading-tight">{t("Stripe")}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">{t("Card payments via Stripe.")}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <Switch
                            id="sf_stripe_enabled"
                            checked={form.sf_stripe_enabled === "1"}
                            onCheckedChange={(v) => patch("sf_stripe_enabled", v ? "1" : "0")}
                            disabled={!orgReady}
                          />
                          <div className="space-y-1">
                            <Label htmlFor="sf_stripe_enabled" className="text-sm font-medium">
                              {t("Enable Stripe")}
                            </Label>
                            <p className="text-xs text-muted-foreground">{t("Offer card checkout when Stripe is wired on the server.")}</p>
                          </div>
                        </div>
                        <div className="space-y-2 sm:min-w-[220px]">
                          <Label className="text-sm font-medium">{t("Active environment")}</Label>
                          <RadioGroup
                            value={form.sf_stripe_mode === "live" ? "live" : "sandbox"}
                            onValueChange={(v) => patch("sf_stripe_mode", v)}
                            disabled={!orgReady}
                            className="flex flex-wrap gap-4"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="sandbox" id="sf_stripe_mode_sandbox" />
                              <Label htmlFor="sf_stripe_mode_sandbox" className="cursor-pointer font-normal">
                                {t("Sandbox")}
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="live" id="sf_stripe_mode_live" />
                              <Label htmlFor="sf_stripe_mode_live" className="cursor-pointer font-normal">
                                {t("Live")}
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                      <div className="mt-6 grid gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Sandbox keys")}</span>
                            <Separator className="flex-1" />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="sf_stripe_pk_sbx">{t("Publishable key")}</Label>
                              <Input
                                id="sf_stripe_pk_sbx"
                                name="sf_stripe_publishable_key_sandbox_x"
                                value={form.sf_stripe_publishable_key_sandbox}
                                onChange={(e) => patch("sf_stripe_publishable_key_sandbox", e.target.value)}
                                disabled={!orgReady}
                                placeholder="pk_test_…"
                                className="font-mono text-sm"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                                data-1p-ignore
                                data-lpignore="true"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sf_stripe_sk_sbx">{t("Secret key")}</Label>
                              <Input
                                id="sf_stripe_sk_sbx"
                                name="sf_stripe_secret_key_sandbox_x"
                                type="password"
                                value={form.sf_stripe_secret_key_sandbox}
                                onChange={(e) => patch("sf_stripe_secret_key_sandbox", e.target.value)}
                                disabled={!orgReady}
                                placeholder="sk_test_…"
                                className="font-mono text-sm"
                                autoComplete="new-password"
                                spellCheck={false}
                                data-1p-ignore
                                data-lpignore="true"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Live keys")}</span>
                            <Separator className="flex-1" />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="sf_stripe_pk_live">{t("Publishable key")}</Label>
                              <Input
                                id="sf_stripe_pk_live"
                                name="sf_stripe_publishable_key_live_x"
                                value={form.sf_stripe_publishable_key_live}
                                onChange={(e) => patch("sf_stripe_publishable_key_live", e.target.value)}
                                disabled={!orgReady}
                                placeholder="pk_live_…"
                                className="font-mono text-sm"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                                data-1p-ignore
                                data-lpignore="true"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sf_stripe_sk_live">{t("Secret key")}</Label>
                              <Input
                                id="sf_stripe_sk_live"
                                name="sf_stripe_secret_key_live_x"
                                type="password"
                                value={form.sf_stripe_secret_key_live}
                                onChange={(e) => patch("sf_stripe_secret_key_live", e.target.value)}
                                disabled={!orgReady}
                                placeholder="sk_live_…"
                                className="font-mono text-sm"
                                autoComplete="new-password"
                                spellCheck={false}
                                data-1p-ignore
                                data-lpignore="true"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-muted/20 p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/80">
                            <CreditCard className="h-5 w-5 text-primary" aria-hidden />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold leading-tight">{t("PayPal")}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">{t("Wallet and PayPal-hosted checkout.")}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <Switch
                            id="sf_paypal_enabled"
                            checked={form.sf_paypal_enabled === "1"}
                            onCheckedChange={(v) => patch("sf_paypal_enabled", v ? "1" : "0")}
                            disabled={!orgReady}
                          />
                          <div className="space-y-1">
                            <Label htmlFor="sf_paypal_enabled" className="text-sm font-medium">
                              {t("Enable PayPal")}
                            </Label>
                            <p className="text-xs text-muted-foreground">{t("Show PayPal when your server integration is configured.")}</p>
                          </div>
                        </div>
                        <div className="space-y-2 sm:min-w-[220px]">
                          <Label className="text-sm font-medium">{t("Active environment")}</Label>
                          <RadioGroup
                            value={form.sf_paypal_mode === "live" ? "live" : "sandbox"}
                            onValueChange={(v) => patch("sf_paypal_mode", v)}
                            disabled={!orgReady}
                            className="flex flex-wrap gap-4"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="sandbox" id="sf_paypal_mode_sandbox" />
                              <Label htmlFor="sf_paypal_mode_sandbox" className="cursor-pointer font-normal">
                                {t("Sandbox")}
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="live" id="sf_paypal_mode_live" />
                              <Label htmlFor="sf_paypal_mode_live" className="cursor-pointer font-normal">
                                {t("Live")}
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                      <div className="mt-6 grid gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Sandbox credentials")}</span>
                            <Separator className="flex-1" />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="sf_paypal_cid_sbx">{t("Client ID")}</Label>
                              <Input
                                id="sf_paypal_cid_sbx"
                                name="sf_paypal_client_id_sandbox_x"
                                value={form.sf_paypal_client_id_sandbox}
                                onChange={(e) => patch("sf_paypal_client_id_sandbox", e.target.value)}
                                disabled={!orgReady}
                                placeholder={t("Sandbox client ID")}
                                className="font-mono text-sm"
                                autoComplete="off"
                                spellCheck={false}
                                data-1p-ignore
                                data-lpignore="true"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sf_paypal_cs_sbx">{t("Client secret")}</Label>
                              <Input
                                id="sf_paypal_cs_sbx"
                                name="sf_paypal_client_secret_sandbox_x"
                                type="password"
                                value={form.sf_paypal_client_secret_sandbox}
                                onChange={(e) => patch("sf_paypal_client_secret_sandbox", e.target.value)}
                                disabled={!orgReady}
                                className="font-mono text-sm"
                                autoComplete="new-password"
                                spellCheck={false}
                                data-1p-ignore
                                data-lpignore="true"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Live credentials")}</span>
                            <Separator className="flex-1" />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="sf_paypal_cid_live">{t("Client ID")}</Label>
                              <Input
                                id="sf_paypal_cid_live"
                                name="sf_paypal_client_id_live_x"
                                value={form.sf_paypal_client_id_live}
                                onChange={(e) => patch("sf_paypal_client_id_live", e.target.value)}
                                disabled={!orgReady}
                                placeholder={t("Live client ID")}
                                className="font-mono text-sm"
                                autoComplete="off"
                                spellCheck={false}
                                data-1p-ignore
                                data-lpignore="true"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sf_paypal_cs_live">{t("Client secret")}</Label>
                              <Input
                                id="sf_paypal_cs_live"
                                name="sf_paypal_client_secret_live_x"
                                type="password"
                                value={form.sf_paypal_client_secret_live}
                                onChange={(e) => patch("sf_paypal_client_secret_live", e.target.value)}
                                disabled={!orgReady}
                                className="font-mono text-sm"
                                autoComplete="new-password"
                                spellCheck={false}
                                data-1p-ignore
                                data-lpignore="true"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeTab === "advanced" ? (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-base font-medium">
                        <Shield className="h-4 w-4 text-muted-foreground" aria-hidden />
                        {t("Store status & accounts")}
                      </h3>
                      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <Switch
                            id="sf_maintenance"
                            checked={form.sf_maintenance_mode === "1"}
                            onCheckedChange={(v) => patch("sf_maintenance_mode", v ? "1" : "0")}
                            disabled={!orgReady}
                          />
                          <div className="space-y-1">
                            <Label htmlFor="sf_maintenance" className="text-sm font-medium">
                              {t("Maintenance mode")}
                            </Label>
                            <p className="text-xs text-muted-foreground">{t("Visitors see a maintenance message instead of the catalog.")}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Switch
                            id="sf_accounts"
                            checked={form.sf_customer_accounts_enabled === "1"}
                            onCheckedChange={(v) => patch("sf_customer_accounts_enabled", v ? "1" : "0")}
                            disabled={!orgReady}
                          />
                          <div className="space-y-1">
                            <Label htmlFor="sf_accounts" className="text-sm font-medium">
                              {t("Customer accounts")}
                            </Label>
                            <p className="text-xs text-muted-foreground">{t("Allow shoppers to sign in on the storefront.")}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Tags className="h-4 w-4 text-muted-foreground" aria-hidden />
                        <Label className="text-base">{t("Media tags")}</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("Preset tags for grouping media used by themes and pages. Manage files from the media library.")}
                      </p>
                      <Dialog
                        open={mediaTagsOpen}
                        onOpenChange={(o) => {
                          setMediaTagsOpen(o);
                          if (o) void loadMediaTags();
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" className="gap-2">
                            <Tags className="h-4 w-4" />
                            {t("View storefront media tags")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>{t("Media grouping tags")}</DialogTitle>
                            <DialogDescription>{t("Use these strings when tagging uploads for storefront use.")}</DialogDescription>
                          </DialogHeader>
                          <ul className="max-h-[50vh] list-inside list-disc overflow-y-auto text-sm text-muted-foreground">
                            {mediaTagsList.length === 0 ? <li>{t("No tags returned.")}</li> : null}
                            {mediaTagsList.map((tag) => (
                              <li key={tag}>
                                <code className="text-foreground">{tag}</code>
                              </li>
                            ))}
                          </ul>
                          <Button asChild variant="secondary" size="sm" className="gap-2">
                            <Link href="/media-library">{t("Open media library")}</Link>
                          </Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ) : null}
                  </>
                )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
