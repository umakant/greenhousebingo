"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Ban,
  Boxes,
  Building2,
  Car,
  Check,
  ChevronDown,
  Droplets,
  Edit,
  Eye,
  HardHat,
  HeartPulse,
  Home,
  LayoutGrid,
  Leaf,
  List,
  PartyPopper,
  PawPrint,
  Plug2,
  Plus,
  Printer,
  Route,
  Search,
  Sparkles,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { getBusinessModuleIcon } from "@/lib/business-module-icon";
import {
  INDUSTRY_MODULE_CATEGORIES,
  catalogNormalizedNameSet,
  normalizeIndustryModuleName,
} from "@/lib/industry-modules-catalog";
import {
  OTHER_MODULE_CATEGORY_ID,
  previewNextModuleCode,
  resolveModuleCategoryId,
} from "@/lib/industry-module-codes";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TableActionButton } from "@/components/ui/table-action-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";

const OTHER_CATEGORY_ID = "other-modules";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "outdoor-services": Leaf,
  "cleaning-services": Sparkles,
  "core-trades": Wrench,
  "roofing-exteriors": Home,
  "remodeling-construction": HardHat,
  "paving-services": Route,
  "automotive-services": Car,
  "installation-services": Plug2,
  "restoration-services": Droplets,
  "event-services": PartyPopper,
  "pet-services": PawPrint,
  "health-services": HeartPulse,
  "commercial-services": Building2,
  "printing-products": Printer,
  "food-beverage": UtensilsCrossed,
  [OTHER_CATEGORY_ID]: Boxes,
};

function categoryIcon(id: string): LucideIcon {
  return CATEGORY_ICONS[id] ?? Boxes;
}

type ModuleRow = {
  id: string;
  code?: string | null;
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string | null;
  categoryId?: string;
  categoryTitle?: string;
  categoryCode?: string;
  moduleCode?: string;
};

type ModuleFormData = {
  category_id: string;
  subcategory_name: string;
  name: string;
  description: string;
  is_active: boolean;
  sort_order: number;
};

const defaultFormData: ModuleFormData = {
  category_id: INDUSTRY_MODULE_CATEGORIES[0]?.id ?? "",
  subcategory_name: "",
  name: "",
  description: "",
  is_active: true,
  sort_order: 0,
};

function statusBadge(active: boolean) {
  return (
    <Badge
      className={
        active ? "bg-primary hover:bg-primary text-primary-foreground" : "bg-muted text-foreground"
      }
    >
      {active ? t("Active") : t("Inactive")}
    </Badge>
  );
}

