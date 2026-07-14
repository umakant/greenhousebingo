"use client";

import * as React from "react";
import {
  Leaf,
  Loader2,
  PawPrint,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Sprout,
  Tags,
} from "lucide-react";
import { toast } from "sonner";

import NoRecordsFound from "@/components/no-records-found";
import MediaPicker from "@/components/MediaPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { appConfirm } from "@/lib/app-confirm";
import {
  EVENT_PLANT_CARE_LEVELS,
  type EventPlantCatalogDto,
  type PlantAiDetails,
} from "@/lib/event-platform/plant-catalog/plant-catalog-types";
import { cn } from "@/lib/utils";

const emptyForm = {
  name: "",
  scientificName: "",
  category: "",
  careLevel: "Easy",
  light: "",
  water: "",
  petSafe: false,
  description: "",
  imageUrl: "",
  retailValue: null as number | null,
  sortOrder: 0,
  status: "active",
};

const CARE_DOT: Record<string, string> = {
  Easy: "bg-emerald-500",
  Moderate: "bg-amber-500",
  Difficult: "bg-rose-500",
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type SortKey = "order" | "name" | "recent" | "care";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function PlantThumbnail(props: { imageUrl: string | null; name: string }) {
  if (props.imageUrl?.trim()) {
    return (
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={props.imageUrl} alt={props.name} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
      <Leaf className="h-5 w-5" />
    </div>
  );
}

function StatCard(props: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint: string;
  tone: string;
}) {
  const Icon = props.icon;
  return (
    <Card className="flex items-start gap-3 p-4">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", props.tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
        <p className="mt-0.5 truncate text-xl font-bold tracking-tight">{props.value}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{props.hint}</p>
      </div>
    </Card>
  );
}

export function EventPlatformPlantInventoryAdmin() {
  const [plants, setPlants] = React.useState<EventPlantCatalogDto[] | null>(null);
  const [search, setSearch] = React.useState("");
  const [careFilter, setCareFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("order");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const reload = React.useCallback(async () => {
    const res = await fetch("/api/event-platform/plant-inventory", {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      items?: EventPlantCatalogDto[];
      message?: string;
    } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not load plant inventory.");
      setPlants([]);
      return;
    }
    setPlants(data.items ?? []);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const stats = React.useMemo(() => {
    const list = plants ?? [];
    const active = list.filter((p) => p.status === "active");
    const categories = new Set(
      list.map((p) => (p.category ?? "").trim().toLowerCase()).filter(Boolean),
    ).size;
    const petSafe = list.filter((p) => p.petSafe).length;

    let lastUpdated: string | null = null;
    let lastUpdatedBy: string | null = null;
    for (const p of list) {
      const stamp = p.updatedAt ?? p.createdAt;
      if (!lastUpdated || new Date(stamp).getTime() > new Date(lastUpdated).getTime()) {
        lastUpdated = stamp;
        lastUpdatedBy = p.updatedByName;
      }
    }

    return {
      total: list.length,
      active: active.length,
      categories,
      petSafe,
      lastUpdated,
      lastUpdatedBy,
    };
  }, [plants]);

  const filtered = React.useMemo(() => {
    if (!plants) return [];
    const q = search.trim().toLowerCase();
    let rows = plants.filter((p) => {
      if (careFilter !== "all" && p.careLevel !== careFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.scientificName ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });

    rows = [...rows].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "care":
          return a.careLevel.localeCompare(b.careLevel) || a.sortOrder - b.sortOrder;
        case "recent":
          return (
            new Date(b.updatedAt ?? b.createdAt).getTime() -
            new Date(a.updatedAt ?? a.createdAt).getTime()
          );
        case "order":
        default:
          return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
      }
    });

    return rows;
  }, [plants, search, careFilter, statusFilter, sortKey]);

  React.useEffect(() => {
    setPage(1);
  }, [search, careFilter, statusFilter, sortKey, pageSize]);

  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, lastPage);
  const start = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const filtersActive =
    search.trim() !== "" || careFilter !== "all" || statusFilter !== "all" || sortKey !== "order";

  function resetFilters() {
    setSearch("");
    setCareFilter("all");
    setStatusFilter("all");
    setSortKey("order");
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, sortOrder: (plants?.length ?? 0) + 1 });
    setSheetOpen(true);
  }

  function openEdit(plant: EventPlantCatalogDto) {
    setEditingId(plant.id);
    setForm({
      name: plant.name,
      scientificName: plant.scientificName ?? "",
      category: plant.category ?? "",
      careLevel: plant.careLevel,
      light: plant.light ?? "",
      water: plant.water ?? "",
      petSafe: plant.petSafe,
      description: plant.description ?? "",
      imageUrl: plant.imageUrl ?? "",
      retailValue: plant.retailValue,
      sortOrder: plant.sortOrder,
      status: plant.status,
    });
    setSheetOpen(true);
  }

  async function generateDetails() {
    const name = form.name.trim();
    if (!name) {
      toast.error("Enter a plant name first.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/event-platform/plant-inventory/ai-generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        details?: PlantAiDetails;
        message?: string;
      } | null;
      if (!res.ok || !data?.ok || !data.details) {
        toast.error(data?.message ?? "Could not generate details.");
        return;
      }
      const d = data.details;
      setForm((f) => ({
        ...f,
        scientificName: d.scientificName || f.scientificName,
        category: d.category || f.category,
        careLevel: d.careLevel || f.careLevel,
        light: d.light || f.light,
        water: d.water || f.water,
        petSafe: d.petSafe,
        description: d.description || f.description,
      }));
      toast.success("Details generated. Review before saving.");
    } finally {
      setGenerating(false);
    }
  }

  async function savePlant() {
    const name = form.name.trim();
    if (!name) {
      toast.error("Plant name is required.");
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `/api/event-platform/plant-inventory/${editingId}`
        : "/api/event-platform/plant-inventory";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not save plant.");
        return;
      }
      toast.success(editingId ? "Plant updated." : "Plant added.");
      setSheetOpen(false);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function archivePlant(id: string) {
    const res = await fetch(`/api/event-platform/plant-inventory/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not archive plant.");
      return;
    }
    toast.success("Plant archived.");
    await reload();
  }

  async function deletePlant(plant: EventPlantCatalogDto) {
    const confirmed = await appConfirm({
      title: "Delete plant",
      description: `Permanently delete "${plant.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    const res = await fetch(`/api/event-platform/plant-inventory/${plant.id}?permanent=1`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not delete plant.");
      return;
    }
    toast.success("Plant deleted.");
    await reload();
  }

  function plantRowActions(plant: EventPlantCatalogDto) {
    const items: TableActionItem[] = [];
    if (plant.status === "active") {
      items.push({ label: "Archive", onSelect: () => void archivePlant(plant.id) });
    }
    items.push({
      label: "Delete",
      onSelect: () => void deletePlant(plant),
      destructive: true,
    });
    return {
      label: "Edit",
      onPrimaryClick: () => openEdit(plant),
      items,
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plant Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build a reusable library of plants. Type a name and let AI fill in the care details.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          Add Plant
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={Sprout}
          label="Total Plants"
          value={stats.total}
          hint="All plants in library"
          tone="bg-sky-500/10 text-sky-600 dark:text-sky-400"
        />
        <StatCard
          icon={Leaf}
          label="Active Plants"
          value={stats.active}
          hint="Currently active"
          tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={Tags}
          label="Categories"
          value={stats.categories}
          hint="Distinct categories"
          tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={PawPrint}
          label="Pet-Safe"
          value={stats.petSafe}
          hint="Non-toxic to pets"
          tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        />
        <StatCard
          icon={Sparkles}
          label="Last Updated"
          value={formatDate(stats.lastUpdated)}
          hint={stats.lastUpdatedBy ? `By ${stats.lastUpdatedBy}` : "—"}
          tone="bg-rose-500/10 text-rose-600 dark:text-rose-400"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search plants by name, species, or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={careFilter} onValueChange={setCareFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Care Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Care Levels</SelectItem>
            {EVENT_PLANT_CARE_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="order">Order</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="care">Care level</SelectItem>
            <SelectItem value="recent">Recently updated</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={resetFilters}
          disabled={!filtersActive}
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {plants === null ? (
          <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading plant inventory…
          </div>
        ) : filtered.length === 0 ? (
          <NoRecordsFound
            icon={Sprout}
            title={plants.length === 0 ? "No plants yet" : "No plants match your filters"}
            description={
              plants.length === 0
                ? "Add plants to your inventory, then assign them as prizes when creating events."
                : "Try adjusting your search or filters."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[64px]">#</TableHead>
                <TableHead>Plant</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Care level</TableHead>
                <TableHead>Pet-safe</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((plant, index) => (
                <TableRow key={plant.id}>
                  <TableCell>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {String(start + index + 1).padStart(2, "0")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <PlantThumbnail imageUrl={plant.imageUrl} name={plant.name} />
                      <div className="min-w-0">
                        <span className="font-medium">{plant.name}</span>
                        {plant.scientificName ? (
                          <p className="mt-0.5 max-w-[220px] truncate text-xs italic text-muted-foreground">
                            {plant.scientificName}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {plant.category || "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          CARE_DOT[plant.careLevel] ?? "bg-muted-foreground",
                        )}
                      />
                      {plant.careLevel}
                    </span>
                  </TableCell>
                  <TableCell>
                    {plant.petSafe ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        Pet-safe
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-sm">
                    {plant.retailValue != null ? `$${plant.retailValue.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        plant.status === "active"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {plant.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDate(plant.updatedAt ?? plant.createdAt)}</div>
                    {plant.updatedByName ? (
                      <div className="text-xs text-muted-foreground">{plant.updatedByName}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <TableActionButton {...plantRowActions(plant)} className="ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {plants && filtered.length > 0 ? (
          <div className="flex flex-col gap-3 border-t px-4 py-3 md:flex-row md:items-center md:justify-between">
            <Pagination
              page={safePage}
              lastPage={lastPage}
              total={total}
              from={total === 0 ? 0 : start + 1}
              to={Math.min(start + pageSize, total)}
              onPageChange={setPage}
              entityLabel="plants"
            />
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>{editingId ? "Edit plant" : "Add plant"}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pl-name">Plant name</Label>
                <div className="flex gap-2">
                  <Input
                    id="pl-name"
                    autoComplete="off"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Golden Pothos"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void generateDetails();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    onClick={() => void generateDetails()}
                    disabled={generating || !form.name.trim()}
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-amber-500" />
                    )}
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a name and click Generate to auto-fill species, care, and description with AI.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pl-scientific">Scientific name</Label>
                <Input
                  id="pl-scientific"
                  autoComplete="off"
                  value={form.scientificName}
                  onChange={(e) => setForm((f) => ({ ...f, scientificName: e.target.value }))}
                  placeholder="Epipremnum aureum"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pl-category">Category</Label>
                  <Input
                    id="pl-category"
                    autoComplete="off"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="Foliage"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Care level</Label>
                  <Select
                    value={form.careLevel}
                    onValueChange={(v) => setForm((f) => ({ ...f, careLevel: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_PLANT_CARE_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pl-light">Light</Label>
                  <Input
                    id="pl-light"
                    autoComplete="off"
                    value={form.light}
                    onChange={(e) => setForm((f) => ({ ...f, light: e.target.value }))}
                    placeholder="Bright indirect light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pl-water">Water</Label>
                  <Input
                    id="pl-water"
                    autoComplete="off"
                    value={form.water}
                    onChange={(e) => setForm((f) => ({ ...f, water: e.target.value }))}
                    placeholder="Weekly when top inch is dry"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Pet-safe</Label>
                  <Select
                    value={form.petSafe ? "yes" : "no"}
                    onValueChange={(v) => setForm((f) => ({ ...f, petSafe: v === "yes" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes — non-toxic</SelectItem>
                      <SelectItem value="no">No — keep from pets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Retail value</Label>
                  <CurrencyInput
                    value={form.retailValue}
                    onChange={(v) => setForm((f) => ({ ...f, retailValue: v }))}
                    showSymbol
                    allowEmpty
                    placeholder="0.00"
                  />
                </div>
              </div>

              <MediaPicker
                id="pl-image"
                label="Plant image"
                value={form.imageUrl}
                onChange={(v) => setForm((f) => ({ ...f, imageUrl: typeof v === "string" ? v : v[0] ?? "" }))}
                placeholder="Upload plant image…"
              />

              <div className="space-y-2">
                <Label htmlFor="pl-desc">Description</Label>
                <Textarea
                  id="pl-desc"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short, customer-facing description shown on the prize card."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pl-sort">Sort order</Label>
                  <Input
                    id="pl-sort"
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <SheetFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void savePlant()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingId ? "Save changes" : "Add plant"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
