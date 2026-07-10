"use client";

import * as React from "react";
import { Grid3x3, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import NoRecordsFound from "@/components/no-records-found";
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
  prize: "",
  description: "",
  sortOrder: 0,
  status: "active",
};

export function EventPlatformBingoGamesAdmin() {
  const [games, setGames] = React.useState<EventBingoGameDto[] | null>(null);
  const [search, setSearch] = React.useState("");
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

  const filtered = React.useMemo(() => {
    if (!games) return [];
    const q = search.trim().toLowerCase();
    if (!q) return games;
    return games.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.pattern.toLowerCase().includes(q) ||
        g.prize.toLowerCase().includes(q),
    );
  }, [games, search]);

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
      prize: game.prize,
      description: game.description ?? "",
      sortOrder: game.sortOrder,
      status: game.status,
    });
    setSheetOpen(true);
  }

  async function saveGame() {
    const name = form.name.trim();
    const pattern = form.pattern.trim();
    const prize = form.prize.trim();
    if (!name || !pattern || !prize) {
      toast.error("Name, pattern, and prize are required.");
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
        body: JSON.stringify({ ...form, name, pattern, prize }),
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
            Build your game library once, then pick which rounds to show on each event page.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add game
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search games…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
            title="No bingo games yet"
            description="Add games to your library, then select them when creating events."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Game</TableHead>
                <TableHead>Pattern</TableHead>
                <TableHead>Prize</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((game) => (
                <TableRow key={game.id}>
                  <TableCell className="font-medium">{game.name}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{game.pattern}</TableCell>
                  <TableCell>{game.prize}</TableCell>
                  <TableCell>{game.difficulty}</TableCell>
                  <TableCell>{game.sortOrder}</TableCell>
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
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <TableActionButton {...gameRowActions(game)} className="ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bg-prize">Prize</Label>
                  <Input
                    id="bg-prize"
                    autoComplete="off"
                    value={form.prize}
                    onChange={(e) => setForm((f) => ({ ...f, prize: e.target.value }))}
                    placeholder="Pothos"
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
              </div>
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
