"use client";

import { appConfirm } from "@/lib/app-confirm";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Code2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";


const DEFAULT_SECTIONS_JSON = `[
  {
    "sortOrder": 0,
    "instanceKey": "hero",
    "settings": { "heading": "Welcome" },
    "blocks": [
      { "sortOrder": 0, "data": { "body": "Edit sections and blocks as JSON." } }
    ]
  }
]`;

export type EditorSection = {
  sortOrder: number;
  instanceKey?: string | null;
  settings?: Record<string, unknown> | null;
  blocks: Array<{ sortOrder: number; data?: Record<string, unknown> | null }>;
};

type WebsiteRow = { id: string; name: string; slug: string };

const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

function parseDefaultSections(): EditorSection[] {
  try {
    const raw = JSON.parse(DEFAULT_SECTIONS_JSON) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw as EditorSection[];
  } catch {
    return [];
  }
}

function cloneSections(s: EditorSection[]): EditorSection[] {
  return JSON.parse(JSON.stringify(s)) as EditorSection[];
}

function normalizeLoadedSections(
  rows: Array<{
    sortOrder: number;
    instanceKey?: string | null;
    settings?: unknown;
    blocks: Array<{ sortOrder: number; data?: unknown }>;
  }>,
): EditorSection[] {
  return rows.map((s) => ({
    sortOrder: s.sortOrder,
    instanceKey: s.instanceKey ?? null,
    settings: (s.settings && typeof s.settings === "object" ? s.settings : {}) as Record<string, unknown>,
    blocks: s.blocks.map((b) => ({
      sortOrder: b.sortOrder,
      data: (b.data && typeof b.data === "object" ? b.data : {}) as Record<string, unknown>,
    })),
  }));
}

/** Lightweight draft preview (mirrors common hero + rich text blocks; not identical to public renderer). */
function DraftPagePreview({ sections }: { sections: EditorSection[] }) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 bg-background p-8 text-foreground">
      {sections.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">{t("Add a section to see a preview.")}</p>
      ) : (
        sections.map((sec, i) => {
          const settings = sec.settings ?? {};
          const heading =
            typeof settings.heading === "string"
              ? settings.heading
              : typeof settings.title === "string"
                ? settings.title
                : sec.instanceKey
                  ? String(sec.instanceKey)
                  : `${t("Section")} ${i + 1}`;
          const bodyBlock = sec.blocks?.[0];
          const body =
            bodyBlock?.data && typeof bodyBlock.data.body === "string"
              ? bodyBlock.data.body
              : bodyBlock?.data
                ? JSON.stringify(bodyBlock.data, null, 2)
                : "";
          return (
            <section key={`${sec.sortOrder}-${i}`} className="space-y-3 border-b border-border/60 pb-8 last:border-0">
              <Badge variant="outline" className="text-[10px] font-normal">
                {sec.instanceKey || t("section")}
              </Badge>
              <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>
              {body ? <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-muted-foreground">{body}</div> : null}
            </section>
          );
        })
      )}
    </div>
  );
}

