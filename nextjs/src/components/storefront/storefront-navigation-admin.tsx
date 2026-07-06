"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { StorefrontNavigationEditor } from "@/components/storefront/storefront-navigation-editor";
import type { WebsiteRow } from "@/components/storefront/storefront-websites-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/lib/admin-t";


const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

export function StorefrontNavigationAdmin() {
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [navWebsiteId, setNavWebsiteId] = useState("");

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

  const loadWebsites = useCallback(async () => {
    if (!orgReady) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/websites"), { credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; data?: WebsiteRow[]; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      const rows = data.data ?? [];
      setWebsites(rows);
      setNavWebsiteId((prev) => (prev && rows.some((w) => w.id === prev) ? prev : rows[0]?.id || ""));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, orgReady]);

  useEffect(() => {
    void loadWebsites();
  }, [loadWebsites]);

  if (orgLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">{t("Loading…")}</span>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-8">
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      ) : null}

      <div className="mb-6 flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:flex-wrap sm:items-end">
        {orgCtx?.isSuperadmin ? (
          <div className="min-w-[200px] max-w-xs flex-1 space-y-2">
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
                setNavWebsiteId("");
                void loadWebsites();
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
        <div className="min-w-[200px] max-w-md flex-1 space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">{t("Website")}</Label>
          <Select value={navWebsiteId || undefined} onValueChange={setNavWebsiteId} disabled={websites.length === 0 || loading}>
            <SelectTrigger className="h-11 bg-background">
              <SelectValue placeholder={t("Select website")} />
            </SelectTrigger>
            <SelectContent>
              {websites.map((w) => (
                <SelectItem key={w.id} value={w.id} textValue={`${w.name} ${w.slug}`}>
                  <span className="font-medium">{w.name}</span>
                  <span className="text-muted-foreground"> · /{w.slug}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="menus" className="space-y-6">
        <TabsList className="h-10 w-full justify-start rounded-lg border bg-muted/40 p-1 sm:w-auto">
          <TabsTrigger value="menus" className="rounded-md px-4">
            {t("Menus")}
          </TabsTrigger>
          <TabsTrigger value="redirects" className="rounded-md px-4">
            {t("URL redirects")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menus" className="mt-0 space-y-4 focus-visible:outline-none">
          {!navWebsiteId ? (
            <Card className="border-dashed border-border/80 bg-muted/10 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{t("Choose a website")}</CardTitle>
                <CardDescription>
                  {t("Select the store you want to edit. Menus are saved per website.")}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <StorefrontNavigationEditor websiteId={navWebsiteId} buildApiUrl={buildApiUrl} />
          )}
        </TabsContent>

        <TabsContent value="redirects" className="mt-0 focus-visible:outline-none">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t("URL redirects")}</CardTitle>
              <CardDescription>
                {t(
                  "Shopify-style URL redirects let visitors land on the right page when old links change. This project does not expose redirects here yet — use your hosting or DNS provider, or we can add a redirects API next.",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("No redirects configured.")}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
