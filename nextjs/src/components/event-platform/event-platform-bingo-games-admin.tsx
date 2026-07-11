"use client";

import * as React from "react";
import {
  BarChart3,
  Gamepad2,
  Grid3x3,
  GripVertical,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import NoRecordsFound from "@/components/no-records-found";
import MediaPicker from "@/components/MediaPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import type { EventBingoGameDto } from "@/lib/event-platform/bingo-games/bingo-game-types";
import { appConfirm } from "@/lib/app-confirm";
import { LMS_EVENT_BINGO_DIFFICULTIES } from "@/lib/lms-events/event-detail-content";
import { cn } from "@/lib/utils";

const emptyForm = {
  name: "",
  pattern: "",
  difficulty: "Easy",
  description: "",
  imageUrl: "",
  sortOrder: 0,
  status: "active",
};

const DIFFICULTY_DOT: Record<string, string> = {
  Easy: "bg-emerald-500",
  Medium: "bg-amber-500",
  Hard: "bg-rose-500",
  Epic: "bg-violet-500",
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type SortKey = "order" | "name" | "recent" | "difficulty";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function BingoGameThumbnail(props: { imageUrl: string | null; name: string; size?: "sm" | "md" }) {
  const sizeClass = props.size === "sm" ? "h-11 w-11" : "h-16 w-16";
  if (props.imageUrl?.trim()) {
    return (
      <div className={cn("shrink-0 overflow-hidden rounded-md border bg-muted", sizeClass)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={props.imageUrl} alt={props.name} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border border-dashed bg-muted/40 text-[10px] text-muted-foreground",
        sizeClass,
      )}
    >
      No image
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

export function EventPlatformBingoGamesAdmin() {
  const [games, setGames] = React.useState<EventBingoGameDto[] | null>(null);
  const [search, setSearch] = React.useState("");
  const [difficultyFilter, setDifficultyFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("order");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const reload = React.useCallback(async () => {
    const res = await fetch("/api/event-platform/bingo-games", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      items?: EventBingoGameDto[];
      message?: string;
    } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not load bingo games.");
      setGames([]);
      return;
    }
    setGames(data.items ?? []);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const stats = React.useMemo(() => {
    const list = games ?? [];
    const active = list.filter((g) => g.status === "active");
    const distinctPatterns = new Set(list.map((g) => g.pattern.trim().toLowerCase())).size;

    const byDifficulty = new Map<string, number>();
    for (const g of list) byDifficulty.set(g.difficulty, (byDifficulty.get(g.difficulty) ?? 0) + 1);
    let topDifficulty = "—";
    let topDifficultyCount = 0;
    for (const [key, count] of byDifficulty) {
      if (count > topDifficultyCount) {
        topDifficulty = key;
        topDifficultyCount = count;
      }
    }

    let lastUpdated: string | null = null;
    let lastUpdatedBy: string | null = null;
    for (const g of list) {
      const stamp = g.updatedAt ?? g.createdAt;
      if (!lastUpdated || new Date(stamp).getTime() > new Date(lastUpdated).getTime()) {
        lastUpdated = stamp;
        lastUpdatedBy = g.updatedByName;
      }
    }

    return {
      total: list.length,
      active: active.length,
      distinctPatterns,
      topDifficulty,
      topDifficultyCount,
      lastUpdated,
      lastUpdatedBy,
    };
  }, [games]);

  const defaultId = React.useMemo(() => {
    if (!games || games.length === 0) return null;
    return [...games].sort(
      (a, b) => a.sortOrder - b.sortOrder || Number(a.id) - Number(b.id),
    )[0]?.id ?? null;
  }, [games]);

  const filtered = React.useMemo(() => {
    if (!games) return [];
    const q = search.trim().toLowerCase();
    let rows = games.filter((g) => {
      if (difficultyFilter !== "all" && g.difficulty !== difficultyFilter) return false;
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.pattern.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q)
      );
    });

    rows = [...rows].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "difficulty":
          return a.difficulty.localeCompare(b.difficulty) || a.sortOrder - b.sortOrder;
        case "recent":
          return (
            new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
          );
        case "order":
        default:
          return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
      }
    });

    return rows;
  }, [games, search, difficultyFilter, statusFilter, sortKey]);

  React.useEffect(() => {
    setPage(1);
  }, [search, difficultyFilter, statusFilter, sortKey, pageSize]);

  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, lastPage);
  const start = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const filtersActive =
    search.trim() !== "" || difficultyFilter !== "all" || statusFilter !== "all" || sortKey !== "order";

  function resetFilters() {
    setSearch("");
    setDifficultyFilter("all");
    setStatusFilter("all");
    setSortKey("order");
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, sortOrder: (games?.length ?? 0) + 1 });
    setSheetOpen(true);
  }

  function openEdit(game: EventBingoGameDto) {
    setEditingId(game.id);
    setForm({
      name: game.name,
      pattern: game.pattern,
      difficulty: game.difficulty,
      description: game.description ?? "",
      imageUrl: game.imageUrl ?? "",
      sortOrder: game.sortOrder,
      status: game.status,
    });
    setSheetOpen(true);
  }

  async function saveGame() {
    const name = form.name.trim();
    const pattern = form.pattern.trim();
    if (!name || !pattern) {
      toast.error("Name and pattern are required.");
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/event-platform/bingo-games/${editingId}` : "/api/event-platform/bingo-games";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name, pattern }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not save bingo game.");
        return;
      }
      toast.success(editingId ? "Bingo game updated." : "Bingo game created.");
      setSheetOpen(false);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function archiveGame(id: string) {
    const res = await fetch(`/api/event-platform/bingo-games/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not archive bingo game.");
      return;
    }
    toast.success("Bingo game archived.");
    await reload();
  }

  async function deleteGame(game: EventBingoGameDto) {
    const confirmed = await appConfirm({
      title: "Delete bingo game",
      description: `Permanently delete "${game.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    const res = await fetch(`/api/event-platform/bingo-games/${game.id}?permanent=1`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not delete bingo game.");
      return;
    }
    toast.success("Bingo game deleted.");
    await reload();
  }

  function gameRowActions(game: EventBingoGameDto) {
    const items: TableActionItem[] = [];
    if (game.status === "active") {
      items.push({ label: "Archive", onSelect: () => void archiveGame(game.id) });
    }
    items.push({
      label: "Delete",
      onSelect: () => void deleteGame(game),
      destructive: true,
    });
    return {
      label: "Edit",
      onPrimaryClick: () => openEdit(game),
      items,
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bingo Games</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage the bingo games available for your events.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          Add Game
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={Gamepad2}
          label="Total Games"
          value={stats.total}
          hint="All games in library"
          tone="bg-sky-500/10 text-sky-600 dark:text-sky-400"
        />
        <StatCard
          icon={Grid3x3}
          label="Active Games"
          value={stats.active}
          hint="Currently active"
          tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={Star}
          label="Total Patterns"
          value={stats.distinctPatterns}
          hint="Across all games"
          tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={BarChart3}
          label="Most Common Difficulty"
          value={stats.topDifficulty}
          hint={stats.topDifficultyCount > 0 ? `${stats.topDifficultyCount} games` : "No games yet"}
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
            placeholder="Search games by name, pattern, or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Difficulties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            {LMS_EVENT_BINGO_DIFFICULTIES.map((level) => (
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
            <SelectValue placeholder="All Orders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="order">Order</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="difficulty">Difficulty</SelectItem>
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
        {games === null ? (
          <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading bingo games…
          </div>
        ) : filtered.length === 0 ? (
          <NoRecordsFound
            icon={Grid3x3}
            title={games.length === 0 ? "No bingo games yet" : "No games match your filters"}
            description={
              games.length === 0
                ? "Add games to your library, then select them when creating events."
                : "Try adjusting your search or filters."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[64px]">#</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Pattern</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((game, index) => (
                <TableRow key={game.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <GripVertical className="h-4 w-4 cursor-grab opacity-40" />
                      <span className="text-xs tabular-nums">
                        {String(start + index + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <BingoGameThumbnail imageUrl={game.imageUrl} name={game.name} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{game.name}</span>
                          {defaultId === game.id ? (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                              Default
                            </Badge>
                          ) : null}
                        </div>
                        {game.description ? (
                          <p className="mt-0.5 max-w-[260px] truncate text-xs text-muted-foreground">
                            {game.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                    {game.pattern}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span className={cn("h-2 w-2 rounded-full", DIFFICULTY_DOT[game.difficulty] ?? "bg-muted-foreground")} />
                      {game.difficulty}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums text-sm">{game.sortOrder}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        game.status === "active"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {game.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDate(game.updatedAt ?? game.createdAt)}</div>
                    {game.updatedByName ? (
                      <div className="text-xs text-muted-foreground">{game.updatedByName}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <TableActionButton {...gameRowActions(game)} className="ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {games && filtered.length > 0 ? (
          <div className="flex flex-col gap-3 border-t px-4 py-3 md:flex-row md:items-center md:justify-between">
            <Pagination
              page={safePage}
              lastPage={lastPage}
              total={total}
              from={total === 0 ? 0 : start + 1}
              to={Math.min(start + pageSize, total)}
              onPageChange={setPage}
              entityLabel="games"
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
            <SheetTitle>{editingId ? "Edit bingo game" : "Add bingo game"}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bg-name">Name</Label>
                <Input
                  id="bg-name"
                  autoComplete="off"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Traditional Bingo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bg-pattern">Pattern</Label>
                <Input
                  id="bg-pattern"
                  autoComplete="off"
                  value={form.pattern}
                  onChange={(e) => setForm((f) => ({ ...f, pattern: e.target.value }))}
                  placeholder="Any line — horizontal, vertical, or diagonal"
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LMS_EVENT_BINGO_DIFFICULTIES.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <MediaPicker
                id="bg-image"
                label="Pattern image"
                value={form.imageUrl}
                onChange={(v) => setForm((f) => ({ ...f, imageUrl: typeof v === "string" ? v : v[0] ?? "" }))}
                placeholder="Upload bingo pattern image…"
              />
              <p className="text-xs text-muted-foreground -mt-2">
                Shown when selecting games for an event and on the public event page.
              </p>
              <div className="space-y-2">
                <Label htmlFor="bg-sort">Sort order</Label>
                <Input
                  id="bg-sort"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bg-desc">Description (optional)</Label>
                <Textarea
                  id="bg-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
          <SheetFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveGame()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingId ? "Save changes" : "Create game"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
