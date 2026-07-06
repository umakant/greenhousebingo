"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import Link from "next/link";

import MediaPicker from "@/components/MediaPicker";
import { getImagePath } from "@/utils/image-path";
import { t } from "@/lib/admin-t";


function previewImgSrc(raw: string): string {
  const u = raw?.trim();
  if (!u) return "";
  if (u.startsWith("http")) return u;
  return getImagePath(u);
}

const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

type SettingsContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

type Props = {
  canEdit: boolean;
};

type LanguageOption = { code: string; name: string; countryCode: string };

type MerchantSettingsResponse = {
  ok?: boolean;
  data?: Record<string, string>;
  availableLanguages?: LanguageOption[];
  defaultCurrency?: string;
  message?: string;
};

function applyMerchantResponse(
  json: MerchantSettingsResponse,
  setData: (data: Record<string, string>) => void,
  setAvailableLanguages: (rows: LanguageOption[]) => void,
  setDefaultCurrency: (code: string) => void,
) {
  setData(json.data ?? {});
  setAvailableLanguages(json.availableLanguages ?? []);
  setDefaultCurrency((json.defaultCurrency ?? "USD").trim() || "USD");
}

function merchantSettingsUrl(organizationId: string | null, isSuperadmin: boolean): string {
  const base = "/api/storefront/merchant-settings";
  if (isSuperadmin && organizationId) {
    return `${base}?organizationId=${encodeURIComponent(organizationId)}`;
  }
  return base;
}

