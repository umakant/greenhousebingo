"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Leaf,
  ListFilter,
  Loader2,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { PlantDrawer } from "@/components/event-platform/event-command-center/plants/plant-drawer";
import { PlantFormDialog } from "@/components/event-platform/event-command-center/plants/plant-form-dialog";
import { PlantRequestDialog } from "@/components/event-platform/event-command-center/plants/plant-request-dialog";
import {
  PlantAttendeeRequests,
  PlantBottomStats,
  PlantImageThumb,
  PlantInventoryOverview,
  PlantSummaryCards,
  PlantTopRequested,
  plantStatusBadge,
  popularityMeta,
} from "@/components/event-platform/event-command-center/plants/plant-panels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import type { EventPlantsOverview } from "@/lib/event-platform/event-plants/event-plant-types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

function money(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function EventPlantsTab(props: { eventId: string }) {
  const [overview, setOverview] = React.useState<EventPlantsOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editPlant, setEditPlant] = React.useState<EventPlantsOverview["plants"][0] | null>(null);
  const [drawerId, setDrawerId] = React.useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignPlantId, setAssignPlantId] = React.useState<string | null>(null);
  const [assignRoundId, setAssignRoundId] = React.useState("");
  const [addQtyOpen, setAddQtyOpen] = React.useState(false);
  const [addQtyPlantId, setAddQtyPlantId] = React.useState<string | null>(null);
  const [addQty, setAddQty] = React.useState("5");
  const [importOpen, setImportOpen] = React.useState(false);
  const [importCsv, setImportCsv] = React.useState("");

  const [query, setQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [gameFilter, setGameFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/plants`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; overview?: EventPlantsOverview; message?: string };
    if (!res.ok || !data?.ok || !data.overview) {
      toast.error(data?.message ?? "Could not load plants.");
      setOverview(null);
    } else {
      setOverview(data.overview);
    }
    setLoading(false);
  }, [props.eventId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const plants = React.useMemo(
    () => overview?.plants.filter((p) => p.status !== "removed") ?? [],
    [overview],
  );
  const canManage = overview?.canManagePlants ?? false;
  const requests = overview?.requests ?? [];

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of plants) if (p.category?.trim()) set.add(p.category.trim());
    return [...set].sort();
  }, [plants]);

  const games = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of plants) if (p.assignedGameLabel?.trim()) set.add(p.assignedGameLabel.trim());
    return [...set].sort();
  }, [plants]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return plants.filter((p) => {
      if (categoryFilter !== "all" && (p.category?.trim() ?? "") !== categoryFilter) return false;
      if (gameFilter !== "all" && (p.assignedGameLabel?.trim() ?? "") !== gameFilter) return false;
      if (q) {
        const hay = `${p.name} ${p.variety ?? ""} ${p.category ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [plants, query, categoryFilter, gameFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [query, categoryFilter, gameFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const maxPopularity = Math.max(1, ...plants.map((p) => p.popularityScore));

  const healthPercent = React.useMemo(() => {
    if (!overview) return 100;
    const lowStock = plants.filter((p) => p.status === "low_stock").length;
    const outStock = plants.filter((p) => p.status === "out_of_stock").length;
    const gaps = overview.summary.inventoryGaps;
    return Math.max(0, Math.min(100, 100 - gaps * 8 - lowStock * 6 - outStock * 15));
  }, [overview, plants]);

  async function runAction(plantId: string, action: string, extra?: Record<string, unknown>) {
    const res = await fetch(
      `/api/event-platform/events/${encodeURIComponent(props.eventId)}/plants/${encodeURIComponent(plantId)}/actions`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      },
    );
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Action failed.");
      return false;
    }
    toast.success("Done.");
    void load();
    return true;
  }

  async function seedFromRounds() {
    const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/plants`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed_from_rounds" }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; created?: number; message?: string };
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Seed failed.");
      return;
    }
    toast.success(`Created ${data.created ?? 0} plant(s) from bingo rounds.`);
    void load();
  }

  async function submitImport() {
    const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/plants/import`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: importCsv }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      created?: number;
      errors?: string[];
      message?: string;
    };
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Import failed.");
      return;
    }
    toast.success(`Imported ${data.created ?? 0} plant(s).`);
    if (data.errors?.length) toast.warning(data.errors.slice(0, 3).join(" "));
    setImportOpen(false);
    setImportCsv("");
    void load();
  }

  function exportPlants() {
    window.open(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/plants/export`, "_blank");
  }

  function openDrawer(plantId: string) {
    setDrawerId(plantId);
    setDrawerOpen(true);
  }

  if (loading && !overview) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading plants…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void seedFromRounds()}>
              Import from Rounds
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              Bulk Import
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={exportPlants}>
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
            <Button type="button" size="sm" onClick={() => { setEditPlant(null); setFormOpen(true); }}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Plant
            </Button>
          </div>
        ) : null}
      </div>

      <PlantSummaryCards
        summary={overview?.summary ?? null}
        requestsCount={requests.length}
        healthPercent={healthPercent}
        loading={loading}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base">Plant Inventory</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[160px] flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search plants…"
                  className="h-9 pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-[140px]">
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
              <Select value={gameFilter} onValueChange={setGameFilter}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  {games.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => toast.info("Advanced filters coming soon.")}
              >
                <ListFilter className="mr-1.5 h-4 w-4" />
                Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {plants.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Leaf className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No plants in inventory</p>
                <p className="text-sm text-muted-foreground">
                  Add plants manually or import prize names from configured bingo rounds.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plant</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">Purchased</TableHead>
                    <TableHead className="hidden lg:table-cell">Remaining</TableHead>
                    <TableHead className="hidden xl:table-cell">Cost</TableHead>
                    <TableHead className="hidden xl:table-cell text-right">Requests</TableHead>
                    <TableHead className="hidden xl:table-cell text-right">Assigned</TableHead>
                    <TableHead>Popularity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((plant) => {
                    const remainingPct =
                      plant.quantityPurchased > 0
                        ? Math.round((plant.quantityRemaining / plant.quantityPurchased) * 100)
                        : 0;
                    const pop = popularityMeta(plant.popularityLabel);
                    return (
                      <TableRow
                        key={plant.id}
                        className="cursor-pointer"
                        onClick={() => openDrawer(plant.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <PlantImageThumb imageUrl={plant.imageUrl} name={plant.name} />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{plant.name}</p>
                              <p className="truncate text-xs italic text-muted-foreground">
                                {plant.variety ?? plant.supplierName ?? "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {plant.category ?? "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right tabular-nums">
                          {plant.quantityPurchased}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums">{plant.quantityRemaining}</span>
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  remainingPct <= 20
                                    ? "bg-red-500"
                                    : remainingPct <= 50
                                      ? "bg-amber-500"
                                      : "bg-emerald-500",
                                )}
                                style={{ width: `${remainingPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{remainingPct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <p className="tabular-nums">{money(plant.totalCost)}</p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            {money(plant.unitCost)} each
                          </p>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-right tabular-nums">
                          {plant.requestCount}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-right tabular-nums">
                          {plant.quantityAssigned}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={pop.color}>{pop.icon}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium">{plant.popularityLabel}</p>
                              <div className="mt-0.5 h-1 w-14 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn("h-full rounded-full", pop.color.replace("text-", "bg-"))}
                                  style={{ width: `${(plant.popularityScore / maxPopularity) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{plantStatusBadge(plant.status)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <TableActionButton
                            label="Actions"
                            items={[
                              { label: "View details", onSelect: () => openDrawer(plant.id) },
                              ...(canManage
                                ? [
                                    {
                                      label: "Edit",
                                      onSelect: () => {
                                        setEditPlant(plant);
                                        setFormOpen(true);
                                      },
                                    },
                                    {
                                      label: "Add quantity",
                                      onSelect: () => {
                                        setAddQtyPlantId(plant.id);
                                        setAddQtyOpen(true);
                                      },
                                    },
                                    {
                                      label: "Assign to game",
                                      onSelect: () => {
                                        setAssignPlantId(plant.id);
                                        setAssignRoundId(overview?.rounds[0]?.id ?? "");
                                        setAssignOpen(true);
                                      },
                                    },
                                    {
                                      label: "Mark awarded",
                                      onSelect: () => void runAction(plant.id, "mark_awarded", { quantity: 1 }),
                                    },
                                    {
                                      label: "View requests",
                                      onSelect: () => openDrawer(plant.id),
                                    },
                                    {
                                      label: "Duplicate",
                                      onSelect: () => void runAction(plant.id, "duplicate"),
                                    },
                                    {
                                      label: "Remove from event",
                                      onSelect: () => void runAction(plant.id, "remove_from_event"),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
          {filtered.length > 0 ? (
            <div className="flex items-center justify-between gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
              <span>
                Showing {pageStart + 1} to {Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
                plants
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-1 tabular-nums">{safePage}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        <div className="space-y-4">
          <PlantInventoryOverview plants={plants} />
          <PlantTopRequested plants={plants} onView={openDrawer} />
          <PlantAttendeeRequests
            requests={requests}
            canManage={canManage}
            onAdd={() => setRequestOpen(true)}
          />
        </div>
      </div>

      <PlantBottomStats plants={plants} />

      <PlantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        eventId={props.eventId}
        initial={editPlant}
        onSaved={load}
      />

      <PlantDrawer
        eventId={props.eventId}
        plantId={drawerId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {canManage ? (
        <PlantRequestDialog
          open={requestOpen}
          onOpenChange={setRequestOpen}
          eventId={props.eventId}
          plants={plants}
          onSaved={load}
        />
      ) : null}

      <Sheet open={assignOpen} onOpenChange={setAssignOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Assign to Game</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            <div className="space-y-2">
              <Label>Round</Label>
              <Select value={assignRoundId} onValueChange={setAssignRoundId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select round" />
                </SelectTrigger>
                <SelectContent>
                  {(overview?.rounds ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      Round {r.roundNumber}: {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!assignPlantId || !assignRoundId) return;
                void runAction(assignPlantId, "assign_to_game", {
                  roundInstanceId: assignRoundId,
                  quantity: 1,
                }).then((ok) => ok && setAssignOpen(false));
              }}
            >
              Assign
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={addQtyOpen} onOpenChange={setAddQtyOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add Inventory</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            <Label>Quantity to Add</Label>
            <Input type="number" min={1} value={addQty} onChange={(e) => setAddQty(e.target.value)} />
          </div>
          <SheetFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setAddQtyOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!addQtyPlantId) return;
                void runAction(addQtyPlantId, "add_quantity", {
                  quantity: Number.parseInt(addQty, 10) || 0,
                }).then((ok) => ok && setAddQtyOpen(false));
              }}
            >
              Add
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={importOpen} onOpenChange={setImportOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Bulk Import Plants</SheetTitle>
          </SheetHeader>
          <p className="mt-6 text-xs text-muted-foreground">
            CSV columns: Name, Category, Variety, Qty Purchased, Unit Cost, Retail Value
          </p>
          <textarea
            className="mt-3 min-h-[160px] w-full rounded-md border bg-background p-3 text-sm"
            value={importCsv}
            onChange={(e) => setImportCsv(e.target.value)}
            placeholder="Name,Category,Variety,Qty,Unit Cost,Retail&#10;Monstera,Tropical,,10,8.50,24.00"
          />
          <SheetFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitImport()}>
              Import
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
