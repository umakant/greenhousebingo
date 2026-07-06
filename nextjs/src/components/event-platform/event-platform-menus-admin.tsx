"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Menu, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import NoRecordsFound from "@/components/no-records-found";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";

type MenuItem = {
  id: string;
  label: string;
  itemType: string;
  url: string | null;
  sortOrder: number;
  isEnabled: boolean;
};

type MenuRow = {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  items: MenuItem[];
};

function SortableMenuItem({
  item,
  onDelete,
}: {
  item: MenuItem;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-card px-2 py-2 text-sm"
    >
      <button type="button" className="cursor-grab text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 truncate">{item.label}</span>
      <Badge variant="secondary" className="text-xs capitalize">
        {item.itemType}
      </Badge>
      <Button type="button" variant="ghost" size="icon" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function EventPlatformMenusAdmin() {
  const [menus, setMenus] = React.useState<MenuRow[] | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [newMenu, setNewMenu] = React.useState({ name: "", location: "header" });
  const [newItem, setNewItem] = React.useState({ label: "", url: "" });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reload = React.useCallback(async () => {
    const res = await fetch("/api/event-platform/menus", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: MenuRow[] } | null;
    const items = res.ok && data?.ok ? data.items ?? [] : [];
    setMenus(items);
    if (!selectedId && items[0]) setSelectedId(items[0].id);
  }, [selectedId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const selected = menus?.find((m) => m.id === selectedId) ?? null;

  async function createMenu() {
    if (!newMenu.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/menus", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(newMenu),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; item?: MenuRow; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Create failed.");
      setSheetOpen(false);
      setNewMenu({ name: "", location: "header" });
      if (data.item) setSelectedId(data.item.id);
      await reload();
      toast.success("Menu created.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  async function addItem() {
    if (!selected || !newItem.label.trim()) return;
    const res = await fetch(`/api/event-platform/menus/${selected.id}`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: newItem.label, itemType: "url", url: newItem.url }),
    });
    if (res.ok) {
      setNewItem({ label: "", url: "" });
      await reload();
    }
  }

  async function reorderItems(event: DragEndEvent) {
    if (!selected) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = selected.items.map((i) => i.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const nextIds = arrayMove(ids, oldIndex, newIndex);
    await fetch(`/api/event-platform/menus/${selected.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemIds: nextIds }),
    });
    await reload();
  }

  async function deleteItem(itemId: string) {
    if (!selected) return;
    await fetch(`/api/event-platform/menus/${selected.id}/items/${itemId}`, {
      method: "DELETE",
      credentials: "include",
    });
    await reload();
  }

  if (menus === null) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading menus…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New menu
        </Button>
      </div>
      {menus.length === 0 ? (
        <NoRecordsFound icon={Menu} title="No menus yet" description="Create a navigation menu for the event platform." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <Card className="shadow-sm">
            <CardContent className="space-y-1 p-2">
              {menus.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${selectedId === m.id ? "bg-muted font-medium" : "hover:bg-muted/60"}`}
                  onClick={() => setSelectedId(m.id)}
                >
                  {m.name}
                  <span className="ml-2 text-xs text-muted-foreground capitalize">({m.location})</span>
                </button>
              ))}
            </CardContent>
          </Card>
          {selected ? (
            <Card className="shadow-sm">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{selected.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{selected.location} menu</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={selected.isActive} disabled />
                    <span className="text-xs text-muted-foreground">Active</span>
                  </div>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void reorderItems(e)}>
                  <SortableContext items={selected.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {selected.items.map((item) => (
                        <SortableMenuItem key={item.id} item={item} onDelete={() => void deleteItem(item.id)} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    placeholder="Label"
                    value={newItem.label}
                    onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                  />
                  <Input
                    placeholder="URL"
                    value={newItem.url}
                    onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                  />
                  <Button type="button" variant="secondary" onClick={() => void addItem()}>
                    Add item
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New menu</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={newMenu.name} onChange={(e) => setNewMenu({ ...newMenu, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select
                value={newMenu.location}
                onValueChange={(v) => setNewMenu({ ...newMenu, location: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["header", "footer", "sidebar", "mobile"].map((loc) => (
                    <SelectItem key={loc} value={loc} className="capitalize">
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button disabled={saving} onClick={() => void createMenu()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
