"use client";

import * as React from "react";
import Link from "next/link";
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
import { GripVertical, LayoutGrid, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/contexts/translation-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


export const MISSION_BOARD_STATUSES = ["Pending", "Scheduled", "In Progress", "Completed"] as const;
export type MissionBoardStatus = (typeof MISSION_BOARD_STATUSES)[number];

export type MissionRow = {
  id: number;
  project_id: number;
  project_name?: string;
  mission_number: string;
  address: string | null;
  status: string;
  notes: string | null;
};

type ProjectOption = { id: number; name: string };

function colId(status: MissionBoardStatus) {
  return `col-${status}`;
}

function normalizeMissionStatus(raw: string | null | undefined): MissionBoardStatus {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "scheduled") return "Scheduled";
  if (s === "in progress" || s === "in_progress" || s === "active") return "In Progress";
  if (s === "completed" || s === "finished") return "Completed";
  return "Pending";
}

function MissionCard({
  mission,
  showProject,
  canDrag,
  canManage,
  onEdit,
}: {
  mission: MissionRow;
  showProject: boolean;
  canDrag: boolean;
  canManage: boolean;
  onEdit: (m: MissionRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `mission-${mission.id}`,
    disabled: !canDrag,
  });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn("shadow-sm transition-shadow", canDrag && "cursor-grab active:cursor-grabbing")}
    >
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start gap-2">
          {canDrag ? (
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
          <div className="min-w-0 flex-1 space-y-1.5 text-sm">
            {showProject && mission.project_name ? (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t("Project")}:</span>{" "}
                <Link href={`/project/${mission.project_id}`} className="text-primary hover:underline">
                  {mission.project_name}
                </Link>
              </p>
            ) : null}
            <p>
              <span className="text-xs font-medium text-muted-foreground">{t("Mission")}:</span>{" "}
              <span className="font-semibold tabular-nums">{mission.mission_number}</span>
            </p>
            {mission.address ? (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="font-medium text-foreground">{t("Address")}:</span> {mission.address}
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("No address")}</p>
            )}
          </div>
          {canManage ? (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onEdit(mission)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MissionColumn({
  status,
  title,
  missions,
  showProject,
  canDrag,
  canManage,
  onEdit,
}: {
  status: MissionBoardStatus;
  title: string;
  missions: MissionRow[];
  showProject: boolean;
  canDrag: boolean;
  canManage: boolean;
  onEdit: (m: MissionRow) => void;
}) {
  const id = colId(status);
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[min(70vh,560px)] w-[280px] shrink-0 flex-col rounded-xl border bg-muted/20",
        isOver && "ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="shrink-0 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {missions.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {missions.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">{t("Drop missions here")}</p>
        ) : (
          missions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              showProject={showProject}
              canDrag={canDrag}
              canManage={canManage}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </div>
  );
}

type MissionsBoardProps = {
  permissions: string[];
  /** When set, board is scoped to a single project (project detail tab). */
  projectId?: number;
  projectName?: string;
  /** Hide search bar on project tab */
  embedded?: boolean;
};

export function MissionsBoard({ permissions, projectId, projectName, embedded = false }: MissionsBoardProps) {
  const { t: tLang } = useTranslation();
  const tr = (s: string) => tLang(s) || s;

  const can = (p: string) =>
    permissions.includes("*") ||
    permissions.includes(p) ||
    permissions.includes("manage-project") ||
    permissions.includes("view-project");
  const canDrag = can("edit-project") || can("manage-project");
  const canManage = can("manage-project") || can("create-project") || can("edit-project");

  const [missions, setMissions] = React.useState<MissionRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [moving, setMoving] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const [formOpen, setFormOpen] = React.useState(false);
  const [editMission, setEditMission] = React.useState<MissionRow | null>(null);
  const [formProjectId, setFormProjectId] = React.useState("");
  const [formMissionNumber, setFormMissionNumber] = React.useState("");
  const [formAddress, setFormAddress] = React.useState("");
  const [formStatus, setFormStatus] = React.useState<MissionBoardStatus>("Pending");
  const [formNotes, setFormNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  const showProjectOnCards = !projectId;

  async function loadMissions() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (projectId) params.set("project_id", String(projectId));

      const url = projectId
        ? `/api/project/${projectId}/missions`
        : `/api/project/missions?${params.toString()}`;

      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(tr("Failed to load missions"));
        setMissions([]);
        return;
      }
      if (projectId) {
        setMissions(Array.isArray(data) ? data : []);
      } else {
        setMissions(Array.isArray(data?.data) ? data.data : []);
      }
    } catch {
      toast.error(tr("Failed to load missions"));
      setMissions([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadProjects() {
    if (projectId) return;
    try {
      const res = await fetch("/api/project/list?per_page=100&page=1", { credentials: "include" });
      const data = await res.json().catch(() => null);
      const rows = Array.isArray(data?.data) ? data.data : [];
      setProjects(rows.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name })));
    } catch {
      setProjects([]);
    }
  }

  React.useEffect(() => {
    void loadMissions();
  }, [projectId]);

  React.useEffect(() => {
    void loadProjects();
  }, [projectId]);

  const columns = React.useMemo(() => {
    const map = new Map<MissionBoardStatus, MissionRow[]>();
    for (const status of MISSION_BOARD_STATUSES) map.set(status, []);
    for (const mission of missions) {
      const bucket = normalizeMissionStatus(mission.status);
      map.get(bucket)!.push(mission);
    }
    return map;
  }, [missions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function openCreate() {
    setEditMission(null);
    setFormProjectId(projectId ? String(projectId) : "");
    setFormMissionNumber("");
    setFormAddress("");
    setFormStatus("Pending");
    setFormNotes("");
    setFormOpen(true);
  }

  function openEdit(m: MissionRow) {
    setEditMission(m);
    setFormProjectId(String(m.project_id));
    setFormMissionNumber(m.mission_number);
    setFormAddress(m.address ?? "");
    setFormStatus(normalizeMissionStatus(m.status));
    setFormNotes(m.notes ?? "");
    setFormOpen(true);
  }

  async function handleSave() {
    if (!formMissionNumber.trim()) {
      toast.error(tr("Mission number is required"));
      return;
    }
    const targetProjectId = projectId ?? Number(formProjectId);
    if (!targetProjectId) {
      toast.error(tr("Select a project"));
      return;
    }

    setSaving(true);
    try {
      const body = {
        mission_number: formMissionNumber.trim(),
        address: formAddress.trim() || null,
        status: formStatus,
        notes: formNotes.trim() || null,
        ...(editMission && { mission_id: editMission.id }),
      };

      const url = editMission
        ? `/api/project/${targetProjectId}/missions`
        : `/api/project/${targetProjectId}/missions`;
      const method = editMission ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : tr("Could not save mission"));
        return;
      }
      toast.success(editMission ? tr("Mission updated") : tr("Mission created"));
      setFormOpen(false);
      await loadMissions();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const m = missions.find((x) => x.id === deleteId);
    if (!m) return;
    const res = await fetch(
      `/api/project/${m.project_id}/missions?mission_id=${deleteId}`,
      { method: "DELETE", credentials: "include" },
    );
    if (!res.ok) {
      toast.error(tr("Could not delete mission"));
      return;
    }
    toast.success(tr("Mission deleted"));
    setDeleteId(null);
    await loadMissions();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !canDrag) return;
    const activeId = String(active.id);
    if (!activeId.startsWith("mission-")) return;
    const missionId = Number(activeId.replace(/^mission-/, ""));
    const overId = String(over.id);
    if (!overId.startsWith("col-")) return;
    const newStatus = overId.replace(/^col-/, "") as MissionBoardStatus;
    if (!MISSION_BOARD_STATUSES.includes(newStatus)) return;

    const mission = missions.find((m) => m.id === missionId);
    if (!mission) return;
    if (normalizeMissionStatus(mission.status) === newStatus) return;

    setMoving(true);
    try {
      const res = await fetch(`/api/project/missions/${missionId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : tr("Could not update mission"));
        return;
      }
      toast.success(tr("Mission updated"));
      await loadMissions();
    } finally {
      setMoving(false);
    }
  }

  const statusLabels: Record<MissionBoardStatus, string> = {
    Pending: tr("Pending"),
    Scheduled: tr("Scheduled"),
    "In Progress": tr("In Progress"),
    Completed: tr("Completed"),
  };

  return (
    <div className="space-y-4">
      {!embedded ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full max-w-md">
              <SearchInput
                value={search}
                onChange={setSearch}
                onSearch={() => void loadMissions()}
                placeholder={tr("Search missions or addresses...")}
              />
            </div>
            {canManage ? (
              <Button size="sm" type="button" onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" />
                {tr("Add Mission")}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {projectName ? (
            <p className="text-sm text-muted-foreground">
              {tr("Missions for")} <span className="font-medium text-foreground">{projectName}</span>
            </p>
          ) : null}
          {canManage ? (
            <Button size="sm" type="button" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              {tr("Add Mission")}
            </Button>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LayoutGrid className="h-4 w-4 shrink-0" />
        <span>{tr("Drag cards between columns to update mission status.")}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">{tr("Loading...")}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragEnd={handleDragEnd}>
          <div
            className={cn(
              "flex gap-3 overflow-x-auto pb-2",
              (moving || !canDrag) && "pointer-events-none opacity-70",
            )}
          >
            {MISSION_BOARD_STATUSES.map((status) => (
              <MissionColumn
                key={status}
                status={status}
                title={statusLabels[status]}
                missions={columns.get(status) ?? []}
                showProject={showProjectOnCards}
                canDrag={canDrag}
                canManage={canManage}
                onEdit={openEdit}
              />
            ))}
          </div>
        </DndContext>
      )}

      <ProjectDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editMission ? tr("Edit Mission") : tr("Add Mission")}
        footerClassName="sm:justify-between"
        footer={
          <>
            {editMission && canManage ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setFormOpen(false);
                  setDeleteId(editMission.id);
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                {tr("Delete")}
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                {tr("Cancel")}
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? tr("Saving...") : tr("Save")}
              </Button>
            </div>
          </>
        }
      >
          <div className="space-y-4">
            {!projectId ? (
              <div className="space-y-2">
                <Label>{tr("Project")}</Label>
                <Select
                  value={formProjectId}
                  onValueChange={setFormProjectId}
                  disabled={!!editMission}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tr("Select project")} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>{tr("Mission")}</Label>
              <Input
                value={formMissionNumber}
                onChange={(e) => setFormMissionNumber(e.target.value)}
                placeholder={tr("e.g. 123456")}
              />
            </div>
            <div className="space-y-2">
              <Label>{tr("Address")}</Label>
              <Textarea
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder={tr("123 Main Street, Anytown, FL 90210")}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{tr("Status")}</Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as MissionBoardStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MISSION_BOARD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tr("Notes")}</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
            </div>
          </div>
      </ProjectDrawer>

      <ProjectDrawer
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={tr("Delete mission?")}
        description={tr("This action cannot be undone.")}
        narrow
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>{tr("Cancel")}</Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()}>{tr("Delete")}</Button>
          </>
        }
      >
        <span className="sr-only">{tr("Confirm delete mission")}</span>
      </ProjectDrawer>
    </div>
  );
}

export default function ProjectsMissionsPage({ permissions }: { permissions: string[] }) {
  return <MissionsBoard permissions={permissions} />;
}
