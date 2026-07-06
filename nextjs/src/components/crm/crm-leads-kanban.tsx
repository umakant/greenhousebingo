"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LayoutGrid, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatPhoneDisplay } from "@/lib/phone";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { formatCrmLeadFullName } from "@/lib/crm-lead-name";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


type Stage = { id: string; name: string; color: string; order?: number };
type Pipeline = { id: string; name: string; stages: Stage[]; isDefault?: boolean };
export type LeadRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: string;
  value: string | null;
  notes: string | null;
  pipelineId: string | null;
  stageId: string | null;
  createdAt: string;
  pipeline?: { id: string; name: string } | null;
  stage?: { id: string; name: string; color: string } | null;
};

function colId(stageId: string | null) {
  return `col-${stageId ?? "none"}`;
}

function LeadCard({
  lead,
  canEdit,
  onEdit,
  formatValue,
}: {
  lead: LeadRow;
  canEdit: boolean;
  onEdit: (row: LeadRow) => void;
  formatValue: (v: string | null | undefined) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lead-${lead.id}`,
    disabled: !canEdit,
  });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 shadow-sm transition-shadow",
        canEdit && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start gap-2">
        {canEdit ? (
          <button
            type="button"
            className="mt-0.5 shrink-0 touch-none text-muted-foreground hover:text-foreground"
            {...listeners}
            {...attributes}
            aria-label={t("Drag to move")}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 font-medium text-sm leading-tight">{formatCrmLeadFullName(lead.firstName, lead.lastName)}</div>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onEdit(lead)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          {lead.company ? <p className="truncate text-xs text-muted-foreground">{lead.company}</p> : null}
          {lead.email ? <p className="truncate text-xs text-muted-foreground">{lead.email}</p> : null}
          {lead.phone ? <p className="text-xs text-muted-foreground">{formatPhoneDisplay(lead.phone)}</p> : null}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge variant="outline" className="text-[10px] capitalize">
              {lead.status}
            </Badge>
            {lead.source ? (
              <Badge variant="secondary" className="text-[10px] capitalize">
                {lead.source.replace(/_/g, " ")}
              </Badge>
            ) : null}
            {lead.value ? (
              <span className="text-[11px] font-medium text-muted-foreground">{formatValue(lead.value)}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

function KanbanColumn({
  stageId,
  title,
  color,
  leads,
  canEdit,
  onEdit,
  formatValue,
}: {
  stageId: string | null;
  title: string;
  color: string;
  leads: LeadRow[];
  canEdit: boolean;
  onEdit: (row: LeadRow) => void;
  formatValue: (v: string | null | undefined) => string;
}) {
  const id = colId(stageId);
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[min(70vh,560px)] w-[272px] shrink-0 flex-col rounded-xl border bg-muted/20",
        isOver && "ring-2 ring-primary/40",
      )}
    >
      <div
        className="flex items-center justify-between gap-2 border-b px-3 py-2.5"
        style={{ borderLeftWidth: 4, borderLeftColor: color }}
      >
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="shrink-0 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium text-muted-foreground">{leads.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {leads.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">{t("Drop leads here")}</p>
        ) : (
          leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} canEdit={canEdit} onEdit={onEdit} formatValue={formatValue} />
          ))
        )}
      </div>
    </div>
  );
}

type Props = {
  permissions: string[];
  pipelines: Pipeline[];
  /** Filters the board the same way as the table search. */
  search?: string;
  onEdit: (row: LeadRow) => void;
};

export function CrmLeadsKanban({ permissions, pipelines, search = "", onEdit }: Props) {
  const { settings } = useAppSettings();
  const formatValue = React.useCallback(
    (v: string | null | undefined) => formatCurrency(Number(v) || 0, settings),
    [settings],
  );
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-crm");
  const canDrag = can("edit-leads");

  const [selectedPipelineId, setSelectedPipelineId] = React.useState("");
  const [leads, setLeads] = React.useState<LeadRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [moving, setMoving] = React.useState(false);

  React.useEffect(() => {
    if (!selectedPipelineId && pipelines.length > 0) {
      const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
      setSelectedPipelineId(def?.id ?? "");
    }
  }, [pipelines, selectedPipelineId]);

  const activePipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const stages = React.useMemo(() => {
    const s = activePipeline?.stages ?? [];
    return [...s].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [activePipeline]);

  async function loadBoard() {
    if (!selectedPipelineId) {
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        board: "1",
        per_page: "500",
        page: "1",
        pipeline_id: selectedPipelineId,
      });
      const r = await fetch(`/api/crm/leads?${params}`, { cache: "no-store", credentials: "include" });
      const d = await r.json();
      setLeads(Array.isArray(d.data) ? d.data : []);
    } catch {
      toast.error(t("Failed to load leads"));
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadBoard();
  }, [selectedPipelineId, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = React.useMemo(() => {
    const unassigned: LeadRow[] = [];
    const byStage = new Map<string, LeadRow[]>();
    for (const s of stages) byStage.set(s.id, []);
    for (const lead of leads) {
      if (!lead.stageId) {
        unassigned.push(lead);
      } else if (byStage.has(lead.stageId)) {
        byStage.get(lead.stageId)!.push(lead);
      } else {
        unassigned.push(lead);
      }
    }
    return { unassigned, byStage };
  }, [leads, stages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !canDrag) return;
    const activeId = String(active.id);
    if (!activeId.startsWith("lead-")) return;
    const leadId = activeId.replace(/^lead-/, "");
    const overId = String(over.id);
    if (!overId.startsWith("col-")) return;

    const stageKey = overId.replace(/^col-/, "");
    const newStageId = stageKey === "none" ? null : stageKey;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const same = (lead.stageId ?? null) === (newStageId ?? null);
    if (same) return;

    setMoving(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: newStageId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json.message === "string" ? json.message : t("Could not move lead"));
        return;
      }
      toast.success(t("Lead updated"));
      await loadBoard();
    } finally {
      setMoving(false);
    }
  }

  if (pipelines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
        {t("Create a pipeline in CRM System Setup to use the lead board.")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LayoutGrid className="h-4 w-4 shrink-0" />
          <span>{t("Drag cards between stages to update pipeline progress.")}</span>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
            <SelectTrigger>
              <SelectValue placeholder={t("Select pipeline")} />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">{t("Loading...")}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragEnd={handleDragEnd}>
          <div
            className={cn(
              "flex gap-3 overflow-x-auto pb-2",
              (moving || !canDrag) && "pointer-events-none opacity-70",
            )}
          >
            <KanbanColumn
              stageId={null}
              title={t("No stage")}
              color="#94a3b8"
              leads={columns.unassigned}
              canEdit={canDrag}
              onEdit={onEdit}
              formatValue={formatValue}
            />
            {stages.map((s) => (
              <KanbanColumn
                key={s.id}
                stageId={s.id}
                title={s.name}
                color={s.color || "#6366f1"}
                leads={columns.byStage.get(s.id) ?? []}
                canEdit={canDrag}
                onEdit={onEdit}
                formatValue={formatValue}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
