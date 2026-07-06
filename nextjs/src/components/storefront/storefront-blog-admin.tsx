"use client";

import { appConfirm } from "@/lib/app-confirm";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChangeEvent } from "react";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  ChevronDown,
  EyeOff,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Store,
  Trash2,
  Upload,
} from "lucide-react";

import { openNativeFilePicker } from "@/lib/open-native-file-picker";
import { parseJsonResponse } from "@/lib/safe-fetch-json";
import {
  STOREFRONT_EDITOR_IMAGE_MAX_BYTES,
  storefrontEditorImageTooLargeMessage,
} from "@/lib/storefront/storefront-image-upload-limit";

import {
  StorefrontAdminErrorAlert,
  StorefrontAdminMainCard,
  StorefrontAdminPageShell,
} from "@/components/storefront/storefront-admin-page-layout";
import { StorefrontBlogCommentsModeration } from "@/components/storefront/storefront-blog-comments-moderation";
import type { WebsiteRow } from "@/components/storefront/storefront-websites-settings";
import NoRecordsFound from "@/components/no-records-found";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { t } from "@/lib/admin-t";


const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";
const BLOG_COLUMN_STORAGE_KEY = "pf-storefront-blog-admin-columns-v1";
type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

export type BlogPostRow = {
  id: string;
  websiteId: string | null;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string;
  featuredImageUrl: string | null;
  category: string | null;
  status: string;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  isFeaturedHome: boolean;
  createdAt: string;
  updatedAt: string | null;
};

type Tab = "all" | "published" | "draft" | "archived";
type BlogSortField = "title" | "category" | "status" | "publishedAt" | "updatedAt";
type BlogTableColumnId = "post" | "category" | "published" | "updated" | "status";

const DEFAULT_BLOG_TABLE_COLUMNS: Record<BlogTableColumnId, boolean> = {
  post: true,
  category: true,
  published: true,
  updated: true,
  status: true,
};

function slugifyTitle(title: string): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "post";
}

function statusSortKey(r: BlogPostRow): number {
  if (r.status === "published") return 0;
  if (r.status === "draft") return 1;
  if (r.status === "archived") return 2;
  return 3;
}

function statusVariant(r: BlogPostRow): "default" | "secondary" | "outline" {
  if (r.status === "published") return "default";
  if (r.status === "archived") return "secondary";
  return "outline";
}

