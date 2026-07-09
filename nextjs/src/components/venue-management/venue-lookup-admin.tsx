"use client";

import * as React from "react";
import { LayoutGrid, Loader2, Plus, Search, Tags } from "lucide-react";
import { toast } from "sonner";

import NoRecordsFound from "@/components/no-records-found";
import { appConfirm } from "@/lib/app-confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import type { VenueLookupDto } from "@/lib/event-platform/venues/venue-types";
import { cn } from "@/lib/utils";

type LookupKind = "category" | "type";

const CONFIG: Record<
  LookupKind,
  {
    title: string;
    singular: string;
    apiBase: string;
    description: string;
    emptyIcon: typeof Tags;
    emptyTitle: string;
    emptyDescription: string;
  }
> = {
  category: {
    title: "Venue Categories",
    singular: "Venue Category",
    apiBase: "/api/event-platform/venue-categories",
    description: "Manage category options shown in the Add Venue form.",
    emptyIcon: Tags,
    emptyTitle: "No venue categories found",
    emptyDescription: "Add your first venue category to populate the Add Venue form.",
  },
  type: {
    title: "Venue Types",
    singular: "Venue Type",
    apiBase: "/api/event-platform/venue-types",
    description: "Manage venue type options shown in the Add Venue form.",
    emptyIcon: LayoutGrid,
    emptyTitle: "No venue types found",
    emptyDescription: "Add your first venue type to populate the Add Venue form.",
  },
};

export function VenueLookupAdmin({ kind }: { kind: LookupKind }) {
  const cfg = CONFIG[kind];
  const [items, setItems] = React.useState<VenueLookupDto[] | null>(null);
  const [search, setSearch] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", sortOrder: "0", isActive: true });

  const reload = React.useCallback(async () => {
    const res = await fetch(cfg.apiBase, { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      items?: VenueLookupDto[];
      message?: string;
    } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? `Could not load ${cfg.title.toLowerCase()}.`);
      setItems([]);
      return;
    }
    setItems(data.items ?? []);
  }, [cfg.apiBase, cfg.title]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = React.useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => row.name.toLowerCase().includes(q));
  }, [items, search]);

  function openCreate() {
    setEditingId(null);
    setForm({ name: "", sortOrder: String(items?.length ?? 0), isActive: true });
    setSheetOpen(true);
  }

  function openEdit(row: VenueLookupDto) {
    setEditingId(row.id);
    setForm({ name: row.name, sortOrder: String(row.sortOrder), isActive: row.isActive });
    setSheetOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
        isActive: form.isActive,
      };
      const url = editingId ? `${cfg.apiBase}/${editingId}` : cfg.apiBase;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      toast.success(editingId ? "Updated." : "Created.");
      setSheetOpen(false);
      await reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: VenueLookupDto) {
    if (!(await appConfirm(`Delete "${row.name}"?`))) return;
    const res = await fetch(`${cfg.apiBase}/${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Delete failed.");
      return;
    }
    toast.success("Deleted.");
    await reload();
  }

  if (items === null) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{cfg.title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{cfg.description}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add {cfg.singular}
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${cfg.title.toLowerCase()}…`}
            />
          </div>
          {search.trim() ? (
            <button
              type="button"
              className="shrink-0 text-sm text-primary hover:underline"
              onClick={() => setSearch("")}
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <NoRecordsFound
          icon={cfg.emptyIcon}
          title={cfg.emptyTitle}
          description={cfg.emptyDescription}
          hasFilters={!!search.trim()}
          onClearFilters={() => setSearch("")}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Sort order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="tabular-nums">{row.sortOrder}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          row.isActive
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <TableActionButton
                        label="Actions"
                        items={[
                          { label: "Edit", onSelect: () => openEdit(row) },
                          { label: "Delete", onSelect: () => void remove(row), destructive: true },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingId ? `Edit ${cfg.singular}` : `Add ${cfg.singular}`}</SheetTitle>
          </SheetHeader>
          <form onSubmit={(e) => void save(e)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="lookup-name">Name *</Label>
              <Input
                id="lookup-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Hospitality"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lookup-sort">Sort order</Label>
              <Input
                id="lookup-sort"
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <Label htmlFor="lookup-active">Active</Label>
              <Switch
                id="lookup-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
            <SheetFooter className="pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
