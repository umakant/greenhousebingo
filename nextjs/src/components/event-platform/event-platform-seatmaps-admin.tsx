"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Armchair,
  BarChart3,
  Copy,
  Grid3X3,
  Layers,
  LayoutGrid,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeatmapPreviewVisual } from "@/components/event-platform/seatmap-preview-visual";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";
import type {
  SeatmapOverviewPayload,
  SeatmapTemplateRow,
} from "@/lib/event-platform/seatmaps/seatmap-overview-types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 6;

function formatDate(iso: string) {
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (s === "draft") return "bg-muted text-muted-foreground";
  if (s === "archived") return "bg-slate-500/15 text-slate-600 dark:text-slate-400";
  return "bg-muted text-muted-foreground";
}

function KpiCard(props: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
          <p className="text-2xl font-bold tracking-tight">{props.value}</p>
          <p className="text-xs text-muted-foreground">{props.sub}</p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", props.iconClass)}>
          {props.icon}
        </div>
      </CardContent>
    </Card>
  );
}

export function EventPlatformSeatmapsAdmin() {
  const router = useRouter();
  const [data, setData] = React.useState<SeatmapOverviewPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState("active");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/event-platform/seatmaps/overview", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as SeatmapOverviewPayload | { message?: string } | null;
      if (!res.ok || !json || !("ok" in json) || !json.ok) {
        throw new Error((json as { message?: string } | null)?.message ?? "Could not load seat maps.");
      }
      setData(json);
      setSelectedId((prev) => prev ?? json.activeMaps[0]?.id ?? null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not load seat maps.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const sourceList = tab === "archived" ? (data?.archivedMaps ?? []) : (data?.activeMaps ?? []);

  const categories = React.useMemo(() => {
    const set = new Set(sourceList.map((r) => r.category));
    return [...set].sort();
  }, [sourceList]);

  const types = React.useMemo(() => {
    const set = new Set(sourceList.map((r) => r.mapType));
    return [...set].sort();
  }, [sourceList]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return sourceList.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (typeFilter !== "all" && row.mapType !== typeFilter) return false;
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        row.mapType.toLowerCase().includes(q)
      );
    });
  }, [sourceList, search, statusFilter, typeFilter, categoryFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, categoryFilter, tab, perPage]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageSafe = Math.min(page, lastPage);
  const paged = filtered.slice((pageSafe - 1) * perPage, pageSafe * perPage);

  const selected =
    sourceList.find((r) => r.id === selectedId) ??
    filtered.find((r) => r.id === selectedId) ??
    paged[0] ??
    sourceList[0] ??
    null;

  React.useEffect(() => {
    if (paged.length && !paged.some((r) => r.id === selectedId)) {
      setSelectedId(paged[0]?.id ?? null);
    }
  }, [paged, selectedId]);

  async function createMap() {
    if (!newName.trim()) return;
    if (data?.isDemo) {
      toast.message("Demo mode", { description: "Create a real seat map after seeding or clearing demo state." });
      setSheetOpen(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/seatmaps", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), status: "draft" }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; item?: { id: string }; message?: string } | null;
      if (!res.ok || !json?.ok || !json.item) throw new Error(json?.message ?? "Create failed.");
      setSheetOpen(false);
      setNewName("");
      toast.success("Seat map created.");
      router.push(EVENT_PLATFORM_PATHS.seatmapEdit(json.item.id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading seat maps…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">Seat map data could not be loaded.</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Create and manage reusable seat map templates for your ticketed events.
        </p>
        <div className="flex items-center gap-2">
          {data.isDemo ? (
            <Badge variant="secondary" className="font-normal">
              Demo data
            </Badge>
          ) : null}
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Seat Map
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total Seat Maps"
          value={String(data.kpis.totalMaps)}
          sub={data.kpis.totalMapsSub}
          icon={<LayoutGrid className="h-5 w-5 text-emerald-600" />}
          iconClass="bg-emerald-500/10"
        />
        <KpiCard
          label="Total Seats"
          value={data.kpis.totalSeats.toLocaleString()}
          sub={data.kpis.totalSeatsSub}
          icon={<Armchair className="h-5 w-5 text-violet-600" />}
          iconClass="bg-violet-500/10"
        />
        <KpiCard
          label="Seat Map Usage"
          value={String(data.kpis.usageCount)}
          sub={data.kpis.usageSub}
          icon={<Users className="h-5 w-5 text-sky-600" />}
          iconClass="bg-sky-500/10"
        />
        <KpiCard
          label="Average Occupancy"
          value={`${data.kpis.avgOccupancy}%`}
          sub={data.kpis.avgOccupancySub}
          icon={<BarChart3 className="h-5 w-5 text-amber-600" />}
          iconClass="bg-amber-500/10"
        />
        <KpiCard
          label="Sections"
          value={String(data.kpis.sectionCount)}
          sub={data.kpis.sectionSub}
          icon={<Layers className="h-5 w-5 text-pink-600" />}
          iconClass="bg-pink-500/10"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">Seat Maps</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-sm">
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search seat maps…"
                className="h-9 pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[9rem]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[9rem]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-[10rem]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setTypeFilter("all");
                setCategoryFilter("all");
              }}
            >
              Reset
            </Button>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="shadow-sm">
              <CardContent className="space-y-4 p-0 pb-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Seat Map</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Seats</TableHead>
                        <TableHead className="text-right">Used In</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                            No seat maps match your filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paged.map((row) => (
                          <TableRow
                            key={row.id}
                            className={cn("cursor-pointer", selected?.id === row.id && "bg-muted/50")}
                            onClick={() => setSelectedId(row.id)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md border bg-gradient-to-br from-emerald-50 to-sky-100 dark:from-emerald-950/40 dark:to-sky-950/40">
                                  <LayoutGrid className="h-5 w-5 text-emerald-600/70" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium">{row.name}</p>
                                  <p className="text-xs text-muted-foreground">Updated {formatDate(row.updatedAt)}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{row.category}</TableCell>
                            <TableCell>{row.mapType}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.seatCount.toLocaleString()}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.usedInEvents} events</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn("capitalize", statusBadgeClass(row.status))}>
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedId(row.id)}
                                >
                                  Preview
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {!data.isDemo ? (
                                      <DropdownMenuItem asChild>
                                        <Link href={EVENT_PLATFORM_PATHS.seatmapEdit(row.id)}>Edit</Link>
                                      </DropdownMenuItem>
                                    ) : null}
                                    <DropdownMenuItem onSelect={() => toast.message("Duplicate", { description: "Coming soon." })}>
                                      Duplicate
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filtered.length > 0 ? (
                  <div className="flex flex-col gap-3 border-t px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <Pagination
                      page={pageSafe}
                      lastPage={lastPage}
                      total={filtered.length}
                      from={(pageSafe - 1) * perPage + 1}
                      to={Math.min(pageSafe * perPage, filtered.length)}
                      onPageChange={setPage}
                      entityLabel="entries"
                    />
                    <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[6, 10, 25].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} / page
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="shadow-sm xl:sticky xl:top-4 xl:self-start">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Preview</CardTitle>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs">
                    Filters
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedId(data.activeMaps[0]?.id ?? null)}>
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selected ? (
                  <>
                    <SeatmapPreviewVisual variant={selected.previewVariant} />
                    <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-sm">
                      <p className="font-semibold">{selected.name}</p>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        <dt className="text-muted-foreground">Type</dt>
                        <dd>{selected.mapType}</dd>
                        <dt className="text-muted-foreground">Sections</dt>
                        <dd>{selected.sectionCount}</dd>
                        <dt className="text-muted-foreground">Rows</dt>
                        <dd>{selected.rowCount}</dd>
                        <dt className="text-muted-foreground">Total Seats</dt>
                        <dd>{selected.seatCount.toLocaleString()}</dd>
                        <dt className="text-muted-foreground">Created</dt>
                        <dd>{formatDate(selected.createdAt)}</dd>
                        <dt className="text-muted-foreground">Last Updated</dt>
                        <dd>{formatDate(selected.updatedAt)}</dd>
                      </dl>
                    </div>
                    <div className="grid gap-2">
                      {!data.isDemo ? (
                        <Button variant="outline" asChild>
                          <Link href={EVENT_PLATFORM_PATHS.seatmapEdit(selected.id)}>Edit</Link>
                        </Button>
                      ) : (
                        <Button variant="outline" disabled>
                          Edit
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => toast.message("Duplicate", { description: "Coming soon." })}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                    <Grid3X3 className="h-8 w-8 opacity-40" />
                    Select a seat map to preview
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New seat map</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <Label htmlFor="sm-name">Name</Label>
            <Input id="sm-name" value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1.5" />
          </div>
          <SheetFooter>
            <Button disabled={saving} onClick={() => void createMap()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create &amp; edit
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
