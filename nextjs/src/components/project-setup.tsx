"use client";

import * as React from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "@/contexts/translation-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableActionButton } from "@/components/ui/table-action-button";
import { cn } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  Circle,
  GripVertical,
  ListTodo,
  Bug,
} from "lucide-react";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Stage = {
  id: number;
  name: string;
  color: string;
  complete: boolean;
  order: number;
};

/** Matches settings `SectionShell` — card header + optional actions, no save bar */
function SetupSectionShell({
  title,
  description,
  icon: Icon,
  actions,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5 shrink-0" />
            {title}
          </CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SortableStageRow({
  stage,
  index,
  onEdit,
  onDelete,
}: {
  stage: Stage;
  index: number;
  onEdit: (s: Stage) => void;
  onDelete: (id: number) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(stage.id) });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 shadow-sm transition-colors hover:bg-muted/30 sm:gap-3 sm:px-4 sm:py-3",
        isDragging ? "z-10 opacity-95 shadow-md ring-2 ring-primary/25" : "",
      )}
    >
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-md border bg-muted/40 text-muted-foreground active:cursor-grabbing"
        aria-label={t("Drag to reorder")}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {index + 1}
      </span>
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-sm border border-border shadow-inner"
        style={{ backgroundColor: stage.color }}
        title={stage.color}
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{stage.name}</span>
      {stage.complete ? (
        <span className="inline-flex max-w-[5.5rem] shrink-0 items-center gap-1 truncate rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary sm:max-w-none sm:px-2 sm:text-xs">
          <CheckCircle className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{t("Completes")}</span>
        </span>
      ) : null}
      <div className="shrink-0" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <TableActionButton
          label={t("Edit")}
          onPrimaryClick={() => onEdit(stage)}
          items={[
            { label: t("Edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => onEdit(stage) },
            { label: t("Delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => onDelete(stage.id), destructive: true },
          ]}
        />
      </div>
    </li>
  );
}

// ── Stage Editor Section ──────────────────────────────────────────────────────
function StageEditor({
  title,
  apiBase,
  stageLabel,
  sectionIcon: SectionIcon,
}: {
  title: string;
  apiBase: string;
  stageLabel: string;
  sectionIcon: React.ComponentType<{ className?: string }>;
}) {
  const { t } = useTranslation();
  const [stages, setStages] = React.useState<Stage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [editStage, setEditStage] = React.useState<Stage | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formColor, setFormColor] = React.useState("#3b82f6");
  const [formComplete, setFormComplete] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);
  const [reordering, setReordering] = React.useState(false);

  const sortableIds = React.useMemo(() => stages.map((s) => String(s.id)), [stages]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = React.useCallback(() => {
    setLoading(true);
    fetch(apiBase, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setStages(Array.isArray(data) ? data.sort((a: Stage, b: Stage) => a.order - b.order) : []);
        setError(null);
      })
      .catch(() => setError(t("Failed to load stages")))
      .finally(() => setLoading(false));
  }, [apiBase]);

  React.useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditStage(null);
    setFormName("");
    setFormColor("#3b82f6");
    setFormComplete(false);
    setShowForm(true);
  };

  const openEdit = (s: Stage) => {
    setEditStage(s);
    setFormName(s.name);
    setFormColor(s.color);
    setFormComplete(s.complete);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editStage) {
        await fetch(`${apiBase}/${editStage.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: formName.trim(), color: formColor, complete: formComplete }),
        });
      } else {
        await fetch(apiBase, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: formName.trim(), color: formColor, complete: formComplete }),
        });
      }
      setShowForm(false);
      load();
    } catch {
      setError(t("Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`${apiBase}/${id}`, { method: "DELETE", credentials: "include" });
    setDeleteId(null);
    load();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = stages;
    const reordered = arrayMove(stages, oldIndex, newIndex);
    const orderById = new Map(previous.map((s) => [s.id, s.order]));
    const withOrders: Stage[] = reordered.map((s, i) => ({ ...s, order: i + 1 }));
    const toSync = withOrders.filter((s) => orderById.get(s.id) !== s.order);
    if (toSync.length === 0) return;

    setStages(withOrders);
    setReordering(true);
    setError(null);
    try {
      await Promise.all(
        toSync.map((s) =>
          fetch(`${apiBase}/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ order: s.order }),
          }).then((r) => {
            if (!r.ok) throw new Error("order");
          }),
        ),
      );
    } catch {
      setStages(previous);
      setError(t("Failed to save order"));
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SetupSectionShell
        title={title}
        description={`${t("Define workflow stages for your projects.")} ${t("Drag the handle to reorder.")}`}
        icon={SectionIcon}
        actions={
          <Button size="sm" type="button" className="gap-1" onClick={openNew}>
            <Plus className="h-4 w-4" />
            {t("Add Stage")}
          </Button>
        }
      >
        {error ? <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted-foreground">{t("Loading...")}</div>
        ) : stages.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
            {t("No stages yet. Click \"Add Stage\" to create one.")}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <ul className={cn("space-y-2", reordering ? "pointer-events-none opacity-70" : "")} role="list">
                {stages.map((s, i) => (
                  <SortableStageRow
                    key={s.id}
                    stage={s}
                    index={i}
                    onEdit={openEdit}
                    onDelete={(id) => setDeleteId(id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </SetupSectionShell>

      {/* Add / Edit — right drawer */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="right" className="sm:max-w-none w-[480px] max-w-[92vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editStage ? `${t("Edit")} ${stageLabel}` : `${t("Add")} ${stageLabel}`}
            </SheetTitle>
            <SheetDescription>
              {t("Configure the stage name, color, and whether it marks items as complete.")}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid gap-4">
            <div className="space-y-1.5">
              <Label>{t("Name")} *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("Stage name")}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Color")}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border"
                />
                <Input
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormComplete((v) => !v)}
              className="flex items-center gap-2 text-sm w-fit"
            >
              {formComplete ? (
                <CheckCircle className="h-4 w-4 text-teal-600" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              {t("Mark as completing stage")}
            </button>
          </div>
          <SheetFooter className="mt-8 sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>{t("Cancel")}</Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? t("Saving…") : t("Save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ProjectDrawer
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("Delete Stage")}
        description={t("This will remove the stage. Items in this stage will have their stage cleared.")}
        narrow
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteId(null)}>{t("Cancel")}</Button>
            <Button variant="destructive" onClick={() => deleteId !== null && handleDelete(deleteId)}>
              {t("Delete")}
            </Button>
          </>
        }
      >
        <span className="sr-only">{t("Confirm delete stage")}</span>
      </ProjectDrawer>
    </div>
  );
}

// ── Main Component (WorkDo-style: side nav + single content panel) ───────────
type SetupSection = "task" | "bug";

export function ProjectSetup() {
  const { t } = useTranslation();
  const [section, setSection] = React.useState<SetupSection>("task");

  const nav = React.useMemo(
    () =>
      [
        {
          id: "task" as const,
          label: t("Task Stages"),
          icon: ListTodo,
          apiBase: "/api/project/task-stages",
          stageLabel: t("Task Stage"),
          title: t("Task Stages"),
        },
        {
          id: "bug" as const,
          label: t("Bug Stages"),
          icon: Bug,
          apiBase: "/api/project/bug-stages",
          stageLabel: t("Bug Stage"),
          title: t("Bug Stages"),
        },
      ] as const,
    [t],
  );

  const active = nav.find((n) => n.id === section)!;

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="md:w-64 flex-shrink-0">
        <div className="md:sticky md:top-4">
          <div className="md:hidden -mx-1 px-1">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={section === item.id ? "default" : "outline"}
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => setSection(item.id)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <ScrollArea className="hidden md:block h-[min(70vh,calc(100vh-8rem))]">
            <div className="pr-4 space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const isActive = section === item.id;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    variant="ghost"
                    className={cn("w-full justify-start", isActive && "bg-muted font-medium")}
                    onClick={() => setSection(item.id)}
                  >
                    <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <div className="flex-1 min-w-0 pt-4 md:pt-0">
        <StageEditor
          key={section}
          title={active.title}
          apiBase={active.apiBase}
          stageLabel={active.stageLabel}
          sectionIcon={active.icon}
        />
      </div>
    </div>
  );
}
