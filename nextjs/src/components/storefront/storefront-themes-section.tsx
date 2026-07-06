"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  LayoutTemplate,
  Loader2,
  MoreHorizontal,
  Pencil,
  PowerOff,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";


/** Same key as Storefront settings — superadmin company selection. */
const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

type WebsiteRow = { id: string; name: string; slug: string };

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

type ThemeTemplateRow = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status?: string | null;
  previewUrl?: string | null;
  metadata?: { packageFile?: string; kind?: string; vendor?: string } | null;
  createdAt?: string | null;
};

type ThemeRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  websiteId: string | null;
  sourceTemplateId: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  _count?: { versions: number };
  metadata?: { packageFile?: string } | null;
  /** True when this theme is the website’s published storefront theme (Website.metadata.activeThemeId). */
  isStorefrontLive?: boolean;
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function previewSrc(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  return url.startsWith("http") || url.startsWith("/") ? url : `/${url.replace(/^\//, "")}`;
}

function ThemePreviewImage({
  src,
  alt,
  ratioClass = "aspect-[16/10]",
  className,
}: {
  src: string | null | undefined;
  alt: string;
  ratioClass?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = previewSrc(src ?? null);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-muted ring-1 ring-border/60",
        ratioClass,
        className,
      )}
    >
      {resolved && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-950/25 via-muted to-sky-950/20">
          <div className="flex flex-col items-center gap-2 text-center">
            <LayoutTemplate className="h-10 w-10 text-muted-foreground/45" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {t("Preview")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Empty server response (${res.status}).`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Server returned invalid JSON (${res.status}). Sync the DB with: npx prisma db push (in the nextjs folder).`,
    );
  }
}