export function StorefrontSettingsSection({ canEdit }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, string>>({});
  const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState("USD");

  const [ctx, setCtx] = useState<SettingsContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    const res = await fetch("/api/storefront/settings-context", { credentials: "include" });
    const json = (await res.json()) as SettingsContext & { ok?: boolean; message?: string };
    if (!res.ok || !json.ok) {
      throw new Error(json.message ?? "Failed to load organization context");
    }
    return json as SettingsContext;
  }, []);

  const loadMerchant = useCallback(
    async (context: SettingsContext, orgId: string | null) => {
      const superadmin = context.isSuperadmin;
      if (superadmin && !orgId) {
        setData({});
        setAvailableLanguages([]);
        setDefaultCurrency("USD");
        return;
      }
      const res = await fetch(merchantSettingsUrl(orgId, superadmin), { credentials: "include" });
      const json = (await res.json()) as MerchantSettingsResponse;
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Failed to load");
      applyMerchantResponse(json, setData, setAvailableLanguages, setDefaultCurrency);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const c = await loadContext();
        if (cancelled) return;
        setCtx(c);

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
        }
        setSelectedOrgId(orgId);

        await loadMerchant(c, orgId);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadContext, loadMerchant]);

  const onOrgChange = (value: string) => {
    setSelectedOrgId(value);
    try {
      window.localStorage.setItem(ORG_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    if (!ctx) return;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        await loadMerchant(ctx, value);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  };

  const save = async () => {
    if (!canEdit) return;
    if (!ctx) return;
    if (ctx.isSuperadmin && !selectedOrgId) {
      setErr(t("Select an organization before saving."));
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(merchantSettingsUrl(selectedOrgId, ctx.isSuperadmin), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as MerchantSettingsResponse;
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Save failed");
      applyMerchantResponse(json, setData, setAvailableLanguages, setDefaultCurrency);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: string) => setData((d) => ({ ...d, [key]: value }));

  const showOrgPicker = ctx?.isSuperadmin && (ctx.organizations?.length ?? 0) > 0;
  const noCompanies = ctx?.isSuperadmin && (ctx.organizations?.length ?? 0) === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Storefront")}</CardTitle>
        <CardDescription>
          {t(
            "Configure your online store defaults for this organization. A safe subset of these values is used by the public /shop experience.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {err ? <p className="text-sm text-destructive">{err}</p> : null}

        {showOrgPicker ? (
          <div className="space-y-2">
            <Label htmlFor="sf-org">{t("Organization")}</Label>
            <Select value={selectedOrgId ?? ""} onValueChange={onOrgChange}>
              <SelectTrigger id="sf-org" className="max-w-md">
                <SelectValue placeholder={t("Select company")} />
              </SelectTrigger>
              <SelectContent>
                {ctx!.organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t(
                "Platform admins must choose which company’s storefront defaults to view or edit. Tenant users only see their own organization.",
              )}
            </p>
          </div>
        ) : null}

        {noCompanies ? (
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t("No company accounts exist yet. Create a company first, then configure storefront defaults for it.")}
          </p>
        ) : null}

        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : !noCompanies && (ctx?.isSuperadmin ? Boolean(selectedOrgId) : true) ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("Store name")}</Label>
                <Input
                  disabled={!canEdit}
                  value={data.sf_store_name ?? ""}
                  onChange={(e) => set("sf_store_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Support email")}</Label>
                <Input
                  disabled={!canEdit}
                  value={data.sf_support_email ?? ""}
                  onChange={(e) => set("sf_support_email", e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label>{t("Logo")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("Upload or pick from the media library. Used on your public storefront.")}
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex h-32 items-center justify-center rounded-md border bg-muted/30 p-4">
                    {(data.sf_logo_url ?? "").trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewImgSrc(data.sf_logo_url ?? "")}
                        alt=""
                        className="max-h-full max-w-full object-contain object-left"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                        <div className="flex h-12 w-28 items-center justify-center rounded-md border border-dashed text-xs font-medium">
                          {t("Logo")}
                        </div>
                        <span className="text-xs">{t("No logo selected")}</span>
                      </div>
                    )}
                  </div>
                  <MediaPicker
                    value={data.sf_logo_url ?? ""}
                    onChange={(url) =>
                      set(
                        "sf_logo_url",
                        Array.isArray(url) ? (url[0] ?? "").trim() : String(url ?? "").trim(),
                      )
                    }
                    placeholder={t("Select logo from media library…")}
                    showPreview={false}
                    disabled={!canEdit}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label>{t("Favicon")}</Label>
                <p className="text-xs text-muted-foreground">{t("Browser tab icon. Square PNG or ICO recommended.")}</p>
                <div className="flex flex-col gap-3">
                  <div className="flex h-32 items-center justify-center rounded-md border bg-muted/30 p-4">
                    {(data.sf_favicon_url ?? "").trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewImgSrc(data.sf_favicon_url ?? "")}
                        alt=""
                        className="h-14 w-14 rounded-md border object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed text-[10px] font-medium">
                          {t("Icon")}
                        </div>
                        <span className="text-xs">{t("No favicon selected")}</span>
                      </div>
                    )}
                  </div>
                  <MediaPicker
                    value={data.sf_favicon_url ?? ""}
                    onChange={(url) =>
                      set(
                        "sf_favicon_url",
                        Array.isArray(url) ? (url[0] ?? "").trim() : String(url ?? "").trim(),
                      )
                    }
                    placeholder={t("Select favicon from media library…")}
                    showPreview={false}
                    disabled={!canEdit}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("Default locale")}</Label>
                <Select
                  disabled={!canEdit}
                  value={data.sf_default_locale || availableLanguages[0]?.code || "en"}
                  onValueChange={(v) => set("sf_default_locale", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select language")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("Inherited from System Settings when not saved here.")}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t("Currency display")}</Label>
                <Select
                  disabled={!canEdit}
                  value={data.sf_currency_display || "symbol"}
                  onValueChange={(v) => set("sf_currency_display", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select display format")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="symbol">{t("Symbol ($)")}</SelectItem>
                    <SelectItem value="code">{t("Code (USD)")}</SelectItem>
                    <SelectItem value="narrow">{t("Narrow symbol")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("Catalog currency:")} {defaultCurrency}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("SEO default title")}</Label>
              <Input
                disabled={!canEdit}
                value={data.sf_seo_default_title ?? ""}
                onChange={(e) => set("sf_seo_default_title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("SEO default description")}</Label>
              <Textarea
                disabled={!canEdit}
                rows={3}
                value={data.sf_seo_default_description ?? ""}
                onChange={(e) => set("sf_seo_default_description", e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  disabled={!canEdit}
                  checked={(data.sf_customer_accounts_enabled ?? "1") === "1"}
                  onCheckedChange={(v) => set("sf_customer_accounts_enabled", v ? "1" : "0")}
                />
                <Label>{t("Customer accounts enabled")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  disabled={!canEdit}
                  checked={(data.sf_maintenance_mode ?? "0") === "1"}
                  onCheckedChange={(v) => set("sf_maintenance_mode", v ? "1" : "0")}
                />
                <Label>{t("Storefront maintenance mode")}</Label>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("Checkout brand primary (hex)")}</Label>
                <Input
                  disabled={!canEdit}
                  value={data.sf_checkout_brand_primary ?? ""}
                  onChange={(e) => set("sf_checkout_brand_primary", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Checkout brand accent (hex)")}</Label>
                <Input
                  disabled={!canEdit}
                  value={data.sf_checkout_brand_accent ?? ""}
                  onChange={(e) => set("sf_checkout_brand_accent", e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={!canEdit || saving} onClick={() => void save()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/storefront/overview">{t("Open Storefronts module")}</Link>
              </Button>
            </div>
          </>
        ) : !loading && !noCompanies && ctx?.isSuperadmin && !selectedOrgId ? (
          <p className="text-sm text-muted-foreground">{t("Select an organization to load settings.")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
