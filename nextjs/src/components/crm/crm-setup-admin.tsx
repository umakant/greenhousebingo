"use client";

import { appConfirm } from "@/lib/app-confirm";

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
import { Plus, Trash2, Edit, GitBranch, Circle, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TableActionButton } from "@/components/ui/table-action-button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


type Stage = { id?: string; clientKey: string; name: string; color: string; order: number };
type Pipeline = { id: string; name: string; description: string | null; isDefault: boolean; stages: Stage[] };

const STAGE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];

const DEFAULT_STAGES: Omit<Stage, "clientKey">[] = [
  { name: "New", color: "#6366f1", order: 0 },
  { name: "Qualified", color: "#f59e0b", order: 1 },
  { name: "Won", color: "#10b981", order: 2 },
  { name: "Lost", color: "#ef4444", order: 3 },
];

function newClientKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `stage-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeStages(
  stages: Array<{ id?: string; name: string; color: string; order?: number }>,
): Stage[] {
  return [...stages]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s, i) => ({
      id: s.id,
      clientKey: s.id ?? newClientKey(),
      name: s.name,
      color: s.color,
      order: i,
    }));
}

function SortablePipelineStageRow({
  stage,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  stage: Stage;
  index: number;
  onUpdate: (field: "name" | "color", value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.clientKey,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background p-1.5",
        isDragging && "z-10 opacity-95 shadow-md ring-2 ring-primary/25",
      )}
    >
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label={t("Drag to reorder")}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
        {index + 1}
      </span>
      <input
        type="color"
        value={stage.color}
        onChange={(e) => onUpdate("color", e.target.value)}
        className="h-8 w-8 shrink-0 cursor-pointer rounded border"
      />
      <Input
        value={stage.name}
        onChange={(e) => onUpdate("name", e.target.value)}
        placeholder={t("Stage name")}
        className="flex-1"
      />
      <Button type="button" size="icon" variant="ghost" onClick={onRemove} disabled={!canRemove}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export default function CrmSetupAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-crm");
  const [rows, setRows] = React.useState<Pipeline[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", description: "", is_default: false });
  const [stages, setStages] = React.useState<Stage[]>(() => normalizeStages(DEFAULT_STAGES));

  const stageSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const stageIds = React.useMemo(() => stages.map((s) => s.clientKey), [stages]);

  function reorderStages(oldIndex: number, newIndex: number) {
    setStages((prev) => arrayMove(prev, oldIndex, newIndex).map((s, idx) => ({ ...s, order: idx })));
  }

  function handleStageDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stageIds.indexOf(String(active.id));
    const newIndex = stageIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    reorderStages(oldIndex, newIndex);
  }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/crm/pipelines", { cache: "no-store", credentials: "include" });
      const d = await r.json();
      setRows(d.data ?? []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  React.useEffect(() => { void load(); }, []); // eslint-disable-line

  function openCreate() {
    setMode("add"); setEditId(null);
    setForm({ name: "", description: "", is_default: false });
    setStages(normalizeStages(DEFAULT_STAGES));
    setOpen(true);
  }

  function openEdit(row: Pipeline) {
    setMode("edit"); setEditId(row.id);
    setForm({ name: row.name, description: row.description ?? "", is_default: row.isDefault });
    setStages(normalizeStages(row.stages));
    setOpen(true);
  }

  function addStage() {
    setStages((prev) => [
      ...prev,
      {
        clientKey: newClientKey(),
        name: "",
        color: STAGE_COLORS[prev.length % STAGE_COLORS.length],
        order: prev.length,
      },
    ]);
  }

  function removeStage(clientKey: string) {
    setStages((prev) =>
      prev.filter((s) => s.clientKey !== clientKey).map((s, idx) => ({ ...s, order: idx })),
    );
  }

  function updateStage(clientKey: string, field: "name" | "color", value: string) {
    setStages((prev) => prev.map((s) => (s.clientKey === clientKey ? { ...s, [field]: value } : s)));
  }

  async function save() {
    if (!form.name.trim()) return;
    setProcessing(true);
    try {
      const payload = {
        ...form,
        stages: stages.map((s, i) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          order: i,
        })),
      };
      const url = mode === "add" ? "/api/crm/pipelines" : `/api/crm/pipelines/${editId}`;
      const method = mode === "add" ? "POST" : "PUT";
      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await r.json().catch(() => ({}));
      if (r.ok) {
        toast.success(mode === "add" ? t("Pipeline created") : t("Pipeline saved"));
        setOpen(false);
        void load();
      } else {
        toast.error(typeof json.message === "string" ? json.message : t("Failed to save pipeline"));
      }
    } finally { setProcessing(false); }
  }

  async function del(id: string) {
    if (!(await appConfirm(t("Delete this pipeline?")))) return;
    await fetch(`/api/crm/pipelines/${id}`, { method: "DELETE", credentials: "include" });
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2"><GitBranch className="h-5 w-5" />{t("Pipelines")}</h2>
        {can("manage-pipelines") && (
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{t("New Pipeline")}</Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t("Loading...")}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{t("No pipelines yet.")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {row.name}
                    {row.isDefault && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t("Default")}</span>}
                  </CardTitle>
                  {can("manage-pipelines") && (
                    <TableActionButton
                      label={t("Actions")}
                      onPrimaryClick={() => openEdit(row)}
                      items={[
                        { label: t("Edit"), icon: <Edit className="h-4 w-4" />, onSelect: () => openEdit(row) },
                        { label: t("Delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => del(row.id), destructive: true },
                      ]}
                    />
                  )}
                </div>
                {row.description && <p className="text-sm text-muted-foreground">{row.description}</p>}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[...row.stages]
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((s) => (
                    <div key={s.id ?? s.order} className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm">
                      <Circle className="h-3 w-3" style={{ fill: s.color, color: s.color }} />
                      {s.name}
                    </div>
                  ))}
                  {row.stages.length === 0 && <span className="text-sm text-muted-foreground">{t("No stages")}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{mode === "add" ? t("New Pipeline") : t("Edit Pipeline")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label required>{t("Name")}</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder={t("e.g. Sales Pipeline")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Description")}</Label>
              <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder={t("Optional description")} />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("Set as Default")}</Label>
              <Switch checked={form.is_default} onCheckedChange={(v) => setForm((p) => ({ ...p, is_default: v }))} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("Stages")}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addStage}><Plus className="h-3 w-3 mr-1" />{t("Add Stage")}</Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("Drag stages to set the order shown on lead and deal boards.")}</p>
              <DndContext sensors={stageSensors} collisionDetection={closestCenter} onDragEnd={handleStageDragEnd}>
                <SortableContext items={stageIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {stages.map((s, i) => (
                      <SortablePipelineStageRow
                        key={s.clientKey}
                        stage={s}
                        index={i}
                        onUpdate={(field, value) => updateStage(s.clientKey, field, value)}
                        onRemove={() => removeStage(s.clientKey)}
                        canRemove={stages.length > 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={processing || !form.name.trim()} className="flex-1">
                {processing ? t("Saving...") : t("Save")}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