export function StorefrontThemesSection() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [orgLoading, setOrgLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [websiteId, setWebsiteId] = useState("");
  const [templates, setTemplates] = useState<ThemeTemplateRow[]>([]);
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [togglingTemplateId, setTogglingTemplateId] = useState<string | null>(null);
  const [themeMutatingId, setThemeMutatingId] = useState<string | null>(null);
  const [tokensOpen, setTokensOpen] = useState(false);

  const [themeDetailId, setThemeDetailId] = useState("");
  const [themeTokensJson, setThemeTokensJson] = useState("[]");
  const [themeVersionId, setThemeVersionId] = useState("");
  const [themeStatus, setThemeStatus] = useState<string | null>(null);

  const tokensAnchorRef = useRef<HTMLDivElement | null>(null);

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
    try {
      const res = await fetch(buildApiUrl("/api/storefront/websites"), { credentials: "same-origin" });
      const data = await readJsonResponse<{ ok?: boolean; data?: WebsiteRow[] }>(res);
      if (!res.ok || !data.ok) return;
      const rows = data.data ?? [];
      setWebsites(rows);
      setWebsiteId((prev) => prev || rows[0]?.id || "");
    } catch {
      /* ignore */
    }
  }, [buildApiUrl, orgReady]);

  const loadTemplates = useCallback(async () => {
    if (!orgReady) return;
    setError(null);
    try {
      const extra = orgCtx?.isSuperadmin ? { includeArchived: "1" } : undefined;
      const res = await fetch(buildApiUrl("/api/storefront/theme-templates", extra), {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await readJsonResponse<{ ok?: boolean; data?: ThemeTemplateRow[]; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed to load theme library");
      setTemplates(data.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, [buildApiUrl, orgCtx?.isSuperadmin, orgReady]);

  const loadThemes = useCallback(async () => {
    if (!orgReady) return;
    setLoading(true);
    setError(null);
    try {
      const wid = websiteId.trim();
      const extra: Record<string, string | undefined> = {};
      if (wid) extra.websiteId = wid;
      const res = await fetch(buildApiUrl("/api/storefront/themes", extra), {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await readJsonResponse<{ ok?: boolean; data?: ThemeRow[]; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed to load themes");
      setThemes(data.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, orgReady, websiteId]);

  useEffect(() => {
    if (orgLoading || !orgCtx) return;
    if (orgCtx.isSuperadmin && !selectedOrgId) {
      setError(t("Select a company to load storefront data (superadmin)."));
      setListLoading(false);
      setTemplates([]);
      setWebsites([]);
      return;
    }
    void (async () => {
      setListLoading(true);
      setError(null);
      await loadWebsites();
      await loadTemplates();
      setListLoading(false);
    })();
  }, [orgLoading, orgCtx, selectedOrgId, loadWebsites, loadTemplates]);

  useEffect(() => {
    void loadThemes();
  }, [loadThemes]);

  const templateById = useMemo(() => {
    const m = new Map<string, ThemeTemplateRow>();
    for (const x of templates) m.set(x.id, x);
    return m;
  }, [templates]);

  const themesKnowStorefrontLive = useMemo(
    () => themes.some((x) => typeof x.isStorefrontLive === "boolean"),
    [themes],
  );
  const storefrontLiveThemes = useMemo(() => {
    if (themesKnowStorefrontLive) return themes.filter((x) => x.isStorefrontLive === true);
    return themes.filter((x) => x.status === "active");
  }, [themes, themesKnowStorefrontLive]);
  const otherInstalledThemes = useMemo(() => {
    if (themesKnowStorefrontLive) return themes.filter((x) => x.isStorefrontLive !== true);
    return themes.filter((x) => x.status !== "active");
  }, [themes, themesKnowStorefrontLive]);

  const websiteLabel = useCallback(
    (id: string | null | undefined) => {
      if (!id) return null;
      const w = websites.find((x) => x.id === id);
      return w ? `${w.name} · ${w.slug}` : null;
    },
    [websites],
  );

  const setTemplateMarketplaceStatus = async (templateId: string, status: "active" | "archived") => {
    if (!orgCtx?.isSuperadmin || !orgReady) return;
    setTogglingTemplateId(templateId);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/theme-templates/${encodeURIComponent(templateId)}`), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await readJsonResponse<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Update failed");
      await loadTemplates();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setTogglingTemplateId(null);
    }
  };

  const installTemplate = async (templateId: string) => {
    setInstallingId(templateId);
    setError(null);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/themes"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceTemplateId: templateId,
          websiteId: websiteId.trim() || websites[0]?.id || null,
        }),
      });
      const data = await readJsonResponse<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Install failed");
      await loadThemes();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setInstallingId(null);
    }
  };

  const loadThemeDetail = async (id?: string) => {
    const tid = (id ?? themeDetailId).trim();
    if (!tid) return;
    setThemeDetailId(tid);
    setLoading(true);
    setThemeStatus(null);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/themes/${encodeURIComponent(tid)}`), {
        credentials: "same-origin",
      });
      const data = await readJsonResponse<{
        ok?: boolean;
        data?: {
          versions?: Array<{
            id: string;
            styleTokens?: Array<{ tokenKey: string; value: string; groupName?: string | null }>;
          }>;
        };
        message?: string;
      }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      const v = data.data?.versions?.[0];
      if (v?.id) {
        setThemeVersionId(v.id);
        setThemeTokensJson(JSON.stringify(v.styleTokens ?? [], null, 2));
        setThemeStatus(t("Loaded latest theme version tokens."));
      } else {
        setThemeVersionId("");
        setThemeTokensJson("[]");
        setThemeStatus(t("Theme has no versions yet."));
      }
      setTokensOpen(true);
      tokensAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const saveThemeTokens = async () => {
    if (!themeDetailId.trim() || !themeVersionId) return;
    setLoading(true);
    setThemeStatus(null);
    setError(null);
    try {
      const tokens = JSON.parse(themeTokensJson) as unknown;
      if (!Array.isArray(tokens)) throw new Error("Tokens JSON must be an array.");
      const res = await fetch(buildApiUrl(`/api/storefront/themes/${encodeURIComponent(themeDetailId.trim())}`), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ themeVersionId, tokens }),
      });
      const data = await readJsonResponse<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setThemeStatus(t("Theme tokens saved."));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid JSON or save failed");
    } finally {
      setLoading(false);
    }
  };

  const openThemeEditor = useCallback(
    (th: ThemeRow) => {
      const wid = (websiteId.trim() || th.websiteId || "").trim();
      const q = new URLSearchParams();
      q.set("themeId", th.id);
      if (wid) q.set("websiteId", wid);
      if (orgCtx?.isSuperadmin && selectedOrgId) q.set("organizationId", selectedOrgId);
      router.push(`/storefront/themes/customize?${q.toString()}`);
    },
    [orgCtx?.isSuperadmin, router, selectedOrgId, websiteId],
  );

  const disableStorefrontTheme = async (themeId: string) => {
    setThemeMutatingId(themeId);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/themes/${encodeURIComponent(themeId)}`), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "disable" }),
      });
      const data = await readJsonResponse<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Disable failed");
      if (themeDetailId.trim() === themeId) {
        setThemeDetailId("");
        setThemeVersionId("");
        setThemeTokensJson("[]");
      }
      await loadThemes();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setThemeMutatingId(null);
    }
  };

  const deleteStorefrontTheme = async (themeId: string) => {
    if (
      !window.confirm(
        t(
          "Permanently delete this theme and all versions? Any website using it will have no live theme until you publish another. This cannot be undone.",
        ),
      )
    ) {
      return;
    }
    setThemeMutatingId(themeId);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/themes/${encodeURIComponent(themeId)}`), {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await readJsonResponse<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Delete failed");
      if (themeDetailId.trim() === themeId) {
        setThemeDetailId("");
        setThemeVersionId("");
        setThemeTokensJson("[]");
      }
      await loadThemes();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setThemeMutatingId(null);
    }
  };

  const publishTheme = async (themeId: string) => {
    setPublishingId(themeId);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/themes/${encodeURIComponent(themeId)}`), {
        credentials: "same-origin",
      });
      const data = await readJsonResponse<{
        ok?: boolean;
        data?: { versions?: Array<{ id: string }> };
        message?: string;
      }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed to load theme");
      const vid = data.data?.versions?.[0]?.id;
      if (!vid) throw new Error("No theme version to publish.");
      const themeRow = themes.find((x) => x.id === themeId);
      const resolvedWebsiteId =
        websiteId.trim() || (themeRow?.websiteId ?? "").trim() || (websites[0]?.id ?? "").trim() || null;
      const act = await fetch(buildApiUrl("/api/storefront/themes/activate"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          themeId,
          themeVersionId: vid,
          websiteId: resolvedWebsiteId,
        }),
      });
      const aj = await readJsonResponse<{ ok?: boolean; message?: string }>(act);
      if (!act.ok || !aj.ok) throw new Error(aj.message ?? "Publish failed");
      await loadThemes();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setPublishingId(null);
    }
  };

  const onSuperadminOrgChange = (value: string) => {
    setSelectedOrgId(value);
    try {
      window.localStorage.setItem(ORG_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  };

  const showLoadingShell = (listLoading || orgLoading) && templates.length === 0;

  return (
    <div className="w-full min-w-0 space-y-10">
      <div className="rounded-lg border border-border/80 bg-muted/30 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          {orgCtx?.isSuperadmin ? (
            <div className="min-w-[200px] max-w-xs space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{t("Company")}</Label>
              <Select
                value={selectedOrgId ?? "__none__"}
                onValueChange={(v) => {
                  if (v === "__none__") {
                    onSuperadminOrgChange("");
                    return;
                  }
                  onSuperadminOrgChange(v);
                }}
              >
                <SelectTrigger className="h-11 bg-background">
                  <SelectValue placeholder={t("Select company")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("Select company…")}</SelectItem>
                  {orgCtx.organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{t("Superadmin: pick a tenant to manage storefront themes and data.")}</p>
            </div>
          ) : null}
          <div className="min-w-[200px] max-w-md flex-1 space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">{t("Website scope")}</Label>
            <Select value={websiteId || "__none__"} onValueChange={(v) => setWebsiteId(v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-11 bg-background">
                <SelectValue placeholder={t("All websites / optional")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("All websites")}</SelectItem>
                {websites.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({w.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      {/* Your themes — current + drafts */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">{t("Your themes")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Themes installed for this organization. The live theme is what customers see when published.")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={() => void loadThemes()}
            disabled={loading || !orgReady}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t("Refresh")}
          </Button>
        </div>

        {showLoadingShell ? (
          <div className="flex min-h-[200px] items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("Loading themes…")}</span>
          </div>
        ) : themes.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/10 px-6 py-16 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-4 text-sm font-medium">{t("No themes in your library yet")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("Add a theme from the Theme library below to get started.")}</p>
          </div>
        ) : (
          <>
            {storefrontLiveThemes.length > 0 ? (
              <div className="space-y-4">
                <div className="w-full min-w-0">
                  {storefrontLiveThemes.map((th) => {
                    const tmpl = th.sourceTemplateId ? templateById.get(th.sourceTemplateId) : undefined;
                    const src = tmpl?.previewUrl ?? null;
                    const pkg = (th.metadata as { packageFile?: string } | undefined)?.packageFile ?? tmpl?.metadata?.packageFile;
                    const wl = websiteLabel(th.websiteId);
                    return (
                      <div
                        key={th.id}
                        className="group overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-border/40 transition-shadow hover:shadow-md"
                      >
                        <p className="border-b bg-muted/30 px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {t("Current theme")}
                        </p>
                        <div className="grid gap-0 md:grid-cols-[1.25fr_1fr] md:items-stretch">
                          <div className="relative min-h-[220px] border-b md:min-h-[300px] md:border-b-0 md:border-r">
                            <ThemePreviewImage
                              src={src}
                              alt=""
                              ratioClass="aspect-[16/10] min-h-[220px] rounded-none md:absolute md:inset-0 md:h-full md:w-full md:min-h-0 md:aspect-auto"
                            />
                            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
                              <Badge className="border-0 bg-emerald-600 text-white shadow-sm">{t("Live")}</Badge>
                              {wl ? (
                                <Badge variant="secondary" className="pointer-events-auto bg-background/95 text-xs shadow-sm backdrop-blur">
                                  {wl}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-col justify-between gap-6 p-5 sm:p-6">
                            <div className="space-y-3">
                              <div>
                                <h4 className="text-xl font-semibold tracking-tight">{th.name}</h4>
                                <p className="mt-1 font-mono text-xs text-muted-foreground">{th.slug}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {t("Last saved")} {formatWhen(th.updatedAt ?? th.createdAt)}
                                {th._count?.versions != null
                                  ? ` · ${th._count.versions} ${th._count.versions === 1 ? t("version") : t("versions")}`
                                  : null}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                              <Button
                                type="button"
                                size="default"
                                className="w-full gap-2 sm:w-auto sm:min-w-[160px]"
                                onClick={() => openThemeEditor(th)}
                              >
                                <Pencil className="h-4 w-4" />
                                {t("Customize")}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="w-full sm:w-auto"
                                disabled={publishingId === th.id || loading}
                                onClick={() => void publishTheme(th.id)}
                              >
                                {publishingId === th.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Republish")}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto">
                                    {t("Actions")}
                                    <MoreHorizontal className="h-4 w-4 opacity-70" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  {pkg ? (
                                    <DropdownMenuItem asChild>
                                      <a href={pkg.startsWith("/") ? pkg : `/${pkg}`} download className="cursor-pointer">
                                        <Download className="mr-2 h-4 w-4" />
                                        {t("Download ZIP")}
                                      </a>
                                    </DropdownMenuItem>
                                  ) : null}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openThemeEditor(th)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {t("Open theme editor")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => void loadThemeDetail(th.id)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {t("Edit raw tokens (JSON)")}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => void disableStorefrontTheme(th.id)}
                                    disabled={themeMutatingId === th.id || loading}
                                  >
                                    <PowerOff className="mr-2 h-4 w-4" />
                                    {t("Disable theme")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => void deleteStorefrontTheme(th.id)}
                                    disabled={themeMutatingId === th.id || loading}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t("Delete theme")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-5 py-4 text-sm text-amber-950 dark:text-amber-100">
                {t("No live theme yet. Publish a draft theme below, or install one from the Theme library.")}
              </div>
            )}

            {otherInstalledThemes.length > 0 ? (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("Other installed themes")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("Drafts and themes that are no longer the published live theme for their website.")}
                </p>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {otherInstalledThemes.map((th) => {
                    const tmpl = th.sourceTemplateId ? templateById.get(th.sourceTemplateId) : undefined;
                    const src = tmpl?.previewUrl ?? null;
                    const pkg = (th.metadata as { packageFile?: string } | undefined)?.packageFile ?? tmpl?.metadata?.packageFile;
                    const wl = websiteLabel(th.websiteId);
                    return (
                      <div
                        key={th.id}
                        className="flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md"
                      >
                        <ThemePreviewImage src={src} alt="" ratioClass="aspect-[5/3]" className="rounded-none rounded-t-2xl" />
                        <div className="flex flex-1 flex-col gap-3 p-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="truncate font-semibold leading-tight">{th.name}</h4>
                              {th.status === "active" && themesKnowStorefrontLive && th.isStorefrontLive !== true ? (
                                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                                  {t("Not storefront live")}
                                </Badge>
                              ) : th.status !== "active" ? (
                                <Badge variant="secondary" className="text-[10px] font-normal">
                                  {t("Draft")}
                                </Badge>
                              ) : null}
                            </div>
                            {wl ? <p className="mt-1 truncate text-xs text-muted-foreground">{wl}</p> : null}
                            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{th.slug}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" className="flex-1 rounded-full sm:flex-none" onClick={() => void publishTheme(th.id)} disabled={publishingId === th.id || loading}>
                              {publishingId === th.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Publish")}
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => openThemeEditor(th)}>
                              {t("Customize")}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="rounded-full px-2.5">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {pkg ? (
                                  <DropdownMenuItem asChild>
                                    <a href={pkg.startsWith("/") ? pkg : `/${pkg}`} download className="cursor-pointer">
                                      <Download className="mr-2 h-4 w-4" />
                                      {t("Download ZIP")}
                                    </a>
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem onClick={() => openThemeEditor(th)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  {t("Open theme editor")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void loadThemeDetail(th.id)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  {t("Edit raw tokens (JSON)")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => void disableStorefrontTheme(th.id)}
                                  disabled={themeMutatingId === th.id || loading}
                                >
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  {t("Disable theme")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => void deleteStorefrontTheme(th.id)}
                                  disabled={themeMutatingId === th.id || loading}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t("Delete theme")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* Theme library */}
      <section className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{t("Theme library")}</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("Browse and install themes into your library. Shopify-compatible ZIPs are available for developers when a package is attached.")}
          </p>
        </div>

        {showLoadingShell ? (
          <div className="flex min-h-[160px] items-center justify-center gap-3 rounded-2xl border border-dashed">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
            {t("No theme presets available for this store.")}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((tm) => {
              const src = tm.previewUrl ?? null;
              const pkg = tm.metadata?.packageFile;
              const isArchived = (tm.status ?? "active").toLowerCase() === "archived";
              if (isArchived && !orgCtx?.isSuperadmin) return null;

              return (
                <div
                  key={tm.id}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                    isArchived ? "border-dashed opacity-80" : "border-border/80",
                  )}
                >
                  <div className="relative overflow-hidden">
                    <ThemePreviewImage src={src} alt="" ratioClass="aspect-[5/3]" className="rounded-none rounded-t-2xl" />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-background/90 text-[10px] backdrop-blur">
                        {t("Marketplace")}
                      </Badge>
                      {isArchived ? (
                        <Badge variant="outline" className="bg-background/80 text-[10px] text-muted-foreground">
                          {t("Disabled")}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="font-semibold leading-snug">{tm.name}</h4>
                      <p className="line-clamp-3 text-sm text-muted-foreground">{tm.description ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {tm.metadata?.vendor ? `${tm.metadata.vendor} · ` : null}
                        {formatWhen(tm.createdAt ?? null)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
                      {orgCtx?.isSuperadmin ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-full text-xs sm:flex-none"
                          disabled={!!togglingTemplateId}
                          onClick={() => void setTemplateMarketplaceStatus(tm.id, isArchived ? "active" : "archived")}
                        >
                          {togglingTemplateId === tm.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isArchived ? (
                            t("Enable")
                          ) : (
                            t("Disable")
                          )}
                        </Button>
                      ) : null}
                      {pkg ? (
                        <Button variant="outline" size="sm" className="rounded-full text-xs" asChild>
                          <a href={pkg.startsWith("/") ? pkg : `/${pkg}`} download className="inline-flex items-center gap-1.5">
                            <Download className="h-3.5 w-3.5" />
                            {t("ZIP")}
                          </a>
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        className="ml-auto rounded-full"
                        disabled={!!installingId || loading || isArchived}
                        onClick={() => void installTemplate(tm.id)}
                      >
                        {installingId === tm.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Add")}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Advanced: tokens */}
      <div ref={tokensAnchorRef}>
        <Collapsible open={tokensOpen} onOpenChange={setTokensOpen}>
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 border-b bg-muted/30 px-6 py-4 text-left transition-colors hover:bg-muted/40"
              >
                <div>
                  <CardTitle className="text-base">{t("Theme settings & tokens")}</CardTitle>
                  <CardDescription className="mt-1">
                    {t("Advanced: edit design tokens for the selected theme version.")}
                  </CardDescription>
                </div>
                <span className="text-xs font-medium text-muted-foreground">{tokensOpen ? t("Hide") : t("Show")}</span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-6">
                {themeStatus ? <p className="text-sm text-muted-foreground">{themeStatus}</p> : null}
                <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
                  <div className="space-y-2">
                    <Label>{t("Theme id")}</Label>
                    <Input
                      value={themeDetailId}
                      onChange={(e) => setThemeDetailId(e.target.value)}
                      placeholder={t("From your themes above")}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => void loadThemeDetail()}
                      disabled={loading || !themeDetailId.trim()}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Load tokens")}
                    </Button>
                  </div>
                </div>
                {themeVersionId ? (
                  <p className="text-xs text-muted-foreground">
                    {t("Theme version id")} <code className="rounded bg-muted px-1">{themeVersionId}</code>
                  </p>
                ) : null}
                <div className="space-y-2">
                  <Label>{t("Style tokens JSON")}</Label>
                  <Textarea
                    rows={12}
                    className="font-mono text-xs"
                    value={themeTokensJson}
                    onChange={(e) => setThemeTokensJson(e.target.value)}
                    spellCheck={false}
                  />
                </div>
                <Button type="button" className="rounded-full" onClick={() => void saveThemeTokens()} disabled={loading || !themeDetailId.trim() || !themeVersionId}>
                  {t("Save tokens")}
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}
