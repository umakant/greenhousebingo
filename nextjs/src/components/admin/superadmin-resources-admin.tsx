"use client";

import * as React from "react";
import {
  ChevronDown,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import MediaPicker from "@/components/MediaPicker";
import { appConfirm } from "@/lib/app-confirm";
import { t } from "@/lib/admin-t";
import {
  categoryBadgeClass,
  resourceTypeLabel,
  SUPERADMIN_RESOURCE_TYPES,
  userInitials,
  type SuperadminResourceDto,
  type SuperadminResourceStats,
  type SuperadminResourceType,
} from "@/lib/superadmin-resources";
import { getImagePath } from "@/utils/image-path";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { cn } from "@/lib/utils";

type TabKey = "all" | "favorites" | "mine" | "recent";

type FormState = {
  title: string;
  url: string;
  description: string;
  category: string;
  resourceType: SuperadminResourceType;
  status: "PUBLISHED" | "DRAFT";
  sortOrder: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  url: "",
  description: "",
  category: "",
  resourceType: "LINK",
  status: "PUBLISHED",
  sortOrder: "0",
};

function typeIcon(type: SuperadminResourceType) {
  switch (type) {
    case "DOCUMENT":
      return FileText;
    case "VIDEO":
      return Video;
    case "SPREADSHEET":
      return FileSpreadsheet;
    case "IMAGE":
      return ImageIcon;
    default:
      return Link2;
  }
}

function resourceHref(url: string): string {
  return getImagePath(url) || url;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" });
}

export default function SuperadminResourcesAdmin() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<SuperadminResourceDto[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [stats, setStats] = React.useState<SuperadminResourceStats | null>(null);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [tab, setTab] = React.useState<TabKey>("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [lastPage, setLastPage] = React.useState(1);

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(
    async (opts?: {
      q?: string;
      category?: string;
      type?: string;
      tab?: TabKey;
      page?: number;
      perPage?: number;
    }) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        const q = (opts?.q ?? search).trim();
        const cat = opts?.category ?? categoryFilter;
        const typ = opts?.type ?? typeFilter;
        const activeTab = opts?.tab ?? tab;
        const p = opts?.page ?? page;
        const pp = opts?.perPage ?? perPage;
        if (q) qs.set("q", q);
        if (cat) qs.set("category", cat);
        if (typ) qs.set("type", typ);
        qs.set("tab", activeTab);
        qs.set("page", String(p));
        qs.set("per_page", String(pp));

        const res = await fetch(`/api/admin/resources?${qs.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json()) as {
          ok?: boolean;
          items?: SuperadminResourceDto[];
          categories?: string[];
          stats?: SuperadminResourceStats;
          pagination?: { page: number; perPage: number; total: number; lastPage: number };
          message?: string;
        };
        if (!res.ok || !json.ok) throw new Error(json.message ?? "Failed to load resources.");
        setItems(json.items ?? []);
        setCategories(json.categories ?? []);
        setStats(json.stats ?? null);
        if (json.pagination) {
          setPage(json.pagination.page);
          setPerPage(json.pagination.perPage);
          setTotal(json.pagination.total);
          setLastPage(json.pagination.lastPage);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load resources.");
      } finally {
        setLoading(false);
      }
    },
    [search, categoryFilter, typeFilter, tab, page, perPage],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setMode("add");
    setEditId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(row: SuperadminResourceDto) {
    setMode("edit");
    setEditId(row.id);
    setForm({
      title: row.title,
      url: row.url,
      description: row.description ?? "",
      category: row.category ?? "",
      resourceType: row.resourceType,
      status: row.status,
      sortOrder: String(row.sortOrder),
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        url: form.url.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        resourceType: form.resourceType,
        status: form.status,
        sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
      };
      const url = mode === "add" ? "/api/admin/resources" : `/api/admin/resources/${editId}`;
      const method = mode === "add" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Save failed.");
      toast.success(mode === "add" ? t("Resource added.") : t("Resource updated."));
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!(await appConfirm(t("Delete this resource?")))) return;
    try {
      const res = await fetch(`/api/admin/resources/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Delete failed.");
      toast.success(t("Resource deleted."));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  async function toggleFavorite(row: SuperadminResourceDto) {
    try {
      const res = await fetch(`/api/admin/resources/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isFavorite: !row.isFavorite }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Update failed.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    }
  }

  async function exportJson() {
    try {
      const res = await fetch("/api/admin/resources?per_page=500&tab=all", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as { ok?: boolean; items?: SuperadminResourceDto[] };
      if (!res.ok || !json.ok || !json.items) throw new Error("Export failed.");
      const blob = new Blob([JSON.stringify(json.items, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "superadmin-resources.json";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    }
  }

  const categoryOptions = React.useMemo(() => {
    const fromItems = new Set(categories);
    for (const i of items) {
      if (i.category) fromItems.add(i.category);
    }
    return Array.from(fromItems).sort((a, b) => a.localeCompare(b));
  }, [items, categories]);

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  function resourceRowActions(row: SuperadminResourceDto): TableActionItem[] {
    return [
      {
        label: t("Open link"),
        onSelect: () => window.open(row.url, "_blank", "noopener,noreferrer"),
        icon: <ExternalLink className="h-4 w-4" />,
      },
      {
        label: row.isFavorite ? t("Remove from favorites") : t("Add to favorites"),
        onSelect: () => void toggleFavorite(row),
        icon: <Star className={cn("h-4 w-4", row.isFavorite && "fill-amber-400 text-amber-500")} />,
      },
      {
        label: t("Edit"),
        onSelect: () => openEdit(row),
        icon: <Pencil className="h-4 w-4" />,
      },
      {
        label: t("Delete"),
        onSelect: () => void remove(row.id),
        icon: <Trash2 className="h-4 w-4" />,
        destructive: true,
      },
    ];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("Save links your team uses often — production URLs, docs, runbooks, and what each one is for.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t("Add Resource")}
            <ChevronDown className="ml-1 h-4 w-4 opacity-60" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void exportJson()}>
            <Download className="mr-2 h-4 w-4" />
            {t("Export")}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled title={t("Coming soon")}>
            <Upload className="mr-2 h-4 w-4" />
            {t("Import")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toast.message(t("Categories are managed per resource when you add or edit a link."))}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            {t("Manage Categories")}
          </Button>
        </div>
      </div>

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <DashboardStatCard
            label={t("Total Resources")}
            value={stats.total}
            sub={t("All resources")}
            icon={<FolderOpen className="h-4 w-4" />}
          />
          <DashboardStatCard
            label={t("Categories")}
            value={stats.categories}
            sub={t("Resource groups")}
            icon={<FolderOpen className="h-4 w-4" />}
          />
          <DashboardStatCard
            label={t("Documents")}
            value={stats.documents}
            sub={t("Files & documents")}
            icon={<FileText className="h-4 w-4" />}
          />
          <DashboardStatCard
            label={t("Links")}
            value={stats.links}
            sub={t("External & internal links")}
            icon={<Link2 className="h-4 w-4" />}
          />
          <DashboardStatCard
            label={t("Recently Added")}
            value={stats.recentlyAdded}
            sub={t("In last 7 days")}
            icon={<Plus className="h-4 w-4" />}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("Search resources by title, URL, description, or tags…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load({ page: 1, q: search });
            }}
          />
        </div>
        <Select
          value={categoryFilter || "__all__"}
          onValueChange={(v) => {
            const cat = v === "__all__" ? "" : v;
            setCategoryFilter(cat);
            void load({ page: 1, category: cat });
          }}
        >
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder={t("All Categories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("All Categories")}</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter || "__all__"}
          onValueChange={(v) => {
            const typ = v === "__all__" ? "" : v;
            setTypeFilter(typ);
            void load({ page: 1, type: typ });
          }}
        >
          <SelectTrigger className="w-full lg:w-[160px]">
            <SelectValue placeholder={t("All Types")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("All Types")}</SelectItem>
            {SUPERADMIN_RESOURCE_TYPES.map((typ) => (
              <SelectItem key={typ} value={typ}>
                {resourceTypeLabel(typ)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={() => void load({ page: 1 })}>
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          {t("Filters")}
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = v as TabKey;
          setTab(next);
          void load({ tab: next, page: 1 });
        }}
      >
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger
            value="all"
            className="rounded-none border-b-2 border-transparent px-4 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {t("All Resources")} ({stats?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger
            value="favorites"
            className="rounded-none border-b-2 border-transparent px-4 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {t("Favorites")} ({stats?.favorites ?? 0})
          </TabsTrigger>
          <TabsTrigger
            value="mine"
            className="rounded-none border-b-2 border-transparent px-4 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {t("My Resources")} ({stats?.mine ?? 0})
          </TabsTrigger>
          <TabsTrigger
            value="recent"
            className="rounded-none border-b-2 border-transparent px-4 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {t("Recently Added")} ({stats?.recentlyAdded ?? 0})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-lg border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("Loading…")}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("No resources yet.")}</p>
            <Button type="button" variant="link" className="mt-2" onClick={openCreate}>
              {t("Add your first resource")}
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("Or run:")}{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">npm run db:seed:superadmin-resources</code>
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("TITLE")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("CATEGORY")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("TYPE")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("ADDED BY")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("ADDED ON")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("STATUS")}</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("ACTIONS")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const Icon = typeIcon(row.resourceType);
                  return (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 align-top">
                        <div className="flex gap-3">
                          {row.resourceType === "IMAGE" && row.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resourceHref(row.url)}
                              alt=""
                              className="mt-0.5 h-9 w-9 shrink-0 rounded-lg border object-cover"
                            />
                          ) : (
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium leading-snug">{row.title}</p>
                            {row.description ? (
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {row.category ? (
                          <Badge className={cn("font-normal", categoryBadgeClass(row.category))}>{row.category}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                          {resourceTypeLabel(row.resourceType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {row.addedBy ? (
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                              {userInitials(row.addedBy.name)}
                            </span>
                            <span className="truncate">{row.addedBy.name}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-muted-foreground">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge
                          className={
                            row.status === "PUBLISHED"
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {row.status === "PUBLISHED" ? t("Published") : t("Draft")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <TableActionButton
                          className="ml-auto"
                          label={t("Open")}
                          primaryIcon={<ExternalLink className="h-4 w-4" />}
                          onPrimaryClick={() => window.open(resourceHref(row.url), "_blank", "noopener,noreferrer")}
                          items={resourceRowActions(row)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > 0 ? (
          <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t("Showing")} {from} {t("to")} {to} {t("of")} {total} {t("results")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={perPage}
                onChange={(e) => {
                  const pp = Number.parseInt(e.target.value, 10) || 10;
                  setPerPage(pp);
                  void load({ page: 1, perPage: pp });
                }}
              >
                <option value="10">{t("10 per page")}</option>
                <option value="20">{t("20 per page")}</option>
                <option value="50">{t("50 per page")}</option>
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => void load({ page: page - 1 })}
              >
                {t("Previous")}
              </Button>
              <span className="px-2 text-sm text-muted-foreground">
                {page} / {lastPage}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= lastPage}
                onClick={() => void load({ page: page + 1 })}
              >
                {t("Next")}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[480px]">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{mode === "add" ? t("Add Resource") : t("Edit Resource")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={(e) => void save(e)} className="flex flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <Label htmlFor="res-title">{t("Title")}</Label>
                <Input
                  id="res-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={t("e.g. Emergency Response Plan")}
                  required
                />
              </div>
              <div className="space-y-2">
                {form.resourceType === "IMAGE" ? (
                  <MediaPicker
                    label={t("Image")}
                    value={form.url}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, url: typeof v === "string" ? v : v[0] ?? "" }))
                    }
                    acceptExtensions={["jpg", "jpeg", "png", "gif", "webp", "svg"]}
                    placeholder={t("Select or upload an image…")}
                    required
                  />
                ) : (
                  <>
                    <Label htmlFor="res-url">{t("URL")}</Label>
                    <Input
                      id="res-url"
                      value={form.url}
                      onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                      placeholder="https://…"
                      required
                    />
                  </>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("Type")}</Label>
                  <Select
                    value={form.resourceType}
                    onValueChange={(v) => setForm((f) => ({ ...f, resourceType: v as SuperadminResourceType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPERADMIN_RESOURCE_TYPES.map((typ) => (
                        <SelectItem key={typ} value={typ}>
                          {resourceTypeLabel(typ)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("Status")}</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v as "PUBLISHED" | "DRAFT" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLISHED">{t("Published")}</SelectItem>
                      <SelectItem value="DRAFT">{t("Draft")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="res-category">{t("Category (optional)")}</Label>
                <Input
                  id="res-category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder={t("e.g. Operations, Safety, IT")}
                  list="resource-categories"
                />
                <datalist id="resource-categories">
                  {categoryOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="res-desc">{t("What is this used for?")}</Label>
                <Textarea
                  id="res-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={t("Short notes so the team remembers when to use this link.")}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="res-sort">{t("Sort order")}</Label>
                <Input
                  id="res-sort"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("Saving…") : t("Save")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
