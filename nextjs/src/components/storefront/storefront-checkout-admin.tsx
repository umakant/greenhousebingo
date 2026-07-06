"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { t } from "@/lib/admin-t";

const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

type CheckoutForm = {
  sf_support_email: string;
  sf_customer_accounts_enabled: string;
  sf_checkout_brand_primary: string;
  sf_checkout_brand_accent: string;
};

const emptyForm = (): CheckoutForm => ({
  sf_support_email: "",
  sf_customer_accounts_enabled: "1",
  sf_checkout_brand_primary: "",
  sf_checkout_brand_accent: "",
});

export function StorefrontCheckoutAdmin() {
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState<CheckoutForm>(() => emptyForm());

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
        const json = (await res.json()) as OrgContext & { ok?: boolean; message?: string };
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

  const loadCheckoutSettings = useCallback(async () => {
    if (!orgReady) return;
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/checkout-settings"), { credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; data?: CheckoutForm; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      if (data.data) setForm({ ...emptyForm(), ...data.data });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, orgReady]);

  useEffect(() => {
    void loadCheckoutSettings();
  }, [loadCheckoutSettings]);

  const save = async () => {
    if (!orgReady) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/checkout-settings"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { ok?: boolean; data?: CheckoutForm; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      if (data.data) setForm({ ...emptyForm(), ...data.data });
      setStatus(t("Saved."));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const accountsOn = form.sf_customer_accounts_enabled === "1" || form.sf_customer_accounts_enabled === "true";

  const pickerPrimary = /^#[0-9A-Fa-f]{6}$/i.test(form.sf_checkout_brand_primary) ? form.sf_checkout_brand_primary : "#0f172a";
  const pickerAccent = /^#[0-9A-Fa-f]{6}$/i.test(form.sf_checkout_brand_accent) ? form.sf_checkout_brand_accent : "#2563eb";

  if (orgLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">{t("Loading…")}</span>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      ) : null}
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

      {orgCtx?.isSuperadmin ? (
        <div className="max-w-xs space-y-2 rounded-lg border border-border/80 bg-muted/30 p-4">
          <Label className="text-xs font-medium text-muted-foreground">{t("Company")}</Label>
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
              void loadCheckoutSettings();
            }}
          >
            <SelectTrigger className="h-11 bg-background">
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

      <div className="space-y-6">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20 py-4">
            <CardTitle className="text-base font-semibold">{t("Customer contact")}</CardTitle>
            <CardDescription>
              {t("Shown on receipts and checkout help text. Customers can reach you if something goes wrong with an order.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="sf-support-email">{t("Support email")}</Label>
              <Input
                id="sf-support-email"
                type="email"
                autoComplete="email"
                placeholder="support@example.com"
                value={form.sf_support_email}
                onChange={(e) => setForm((f) => ({ ...f, sf_support_email: e.target.value }))}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20 py-4">
            <CardTitle className="text-base font-semibold">{t("Customer accounts")}</CardTitle>
            <CardDescription>
              {t("Control whether shoppers can create a storefront login (Day 21+ customer auth).")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">{t("Allow customer accounts")}</p>
              <p className="text-sm text-muted-foreground">
                {t("When off, checkout stays guest-only until you enable accounts again.")}
              </p>
            </div>
            <Switch
              checked={accountsOn}
              onCheckedChange={(on) => setForm((f) => ({ ...f, sf_customer_accounts_enabled: on ? "1" : "0" }))}
              disabled={loading}
              aria-label={t("Allow customer accounts")}
            />
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20 py-4">
            <CardTitle className="text-base font-semibold">{t("Checkout branding")}</CardTitle>
            <CardDescription>
              {t("Accent colors for hosted checkout and payment UI. Leave blank to fall back to theme defaults.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sf-brand-primary">{t("Primary brand color")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="sf-brand-primary"
                    type="color"
                    className="h-10 w-14 cursor-pointer p-1"
                    value={pickerPrimary}
                    onChange={(e) => setForm((f) => ({ ...f, sf_checkout_brand_primary: e.target.value }))}
                    disabled={loading}
                  />
                  <Input
                    placeholder="#0f172a"
                    value={form.sf_checkout_brand_primary}
                    onChange={(e) => setForm((f) => ({ ...f, sf_checkout_brand_primary: e.target.value }))}
                    disabled={loading}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sf-brand-accent">{t("Accent color")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="sf-brand-accent"
                    type="color"
                    className="h-10 w-14 cursor-pointer p-1"
                    value={pickerAccent}
                    onChange={(e) => setForm((f) => ({ ...f, sf_checkout_brand_accent: e.target.value }))}
                    disabled={loading}
                  />
                  <Input
                    placeholder="#2563eb"
                    value={form.sf_checkout_brand_accent}
                    onChange={(e) => setForm((f) => ({ ...f, sf_checkout_brand_accent: e.target.value }))}
                    disabled={loading}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => void loadCheckoutSettings()} disabled={loading || saving}>
            {t("Discard")}
          </Button>
          <Button type="button" onClick={() => void save()} disabled={!orgReady || loading || saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("Save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
