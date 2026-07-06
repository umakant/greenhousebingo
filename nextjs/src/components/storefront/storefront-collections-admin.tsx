"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Layers, Loader2, Plus, RefreshCw } from "lucide-react";

import {
  StorefrontAdminErrorAlert,
  StorefrontAdminMainCard,
  StorefrontAdminPageShell,
} from "@/components/storefront/storefront-admin-page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WebsiteRow } from "@/components/storefront/storefront-websites-settings";
import { t } from "@/lib/admin-t";

const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

type CollectionRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  published: boolean;
  sortOrder: number;
  websiteId: string | null;
  productCount: number;
};

type Tab = "all" | "published" | "unpublished";

export function StorefrontCollectionsAdmin() {
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<CollectionRow[]>([]);
  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newWebsiteId, setNewWebsiteId] = useState<string>("");

  const [editOpen, setEditOpen] = useState(false);
  const [editInitializing, setEditInitializing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSeoTitle, setEditSeoTitle] = useState("");
  const [editSeoDescription, setEditSeoDescription] = useState("");
  const [editWebsiteId, setEditWebsiteId] = useState<string>("");
  const [editPublished, setEditPublished] = useState(false);
  const [editProductCount, setEditProductCount] = useState(0);

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

  const handleSearch = () => {
    setQ(searchInput.trim());
  };

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
        // The superadmin Store is bound to the dedicated Water Ice Express store org
        // (returned as defaultOrganizationId); no company switching here.
        const orgId: string | null = c.defaultOrganizationId;
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
      const data = (await res.json()) as { ok?: boolean; data?: WebsiteRow[] };
      if (res.ok && data.ok) {
        const rows = data.data ?? [];
        setWebsites(rows);
        setNewWebsiteId((prev) => prev || rows[0]?.id || "");
      }
    } catch {
      /* optional */
    }
  }, [buildApiUrl, orgReady]);

  const loadCollections = useCallback(async () => {
    if (!orgReady) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/collections"), { credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; collections?: CollectionRow[]; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setRawRows(data.collections ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, orgReady]);

  useEffect(() => {
    void loadWebsites();
  }, [loadWebsites]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  const rows = useMemo(() => {
    const qt = q.trim().toLowerCase();
    let list = rawRows;
    if (tab === "published") list = list.filter((r) => r.published);
    if (tab === "unpublished") list = list.filter((r) => !r.published);
    if (qt) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(qt) ||
          r.slug.toLowerCase().includes(qt) ||
          (r.description ?? "").toLowerCase().includes(qt),
      );
    }
    return list;
  }, [q, rawRows, tab]);

  const showShopifyEmpty = rawRows.length === 0 && tab === "all" && !q.trim() && !loading;

  const patchCollection = async (id: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/collections/${encodeURIComponent(id)}`), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await loadCollections();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const resetEditForm = () => {
    setEditId(null);
    setEditTitle("");
    setEditSlug("");
    setEditDescription("");
    setEditSeoTitle("");
    setEditSeoDescription("");
    setEditWebsiteId("");
    setEditPublished(false);
    setEditProductCount(0);
  };

  const openEditCollection = async (c: CollectionRow) => {
    setError(null);
    setEditOpen(true);
    setEditInitializing(true);
    setEditId(c.id);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/collections/${encodeURIComponent(c.id)}`), {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        collection?: {
          title?: string;
          slug?: string;
          description?: string | null;
          seoTitle?: string | null;
          seoDescription?: string | null;
          websiteId?: string | null;
          published?: boolean;
          products?: unknown[];
        };
      };
      if (!res.ok || !data.ok || !data.collection) {
        throw new Error(data.message ?? "Failed to load collection");
      }
      const col = data.collection;
      setEditTitle((col.title ?? "").trim());
      setEditSlug((col.slug ?? "").trim());
      setEditDescription(col.description?.trim() ?? "");
      setEditSeoTitle(col.seoTitle?.trim() ?? "");
      setEditSeoDescription(col.seoDescription?.trim() ?? "");
      setEditWebsiteId(col.websiteId?.trim() ?? "");
      setEditPublished(Boolean(col.published));
      setEditProductCount(Array.isArray(col.products) ? col.products.length : 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setEditOpen(false);
      resetEditForm();
    } finally {
      setEditInitializing(false);
    }
  };

  const saveEditCollection = async () => {
    if (!editId || !editTitle.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/collections/${encodeURIComponent(editId)}`), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          slug: editSlug.trim() || undefined,
          description: editDescription.trim() || null,
          seoTitle: editSeoTitle.trim() || null,
          seoDescription: editSeoDescription.trim() || null,
          websiteId: editWebsiteId.trim() || null,
          published: editPublished,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setEditOpen(false);
      resetEditForm();
      await loadCollections();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const buildRowActions = (c: CollectionRow): TableActionItem[] => {
    const items: TableActionItem[] = [
      {
        label: t("Edit"),
        onSelect: () => void openEditCollection(c),
      },
    ];
    if (c.published) {
      items.push({
        label: t("Unpublish"),
        onSelect: () => void patchCollection(c.id, { published: false }),
      });
    } else {
      items.push({
        label: t("Publish"),
        onSelect: () => void patchCollection(c.id, { published: true }),
      });
    }
    return items;
  };

  const createCollection = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/collections"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          slug: newSlug.trim() || undefined,
          published: false,
          websiteId: newWebsiteId || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setAddOpen(false);
      setNewTitle("");
      setNewSlug("");
      setTab("unpublished");
      await loadCollections();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
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
    <StorefrontAdminPageShell>
      <StorefrontAdminErrorAlert>{error}</StorefrontAdminErrorAlert>

      <StorefrontAdminMainCard contentClassName="p-0 sm:p-0">
        <div className="space-y-0">
          <div className="border-b bg-muted/30 p-4 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
              <div className="w-full shrink-0 lg:w-auto">
                <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full sm:w-auto">
                  <TabsList className="grid h-auto w-full grid-cols-3 gap-1 sm:flex sm:h-10 sm:w-auto">
                    <TabsTrigger value="all" className="text-xs sm:text-sm">
                      {t("All")}
                    </TabsTrigger>
                    <TabsTrigger value="published" className="text-xs sm:text-sm">
                      {t("Published")}
                    </TabsTrigger>
                    <TabsTrigger value="unpublished" className="text-xs sm:text-sm">
                      {t("Unpublished")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex min-w-0 w-full max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:max-w-2xl lg:flex-1 lg:justify-end">
                <div className="min-w-0 w-full max-w-full sm:max-w-md lg:flex-1">
                  <SearchInput
                    value={searchInput}
                    onChange={setSearchInput}
                    onSearch={handleSearch}
                    placeholder={t("Search collections")}
                    buttonLabel={t("Search")}
                  />
                </div>
                <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 shrink-0"
                    onClick={() => void loadCollections()}
                    disabled={loading}
                    aria-label={t("Refresh")}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button type="button" size="sm" className="gap-1" onClick={() => setAddOpen(true)} disabled={!orgReady || loading}>
                    <Plus className="h-4 w-4" />
                    {t("Add collection")}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            {showShopifyEmpty ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/5 px-6 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Layers className="h-8 w-8 text-muted-foreground" aria-hidden />
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{t("Create your first collection")}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {t(
                    "Collections organize products for your storefront — like Shopify’s manual collections. Add one, then attach products via the API or a future collection editor.",
                  )}
                </p>
                <Button type="button" size="sm" className="mt-8 gap-1" onClick={() => setAddOpen(true)} disabled={!orgReady}>
                  <Plus className="h-4 w-4" />
                  {t("Create collection")}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium text-muted-foreground">{t("Title")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground md:table-cell">{t("Type")}</th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground sm:table-cell">{t("Products")}</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">{t("Status")}</th>
                      <th className="p-3 text-right font-medium text-muted-foreground">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                          {t("No collections match this filter.")}
                        </td>
                      </tr>
                    ) : null}
                    {rows.map((c) => {
                      const shopPath = `/shop/collections/${encodeURIComponent(c.slug)}`;
                      const items = buildRowActions(c);
                      return (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3">
                            <div className="flex flex-col gap-0.5">
                              <Link href={shopPath} className="font-medium text-primary hover:underline">
                                {c.title}
                              </Link>
                              <span className="text-xs text-muted-foreground">/{c.slug}</span>
                            </div>
                          </td>
                          <td className="hidden p-3 text-muted-foreground md:table-cell">{t("Manual")}</td>
                          <td className="hidden p-3 sm:table-cell">{c.productCount}</td>
                          <td className="p-3">
                            <Badge variant={c.published ? "default" : "secondary"}>
                              {c.published ? t("Active") : t("Draft")}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <TableActionButton
                              label={t("View")}
                              onPrimaryClick={() => {
                                window.open(shopPath, "_blank", "noopener,noreferrer");
                              }}
                              items={items}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {loading && rawRows.length === 0 ? (
              <div className="flex justify-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : null}
          </div>
        </div>
      </StorefrontAdminMainCard>

      <Sheet
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) {
            setEditInitializing(false);
            resetEditForm();
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex h-full w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md md:max-w-lg"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-14 text-left">
            <SheetTitle>{t("Edit collection")}</SheetTitle>
            <SheetDescription>
              {editInitializing
                ? t("Loading…")
                : t("Update how this collection appears on your storefront. Product membership can still be managed via the catalog API.")}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            {editInitializing ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {editProductCount > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("Products in collection")}: <span className="font-medium text-foreground">{editProductCount}</span>
                  </p>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="sf-edit-col-title">{t("Title")}</Label>
                  <Input
                    id="sf-edit-col-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={t("Spring sale")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf-edit-col-slug">{t("Handle")}</Label>
                  <Input
                    id="sf-edit-col-slug"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    placeholder={t("spring-sale")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf-edit-col-desc">{t("Description")}</Label>
                  <Textarea
                    id="sf-edit-col-desc"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                    placeholder={t("Optional description for collection pages and SEO.")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf-edit-col-seo-title">{t("SEO title (optional)")}</Label>
                  <Input
                    id="sf-edit-col-seo-title"
                    value={editSeoTitle}
                    onChange={(e) => setEditSeoTitle(e.target.value)}
                    placeholder={t("Override page title in search results")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf-edit-col-seo-desc">{t("SEO description (optional)")}</Label>
                  <Textarea
                    id="sf-edit-col-seo-desc"
                    value={editSeoDescription}
                    onChange={(e) => setEditSeoDescription(e.target.value)}
                    rows={3}
                    placeholder={t("Meta description for search results")}
                  />
                </div>
                {websites.length > 0 ? (
                  <div className="space-y-2">
                    <Label>{t("Website (optional)")}</Label>
                    <Select value={editWebsiteId || "__none__"} onValueChange={(v) => setEditWebsiteId(v === "__none__" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("All websites")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("All websites")}</SelectItem>
                        {websites.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="sf-edit-col-published" className="text-sm font-medium">
                      {t("Published")}
                    </Label>
                    <p className="text-xs text-muted-foreground">{t("When published, the collection is visible on the storefront.")}</p>
                  </div>
                  <Switch id="sf-edit-col-published" checked={editPublished} onCheckedChange={setEditPublished} />
                </div>
              </div>
            )}
          </div>
          <SheetFooter className="shrink-0 flex-row flex-wrap gap-2 border-t px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                resetEditForm();
              }}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void saveEditCollection()}
              disabled={!editTitle.trim() || loading || editInitializing}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md md:max-w-lg"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-14 text-left">
            <SheetTitle>{t("Add collection")}</SheetTitle>
            <SheetDescription>
              {t("Creates an unpublished collection you can add products to from the API or future editor.")}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sf-new-col-title">{t("Title")}</Label>
                <Input id="sf-new-col-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t("Spring sale")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sf-new-col-slug">{t("Handle (optional)")}</Label>
                <Input id="sf-new-col-slug" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder={t("spring-sale")} />
              </div>
              {websites.length > 0 ? (
                <div className="space-y-2">
                  <Label>{t("Website (optional)")}</Label>
                  <Select value={newWebsiteId || "__none__"} onValueChange={(v) => setNewWebsiteId(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("All websites")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("All websites")}</SelectItem>
                      {websites.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </div>
          <SheetFooter className="shrink-0 flex-row flex-wrap gap-2 border-t px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button type="button" onClick={() => void createCollection()} disabled={!newTitle.trim() || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </StorefrontAdminPageShell>
  );
}
