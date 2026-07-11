"use client";

import * as React from "react";
import { Download, Leaf, Loader2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";

import { PlantDrawer } from "@/components/event-platform/event-command-center/plants/plant-drawer";
import { PlantFormDialog } from "@/components/event-platform/event-command-center/plants/plant-form-dialog";
import { PlantRequestDialog } from "@/components/event-platform/event-command-center/plants/plant-request-dialog";
import {
  InventoryGapPanel,
  PlantAnalyticsCharts,
  PlantImageThumb,
  PlantSummaryCards,
  plantStatusBadge,
} from "@/components/event-platform/event-command-center/plants/plant-panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const plants = overview?.plants.filter((p) => p.status !== "removed") ?? [];
  const canManage = overview?.canManagePlants ?? false;

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

  function exportRequests() {
    window.open(
      `/api/event-platform/events/${encodeURIComponent(props.eventId)}/plants/requests/export`,
      "_blank",
    );
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div />
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void seedFromRounds()}>
              Import from rounds
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              Bulk import
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={exportPlants}>
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
            <Button type="button" size="sm" onClick={() => { setEditPlant(null); setFormOpen(true); }}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add plant
            </Button>
          </div>
        ) : null}
      </div>

      <PlantSummaryCards summary={overview?.summary ?? null} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plant inventory</CardTitle>
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
                    <TableHead className="w-12" />
                    <TableHead>Plant</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell">Purchased</TableHead>
                    <TableHead className="hidden lg:table-cell">Remaining</TableHead>
                    <TableHead className="hidden xl:table-cell">Cost</TableHead>
                    <TableHead className="hidden xl:table-cell">Requests</TableHead>
                    <TableHead>Popularity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plants.map((plant) => (
                    <TableRow
                      key={plant.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setDrawerId(plant.id);
                        setDrawerOpen(true);
                      }}
                    >
                      <TableCell>
                        <PlantImageThumb imageUrl={plant.imageUrl} name={plant.name} />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{plant.name}</p>
                        <p className="text-xs text-muted-foreground">{plant.variety ?? plant.supplierName ?? "—"}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{plant.category ?? "—"}</TableCell>
                      <TableCell className="hidden tabular-nums lg:table-cell">{plant.quantityPurchased}</TableCell>
                      <TableCell className="hidden tabular-nums lg:table-cell">{plant.quantityRemaining}</TableCell>
                      <TableCell className="hidden tabular-nums xl:table-cell">${plant.totalCost.toFixed(2)}</TableCell>
                      <TableCell className="hidden tabular-nums xl:table-cell">{plant.requestCount}</TableCell>
                      <TableCell>
                        <span className="text-sm tabular-nums font-medium">{plant.popularityScore}</span>
                        <p className="text-[10px] text-muted-foreground">{plant.popularityLabel}</p>
                      </TableCell>
                      <TableCell>{plantStatusBadge(plant.status)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <TableActionButton
                          label="Actions"
                          items={[
                            { label: "View details", onSelect: () => { setDrawerId(plant.id); setDrawerOpen(true); } },
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
                                    onSelect: () => {
                                      setDrawerId(plant.id);
                                      setDrawerOpen(true);
                                    },
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
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <InventoryGapPanel
            gaps={overview?.gaps ?? []}
            canManage={canManage}
            onAddInventory={(plantId) => {
              setAddQtyPlantId(plantId);
              setAddQtyOpen(true);
            }}
          />

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Attendee requests</CardTitle>
              {canManage ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setRequestOpen(true)}>
                  Add request
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-2">
              {(overview?.requests.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No plant requests yet.</p>
              ) : (
                overview!.requests.slice(0, 8).map((r) => (
                  <div key={r.id} className="rounded-lg border p-2 text-sm">
                    <p className="font-medium">{r.attendeeName}</p>
                    <p className="text-xs text-muted-foreground">{r.plantName}</p>
                  </div>
                ))
              )}
              {canManage ? (
                <Button type="button" size="sm" variant="ghost" className="w-full" onClick={exportRequests}>
                  Export requests
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {overview?.activity.length ? (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overview.activity.map((item) => (
                  <div key={item.id} className="text-sm">
                    <p className="font-medium capitalize">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.at).toLocaleString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <PlantAnalyticsCharts analytics={overview?.analytics ?? null} />

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

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to game</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addQtyOpen} onOpenChange={setAddQtyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Quantity to add</Label>
            <Input type="number" min={1} value={addQty} onChange={(e) => setAddQty(e.target.value)} />
          </div>
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk import plants</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            CSV columns: Name, Category, Variety, Qty Purchased, Unit Cost, Retail Value
          </p>
          <textarea
            className="min-h-[160px] w-full rounded-md border bg-background p-3 text-sm"
            value={importCsv}
            onChange={(e) => setImportCsv(e.target.value)}
            placeholder="Name,Category,Variety,Qty,Unit Cost,Retail&#10;Monstera,Tropical,,10,8.50,24.00"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitImport()}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