export function StorefrontBlogAdmin() {
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<BlogPostRow[]>([]);
  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [filterWebsiteId, setFilterWebsiteId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortField, setSortField] = useState<BlogSortField>("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugManual, setSlugManual] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [websiteId, setWebsiteId] = useState<string>("");
  const [status, setStatus] = useState("draft");
  const [isFeaturedHome, setIsFeaturedHome] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [featuredImageUploading, setFeaturedImageUploading] = useState(false);
  const [featuredUploadError, setFeaturedUploadError] = useState<string | null>(null);
  const featuredFileRef = useRef<HTMLInputElement>(null);
  const featuredBlobRef = useRef<string | null>(null);
  const [featuredBlobPreview, setFeaturedBlobPreview] = useState<string | null>(null);

  const replaceFeaturedBlob = useCallback((next: string | null) => {
    if (featuredBlobRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(featuredBlobRef.current);
    }
    featuredBlobRef.current = next;
    setFeaturedBlobPreview(next);
  }, []);

  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<BlogTableColumnId>(
    BLOG_COLUMN_STORAGE_KEY,
    DEFAULT_BLOG_TABLE_COLUMNS,
  );

  const blogColumnMenuDefs = useMemo(
    () => [
      { id: "post" as const, label: t("Post") },
      { id: "category" as const, label: t("Category") },
      { id: "published" as const, label: t("Published") },
      { id: "updated" as const, label: t("Updated") },
      { id: "status" as const, label: t("Status") },
    ],
    [],
  );

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
    return () => {
      if (featuredBlobRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(featuredBlobRef.current);
      }
      featuredBlobRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setOrgLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/storefront/organization-context", { credentials: "include" });
        const json = await parseJsonResponse<OrgContext & { ok?: boolean; message?: string }>(res);
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
      const data = await parseJsonResponse<{ ok?: boolean; data?: WebsiteRow[] }>(res);
      if (res.ok && data.ok) {
        setWebsites(data.data ?? []);
        setWebsiteId((prev) => prev || (data.data?.[0]?.id ?? ""));
      }
    } catch {
      /* optional */
    }
  }, [buildApiUrl, orgReady]);

  const loadPosts = useCallback(async () => {
    if (!orgReady) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        buildApiUrl("/api/storefront/blog-posts", filterWebsiteId.trim() ? { websiteId: filterWebsiteId.trim() } : undefined),
        { credentials: "same-origin" },
      );
      const data = await parseJsonResponse<{
        ok?: boolean;
        posts?: BlogPostRow[];
        message?: string;
        storefrontNotice?: string;
      }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setRawRows(data.posts ?? []);
      setSelected(new Set());
      const n = data.storefrontNotice?.trim();
      setNotice(n ? n : null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, orgReady, filterWebsiteId]);

  useEffect(() => {
    void loadWebsites();
  }, [loadWebsites]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    setPage(1);
  }, [tab, q, filterWebsiteId]);

  useEffect(() => {
    if (!editorOpen || editingId != null || slugManual) return;
    const next = slugifyTitle(title);
    if (next) setSlug(next);
  }, [title, editorOpen, editingId, slugManual]);

  const filteredRows = useMemo(() => {
    const qt = q.trim().toLowerCase();
    let list = rawRows;
    if (tab === "published") list = list.filter((r) => r.status === "published");
    if (tab === "draft") list = list.filter((r) => r.status === "draft");
    if (tab === "archived") list = list.filter((r) => r.status === "archived");
    if (qt) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(qt) ||
          r.slug.toLowerCase().includes(qt) ||
          (r.category ?? "").toLowerCase().includes(qt) ||
          (r.excerpt ?? "").toLowerCase().includes(qt),
      );
    }
    return list;
  }, [q, rawRows, tab]);

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    const dir = sortDirection === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") {
        cmp = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      } else if (sortField === "category") {
        cmp = (a.category ?? "").localeCompare(b.category ?? "", undefined, { sensitivity: "base" });
      } else if (sortField === "status") {
        cmp = statusSortKey(a) - statusSortKey(b);
        if (cmp === 0) cmp = a.status.localeCompare(b.status);
      } else if (sortField === "publishedAt") {
        const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        cmp = ta - tb;
      } else if (sortField === "updatedAt") {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime();
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime();
        cmp = ta - tb;
      }
      return cmp * dir;
    });
    return copy;
  }, [filteredRows, sortField, sortDirection]);

  const total = sortedRows.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage) || 1);

  useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [page, lastPage]);

  const pageSafe = Math.min(page, lastPage);
  const paginatedRows = useMemo(() => {
    const start = (pageSafe - 1) * perPage;
    return sortedRows.slice(start, start + perPage);
  }, [sortedRows, pageSafe, perPage]);

  const allSelected = sortedRows.length > 0 && sortedRows.every((r) => selected.has(r.id));

  const toggleSelectAll = (on: boolean) => {
    if (on) setSelected(new Set(sortedRows.map((r) => r.id)));
    else setSelected(new Set());
  };

  const toggleSelect = (id: string, on: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  };

  const openNew = () => {
    setFeaturedUploadError(null);
    replaceFeaturedBlob(null);
    setEditingId(null);
    setSlugManual(false);
    setTitle("");
    setSlug("");
    setExcerpt("");
    setBodyHtml("");
    setFeaturedImageUrl("");
    setCategory("");
    setWebsiteId(websites[0]?.id ?? "");
    setStatus("draft");
    setIsFeaturedHome(false);
    setSeoTitle("");
    setSeoDescription("");
    setEditorOpen(true);
  };

  const openEdit = (r: BlogPostRow) => {
    setFeaturedUploadError(null);
    replaceFeaturedBlob(null);
    setEditingId(r.id);
    setSlugManual(true);
    setTitle(r.title);
    setSlug(r.slug);
    setExcerpt(r.excerpt ?? "");
    setBodyHtml(r.bodyHtml ?? "");
    setFeaturedImageUrl(r.featuredImageUrl ?? "");
    setCategory(r.category ?? "");
    setWebsiteId(r.websiteId ?? "");
    setStatus(r.status);
    setIsFeaturedHome(r.isFeaturedHome);
    setSeoTitle(r.seoTitle ?? "");
    setSeoDescription(r.seoDescription ?? "");
    setEditorOpen(true);
  };

  const patchPost = async (id: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/blog-posts/${encodeURIComponent(id)}`), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await parseJsonResponse<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await loadPosts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const savePost = async () => {
    if (!title.trim()) {
      setError(t("Title is required."));
      return;
    }
    if (!slug.trim()) {
      setError(t("Slug is required."));
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || null,
        bodyHtml,
        featuredImageUrl: featuredImageUrl.trim() || null,
        category: category.trim() || null,
        websiteId: websiteId.trim() || null,
        status,
        isFeaturedHome,
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
      };
      if (editingId) {
        const res = await fetch(buildApiUrl(`/api/storefront/blog-posts/${encodeURIComponent(editingId)}`), {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await parseJsonResponse<{ ok?: boolean; message?: string }>(res);
        if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      } else {
        const res = await fetch(buildApiUrl("/api/storefront/blog-posts"), {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await parseJsonResponse<{ ok?: boolean; message?: string }>(res);
        if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      }
      setEditorOpen(false);
      await loadPosts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const triggerBlogFeaturedPicker = useCallback(() => {
    if (featuredImageUploading) return;
    openNativeFilePicker(featuredFileRef.current);
  }, [featuredImageUploading]);

  const onFeaturedFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > STOREFRONT_EDITOR_IMAGE_MAX_BYTES) {
      setFeaturedUploadError(storefrontEditorImageTooLargeMessage());
      return;
    }
    setFeaturedUploadError(null);
    replaceFeaturedBlob(URL.createObjectURL(file));
    setFeaturedImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(buildApiUrl("/api/storefront/blog-posts/upload-image"), {
        method: "POST",
        credentials: "same-origin",
        body: fd,
      });
      const data = await parseJsonResponse<{ ok?: boolean; urls?: string[]; message?: string }>(res);
      if (!res.ok || !data.ok || !data.urls?.[0]) {
        throw new Error(data.message ?? t("Upload failed"));
      }
      replaceFeaturedBlob(null);
      setFeaturedImageUrl(data.urls[0]!);
    } catch (err: unknown) {
      replaceFeaturedBlob(null);
      setFeaturedUploadError(err instanceof Error ? err.message : t("Upload failed"));
    } finally {
      setFeaturedImageUploading(false);
    }
  };

  const deletePost = async (id: string, label: string) => {
    if (!(await appConfirm(t(`Delete “${label}”?`)))) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/blog-posts/${encodeURIComponent(id)}`), {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await parseJsonResponse<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await loadPosts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const bulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!(await appConfirm(t(`Delete ${ids.length} selected post(s)?`)))) return;
    setLoading(true);
    setError(null);
    try {
      for (const id of ids) {
        const row = rawRows.find((r) => r.id === id);
        const res = await fetch(buildApiUrl(`/api/storefront/blog-posts/${encodeURIComponent(id)}`), {
          method: "DELETE",
          credentials: "same-origin",
        });
        const data = await parseJsonResponse<{ ok?: boolean; message?: string }>(res);
        if (!res.ok || !data.ok) throw new Error(data.message ?? (row ? row.title : id));
      }
      await loadPosts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setQ(searchInput.trim());
    setPage(1);
  };

  const handleSort = (field: BlogSortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "title" || field === "category" ? "asc" : "desc");
    }
  };

  const sortChevron = (field: BlogSortField) => (
    <ChevronDown
      className={`ml-1 inline-block h-3 w-3 transition-transform ${
        sortField === field && sortDirection === "desc" ? "rotate-180" : ""
      }`}
    />
  );

  const activeFilterCount = (tab !== "all" ? 1 : 0) + (filterWebsiteId.trim() ? 1 : 0);
  const hasFilters = !!q.trim() || tab !== "all" || !!filterWebsiteId.trim();

  const from = total === 0 ? 0 : (pageSafe - 1) * perPage + 1;
  const to = Math.min(pageSafe * perPage, total);

  const actionIconCls = "h-4 w-4";

  const buildRowActions = (r: BlogPostRow): { items: TableActionItem[] } => {
    const items: TableActionItem[] = [];
    if (r.status !== "published") {
      items.push({
        label: t("Publish"),
        icon: <Store className={actionIconCls} />,
        onSelect: () => void patchPost(r.id, { status: "published" }),
      });
    } else {
      items.push({
        label: t("Unpublish"),
        icon: <EyeOff className={actionIconCls} />,
        onSelect: () => void patchPost(r.id, { status: "draft" }),
      });
    }
    if (r.status !== "archived") {
      items.push({
        label: t("Archive"),
        icon: <Archive className={actionIconCls} />,
        onSelect: () => void patchPost(r.id, { status: "archived" }),
      });
    } else {
      items.push({
        label: t("Restore to draft"),
        icon: <ArchiveRestore className={actionIconCls} />,
        onSelect: () => void patchPost(r.id, { status: "draft" }),
      });
    }
    items.push({
      label: t("Delete"),
      icon: <Trash2 className={actionIconCls} />,
      destructive: true,
      onSelect: () => void deletePost(r.id, r.title),
    });
    return { items };
  };

  if (orgLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">{t("Loading…")}</span>
      </div>
    );
  }

  const blogFeaturedFilePortal =
    editorOpen && typeof document !== "undefined"
      ? createPortal(
          <input
            ref={featuredFileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.svg"
            className="sr-only"
            tabIndex={-1}
            onChange={(ev) => void onFeaturedFileChange(ev)}
            disabled={featuredImageUploading}
          />,
          document.body,
        )
      : null;

  return (
    <>
      {blogFeaturedFilePortal}
      <StorefrontAdminPageShell>
      <StorefrontAdminErrorAlert>{error}</StorefrontAdminErrorAlert>
      {notice ? (
        <div
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-50"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      <StorefrontAdminMainCard contentClassName="p-0 sm:p-0">
        <div className="space-y-0">
          <div className="border-b bg-muted/30 p-4 sm:p-6">
            {orgCtx?.isSuperadmin ? (
              <div className="mb-4 flex flex-wrap items-end gap-4 border-b border-border/60 pb-4">
                <div className="min-w-[200px] max-w-xs space-y-2">
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
                      void loadWebsites();
                      void loadPosts();
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
              </div>
            ) : null}
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
              <div className="min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
                <SearchInput
                  value={searchInput}
                  onChange={setSearchInput}
                  onSearch={handleSearch}
                  placeholder={t("Search posts...")}
                  buttonLabel={t("Search")}
                />
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
                <div className="flex overflow-hidden rounded-md border">
                  <button
                    type="button"
                    className={`p-2 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                    title={t("List view")}
                    aria-label={t("List view")}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={`p-2 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                    title={t("Grid view")}
                    aria-label={t("Grid view")}
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
                <Select
                  value={String(perPage)}
                  onValueChange={(v) => {
                    const n = parseInt(v, 10) || 10;
                    setPerPage(n);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {t("per page")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="default" className="relative">
                      <Filter className="mr-2 h-4 w-4" />
                      {t("Filters")}
                      {activeFilterCount > 0 ? (
                        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-2">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("Status")}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={tab}
                      onValueChange={(v) => {
                        setTab(v as Tab);
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="all">{t("All")}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="published">{t("Published")}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="draft">{t("Draft")}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="archived">{t("Archived")}</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuLabel className="mt-2 text-xs font-normal text-muted-foreground">{t("Website")}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={filterWebsiteId.trim() || "__all__"}
                      onValueChange={(v) => {
                        setFilterWebsiteId(v === "__all__" ? "" : v);
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="__all__">{t("All websites")}</DropdownMenuRadioItem>
                      {websites.map((w) => (
                        <DropdownMenuRadioItem key={w.id} value={w.id}>
                          {w.name}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <TableColumnVisibilityMenu
                  columns={blogColumnMenuDefs}
                  columnVisible={columnVisible}
                  setVisibility={setVisibility}
                  onReset={resetVisibility}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 shrink-0"
                  onClick={() => void loadPosts()}
                  disabled={loading}
                  aria-label={t("Refresh")}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1"
                  onClick={() => openNew()}
                  disabled={!orgReady || loading || !!notice}
                >
                  <Plus className="h-4 w-4" />
                  {t("New post")}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            {selected.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm">
                <span className="font-medium">
                  {selected.size} {t("selected")}
                </span>
                <Button type="button" size="sm" variant="destructive" onClick={() => void bulkDelete()} disabled={loading}>
                  {t("Delete")}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  {t("Clear selection")}
                </Button>
              </div>
            ) : null}

            {loading && rawRows.length === 0 ? (
              <div className="flex justify-center py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : sortedRows.length === 0 ? (
              <NoRecordsFound
                icon={BookOpen}
                title={t("No posts found")}
                description={t("Create a post or adjust filters to see blog content here.")}
                hasFilters={hasFilters}
                onClearFilters={() => {
                  setTab("all");
                  setFilterWebsiteId("");
                  setSearchInput("");
                  setQ("");
                  setPage(1);
                }}
              />
            ) : viewMode === "list" ? (
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-12 min-w-[3rem] max-w-[3rem] p-3 text-left font-medium">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(c) => toggleSelectAll(c === true)}
                          aria-label={t("Select all")}
                        />
                      </th>
                      {columnVisible("post") ? (
                        <th className="min-w-0 p-3 text-left font-medium">
                          <button type="button" className="inline-flex max-w-full items-center truncate" onClick={() => handleSort("title")}>
                            {t("Post")}
                            {sortChevron("title")}
                          </button>
                        </th>
                      ) : null}
                      {columnVisible("category") ? (
                        <th className="hidden min-w-0 p-3 text-center font-medium md:table-cell">
                          <button
                            type="button"
                            className="inline-flex w-full max-w-full items-center justify-center gap-0.5 truncate"
                            onClick={() => handleSort("category")}
                          >
                            {t("Category")}
                            {sortChevron("category")}
                          </button>
                        </th>
                      ) : null}
                      {columnVisible("published") ? (
                        <th className="hidden min-w-0 whitespace-nowrap p-3 text-center font-medium lg:table-cell">
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-center gap-0.5"
                            onClick={() => handleSort("publishedAt")}
                          >
                            {t("Published")}
                            {sortChevron("publishedAt")}
                          </button>
                        </th>
                      ) : null}
                      {columnVisible("updated") ? (
                        <th className="hidden min-w-0 whitespace-nowrap p-3 text-center font-medium lg:table-cell">
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-center gap-0.5"
                            onClick={() => handleSort("updatedAt")}
                          >
                            {t("Updated")}
                            {sortChevron("updatedAt")}
                          </button>
                        </th>
                      ) : null}
                      {columnVisible("status") ? (
                        <th className="hidden min-w-0 whitespace-nowrap p-3 text-center font-medium md:table-cell">
                          <button
                            type="button"
                            className="inline-flex w-full max-w-full items-center justify-center gap-0.5 truncate"
                            onClick={() => handleSort("status")}
                          >
                            {t("Status")}
                            {sortChevron("status")}
                          </button>
                        </th>
                      ) : null}
                      <th className="min-w-0 p-3 text-right font-medium">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((r) => {
                      const { items } = buildRowActions(r);
                      return (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="w-12 min-w-[3rem] max-w-[3rem] p-3 align-top">
                            <Checkbox
                              checked={selected.has(r.id)}
                              onCheckedChange={(c) => toggleSelect(r.id, c === true)}
                              aria-label={t("Select row")}
                            />
                          </td>
                          {columnVisible("post") ? (
                            <td className="min-w-0 p-3 align-top">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                                  {r.featuredImageUrl ? (
                                    <img src={r.featuredImageUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                      <BookOpen className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex min-w-0 flex-col gap-0.5">
                                  <button
                                    type="button"
                                    className="truncate text-left font-medium text-primary hover:underline"
                                    title={r.title}
                                    onClick={() => openEdit(r)}
                                  >
                                    {r.title}
                                  </button>
                                  <span className="text-xs text-muted-foreground">/{r.slug}</span>
                                  <div className="mt-1 space-y-1 md:hidden">
                                    {r.category?.trim() ? (
                                      <Badge variant="secondary" className="w-fit max-w-full truncate font-normal">
                                        {r.category}
                                      </Badge>
                                    ) : null}
                                    <p className="text-xs text-muted-foreground">
                                      {r.publishedAt
                                        ? `${t("Published")}: ${new Date(r.publishedAt).toLocaleDateString()}`
                                        : t("Not published")}
                                    </p>
                                    <Badge variant={statusVariant(r)} className="w-fit capitalize">
                                      {r.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </td>
                          ) : null}
                          {columnVisible("category") ? (
                            <td className="hidden min-w-0 p-3 text-center align-top md:table-cell">
                              {r.category?.trim() ? (
                                <Badge variant="secondary" className="max-w-full truncate font-normal" title={r.category}>
                                  {r.category}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          ) : null}
                          {columnVisible("published") ? (
                            <td className="hidden min-w-0 whitespace-nowrap p-3 text-center align-top lg:table-cell">
                              {r.publishedAt ? new Date(r.publishedAt).toLocaleString() : "—"}
                            </td>
                          ) : null}
                          {columnVisible("updated") ? (
                            <td className="hidden min-w-0 whitespace-nowrap p-3 text-center align-top lg:table-cell">
                              {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : new Date(r.createdAt).toLocaleString()}
                            </td>
                          ) : null}
                          {columnVisible("status") ? (
                            <td className="hidden min-w-0 p-3 text-center align-top md:table-cell">
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant={statusVariant(r)} className="capitalize">
                                  {r.status}
                                </Badge>
                                {r.isFeaturedHome ? (
                                  <Badge variant="outline" className="text-[10px] font-normal">
                                    {t("Featured")}
                                  </Badge>
                                ) : null}
                              </div>
                            </td>
                          ) : null}
                          <td className="min-w-0 p-3 text-right align-top">
                            <TableActionButton
                              label={t("Edit")}
                              primaryIcon={<Pencil className={actionIconCls} />}
                              onPrimaryClick={() => openEdit(r)}
                              items={items}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedRows.map((r) => {
                  const { items } = buildRowActions(r);
                  return (
                    <Card key={r.id} className="overflow-hidden border-border/60 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                            {r.featuredImageUrl ? (
                              <img src={r.featuredImageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <BookOpen className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <button type="button" className="block text-left font-medium text-primary hover:underline" onClick={() => openEdit(r)}>
                              {r.title}
                            </button>
                            <p className="text-xs text-muted-foreground">/{r.slug}</p>
                            {r.category?.trim() ? (
                              <Badge variant="secondary" className="mt-1 max-w-full truncate text-[10px] font-normal">
                                {r.category}
                              </Badge>
                            ) : null}
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                {r.publishedAt ? new Date(r.publishedAt).toLocaleDateString() : t("Not published")}
                              </span>
                              <span>
                                {t("Updated")}{" "}
                                {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : new Date(r.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <Badge variant={statusVariant(r)} className="mt-2 w-fit capitalize">
                              {r.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end border-t border-border/60 pt-3">
                          <TableActionButton
                            label={t("Edit")}
                            primaryIcon={<Pencil className={actionIconCls} />}
                            onPrimaryClick={() => openEdit(r)}
                            items={items}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {!loading && sortedRows.length > 0 ? (
              <div className="border-t border-border/60 pt-4">
                <Pagination page={pageSafe} lastPage={lastPage} total={total} from={from} to={to} onPageChange={setPage} />
              </div>
            ) : null}
          </div>
        </div>
      </StorefrontAdminMainCard>

      <Sheet
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setFeaturedUploadError(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex h-full w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl md:max-w-lg lg:max-w-xl"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-14 text-left">
            <SheetTitle>{editingId ? t("Edit post") : t("New post")}</SheetTitle>
            <SheetDescription>
              {t(
                "Rich text body, excerpt, SEO fields, and a featured image. Slug must be unique per company. Saved to your storefront blog.",
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sf-blog-title">{t("Title")}</Label>
                  <Input id="sf-blog-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf-blog-slug">{t("Slug")}</Label>
                  <Input
                    id="sf-blog-slug"
                    value={slug}
                    onChange={(e) => {
                      setSlugManual(true);
                      setSlug(e.target.value);
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("Website")}</Label>
                  <Select value={websiteId || "__none__"} onValueChange={(v) => setWebsiteId(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("Optional")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("None")}</SelectItem>
                      {websites.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("Status")}</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t("Draft")}</SelectItem>
                      <SelectItem value="published">{t("Published")}</SelectItem>
                      <SelectItem value="archived">{t("Archived")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sf-blog-cat">{t("Category")}</Label>
                <Input id="sf-blog-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("News")} />
              </div>
              <div className="space-y-2">
                <Label>{t("Featured image")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("Upload a cover image (stored per Settings → Storage), or paste a URL below.")}
                </p>
                {featuredUploadError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {featuredUploadError}
                  </p>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  {(featuredBlobPreview ?? "").trim() || featuredImageUrl.trim() ? (
                    <div className="space-y-2">
                      <img
                        src={(featuredBlobPreview ?? "").trim() || featuredImageUrl}
                        alt=""
                        className="max-h-40 w-full max-w-xs rounded-md border bg-muted/30 object-cover"
                      />
                      {featuredImageUploading ? (
                        <p className="text-xs text-muted-foreground">{t("Uploading…")}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="gap-2"
                          disabled={featuredImageUploading}
                          onClick={triggerBlogFeaturedPicker}
                        >
                          {featuredImageUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Upload className="h-4 w-4" aria-hidden />
                          )}
                          {t("Replace image")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={featuredImageUploading}
                          onClick={() => {
                            replaceFeaturedBlob(null);
                            setFeaturedImageUrl("");
                          }}
                        >
                          {t("Remove")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={featuredImageUploading}
                      onClick={triggerBlogFeaturedPicker}
                    >
                      {featuredImageUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Upload className="h-4 w-4" aria-hidden />
                      )}
                      {t("Upload image")}
                    </Button>
                  )}
                </div>
                <details className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                  <summary className="cursor-pointer select-none font-medium text-muted-foreground">{t("Or paste image URL")}</summary>
                  <div className="mt-2 space-y-1">
                    <Label htmlFor="sf-blog-img-url" className="sr-only">
                      {t("Image URL")}
                    </Label>
                    <Input
                      id="sf-blog-img-url"
                      value={featuredImageUrl}
                      onChange={(e) => {
                        replaceFeaturedBlob(null);
                        setFeaturedImageUrl(e.target.value);
                      }}
                      placeholder="https://"
                      className="bg-background"
                    />
                  </div>
                </details>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{t("Feature on home")}</p>
                  <p className="text-xs text-muted-foreground">{t("Mark for theme / widgets that read featured posts.")}</p>
                </div>
                <Switch checked={isFeaturedHome} onCheckedChange={setIsFeaturedHome} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sf-blog-excerpt">{t("Excerpt")}</Label>
                <Textarea id="sf-blog-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>{t("Body")}</Label>
                <RichTextEditor key={editingId ?? "new"} content={bodyHtml} onChange={setBodyHtml} className="min-h-[200px] rounded-md border" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sf-blog-seo-t">{t("SEO title")}</Label>
                  <Input id="sf-blog-seo-t" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="sf-blog-seo-d">{t("SEO description")}</Label>
                  <Textarea id="sf-blog-seo-d" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} />
                </div>
              </div>
              <StorefrontBlogCommentsModeration editorOpen={editorOpen} editingId={editingId} buildApiUrl={buildApiUrl} />
            </div>
          </div>
          <SheetFooter className="shrink-0 flex-row flex-wrap gap-2 border-t bg-muted/20 px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button type="button" onClick={() => void savePost()} disabled={loading} className="gap-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("Save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </StorefrontAdminPageShell>
    </>
  );
}
