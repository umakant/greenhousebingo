"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StorefrontNavItem, StorefrontNavLinkType, StorefrontWebsiteNavigation } from "@/lib/storefront/navigation";
import { t } from "@/lib/admin-t";


function ensureId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `nav-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeItems(items: StorefrontNavItem[]): StorefrontNavItem[] {
  return items.map((it, i) => ({
    ...it,
    id: it.id || ensureId(),
    sortOrder: i,
    children: it.children?.length ? normalizeItems(it.children) : undefined,
  }));
}

function SortableNavRow({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: StorefrontNavItem;
  index: number;
  onChange: (id: string, patch: Partial<StorefrontNavItem>) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-2 rounded-md border bg-card p-3 sm:flex-row sm:items-center ${isDragging ? "z-10 opacity-90 shadow-md" : ""}`}
    >
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded border bg-muted/50"
        aria-label={t("Drag")}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">{index + 1}</span>
      <div className="grid flex-1 gap-2 sm:grid-cols-3">
        <Input
          placeholder={t("Label")}
          value={item.label}
          onChange={(e) => onChange(item.id, { label: e.target.value })}
        />
        <Select
          value={item.type ?? "page"}
          onValueChange={(v) => onChange(item.id, { type: v as StorefrontNavLinkType })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="page">{t("Page")}</SelectItem>
            <SelectItem value="product">{t("Product")}</SelectItem>
            <SelectItem value="collection">{t("Collection")}</SelectItem>
            <SelectItem value="help">{t("Help")}</SelectItem>
            <SelectItem value="external">{t("External")}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={item.type === "external" ? "https://…" : t("Slug or id")}
          value={item.href ?? item.targetId ?? ""}
          onChange={(e) =>
            onChange(item.id, item.type === "external" ? { href: e.target.value } : { targetId: e.target.value })
          }
        />
      </div>
      <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => onRemove(item.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

type Props = {
  websiteId: string;
  /** When set (e.g. superadmin), append `organizationId` to navigation API calls. */
  buildApiUrl?: (pathname: string, extraSearch?: Record<string, string | undefined>) => string;
};

export function StorefrontNavigationEditor({ websiteId, buildApiUrl }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [main, setMain] = useState<StorefrontNavItem[]>([]);
  const [footer, setFooter] = useState<StorefrontNavItem[]>([]);

  const navigationUrl = useMemo(() => {
    const path = `/api/storefront/websites/${encodeURIComponent(websiteId)}/navigation`;
    return buildApiUrl ? buildApiUrl(path) : path;
  }, [buildApiUrl, websiteId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(navigationUrl, { credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; data?: StorefrontWebsiteNavigation; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      const nav = data.data ?? { main: [], footer: [] };
      setMain(normalizeItems(nav.main ?? []));
      setFooter(normalizeItems(nav.footer ?? []));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [navigationUrl, websiteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!websiteId) return;
    setLoading(true);
    setError(null);
    try {
      const navigation: StorefrontWebsiteNavigation = {
        main: main.map((m, i) => ({ ...m, sortOrder: i })),
        footer: footer.map((m, i) => ({ ...m, sortOrder: i })),
        updatedAt: new Date().toISOString(),
      };
      const res = await fetch(navigationUrl, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ navigation }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const onDragEndMain = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = main.findIndex((x) => x.id === active.id);
    const newIndex = main.findIndex((x) => x.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setMain(arrayMove(main, oldIndex, newIndex).map((m, i) => ({ ...m, sortOrder: i })));
  };

  const onDragEndFooter = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = footer.findIndex((x) => x.id === active.id);
    const newIndex = footer.findIndex((x) => x.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setFooter(arrayMove(footer, oldIndex, newIndex).map((m, i) => ({ ...m, sortOrder: i })));
  };

  const patchMain = (id: string, patch: Partial<StorefrontNavItem>) => {
    setMain((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };
  const patchFooter = (id: string, patch: Partial<StorefrontNavItem>) => {
    setFooter((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const addMain = () => {
    setMain((prev) => [
      ...prev,
      { id: ensureId(), label: "New link", sortOrder: prev.length, type: "page", targetId: "" },
    ]);
  };
  const addFooter = () => {
    setFooter((prev) => [
      ...prev,
      { id: ensureId(), label: "Footer link", sortOrder: prev.length, type: "external", href: "https://" },
    ]);
  };

  const removeMain = (id: string) => setMain((prev) => prev.filter((x) => x.id !== id));
  const removeFooter = (id: string) => setFooter((prev) => prev.filter((x) => x.id !== id));

  if (!websiteId) {
    return <p className="text-sm text-muted-foreground">{t("Select a website first.")}</p>;
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20 py-4">
          <CardTitle className="text-base font-semibold">{t("Main menu")}</CardTitle>
          <CardDescription>
            {t("Items in the main menu appear in the header of your online store. Drag to reorder.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndMain}>
            <SortableContext items={main.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {main.map((item, index) => (
                  <SortableNavRow key={item.id} item={item} index={index} onChange={patchMain} onRemove={removeMain} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          <Button type="button" variant="outline" size="sm" onClick={addMain}>
            <Plus className="mr-2 h-4 w-4" />
            {t("Add menu item")}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20 py-4">
          <CardTitle className="text-base font-semibold">{t("Footer menu")}</CardTitle>
          <CardDescription>{t("Footer links are shown at the bottom of your storefront.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndFooter}>
            <SortableContext items={footer.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {footer.map((item, index) => (
                  <SortableNavRow key={item.id} item={item} index={index} onChange={patchFooter} onRemove={removeFooter} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          <Button type="button" variant="outline" size="sm" onClick={addFooter}>
            <Plus className="mr-2 h-4 w-4" />
            {t("Add menu item")}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void save()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
        </Button>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          {t("Discard changes")}
        </Button>
      </div>
    </div>
  );
}