export function StorefrontPagesAdmin() {
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [pageWebsiteId, setPageWebsiteId] = useState("");

  const [pages, setPages] = useState<{ id: string; slug: string; title: string; status: string }[]>([]);
  const [pageEditorId, setPageEditorId] = useState("");
  const [sections, setSections] = useState<EditorSection[]>(() => parseDefaultSections());
  const [draftVersionId, setDraftVersionId] = useState("");
  const [pageEditorStatus, setPageEditorStatus] = useState<string | null>(null);
  const [newPageSlug, setNewPageSlug] = useState("");
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageType, setNewPageType] = useState("standard");
  const [pageVersions, setPageVersions] = useState<
    { id: string; version: number; status: string; label: string | null; publishedAt: string | null }[]
  >([]);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [advancedJsonOpen, setAdvancedJsonOpen] = useState(false);
  const [sectionsJsonDraft, setSectionsJsonDraft] = useState("");

  const selectedPage = useMemo(() => pages.find((p) => p.id === pageEditorId), [pages, pageEditorId]);

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
      setPageWebsiteId((prev) => prev || rows[0]?.id || "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, orgReady]);

  const loadPages = useCallback(async () => {
    if (!pageWebsiteId || !orgReady) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        buildApiUrl("/api/storefront/pages", { websiteId: pageWebsiteId }),
        {
        credentials: "same-origin",
      },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        data?: { id: string; slug: string; title: string; status: string }[];
        message?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setPages(data.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, orgReady, pageWebsiteId]);

  useEffect(() => {
    void loadWebsites();
  }, [loadWebsites]);

  useEffect(() => {
    if (pageWebsiteId) void loadPages();
  }, [pageWebsiteId, loadPages]);

  const loadPageEditor = async (pageIdOverride?: string) => {
    if (!orgReady) return;
    const pid = (pageIdOverride ?? pageEditorId).trim();
    if (!pid) return;
    setLoading(true);
    setPageEditorStatus(null);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/pages/${encodeURIComponent(pid)}`), {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        data?: {
          draftVersion?: {
            id: string;
            sections: Array<{
              sortOrder: number;
              instanceKey?: string | null;
              settings?: unknown;
              blocks: Array<{ sortOrder: number; data?: unknown }>;
            }>;
          } | null;
        };
        message?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      const draft = data.data?.draftVersion;
      if (draft) {
        setDraftVersionId(draft.id);
        setSections(normalizeLoadedSections(draft.sections));
        setPageEditorStatus(t("Loaded draft version."));
      } else {
        setDraftVersionId("");
        setSections(parseDefaultSections());
        setPageEditorStatus(t("No draft yet — use “Prepare draft” to clone from the latest version."));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const ensurePageDraft = async () => {
    if (!pageEditorId.trim()) return;
    setLoading(true);
    setPageEditorStatus(null);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/pages/${encodeURIComponent(pageEditorId.trim())}/draft`), {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        data?: { draftVersion?: { id: string } };
        message?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      const id = data.data?.draftVersion?.id;
      if (id) setDraftVersionId(id);
      await loadPageEditor();
      setPageEditorStatus(t("Draft ready."));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const savePageDraft = async () => {
    if (!pageEditorId.trim() || !draftVersionId) return;
    setLoading(true);
    setPageEditorStatus(null);
    setError(null);
    try {
      const res = await fetch(`/api/storefront/pages/${encodeURIComponent(pageEditorId.trim())}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pageVersionId: draftVersionId, sections }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setPageEditorStatus(t("Draft saved."));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const publishPageDraft = async () => {
    if (!pageEditorId.trim() || !draftVersionId) return;
    if (!(await appConfirm(t("Publish this draft version to the live storefront?")))) return;
    setLoading(true);
    setPageEditorStatus(null);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/pages/${encodeURIComponent(pageEditorId.trim())}/publish`), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ versionId: draftVersionId }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setPageEditorStatus(t("Published. Open a new draft to keep editing."));
      setDraftVersionId("");
      await loadPages();
      await loadPageEditor();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const unpublishPageLive = async () => {
    if (!pageEditorId.trim()) return;
    if (!(await appConfirm(t("Unpublish this page?")))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/pages/${encodeURIComponent(pageEditorId.trim())}/unpublish`), {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setPageEditorStatus(t("Unpublished."));
      await loadPages();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const createPage = async () => {
    if (!orgReady || !pageWebsiteId.trim() || !newPageSlug.trim() || !newPageTitle.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/pages"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          websiteId: pageWebsiteId.trim(),
          slug: newPageSlug.trim(),
          title: newPageTitle.trim(),
          pageType: newPageType,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; data?: { id: string }; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      if (data.data?.id) {
        setPageEditorId(data.data.id);
        setNewPageSlug("");
        setNewPageTitle("");
        await loadPages();
        await loadPageEditor(data.data.id);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const loadPageVersions = async () => {
    if (!pageEditorId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/pages/${encodeURIComponent(pageEditorId.trim())}/versions`), {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        data?: { id: string; version: number; status: string; label: string | null; publishedAt: string | null }[];
        message?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setPageVersions(data.data ?? []);
      setVersionsOpen(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const rollbackToVersion = async (versionId: string) => {
    if (!pageEditorId.trim()) return;
    if (!(await appConfirm(t("Re-publish this version as the live page? (counts as rollback in audit)")))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/pages/${encodeURIComponent(pageEditorId.trim())}/publish`), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ versionId, rollback: true }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setPageEditorStatus(t("Rollback complete."));
      await loadPageVersions();
      await loadPageEditor();
      await loadPages();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= sections.length) return;
    const next = cloneSections(sections);
    const tmp = next[index]!;
    next[index] = next[to]!;
    next[to] = tmp;
    next.forEach((s, i) => {
      s.sortOrder = i;
    });
    setSections(next);
  };

  const removeSection = (index: number) => {
    const next = cloneSections(sections).filter((_, i) => i !== index);
    next.forEach((s, i) => {
      s.sortOrder = i;
    });
    setSections(next);
  };

  const addSection = () => {
    const next = cloneSections(sections);
    next.push({
      sortOrder: next.length,
      instanceKey: "custom",
      settings: { heading: t("New section") },
      blocks: [{ sortOrder: 0, data: { body: "" } }],
    });
    setSections(next);
  };

  const updateSectionField = (index: number, field: "instanceKey" | "sortOrder", value: string | number) => {
    const next = cloneSections(sections);
    const s = next[index]!;
    if (field === "sortOrder") {
      const n = Number(value);
      if (Number.isFinite(n)) s.sortOrder = n;
    } else {
      s.instanceKey = value === "" ? null : String(value);
    }
    setSections(next);
  };

  const updateSetting = (sectionIndex: number, key: string, value: string) => {
    const next = cloneSections(sections);
    const s = next[sectionIndex]!;
    if (!s.settings) s.settings = {};
    s.settings[key] = value;
    setSections(next);
  };

  const removeSettingKey = (sectionIndex: number, key: string) => {
    const next = cloneSections(sections);
    const s = next[sectionIndex]!;
    if (s.settings && key in s.settings) delete s.settings[key];
    setSections(next);
  };

  const updateBlockData = (sectionIndex: number, blockIndex: number, key: string, value: string) => {
    const next = cloneSections(sections);
    const b = next[sectionIndex]!.blocks[blockIndex]!;
    if (!b.data) b.data = {};
    b.data[key] = value;
    setSections(next);
  };

  const addBlock = (sectionIndex: number) => {
    const next = cloneSections(sections);
    const blocks = next[sectionIndex]!.blocks;
    blocks.push({ sortOrder: blocks.length, data: {} });
    setSections(next);
  };

  const removeBlock = (sectionIndex: number, blockIndex: number) => {
    const next = cloneSections(sections);
    next[sectionIndex]!.blocks = next[sectionIndex]!.blocks.filter((_, i) => i !== blockIndex);
    next[sectionIndex]!.blocks.forEach((b, i) => {
      b.sortOrder = i;
    });
    setSections(next);
  };

  const applyAdvancedJson = () => {
    try {
      const parsed = JSON.parse(sectionsJsonDraft) as unknown;
      if (!Array.isArray(parsed)) throw new Error(t("Sections must be a JSON array."));
      setSections(
        normalizeLoadedSections(
          parsed as Array<{
            sortOrder: number;
            instanceKey?: string | null;
            settings?: unknown;
            blocks: Array<{ sortOrder: number; data?: unknown }>;
          }>,
        ),
      );
      setAdvancedJsonOpen(false);
      setPageEditorStatus(t("Applied JSON to the visual editor."));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("Invalid JSON"));
    }
  };

  const openAdvancedJson = () => {
    setSectionsJsonDraft(JSON.stringify(sections, null, 2));
    setAdvancedJsonOpen(true);
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
    <div className="w-full min-w-0 space-y-8">
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:flex-wrap sm:items-end">
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
                setPages([]);
                setPageEditorId("");
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
          <Select value={pageWebsiteId || undefined} onValueChange={setPageWebsiteId} disabled={websites.length === 0}>
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

      {/* Create page */}
      <Card className="border-dashed border-border/80 bg-muted/10 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t("Add page")}</CardTitle>
          <CardDescription>{t("Creates a draft page version you can customize before publishing.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("URL and handle")}</Label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-2 text-xs text-muted-foreground">
                  /
                </span>
                <Input
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  placeholder={t("about")}
                  className="rounded-l-none font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("Page title")}</Label>
              <Input value={newPageTitle} onChange={(e) => setNewPageTitle(e.target.value)} placeholder={t("About us")} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("Template type")}</Label>
              <Select value={newPageType} onValueChange={setNewPageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">{t("home")}</SelectItem>
                  <SelectItem value="standard">{t("standard")}</SelectItem>
                  <SelectItem value="product">{t("product template")}</SelectItem>
                  <SelectItem value="collection">{t("collection template")}</SelectItem>
                  <SelectItem value="cart">{t("cart")}</SelectItem>
                  <SelectItem value="account">{t("account")}</SelectItem>
                  <SelectItem value="support">{t("support")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={loading || !pageWebsiteId.trim() || !newPageSlug.trim() || !newPageTitle.trim()}
              onClick={() => void createPage()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Create page")}
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={() => void loadPages()} disabled={loading || !pageWebsiteId}>
              <RefreshCw className="h-4 w-4" />
              {t("Reload list")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Page list */}
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="border-b bg-muted/30 py-4">
          <CardTitle className="text-base">{t("Your pages")}</CardTitle>
          <CardDescription>{t("Select a page to edit its draft in the editor below.")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center text-sm text-muted-foreground">
              <Sparkles className="h-8 w-8 opacity-40" />
              {t("No pages for this website yet.")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">{t("Title")}</TableHead>
                  <TableHead>{t("Handle")}</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                  <TableHead className="pr-6 text-right">{t("Action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((p) => (
                  <TableRow
                    key={p.id}
                    className={cn("cursor-pointer", pageEditorId === p.id && "bg-muted/40")}
                    onClick={() => {
                      setPageEditorId(p.id);
                      void loadPageEditor(p.id);
                    }}
                  >
                    <TableCell className="pl-6 font-medium">{p.title}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted/80 px-1.5 py-0.5 text-xs">/{p.slug}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal capitalize">
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant={pageEditorId === p.id ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPageEditorId(p.id);
                          void loadPageEditor(p.id);
                        }}
                      >
                        {t("Edit")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Split editor */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">{t("Page editor")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedPage
                ? `${selectedPage.title} · /${selectedPage.slug}`
                : t("Select a page above to edit sections and blocks.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={loading || !pageEditorId.trim()} onClick={() => void loadPageEditor()}>
              {t("Reload draft")}
            </Button>
            <Button type="button" variant="secondary" size="sm" disabled={loading || !pageEditorId.trim()} onClick={() => void ensurePageDraft()}>
              {t("Prepare draft")}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={loading || !pageEditorId.trim()} onClick={() => void loadPageVersions()}>
              {t("Versions")}
            </Button>
            <Button type="button" size="sm" className="gap-1.5" disabled={loading || !draftVersionId} onClick={() => void savePageDraft()}>
              <Save className="h-3.5 w-3.5" />
              {t("Save")}
            </Button>
            <Button type="button" size="sm" disabled={loading || !draftVersionId} onClick={() => void publishPageDraft()}>
              {t("Publish…")}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={loading || !pageEditorId.trim()} onClick={() => void unpublishPageLive()}>
              {t("Unpublish")}
            </Button>
          </div>
        </div>
        {pageEditorStatus ? <p className="text-xs text-muted-foreground">{pageEditorStatus}</p> : null}
        {draftVersionId ? (
          <p className="text-xs text-muted-foreground">
            {t("Draft version")} <code className="rounded bg-muted px-1">{draftVersionId}</code>
          </p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="grid min-h-[min(640px,calc(100dvh-16rem))] lg:grid-cols-[minmax(0,380px)_1fr]">
            {/* Left rail — sections */}
            <div className="flex flex-col border-b lg:border-b-0 lg:border-r">
              <div className="border-b bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Sections")}</p>
                <p className="text-xs text-muted-foreground">{t("Reorder, edit settings, and nested blocks.")}</p>
              </div>
              <ScrollArea className="h-[min(520px,50vh)] lg:h-[min(calc(100dvh-18rem),720px)]">
                <div className="space-y-3 p-4">
                  <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={addSection}>
                    <Plus className="h-4 w-4" />
                    {t("Add section")}
                  </Button>
                  {sections.map((sec, si) => (
                    <Collapsible key={`sec-${si}-${sec.sortOrder}`} defaultOpen={si === 0}>
                      <div className="rounded-lg border border-border/70 bg-background shadow-sm">
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/40"
                          >
                            <span className="truncate">
                              {sec.instanceKey || t("Section")} <span className="text-muted-foreground">#{si + 1}</span>
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-2">
                            <div className="flex gap-1">
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveSection(si, -1)} disabled={si === 0}>
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => moveSection(si, 1)}
                                disabled={si === sections.length - 1}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeSection(si)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label className="text-[11px]">{t("Section type")}</Label>
                                <Input
                                  className="h-9 font-mono text-xs"
                                  value={sec.instanceKey ?? ""}
                                  onChange={(e) => updateSectionField(si, "instanceKey", e.target.value)}
                                  placeholder="hero"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px]">{t("Order")}</Label>
                                <Input
                                  type="number"
                                  className="h-9 text-xs"
                                  value={sec.sortOrder}
                                  onChange={(e) => updateSectionField(si, "sortOrder", e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] text-muted-foreground">{t("Settings")}</Label>
                              {Object.entries(sec.settings ?? {}).map(([k, v]) => (
                                <div key={k} className="flex gap-2">
                                  <Input className="h-9 w-[36%] font-mono text-[11px]" value={k} readOnly />
                                  <Input
                                    className="h-9 flex-1 text-xs"
                                    value={typeof v === "string" || typeof v === "number" ? String(v) : JSON.stringify(v)}
                                    onChange={(e) => updateSetting(si, k, e.target.value)}
                                  />
                                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => removeSettingKey(si, k)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <div className="space-y-2 border-t border-border/50 pt-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-[11px] text-muted-foreground">{t("Blocks")}</Label>
                                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addBlock(si)}>
                                  <Plus className="mr-1 h-3 w-3" />
                                  {t("Block")}
                                </Button>
                              </div>
                              {sec.blocks.map((blk, bi) => (
                                <div key={`b-${bi}`} className="rounded-md border border-border/60 bg-muted/20 p-2">
                                  <div className="mb-2 flex justify-end">
                                    <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => removeBlock(si, bi)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                  {Object.entries(blk.data ?? {}).map(([k, v]) => (
                                    <div key={k} className="mb-2 space-y-1">
                                      <Label className="text-[11px] font-mono">{k}</Label>
                                      {k === "body" || String(v).length > 80 ? (
                                        <Textarea
                                          className="min-h-[72px] font-mono text-xs"
                                          value={typeof v === "string" ? v : JSON.stringify(v)}
                                          onChange={(e) => updateBlockData(si, bi, k, e.target.value)}
                                        />
                                      ) : (
                                        <Input
                                          className="h-9 text-xs"
                                          value={typeof v === "string" || typeof v === "number" ? String(v) : JSON.stringify(v)}
                                          onChange={(e) => updateBlockData(si, bi, k, e.target.value)}
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                  <Button type="button" variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground" onClick={openAdvancedJson}>
                    <Code2 className="h-4 w-4" />
                    {t("Edit as JSON")}
                  </Button>
                </div>
              </ScrollArea>
            </div>

            {/* Preview */}
            <div className="flex flex-col bg-muted/30">
              <div className="border-b border-border/60 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Preview")}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t("Approximate layout from your draft. The live storefront uses the published version.")}
                </p>
              </div>
              <ScrollArea className="min-h-[320px] flex-1 lg:min-h-[min(calc(100dvh-18rem),720px)]">
                <DraftPagePreview sections={sections} />
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Version history")}</DialogTitle>
            <DialogDescription>{t("Rollback restores an archived version as the live page.")}</DialogDescription>
          </DialogHeader>
          {pageVersions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No versions loaded.")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                  <TableHead>{t("Label")}</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageVersions.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.version}</TableCell>
                    <TableCell className="text-xs">{v.status}</TableCell>
                    <TableCell className="text-xs">{v.label ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {v.status === "archived" ? (
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" disabled={loading} onClick={() => void rollbackToVersion(v.id)}>
                          {t("Rollback")}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={advancedJsonOpen} onOpenChange={setAdvancedJsonOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Sections JSON")}</DialogTitle>
            <DialogDescription>{t("Paste or edit the full structure. Apply replaces the visual editor.")}</DialogDescription>
          </DialogHeader>
          <Textarea rows={16} className="font-mono text-xs" value={sectionsJsonDraft} onChange={(e) => setSectionsJsonDraft(e.target.value)} spellCheck={false} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdvancedJsonOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button type="button" onClick={applyAdvancedJson}>
              {t("Apply")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