export default function BusinessModulesAdmin() {
  const [items, setItems] = React.useState<ModuleRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"" | "active" | "inactive">("");

  const [selectedModule, setSelectedModule] = React.useState<ModuleRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingModule, setEditingModule] = React.useState<ModuleRow | null>(null);
  const [formData, setFormData] = React.useState<ModuleFormData>(defaultFormData);
  const [saving, setSaving] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [toggling, setToggling] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(12);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [catalogDetailsName, setCatalogDetailsName] = React.useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = React.useState<string>(
    () => INDUSTRY_MODULE_CATEGORIES[0]?.id ?? OTHER_CATEGORY_ID,
  );

  const catalogNameSet = React.useMemo(() => catalogNormalizedNameSet(), []);

  const moduleByNormalizedName = React.useMemo(() => {
    const map = new Map<string, ModuleRow>();
    for (const m of items) {
      map.set(normalizeIndustryModuleName(m.name), m);
    }
    return map;
  }, [items]);

  const uncataloguedModules = React.useMemo(
    () => items.filter((m) => !catalogNameSet.has(normalizeIndustryModuleName(m.name))),
    [items, catalogNameSet],
  );

  const navCategories = React.useMemo(() => {
    const base = [...INDUSTRY_MODULE_CATEGORIES];
    if (uncataloguedModules.length === 0) return base;
    return [
      ...base,
      {
        id: OTHER_CATEGORY_ID,
        title: "OTHER MODULES",
        description: "Business modules in the database that are not listed in the industry catalog above.",
        moduleNames: [] as string[],
      },
    ];
  }, [uncataloguedModules.length]);

  const activeCategory = React.useMemo(
    () => navCategories.find((c) => c.id === activeCategoryId) ?? navCategories[0],
    [navCategories, activeCategoryId],
  );

  React.useEffect(() => {
    if (!navCategories.some((c) => c.id === activeCategoryId) && navCategories[0]) {
      setActiveCategoryId(navCategories[0].id);
    }
  }, [navCategories, activeCategoryId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/business-modules?all=1", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(json?.message || "Failed to load modules.");
      const rows = Array.isArray(json?.items) ? (json.items as ModuleRow[]) : [];
      setItems(rows);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  React.useEffect(() => {
    const onCreate = () => {
      setEditingModule(null);
      setFormData(defaultFormData);
      setIsFormOpen(true);
    };
    window.addEventListener("pf:business-modules:create", onCreate as any);
    return () => window.removeEventListener("pf:business-modules:create", onCreate as any);
  }, []);

  const slotsForCategory = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (activeCategoryId === OTHER_CATEGORY_ID) {
      let list = uncataloguedModules;
      if (term) {
        list = list.filter(
          (m) =>
            (m.name ?? "").toLowerCase().includes(term) ||
            (m.code ?? "").toLowerCase().includes(term) ||
            (m.description ?? "").toLowerCase().includes(term),
        );
      }
      if (statusFilter === "active") list = list.filter((m) => m.isActive);
      if (statusFilter === "inactive") list = list.filter((m) => !m.isActive);
      return { kind: "db" as const, modules: [...list].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")) };
    }
    const names = activeCategory?.moduleNames ?? [];
    const filteredNames = names.filter((n) => {
      if (term && !n.toLowerCase().includes(term)) return false;
      const key = normalizeIndustryModuleName(n);
      const db = moduleByNormalizedName.get(key);
      if (statusFilter === "active") return Boolean(db?.isActive);
      if (statusFilter === "inactive") return db != null && !db.isActive;
      return true;
    });
    return { kind: "catalog" as const, names: filteredNames };
  }, [
    activeCategoryId,
    activeCategory?.moduleNames,
    uncataloguedModules,
    searchTerm,
    statusFilter,
    moduleByNormalizedName,
  ]);

  const isEmptyResults = React.useMemo(() => {
    if (loading) return false;
    if (slotsForCategory.kind === "db") return slotsForCategory.modules.length === 0;
    return slotsForCategory.names.length === 0;
  }, [loading, slotsForCategory]);

  type GridItem =
    | { kind: "db"; key: string; row: ModuleRow }
    | { kind: "catalog"; key: string; name: string };

  const gridItems = React.useMemo((): GridItem[] => {
    if (slotsForCategory.kind === "db") {
      return slotsForCategory.modules.map((m) => ({ kind: "db", key: m.id, row: m }));
    }
    return slotsForCategory.names.map((name) => {
      const m = moduleByNormalizedName.get(normalizeIndustryModuleName(name));
      if (m) return { kind: "db", key: m.id, row: m };
      return { kind: "catalog", key: `cat-${name}`, name };
    });
  }, [slotsForCategory, moduleByNormalizedName]);

  const total = gridItems.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  React.useEffect(() => {
    const tp = Math.max(1, Math.ceil(total / perPage));
    if (page > tp) setPage(tp);
  }, [total, perPage, page]);

  React.useEffect(() => {
    setPage(1);
  }, [activeCategoryId, searchTerm, statusFilter]);

  const pageSlice = React.useMemo(() => {
    const start = (page - 1) * perPage;
    return gridItems.slice(start, start + perPage);
  }, [gridItems, page, perPage]);

  const selectedDetailsIcon = React.useMemo(
    () => getBusinessModuleIcon(selectedModule?.name ?? ""),
    [selectedModule?.name],
  );

  function doSearch() {
    setSearchTerm(searchInput.trim());
    setPage(1);
  }

  function openCreate() {
    setEditingModule(null);
    setFormData({
      ...defaultFormData,
      category_id: activeCategoryId === OTHER_CATEGORY_ID ? INDUSTRY_MODULE_CATEGORIES[0]?.id ?? "" : activeCategoryId,
    });
    setIsFormOpen(true);
  }

  function openCreateFromCatalog(moduleName: string) {
    setCatalogDetailsName(null);
    setEditingModule(null);
    const categoryId = resolveModuleCategoryId(moduleName);
    setFormData({
      ...defaultFormData,
      category_id: categoryId === OTHER_MODULE_CATEGORY_ID ? activeCategoryId : categoryId,
      subcategory_name: moduleName,
      name: moduleName,
    });
    setIsFormOpen(true);
  }

  function openEdit(mod: ModuleRow) {
    setEditingModule(mod);
    const categoryId = mod.categoryId ?? resolveModuleCategoryId(mod.name);
    const inCatalog = INDUSTRY_MODULE_CATEGORIES.some((c) =>
      c.moduleNames.some((n) => normalizeIndustryModuleName(n) === normalizeIndustryModuleName(mod.name)),
    );
    setFormData({
      category_id: categoryId,
      subcategory_name: inCatalog ? mod.name : "",
      name: mod.name,
      description: mod.description ?? "",
      is_active: mod.isActive,
      sort_order: mod.sortOrder,
    });
    setIsFormOpen(true);
  }

  function openDetails(mod: ModuleRow) {
    setSelectedModule(mod);
    setIsDetailsOpen(true);
  }

  const formCategory = React.useMemo(
    () => INDUSTRY_MODULE_CATEGORIES.find((c) => c.id === formData.category_id),
    [formData.category_id],
  );

  const formSubcategoryOptions = React.useMemo(() => {
    if (!formCategory) return [];
    return formCategory.moduleNames.filter((moduleName) => {
      const existing = moduleByNormalizedName.get(normalizeIndustryModuleName(moduleName));
      if (!existing) return true;
      if (editingModule && existing.id === editingModule.id) return true;
      return false;
    });
  }, [formCategory, moduleByNormalizedName, editingModule]);

  const formIdPreview = React.useMemo(() => {
    const moduleName = (formData.subcategory_name || formData.name).trim();
    if (!moduleName || !formData.category_id) return null;
    if (editingModule?.moduleCode) {
      return {
        categoryCode: editingModule.categoryCode ?? "",
        moduleCode: editingModule.moduleCode,
      };
    }
    return previewNextModuleCode(moduleName, formData.category_id, items);
  }, [formData.subcategory_name, formData.name, formData.category_id, editingModule, items]);

  async function saveForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const moduleName = (formData.subcategory_name || formData.name).trim();
      if (!formData.category_id) {
        throw new Error(t("Please select a category."));
      }
      if (!editingModule && formCategory && !formData.subcategory_name.trim() && !formData.name.trim()) {
        throw new Error(t("Please select a sub-category."));
      }
      const payload = {
        category_id: formData.category_id,
        name: moduleName,
        description: formData.description,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      };
      const res = await fetch(
        editingModule ? `/api/business-modules/${editingModule.id}` : "/api/business-modules",
        {
          method: editingModule ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(json?.message || (editingModule ? "Update failed." : "Create failed."));
      setIsFormOpen(false);
      setEditingModule(null);
      setFormData(defaultFormData);
      await load();
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: ModuleRow) {
    setToggling(true);
    try {
      const res = await fetch(`/api/business-modules/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: !row.isActive }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.message || "Update failed.");
        return;
      }
      await load();
    } finally {
      setToggling(false);
    }
  }

  function renderDbModuleGridCard(m: ModuleRow) {
    const active = m.isActive;
    const ModuleIcon = getBusinessModuleIcon(m.name);
    const moduleLabel = (m.moduleCode ?? m.code ?? "").trim() || normalizeIndustryModuleName(m.name) || "—";
    const categoryLabel = (m.categoryCode ?? "").trim();
    return (
      <div key={m.id} className="rounded-lg border bg-background overflow-hidden shadow-sm">
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <ModuleIcon className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {categoryLabel ? (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 max-w-[140px] truncate" title={categoryLabel}>
                  {categoryLabel}
                </Badge>
              ) : null}
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-mono max-w-[140px] truncate" title={moduleLabel}>
                {moduleLabel}
              </Badge>
              <Badge
                className={
                  active ? "bg-primary hover:bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }
              >
                {active ? t("Active") : t("Inactive")}
              </Badge>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium leading-tight line-clamp-2 min-h-[2.5rem]">{m.name}</div>
            <div className="text-xs text-muted-foreground mt-1 line-clamp-1" title={m.description ?? ""}>
              {m.description || t("No description")}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              v1.0.0 · {t("Company")} · $0.00/mo
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div
            className={cn(
              "flex w-full overflow-hidden rounded-md border border-input bg-background shadow-sm",
              "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
            )}
          >
            <Button
              type="button"
              variant="ghost"
              className="h-9 flex-1 gap-2 rounded-none border-0 shadow-none text-foreground hover:bg-muted/70"
              onClick={() => openDetails(m)}
              disabled={toggling}
            >
              <Eye className="h-4 w-4 shrink-0 opacity-80" />
              {t("Details")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-none border-0 border-l border-input shadow-none hover:bg-muted/70"
              onClick={() => void toggle(m)}
              disabled={toggling}
              aria-label={active ? t("Deactivate module") : t("Activate module")}
              title={active ? t("Deactivate") : t("Activate")}
            >
              {active ? (
                <Ban className="h-4 w-4 text-destructive" />
              ) : (
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function renderCatalogPlaceholderCard(catalogName: string) {
    const ModuleIcon = getBusinessModuleIcon(catalogName);
    const categoryId =
      activeCategoryId === OTHER_CATEGORY_ID
        ? resolveModuleCategoryId(catalogName)
        : activeCategoryId;
    const preview = previewNextModuleCode(catalogName, categoryId, items);
    const subtitle = t("Add this module to the platform catalog.");
    return (
      <div key={`cat-${catalogName}`} className="rounded-lg border bg-background overflow-hidden shadow-sm">
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <ModuleIcon className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 max-w-[140px] truncate" title={preview.categoryCode}>
                {preview.categoryCode}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-mono max-w-[140px] truncate" title={preview.moduleCode}>
                {preview.moduleCode}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/60 text-foreground">
                {t("Not created")}
              </Badge>
            </div>
          </div>
          <div className="mt-3">
            <div className="font-medium leading-tight line-clamp-2 min-h-[2.5rem]">{catalogName}</div>
            <div className="text-xs text-muted-foreground mt-1 line-clamp-1" title={subtitle}>
              {subtitle}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              v— · {t("Catalog")} · $0.00/mo
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">
          <div
            className={cn(
              "flex w-full overflow-hidden rounded-md border border-input bg-background shadow-sm",
              "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
            )}
          >
            <Button
              type="button"
              variant="ghost"
              className="h-9 flex-1 gap-2 rounded-none border-0 shadow-none text-foreground hover:bg-muted/70"
              onClick={() => setCatalogDetailsName(catalogName)}
            >
              <Eye className="h-4 w-4 shrink-0 opacity-80" />
              {t("Details")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-none border-0 border-l border-input shadow-none hover:bg-muted/70"
              onClick={() => openCreateFromCatalog(catalogName)}
              aria-label={t("Add module")}
              title={t("Add module")}
            >
              <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function renderListRow(item: GridItem) {
    if (item.kind === "db") {
      const m = item.row;
      const ModuleIcon = getBusinessModuleIcon(m.name);
      return (
        <tr key={item.key} className="border-b hover:bg-muted/20">
          <td className="px-3 py-2 font-mono text-xs">{m.moduleCode ?? m.code ?? "-"}</td>
          <td className="px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                <ModuleIcon className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <div>
                <div className="text-sm font-medium">{m.name}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{statusBadge(m.isActive)}</div>
              </div>
            </div>
          </td>
          <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs">
            <div className="line-clamp-2">{m.description || t("No description")}</div>
          </td>
          <td className="px-3 py-2 text-xs text-muted-foreground">
            {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}
          </td>
          <td className="px-3 py-2 text-right">
            <div className="flex justify-end">
              <TableActionButton
                label={t("Details")}
                onPrimaryClick={() => openDetails(m)}
                disabled={toggling}
                items={[
                  {
                    label: t("Details"),
                    onSelect: () => openDetails(m),
                    icon: <Eye className="h-4 w-4" />,
                  },
                  {
                    label: t("Edit"),
                    onSelect: () => openEdit(m),
                    icon: <Edit className="h-4 w-4" />,
                  },
                  m.isActive
                    ? {
                        label: t("Deactivate"),
                        onSelect: () => void toggle(m),
                        icon: <Ban className="h-4 w-4" />,
                        destructive: true,
                      }
                    : {
                        label: t("Activate"),
                        onSelect: () => void toggle(m),
                        icon: <Check className="h-4 w-4" />,
                      },
                ]}
              />
            </div>
          </td>
        </tr>
      );
    }
    const name = item.name;
    const ModuleIcon = getBusinessModuleIcon(name);
    return (
      <tr key={item.key} className="border-b hover:bg-muted/20">
        <td className="px-3 py-2 font-mono text-xs">—</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <ModuleIcon className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <div>
              <div className="text-sm font-medium">{name}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">
                  {t("Not created")}
                </Badge>
              </div>
            </div>
          </div>
        </td>
        <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs">
          {t("Add this module to the platform catalog.")}
        </td>
        <td className="px-3 py-2 text-xs text-muted-foreground">—</td>
        <td className="px-3 py-2 text-right">
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setCatalogDetailsName(name)}>
              {t("Details")}
            </Button>
            <Button type="button" size="sm" onClick={() => openCreateFromCatalog(name)}>
              {t("Add module")}
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="shrink-0 md:w-64 md:border-r md:border-border md:pr-6">
          <div className="md:sticky md:top-4">
            <div className="md:hidden -mx-1 px-1">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {navCategories.map((c) => {
                  const NavIcon = categoryIcon(c.id);
                  return (
                    <Button
                      key={c.id}
                      type="button"
                      variant={activeCategoryId === c.id ? "default" : "outline"}
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={() => setActiveCategoryId(c.id)}
                    >
                      <NavIcon className="h-4 w-4 mr-2 shrink-0" />
                      {c.title}
                    </Button>
                  );
                })}
              </div>
            </div>
            <ScrollArea className="hidden md:block h-[min(70vh,calc(100vh-8rem))]">
              <div className="space-y-1 pr-4">
                {navCategories.map((c) => {
                  const NavIcon = categoryIcon(c.id);
                  return (
                    <Button
                      key={c.id}
                      type="button"
                      variant="ghost"
                      className={cn(
                        "h-auto min-h-10 w-full justify-start whitespace-normal py-2 text-left",
                        activeCategoryId === c.id && "bg-muted font-semibold",
                      )}
                      onClick={() => setActiveCategoryId(c.id)}
                    >
                      <NavIcon className="mr-2 h-4 w-4 shrink-0 self-start mt-0.5" />
                      <span className="text-[13px] leading-snug">{c.title}</span>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{activeCategory?.title}</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{activeCategory?.description}</p>
            </div>
            <Button type="button" size="icon" className="h-9 w-9 shrink-0" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              <span className="sr-only">{t("Create Module")}</span>
            </Button>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-4 border-b">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-lg">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={t("Search modules...")}
                    className="pl-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        doSearch();
                      }
                    }}
                  />
                </div>
                <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
                  <Button type="button" onClick={doSearch} className="w-full shrink-0 md:w-auto">
                    {t("Search")}
                  </Button>
                  <select
                    className="h-10 min-w-[140px] rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as "" | "active" | "inactive")}
                    aria-label={t("Module status")}
                  >
                    <option value="">{t("All modules")}</option>
                    <option value="active">{t("Active only")}</option>
                    <option value="inactive">{t("Inactive only")}</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{t("View")}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant={viewMode === "grid" ? "secondary" : "ghost"}
                      onClick={() => setViewMode("grid")}
                      aria-label={t("Grid view")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      onClick={() => setViewMode("list")}
                      aria-label={t("List view")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>

                  <select
                    className="h-10 min-w-[120px] rounded-md border border-input bg-background px-2 text-sm"
                    value={String(perPage)}
                    onChange={(e) => {
                      const next = Number(e.target.value || "12");
                      setPerPage(next);
                      setPage(1);
                    }}
                    aria-label={t("Per page")}
                  >
                    <option value="12">{t("12 per page")}</option>
                    <option value="20">{t("20 per page")}</option>
                    <option value="50">{t("50 per page")}</option>
                  </select>

                  <DropdownMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="h-10">
                        {t("Filters")}
                        <ChevronDown className="ml-2 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 p-3">
                      <div className="space-y-2">
                        <div>
                          <div className="mb-1 text-xs text-muted-foreground">{t("Status")}</div>
                          <select
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as "" | "active" | "inactive")}
                          >
                            <option value="">{t("All modules")}</option>
                            <option value="active">{t("Active only")}</option>
                            <option value="inactive">{t("Inactive only")}</option>
                          </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setStatusFilter("");
                              setFiltersOpen(false);
                              setPage(1);
                            }}
                          >
                            {t("Clear")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setFiltersOpen(false);
                              setPage(1);
                            }}
                          >
                            {t("Apply")}
                          </Button>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>

            <CardContent className="p-4">
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Boxes className="h-4 w-4" />
                <span>{t("Modules")}</span>
              </div>

              {loading ? (
                <div className="py-16 text-center text-muted-foreground">{t("Loading...")}</div>
              ) : isEmptyResults ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <div className="mx-auto max-w-md space-y-2">
                    <div className="font-medium">{t("No modules found")}</div>
                    <div className="text-sm">
                      {searchTerm || statusFilter
                        ? t("No modules match your filters.")
                        : activeCategoryId === OTHER_CATEGORY_ID
                          ? t("No uncatalogued modules in the database.")
                          : t("No modules in this category.")}
                    </div>
                    <div className="pt-2">
                      <Button type="button" size="sm" onClick={openCreate}>
                        {t("Create Module")}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {pageSlice.map((item) =>
                    item.kind === "db"
                      ? renderDbModuleGridCard(item.row)
                      : renderCatalogPlaceholderCard(item.name),
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("Code")}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("Name")}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("Description")}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("Created")}
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("Actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>{pageSlice.map((item) => renderListRow(item))}</tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {t("Showing")} {from} {t("to")} {to} {t("of")} {total} {t("results")}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    {t("Previous")}
                  </Button>
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground">
                    {page}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    {t("Next")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Details dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                {React.createElement(selectedDetailsIcon, {
                  className: "h-4 w-4 text-primary",
                  "aria-hidden": true,
                })}
              </div>
              {selectedModule?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedModule?.description || t("No description provided.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">{t("Category ID")}:</span>
                <p>{selectedModule?.categoryCode ?? "-"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">{t("Sub-category ID")}:</span>
                <p className="font-mono">{selectedModule?.moduleCode ?? selectedModule?.code ?? "-"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">{t("Status")}:</span>
                <div className="mt-1">
                  <Badge
                    className={
                      selectedModule?.isActive
                        ? "bg-primary hover:bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }
                  >
                    {selectedModule?.isActive ? t("Active") : t("Inactive")}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-600">{t("Sort Order")}:</span>
                <p>{selectedModule?.sortOrder ?? 0}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!selectedModule) return;
                  setIsDetailsOpen(false);
                  openEdit(selectedModule);
                }}
                className="flex-1"
              >
                <Edit className="mr-2 h-4 w-4" />
                {t("Edit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={catalogDetailsName != null} onOpenChange={(open) => !open && setCatalogDetailsName(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                {catalogDetailsName
                  ? React.createElement(getBusinessModuleIcon(catalogDetailsName), {
                      className: "h-4 w-4 text-primary",
                      "aria-hidden": true,
                    })
                  : null}
              </div>
              <span>{catalogDetailsName}</span>
            </DialogTitle>
            <DialogDescription className="space-y-2">
              {activeCategory?.description ? <p>{activeCategory.description}</p> : null}
              <p>{t("This catalog entry is not yet created in the database.")}</p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setCatalogDetailsName(null)}>
              {t("Close")}
            </Button>
            {catalogDetailsName ? (
              <Button type="button" onClick={() => openCreateFromCatalog(catalogDetailsName)}>
                {t("Add module")}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit — right drawer */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-full max-w-full flex-col gap-0 border-l p-0 sm:max-w-xl"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-14 text-left">
            <SheetTitle>{editingModule ? t("Edit Module") : t("Create Module")}</SheetTitle>
            <SheetDescription>
              {editingModule
                ? t("Update the module name, description, sort order, and status.")
                : t("Create a new business module for the platform catalog.")}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={saveForm} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {!editingModule ? (
                <>
                  <div>
                    <Label htmlFor="category_id" required>
                      {t("Category")}
                    </Label>
                    <select
                      id="category_id"
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                      value={formData.category_id}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          category_id: e.target.value,
                          subcategory_name: "",
                          name: "",
                        }))
                      }
                      required
                    >
                      <option value="">{t("Select a category")}</option>
                      {INDUSTRY_MODULE_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="subcategory_name" required>
                      {t("Sub-category")}
                    </Label>
                    <select
                      id="subcategory_name"
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                      value={formData.subcategory_name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData((p) => ({
                          ...p,
                          subcategory_name: value,
                          name: value,
                        }));
                      }}
                      required
                      disabled={!formData.category_id}
                    >
                      <option value="">{t("Select a sub-category")}</option>
                      {formSubcategoryOptions.map((moduleName) => (
                        <option key={moduleName} value={moduleName}>
                          {moduleName}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("Choose the catalog sub-category this module belongs under.")}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <Label htmlFor="name" required>
                    {t("Module Name")}
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                  {formData.category_id ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("Category")}: {formCategory?.title ?? resolveModuleCategoryId(formData.name)}
                    </p>
                  ) : null}
                </div>
              )}

              {formIdPreview ? (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Module IDs")}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("Category ID")}</p>
                      <p className="font-medium">{formIdPreview.categoryCode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("Sub-category ID")}</p>
                      <p className="font-medium font-mono">{formIdPreview.moduleCode}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <Label htmlFor="description">{t("Description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder={t("Brief description of this module...")}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sort_order">{t("Sort Order")}</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    min={0}
                    value={String(formData.sort_order)}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, sort_order: Number(e.target.value || "0") }))
                    }
                  />
                </div>
                <div>
                  <Label>{t("Status")}</Label>
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                    />
                    {formData.is_active ? t("Active") : t("Inactive")}
                  </label>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("Saving...") : editingModule ? t("Update") : t("Create")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
