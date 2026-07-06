"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { FormattedCurrency } from "@/components/formatted-currency";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import {
  formatCurrency,
  parseCurrencyToNumber,
  filterMoneyDecimalInput,
} from "@/lib/format-currency";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Bug,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Edit,
  Flag,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Milestone,
  Plus,
  Trash2,
  Upload,
  Download,
  Users,
  FileText,
  MapPin,
  MapPinned,
  Activity,
  BedDouble,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Crown,
  StickyNote,
  Shield,
  ShieldAlert,
  Stethoscope,
  UserCheck,
  BarChart3,
  Briefcase,
  Hospital,
  PackageSearch,
  ClipboardList as ClipboardListIcon,
  FileSignature,
} from "lucide-react";
import { MissionsBoard } from "@/components/projects/missions-board";
import { ProjectOpsHeader } from "@/components/projects/operations/project-ops-header";
import {
  ProjectOpsDynamicForm,
  buildProjectOpsFormData,
} from "@/components/projects/operations/project-ops-dynamic-form";
import { coerceOptionalId, normalizeAssignedTo } from "@/lib/project-ops-form-utils";
import { useRouter } from "next/navigation";
import { OpsOverviewTab } from "@/components/projects/operations/project-ops-overview";
import {
  AgentsTab,
  AgentChecklistTab,
  ActivityTab,
  ChecklistTab,
  DocumentsTab,
  LeadershipTab,
  LodgingTab,
  MedicsTab,
  NotesTab,
  RiskAssessmentTab,
  ScheduleTab,
  SecurityTab,
  VendorsTab,
} from "@/components/projects/operations/project-ops-tabs";
import {
  AfterActionTab,
  IncidentReportsTab,
  LostFoundTab,
  MedicalFacilitiesTab,
  PositionsTab,
  ReportsTab,
  LocationsTab,
} from "@/components/projects/operations/project-ops-extra-tabs";
import { SowTab } from "@/components/projects/operations/project-ops-sow-tab";
import { useTranslation } from "@/contexts/translation-context";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PROJECT_VISIBLE_SECTIONS,
  isProjectSectionVisible,
  normalizeProjectVisibleSections,
  sortProjectNavSections,
} from "@/lib/project-visible-sections";

/** Avoid Response.json() throwing when the body is empty or not JSON (e.g. proxy/HTML errors). */
async function jsonFromResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Parse API JSON for error fields; never throws (avoids surfacing SyntaxError to users). */
function parseApiJsonBody(raw: string): { error?: string; ok?: boolean } {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as { error?: string; ok?: boolean };
  } catch {
    return {};
  }
}

type Project = {
  id: number;
  name: string;
  description: string | null;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  property_name?: string | null;
  city?: string | null;
  state?: string | null;
  usr_number?: string | null;
  security_director_name?: string | null;
  security_director_phone?: string | null;
  security_director_email?: string | null;
  timezone?: string | null;
};

type Stage = { id: number; name: string; color: string; complete: boolean };
type UserOption = {
  id: number;
  name: string;
  email: string;
  source?: "user" | "employee";
  employee_id?: number;
};
type MilestoneOption = { id: number; title: string };

type TaskRow = {
  id: number;
  title: string;
  priority: string;
  stage: { id: number; name: string; color: string } | null;
  milestone: { id: number; title: string } | null;
  assigned_users: { id: number; name: string }[];
  start_date: string | null;
  end_date: string | null;
  comment_count: number;
  subtask_count: number;
  subtask_completed: number;
};

type BugRow = {
  id: number;
  title: string;
  priority: string;
  stage: { id: number; name: string; color: string } | null;
  assigned_users: { id: number; name: string }[];
  comment_count: number;
};

type MilestoneRow = {
  id: number;
  title: string;
  cost: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  progress: number;
  summary: string | null;
};

type MemberRow = { id: number; name: string; email: string; type: string | null };

export type ProjectSectionId =
  | "overview"
  | "checklist"
  | "agent_checklist"
  | "vendors"
  | "agents"
  | "medics"
  | "security"
  | "schedule"
  | "lodging"
  | "locations"
  | "documents"
  | "risk_assessment"
  | "notes"
  | "leadership"
  | "activity"
  | "reports"
  | "incident_reports"
  | "medical_facilities"
  | "lost_found"
  | "after_action"
  | "position"
  | "project_details"
  | "missions"
  | "tasks"
  | "bugs"
  | "milestones"
  | "team"
  | "files"
  | "sow";

const OPS_SECTION_IDS = new Set<ProjectSectionId>([
  "overview",
  "checklist",
  "agent_checklist",
  "vendors",
  "agents",
  "medics",
  "security",
  "schedule",
  "lodging",
  "locations",
  "documents",
  "risk_assessment",
  "notes",
  "leadership",
  "activity",
  "reports",
  "incident_reports",
  "medical_facilities",
  "lost_found",
  "after_action",
  "position",
  "sow",
]);

const TAB_ALIASES: Record<string, ProjectSectionId> = {
  hospital: "medical_facilities",
  "lost-found": "lost_found",
  "after-action": "after_action",
};

const VALID_SECTION_IDS = new Set<ProjectSectionId>([
  "overview",
  "checklist",
  "agent_checklist",
  "vendors",
  "agents",
  "medics",
  "security",
  "schedule",
  "lodging",
  "locations",
  "documents",
  "risk_assessment",
  "notes",
  "leadership",
  "activity",
  "reports",
  "incident_reports",
  "medical_facilities",
  "lost_found",
  "after_action",
  "position",
  "project_details",
  "missions",
  "tasks",
  "bugs",
  "milestones",
  "team",
  "files",
  "sow",
]);

function resolveTabParam(tab: string | null): ProjectSectionId {
  if (!tab) return "overview";
  const aliased = TAB_ALIASES[tab] ?? tab;
  if (VALID_SECTION_IDS.has(aliased as ProjectSectionId)) return aliased as ProjectSectionId;
  return "overview";
}

type ProjectNavItem = {
  id: ProjectSectionId;
  titleKey: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PROJECT_SECTIONS: ProjectNavItem[] = [
  { id: "overview", titleKey: "Overview", icon: LayoutDashboard },
  { id: "checklist", titleKey: "Checklist", icon: ClipboardCheck },
  { id: "agent_checklist", titleKey: "Agent Checklist", icon: UserCheck },
  { id: "vendors", titleKey: "Vendors", icon: Building2 },
  { id: "agents", titleKey: "Agents", icon: Users },
  { id: "medics", titleKey: "Medics", icon: Stethoscope },
  { id: "security", titleKey: "Security", icon: Shield },
  { id: "schedule", titleKey: "Schedule", icon: CalendarClock },
  { id: "lodging", titleKey: "Lodging", icon: BedDouble },
  { id: "locations", titleKey: "Locations", icon: MapPinned },
  { id: "documents", titleKey: "Documents", icon: FileText },
  { id: "risk_assessment", titleKey: "Risk Assessment", icon: ShieldAlert },
  { id: "notes", titleKey: "Notes", icon: StickyNote },
  { id: "leadership", titleKey: "Leadership", icon: Crown },
  { id: "activity", titleKey: "Activity", icon: Activity },
  { id: "reports", titleKey: "Reports", icon: BarChart3 },
  { id: "incident_reports", titleKey: "Incident Reports", icon: AlertTriangle },
  { id: "medical_facilities", titleKey: "Medical Facilities", icon: Hospital },
  { id: "lost_found", titleKey: "Lost & Found", icon: PackageSearch },
  { id: "after_action", titleKey: "After Action", icon: ClipboardListIcon },
  { id: "position", titleKey: "Position", icon: Briefcase },
  { id: "project_details", titleKey: "Project Details", icon: ClipboardList },
  { id: "missions", titleKey: "Missions", icon: MapPin },
  { id: "tasks", titleKey: "Tasks", icon: ListTodo },
  { id: "bugs", titleKey: "Bugs", icon: Bug },
  { id: "milestones", titleKey: "Milestones", icon: Milestone },
  { id: "team", titleKey: "Team", icon: Users },
  { id: "files", titleKey: "Files", icon: FileText },
  { id: "sow", titleKey: "SOW", icon: FileSignature },
];

function ProjectSectionShell({
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
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  High: "text-red-600 bg-red-50 border-red-200",
  Medium: "text-amber-600 bg-amber-50 border-amber-200",
  Low: "text-green-600 bg-green-50 border-green-200",
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[priority] ?? ""}`}>
      <Flag className="h-3 w-3" />
      {priority}
    </span>
  );
}

function StageBadge({ stage }: { stage: { name: string; color: string } | null }) {
  const { t } = useTranslation();
  if (!stage) return <span className="text-xs text-muted-foreground">{t("No stage")}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: stage.color }}>
      {stage.name}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Ongoing: "bg-blue-100 text-blue-700",
    Finished: "bg-green-100 text-green-700",
    Onhold: "bg-amber-100 text-amber-700",
    "Not Started": "bg-gray-100 text-gray-600",
    Complete: "bg-green-100 text-green-700",
    Incomplete: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function TasksTab({
  projectId,
  stages,
  members,
  milestones,
  canManage,
}: {
  projectId: number;
  stages: Stage[];
  members: UserOption[];
  milestones: MilestoneOption[];
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const [tasks, setTasks] = React.useState<TaskRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stageFilter, setStageFilter] = React.useState("__all__");
  const [priorityFilter, setPriorityFilter] = React.useState("__all__");
  const [showForm, setShowForm] = React.useState(false);
  const [editTask, setEditTask] = React.useState<TaskRow | null>(null);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  const [formTitle, setFormTitle] = React.useState("");
  const [formPriority, setFormPriority] = React.useState("Medium");
  const [formStageId, setFormStageId] = React.useState("__none__");
  const [formMilestoneId, setFormMilestoneId] = React.useState("__none__");
  const [formStart, setFormStart] = React.useState("");
  const [formEnd, setFormEnd] = React.useState("");
  const [formDesc, setFormDesc] = React.useState("");
  const [formAssigned, setFormAssigned] = React.useState<number[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ project_id: String(projectId), per_page: "100" });
    if (stageFilter !== "__all__") params.set("stage_id", stageFilter);
    if (priorityFilter !== "__all__") params.set("priority", priorityFilter);
    fetch(`/api/project/tasks?${params}`, { credentials: "include" })
      .then(async (r) => {
        const d = await jsonFromResponse<{ data?: unknown }>(r);
        setTasks(Array.isArray(d?.data) ? (d.data as TaskRow[]) : []);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [projectId, stageFilter, priorityFilter]);

  React.useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditTask(null);
    setFormTitle(""); setFormPriority("Medium"); setFormStageId("__none__");
    setFormMilestoneId("__none__"); setFormStart(""); setFormEnd("");
    setFormDesc(""); setFormAssigned([]);
    setError(null); setShowForm(true);
  };

  const openEdit = (task: TaskRow) => {
    setEditTask(task);
    setFormTitle(task.title);
    setFormPriority(task.priority);
    setFormStageId(task.stage ? String(task.stage.id) : "__none__");
    setFormMilestoneId(task.milestone ? String(task.milestone.id) : "__none__");
    setFormStart(task.start_date ?? "");
    setFormEnd(task.end_date ?? "");
    setFormDesc("");
    setFormAssigned(task.assigned_users.map((u) => u.id));
    setError(null); setShowForm(true);
  };

  const toggleAssigned = (uid: number) =>
    setFormAssigned((prev) => prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]);

  const handleSave = async () => {
    if (!formTitle.trim()) return setError(t("Title is required"));
    setSaving(true); setError(null);
    try {
      const body = {
        project_id: projectId,
        title: formTitle.trim(),
        priority: formPriority,
        stage_id: formStageId !== "__none__" ? Number(formStageId) : null,
        milestone_id: formMilestoneId !== "__none__" ? Number(formMilestoneId) : null,
        start_date: formStart || null,
        end_date: formEnd || null,
        description: formDesc.trim() || null,
        assigned_to: formAssigned,
      };
      const url = editTask ? `/api/project/tasks/${editTask.id}` : "/api/project/tasks";
      const method = editTask ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(body),
      });
      const raw = await res.text();
      let payload: { error?: string } = {};
      if (raw.trim()) {
        try {
          payload = JSON.parse(raw) as { error?: string };
        } catch {
          if (!res.ok) throw new Error(`Request failed (${res.status})`);
        }
      }
      if (!res.ok) throw new Error(payload.error ?? `Request failed (${res.status})`);
      setShowForm(false); load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/project/tasks/${id}`, { method: "DELETE", credentials: "include" });
    setDeleteId(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder={t("All stages")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("All Stages")}</SelectItem>
            {stages.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder={t("All priorities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("All Priorities")}</SelectItem>
            {["High", "Medium", "Low"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          {canManage && (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-3.5 w-3.5 mr-1" />{t("Add Task")}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{t("Loading...")}</div>
      ) : tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {t("No tasks yet.")}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{task.title}</span>
                  <PriorityBadge priority={task.priority} />
                  <StageBadge stage={task.stage} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {task.milestone && (
                    <span className="flex items-center gap-1">
                      <Milestone className="h-3 w-3" />{task.milestone.title}
                    </span>
                  )}
                  {(task.start_date || task.end_date) && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {task.start_date ?? "?"} — {task.end_date ?? "?"}
                    </span>
                  )}
                  {task.comment_count > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />{task.comment_count}
                    </span>
                  )}
                  {task.subtask_count > 0 && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {task.subtask_completed}/{task.subtask_count}
                    </span>
                  )}
                  {task.assigned_users.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {task.assigned_users.map((u) => u.name).join(", ")}
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(task)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(task.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="right" className="sm:max-w-none w-[560px] max-w-[92vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editTask ? t("Edit Task") : t("Add Task")}</SheetTitle>
          </SheetHeader>
          {showForm ? (
            <div className="mt-6">
              <ProjectOpsDynamicForm
                key={editTask?.id ?? "new"}
                sectionId="tasks"
                projectId={projectId}
                initialValues={
                  editTask
                    ? {
                        title: editTask.title,
                        priority: editTask.priority,
                        stage_id: editTask.stage?.id ?? "",
                        milestone_id: editTask.milestone?.id ?? "",
                        start_date: editTask.start_date ?? "",
                        end_date: editTask.end_date ?? "",
                        assigned_to: editTask.assigned_users.map((u) => String(u.id)),
                      }
                    : { priority: "Medium" }
                }
                context={{
                  stages,
                  members,
                  milestones: milestones.map((m) => ({ id: m.id, title: m.title })),
                }}
                submitLabel={editTask ? t("Save") : t("Create")}
                onSubmit={async (payload) => {
                  const body = {
                    project_id: projectId,
                    title: String(payload.title ?? "").trim(),
                    priority: payload.priority ?? "Medium",
                    stage_id: coerceOptionalId(payload.stage_id),
                    milestone_id: coerceOptionalId(payload.milestone_id),
                    start_date: payload.start_date || null,
                    end_date: payload.end_date || null,
                    description: payload.description ? String(payload.description).trim() : null,
                    assigned_to: normalizeAssignedTo(payload.assigned_to),
                  };
                  if (!body.title) throw new Error(t("Title is required"));
                  const url = editTask ? `/api/project/tasks/${editTask.id}` : "/api/project/tasks";
                  const method = editTask ? "PATCH" : "POST";
                  const res = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(body),
                  });
                  const raw = await res.text();
                  let responsePayload: { error?: string } = {};
                  if (raw.trim()) {
                    try {
                      responsePayload = JSON.parse(raw) as { error?: string };
                    } catch {
                      if (!res.ok) throw new Error(`Request failed (${res.status})`);
                    }
                  }
                  if (!res.ok) throw new Error(responsePayload.error ?? `Request failed (${res.status})`);
                  setShowForm(false);
                  load();
                }}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <ProjectDrawer
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("Delete Task")}
        description={t("This cannot be undone.")}
        narrow
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteId(null)}>{t("Cancel")}</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>{t("Delete")}</Button>
          </>
        }
      >
        <span className="sr-only">{t("Confirm delete task")}</span>
      </ProjectDrawer>
    </div>
  );
}

function BugsTab({
  projectId,
  stages,
  members,
  canManage,
}: {
  projectId: number;
  stages: Stage[];
  members: UserOption[];
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const [bugs, setBugs] = React.useState<BugRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stageFilter, setStageFilter] = React.useState("__all__");
  const [showForm, setShowForm] = React.useState(false);
  const [editBug, setEditBug] = React.useState<BugRow | null>(null);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  const [formTitle, setFormTitle] = React.useState("");
  const [formPriority, setFormPriority] = React.useState("Medium");
  const [formStageId, setFormStageId] = React.useState("__none__");
  const [formDesc, setFormDesc] = React.useState("");
  const [formAssigned, setFormAssigned] = React.useState<number[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ project_id: String(projectId), per_page: "100" });
    if (stageFilter !== "__all__") params.set("stage_id", stageFilter);
    fetch(`/api/project/bugs?${params}`, { credentials: "include" })
      .then(async (r) => {
        const d = await jsonFromResponse<{ data?: unknown }>(r);
        setBugs(Array.isArray(d?.data) ? (d.data as BugRow[]) : []);
      })
      .catch(() => setBugs([]))
      .finally(() => setLoading(false));
  }, [projectId, stageFilter]);

  React.useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditBug(null);
    setFormTitle(""); setFormPriority("Medium"); setFormStageId("__none__");
    setFormDesc(""); setFormAssigned([]); setError(null); setShowForm(true);
  };

  const openEdit = (bug: BugRow) => {
    setEditBug(bug);
    setFormTitle(bug.title); setFormPriority(bug.priority);
    setFormStageId(bug.stage ? String(bug.stage.id) : "__none__");
    setFormDesc(""); setFormAssigned(bug.assigned_users.map((u) => u.id));
    setError(null); setShowForm(true);
  };

  const toggleAssigned = (uid: number) =>
    setFormAssigned((prev) => prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]);

  const handleSave = async () => {
    if (!formTitle.trim()) return setError(t("Title is required"));
    setSaving(true); setError(null);
    try {
      const body = {
        project_id: projectId,
        title: formTitle.trim(), priority: formPriority,
        stage_id: formStageId !== "__none__" ? Number(formStageId) : null,
        description: formDesc.trim() || null, assigned_to: formAssigned,
      };
      const url = editBug ? `/api/project/bugs/${editBug.id}` : "/api/project/bugs";
      const method = editBug ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(body),
      });
      const raw = await res.text();
      let payload: { error?: string } = {};
      if (raw.trim()) {
        try {
          payload = JSON.parse(raw) as { error?: string };
        } catch {
          if (!res.ok) throw new Error(`Request failed (${res.status})`);
        }
      }
      if (!res.ok) throw new Error(payload.error ?? `Request failed (${res.status})`);
      setShowForm(false); load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/project/bugs/${id}`, { method: "DELETE", credentials: "include" });
    setDeleteId(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder={t("All stages")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("All Stages")}</SelectItem>
            {stages.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          {canManage && (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-3.5 w-3.5 mr-1" />{t("Report Bug")}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{t("Loading...")}</div>
      ) : bugs.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          <Bug className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {t("No bugs reported.")}
        </div>
      ) : (
        <div className="space-y-2">
          {bugs.map((bug) => (
            <div key={bug.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{bug.title}</span>
                  <PriorityBadge priority={bug.priority} />
                  <StageBadge stage={bug.stage} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {bug.comment_count > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />{bug.comment_count}
                    </span>
                  )}
                  {bug.assigned_users.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />{bug.assigned_users.map((u) => u.name).join(", ")}
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(bug)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(bug.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="right" className="sm:max-w-none w-[560px] max-w-[92vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editBug ? t("Edit Bug") : t("Report Bug")}</SheetTitle>
          </SheetHeader>
          {showForm ? (
            <div className="mt-6">
              <ProjectOpsDynamicForm
                key={editBug?.id ?? "new"}
                sectionId="bugs"
                projectId={projectId}
                initialValues={
                  editBug
                    ? {
                        title: editBug.title,
                        priority: editBug.priority,
                        stage_id: editBug.stage?.id ?? "",
                        assigned_to: editBug.assigned_users.map((u) => String(u.id)),
                      }
                    : { priority: "Medium" }
                }
                context={{ stages, members }}
                submitLabel={t("Save")}
                onSubmit={async (payload) => {
                  const body = {
                    project_id: projectId,
                    title: String(payload.title ?? "").trim(),
                    priority: payload.priority ?? "Medium",
                    stage_id: coerceOptionalId(payload.stage_id),
                    description: payload.description ? String(payload.description).trim() : null,
                    assigned_to: normalizeAssignedTo(payload.assigned_to),
                  };
                  if (!body.title) throw new Error(t("Title is required"));
                  const url = editBug ? `/api/project/bugs/${editBug.id}` : "/api/project/bugs";
                  const method = editBug ? "PATCH" : "POST";
                  const res = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(body),
                  });
                  const raw = await res.text();
                  let responsePayload: { error?: string } = {};
                  if (raw.trim()) {
                    try {
                      responsePayload = JSON.parse(raw) as { error?: string };
                    } catch {
                      if (!res.ok) throw new Error(`Request failed (${res.status})`);
                    }
                  }
                  if (!res.ok) throw new Error(responsePayload.error ?? `Request failed (${res.status})`);
                  setShowForm(false);
                  load();
                }}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <ProjectDrawer
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("Delete Bug")}
        description={t("This cannot be undone.")}
        narrow
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteId(null)}>{t("Cancel")}</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>{t("Delete")}</Button>
          </>
        }
      >
        <span className="sr-only">{t("Confirm delete bug")}</span>
      </ProjectDrawer>
    </div>
  );
}

function MilestonesTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const [milestones, setMilestones] = React.useState<MilestoneRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [editMs, setEditMs] = React.useState<MilestoneRow | null>(null);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  const [formTitle, setFormTitle] = React.useState("");
  const [formCost, setFormCost] = React.useState("");
  const [formStart, setFormStart] = React.useState("");
  const [formEnd, setFormEnd] = React.useState("");
  const [formStatus, setFormStatus] = React.useState("Incomplete");
  const [formProgress, setFormProgress] = React.useState("0");
  const [formSummary, setFormSummary] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const decimalPlaces = React.useMemo(() => {
    const d = parseInt(String(settings.decimalFormat ?? "2").trim() || "2", 10);
    return Math.min(10, Math.max(0, Number.isFinite(d) ? d : 2));
  }, [settings.decimalFormat]);

  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;

  const load = React.useCallback(() => {
    setLoading(true);
    fetch(`/api/project/${projectId}/milestones`, { credentials: "include" })
      .then(async (r) => {
        const d = await jsonFromResponse<unknown>(r);
        setMilestones(Array.isArray(d) ? (d as MilestoneRow[]) : []);
      })
      .catch(() => setMilestones([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  React.useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditMs(null);
    setFormTitle(""); setFormCost(""); setFormStart(""); setFormEnd("");
    setFormStatus("Incomplete"); setFormProgress("0"); setFormSummary("");
    setError(null); setShowForm(true);
  };

  const openEdit = (m: MilestoneRow) => {
    setEditMs(m);
    setFormTitle(m.title);
    setFormCost(
      m.cost != null && m.cost !== "" && Number.isFinite(Number(m.cost))
        ? formatCurrency(Number(m.cost), settingsRef.current)
        : "",
    );
    setFormStart(m.start_date ?? ""); setFormEnd(m.end_date ?? "");
    setFormStatus(m.status); setFormProgress(String(m.progress));
    setFormSummary(m.summary ?? ""); setError(null); setShowForm(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return setError(t("Title is required"));
    let costNum: number | null = null;
    if (formCost.trim() !== "") {
      const n = parseCurrencyToNumber(formCost, settings);
      if (!Number.isFinite(n) || n < 0) {
        return setError(t("Enter a valid cost amount"));
      }
      costNum = n;
    }
    setSaving(true); setError(null);
    try {
      const body = {
        title: formTitle.trim(),
        cost: costNum,
        start_date: formStart || null,
        end_date: formEnd || null,
        status: formStatus,
        progress: Number(formProgress),
        summary: formSummary.trim() || null,
        ...(editMs && { milestone_id: editMs.id }),
      };
      const method = editMs ? "PATCH" : "POST";
      const res = await fetch(`/api/project/${projectId}/milestones`, {
        method, headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(body),
      });
      const raw = await res.text();
      let payload: { error?: string } = {};
      if (raw.trim()) {
        try {
          payload = JSON.parse(raw) as { error?: string };
        } catch {
          if (!res.ok) throw new Error(`Request failed (${res.status})`);
        }
      }
      if (!res.ok) throw new Error(payload.error ?? `Request failed (${res.status})`);
      setShowForm(false); load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/project/${projectId}/milestones?milestone_id=${id}`, { method: "DELETE", credentials: "include" });
    setDeleteId(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && (
          <Button size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5 mr-1" />{t("Add Milestone")}
          </Button>
        )}
      </div>
      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{t("Loading...")}</div>
      ) : milestones.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          <Milestone className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {t("No milestones yet.")}
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((m) => (
            <div key={m.id} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{m.title}</span>
                    <StatusBadge status={m.status} />
                    {m.cost && <span className="text-xs text-muted-foreground">${Number(m.cost).toLocaleString()}</span>}
                  </div>
                  {(m.start_date || m.end_date) && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {m.start_date ?? "?"} — {m.end_date ?? "?"}
                    </div>
                  )}
                  {m.summary && <div className="text-xs text-muted-foreground">{m.summary}</div>}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(m)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(m.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("Progress")}</span>
                  <span>{m.progress}%</span>
                </div>
                <Progress value={m.progress} className="h-1.5" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="right" className="sm:max-w-none w-[560px] max-w-[92vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editMs ? t("Edit Milestone") : t("Add Milestone")}</SheetTitle>
          </SheetHeader>
          {showForm ? (
            <div className="mt-6">
              <ProjectOpsDynamicForm
                key={editMs?.id ?? "new"}
                sectionId="milestones"
                projectId={projectId}
                initialValues={
                  editMs
                    ? {
                        title: editMs.title,
                        cost:
                          editMs.cost != null && editMs.cost !== "" && Number.isFinite(Number(editMs.cost))
                            ? formatCurrency(Number(editMs.cost), settingsRef.current)
                            : "",
                        start_date: editMs.start_date ?? "",
                        end_date: editMs.end_date ?? "",
                        status: editMs.status,
                        progress: editMs.progress,
                        summary: editMs.summary ?? "",
                      }
                    : { status: "Incomplete", progress: 0 }
                }
                submitLabel={t("Save")}
                onSubmit={async (payload) => {
                  let cost: number | null = null;
                  if (payload.cost != null && String(payload.cost).trim() !== "") {
                    const n = parseCurrencyToNumber(String(payload.cost), settings);
                    if (!Number.isFinite(n)) throw new Error(t("Invalid cost"));
                    cost = n;
                  }
                  const body = {
                    title: String(payload.title ?? "").trim(),
                    cost,
                    start_date: payload.start_date || null,
                    end_date: payload.end_date || null,
                    status: payload.status ?? "Incomplete",
                    progress: Number(payload.progress ?? 0),
                    summary: payload.summary ? String(payload.summary).trim() : null,
                  };
                  if (!body.title) throw new Error(t("Title is required"));
                  const url = editMs ? `/api/project/milestones/${editMs.id}` : "/api/project/milestones";
                  const method = editMs ? "PATCH" : "POST";
                  const res = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ ...body, project_id: projectId }),
                  });
                  if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    throw new Error(d.error ?? t("Save failed"));
                  }
                  setShowForm(false);
                  load();
                }}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <ProjectDrawer
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("Delete Milestone")}
        description={t("This cannot be undone.")}
        narrow
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteId(null)}>{t("Cancel")}</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>{t("Delete")}</Button>
          </>
        }
      >
        <span className="sr-only">{t("Confirm delete milestone")}</span>
      </ProjectDrawer>
    </div>
  );
}

function TeamTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const { t } = useTranslation();
  const [members, setMembers] = React.useState<MemberRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [allUsers, setAllUsers] = React.useState<UserOption[]>([]);
  const [showAdd, setShowAdd] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState("__none__");
  const [userSearch, setUserSearch] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadMembers = React.useCallback(() => {
    setLoading(true);
    fetch(`/api/project/${projectId}/members`, { credentials: "include" })
      .then(async (r) => {
        const d = await jsonFromResponse<unknown>(r);
        setMembers(Array.isArray(d) ? (d as MemberRow[]) : []);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  React.useEffect(() => { loadMembers(); }, [loadMembers]);

  React.useEffect(() => {
    if (!showAdd) return;
    const controller = new AbortController();
    const loadUsers = async () => {
      const params = new URLSearchParams({ per_page: "200", include_employees: "1" });
      if (userSearch.trim()) params.set("search", userSearch.trim());
      try {
        const r = await fetch(`/api/users/list?${params.toString()}`, {
          credentials: "include",
          signal: controller.signal,
        });
        const d = await jsonFromResponse<{ data?: unknown }>(r);
        setAllUsers(Array.isArray(d?.data) ? (d.data as UserOption[]) : []);
      } catch {
        setAllUsers([]);
      }
    };
    void loadUsers();
    return () => controller.abort();
  }, [showAdd, userSearch]);

  const availableUsers = allUsers.filter((u) => {
    if (u.source === "employee" && u.employee_id) return true;
    return !members.some((m) => m.id === u.id);
  });

  const handleAdd = async () => {
    if (selectedUserId === "__none__") return;
    setSaving(true); setError(null);
    try {
      const selected = allUsers.find((u) => String(u.id) === selectedUserId);
      if (!selected) throw new Error(t("Select a user"));
      const requestPayload =
        selected.source === "employee" && selected.employee_id
          ? { employee_id: selected.employee_id }
          : { user_id: Number(selectedUserId) };
      const res = await fetch(`/api/project/${projectId}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(requestPayload),
      });
      const raw = await res.text();
      const responsePayload = parseApiJsonBody(raw);
      if (!res.ok) {
        throw new Error(responsePayload.error?.trim() || `Request failed (${res.status})`);
      }
      setShowAdd(false); setSelectedUserId("__none__"); setUserSearch(""); loadMembers();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Failed to add member"));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (userId: number) => {
    await fetch(`/api/project/${projectId}/members?user_id=${userId}`, {
      method: "DELETE", credentials: "include",
    });
    loadMembers();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />{t("Add Member")}
          </Button>
        )}
      </div>
      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{t("Loading...")}</div>
      ) : members.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {t("No team members yet.")}
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.email}</div>
              </div>
              <Badge variant="secondary" className="text-xs capitalize">{m.type ?? "staff"}</Badge>
              {canManage && (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemove(m.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Sheet open={showAdd} onOpenChange={setShowAdd}>
        <SheetContent side="right" className="sm:max-w-none w-[420px] max-w-[92vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("Add Team Member")}</SheetTitle>
          </SheetHeader>
          {showAdd ? (
            <div className="mt-6">
              {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}
              <ProjectOpsDynamicForm
                sectionId="team"
                projectId={projectId}
                submitLabel={t("Add")}
                onSubmit={async (payload) => {
                  setError(null);
                  const userId = Number(payload.user_id);
                  if (!Number.isFinite(userId)) throw new Error(t("Select a user"));
                  const res = await fetch(`/api/project/${projectId}/members`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ user_id: userId }),
                  });
                  const raw = await res.text();
                  const responsePayload = parseApiJsonBody(raw);
                  if (!res.ok) {
                    throw new Error(responsePayload.error?.trim() || `Request failed (${res.status})`);
                  }
                  setShowAdd(false);
                  loadMembers();
                }}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

type ProjectFileRow = {
  id: number;
  file_name: string;
  file_path: string;
  created_at: string;
};

function FilesTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const { t } = useTranslation();
  const [files, setFiles] = React.useState<ProjectFileRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showUpload, setShowUpload] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch(`/api/project/${projectId}/files`, { credentials: "include" })
      .then(async (r) => {
        const d = await jsonFromResponse<{ data?: ProjectFileRow[] }>(r);
        setFiles(Array.isArray(d?.data) ? d.data : []);
      })
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (fileId: number) => {
    if (!(await appConfirm(t("Delete this file?")))) return;
    setError(null);
    const res = await fetch(`/api/project/${projectId}/files?file_id=${fileId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const d = await jsonFromResponse<{ error?: string }>(res);
      setError(d?.error ?? t("Delete failed"));
      return;
    }
    load();
  };

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-destructive">{error}</div>}
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="h-3.5 w-3.5 mr-1" />
            {t("Upload File")}
          </Button>
        </div>
      )}
      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{t("Loading...")}</div>
      ) : files.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {t("No files uploaded yet.")}
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={f.file_path}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate font-medium text-primary hover:underline"
              >
                {f.file_name}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground hidden sm:inline">
                {new Date(f.created_at).toLocaleString()}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                <a href={f.file_path} target="_blank" rel="noopener noreferrer" title={t("Download")}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(f.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <ProjectDrawer open={showUpload} onOpenChange={setShowUpload} title={t("Upload File")} footer={null}>
        <ProjectOpsDynamicForm
          sectionId="files"
          projectId={projectId}
          submitLabel={t("Upload")}
          onSubmit={async (payload, filesMap) => {
            const file = filesMap.file;
            if (!(file instanceof File)) throw new Error(t("File is required"));
            const fd = buildProjectOpsFormData(
              { title: payload.title || file.name, category: payload.category || "General" },
              { file },
            );
            const res = await fetch(`/api/project/${projectId}/files`, {
              method: "POST",
              body: fd,
              credentials: "include",
            });
            if (!res.ok) throw new Error(t("Upload failed"));
            setShowUpload(false);
            load();
          }}
        />
      </ProjectDrawer>
    </div>
  );
}

export function ProjectDetail({
  project,
  taskStages,
  bugStages,
  members,
  canManage,
  permissions = [],
  counts,
}: {
  project: Project;
  taskStages: Stage[];
  bugStages: Stage[];
  members: UserOption[];
  canManage: boolean;
  permissions?: string[];
  counts: { tasks: number; bugs: number; milestones: number; missions?: number };
}) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab") ?? null;
  const initialTab = resolveTabParam(tabParam);
  const [active, setActive] = React.useState<ProjectSectionId>(initialTab);
  const [lead, setLead] = React.useState<{ id: number; name: string; email: string } | null>(null);
  const [rosterUsers, setRosterUsers] = React.useState<UserOption[]>([]);
  const [setupOpen, setSetupOpen] = React.useState(false);
  const [visibleSections, setVisibleSections] = React.useState<Record<string, boolean>>({
    ...DEFAULT_PROJECT_VISIBLE_SECTIONS,
  });
  const milestoneOptions: MilestoneOption[] = [];
  const [_milestones, _setMilestones] = React.useState<MilestoneOption[]>(milestoneOptions);

  const loadOpsMeta = React.useCallback(() => {
    fetch(`/api/project/${project.id}/operations`, { credentials: "include" })
      .then(async (r) => {
        const d = await jsonFromResponse<{
          lead?: { id: number; name: string; email: string } | null;
          visible_sections?: Record<string, boolean>;
          project?: { visible_sections?: Record<string, boolean> };
        }>(r);
        setLead(d?.lead ?? null);
        const sections = d?.visible_sections ?? d?.project?.visible_sections;
        if (sections) setVisibleSections(normalizeProjectVisibleSections(sections));
      })
      .catch(() => {});
    fetch(`/api/project/${project.id}/roster`, { credentials: "include" })
      .then(async (r) => {
        const d = await jsonFromResponse<{ data?: UserOption[] }>(r);
        setRosterUsers(Array.isArray(d?.data) ? d.data! : []);
      })
      .catch(() => {});
  }, [project.id]);

  React.useEffect(() => {
    loadOpsMeta();
  }, [loadOpsMeta]);

  React.useEffect(() => {
    if (tabParam) setActive(resolveTabParam(tabParam));
  }, [tabParam]);

  const setActiveTab = (id: ProjectSectionId) => {
    setActive(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url.pathname + url.search);
  };

  const visibleNavSections = React.useMemo(() => {
    const visible = PROJECT_SECTIONS.filter((s) => isProjectSectionVisible(s.id, visibleSections));
    return sortProjectNavSections(visible, (s) => t(s.titleKey));
  }, [visibleSections, t]);

  React.useEffect(() => {
    if (visibleNavSections.some((s) => s.id === active)) return;
    const fallback = visibleNavSections[0]?.id ?? "overview";
    if (fallback !== active) setActiveTab(fallback);
  }, [active, visibleNavSections]);

  React.useEffect(() => {
    fetch(`/api/project/${project.id}/milestones`, { credentials: "include" })
      .then(async (r) => {
        const d = await jsonFromResponse<unknown>(r);
        _setMilestones(
          Array.isArray(d) ? (d as MilestoneRow[]).map((m) => ({ id: m.id, title: m.title })) : [],
        );
      })
      .catch(() => {});
  }, [project.id]);

  const statusLabel = project.status ?? "Not Started";
  const timelineLabel =
    project.start_date || project.end_date
      ? `${project.start_date ? fmtDateLib(project.start_date, settings) : "—"} — ${project.end_date ? fmtDateLib(project.end_date, settings) : "—"}`
      : "—";
  const teamCount = members.length;

  const projectDetailsActions = canManage ? (
    <Button size="sm" variant="outline" asChild>
      <Link href={`/project/${project.id}/edit`}>
        <Edit className="h-4 w-4 mr-1" />
        {t("Edit")}
      </Link>
    </Button>
  ) : null;

  const renderSection = () => {
    switch (active) {
      case "checklist":
        return <ChecklistTab projectId={project.id} canManage={canManage} />;
      case "agent_checklist":
        return <AgentChecklistTab projectId={project.id} canManage={canManage} />;
      case "vendors":
        return <VendorsTab projectId={project.id} canManage={canManage} />;
      case "agents":
        return <AgentsTab projectId={project.id} canManage={canManage} />;
      case "medics":
        return <MedicsTab projectId={project.id} canManage={canManage} />;
      case "security":
        return <SecurityTab projectId={project.id} canManage={canManage} />;
      case "schedule":
        return (
          <ScheduleTab
            projectId={project.id}
            canManage={canManage}
            leadName={lead?.name ?? null}
            project={{
              id: project.id,
              name: project.name,
              start_date: project.start_date,
              end_date: project.end_date,
              city: project.city,
              state: project.state,
              budget: project.budget,
            }}
          />
        );
      case "lodging":
        return <LodgingTab projectId={project.id} canManage={canManage} />;
      case "locations":
        return <LocationsTab projectId={project.id} />;
      case "documents":
        return <DocumentsTab projectId={project.id} canManage={canManage} />;
      case "risk_assessment":
        return <RiskAssessmentTab projectId={project.id} canManage={canManage} />;
      case "notes":
        return <NotesTab projectId={project.id} canManage={canManage} />;
      case "leadership":
        return (
          <LeadershipTab
            projectId={project.id}
            lead={lead}
            members={members.length ? members : rosterUsers}
            canManage={canManage}
            onLeadChange={loadOpsMeta}
          />
        );
      case "activity":
        return <ActivityTab projectId={project.id} />;
      case "reports":
        return <ReportsTab projectId={project.id} />;
      case "incident_reports":
        return <IncidentReportsTab projectId={project.id} canManage={canManage} />;
      case "medical_facilities":
        return <MedicalFacilitiesTab projectId={project.id} canManage={canManage} />;
      case "lost_found":
        return <LostFoundTab projectId={project.id} canManage={canManage} />;
      case "after_action":
        return <AfterActionTab projectId={project.id} canManage={canManage} projectName={project.name} />;
      case "position":
        return <PositionsTab projectId={project.id} canManage={canManage} />;
      case "overview":
        return <OpsOverviewTab projectId={project.id} canManage={canManage} />;
      case "project_details":
        return (
          <ProjectSectionShell
            title={t("Project Details")}
            description={t("Read-only project details hint")}
            icon={ClipboardList}
            actions={projectDetailsActions}
          >
            <div className="space-y-8">
              <div className="grid gap-8 md:grid-cols-2">
                <DetailField label={t("Description")}>
                  <span className="whitespace-pre-wrap">{project.description?.trim() || "—"}</span>
                </DetailField>
                <DetailField label={t("Budget")}>
                  {project.budget != null ? <FormattedCurrency value={Number(project.budget)} /> : "—"}
                </DetailField>
                <DetailField label={t("Timeline")}>{timelineLabel}</DetailField>
                <DetailField label={t("Status")}>
                  <StatusBadge status={statusLabel} />
                </DetailField>
              </div>
            </div>
          </ProjectSectionShell>
        );

      case "missions":
        return (
          <ProjectSectionShell
            title={t("Missions")}
            description={t("Track mission locations and status for this project.")}
            icon={MapPin}
          >
            <MissionsBoard
              permissions={permissions}
              projectId={project.id}
              projectName={project.name}
              embedded
            />
          </ProjectSectionShell>
        );

      case "tasks":
        return (
          <ProjectSectionShell
            title={t("Tasks")}
            description={t("Project tasks section description")}
            icon={ListTodo}
          >
            <TasksTab
              projectId={project.id}
              stages={taskStages}
              members={members}
              milestones={_milestones}
              canManage={canManage}
            />
          </ProjectSectionShell>
        );

      case "bugs":
        return (
          <ProjectSectionShell
            title={t("Bugs")}
            description={t("Project bugs section description")}
            icon={Bug}
          >
            <BugsTab projectId={project.id} stages={bugStages} members={members} canManage={canManage} />
          </ProjectSectionShell>
        );

      case "milestones":
        return (
          <ProjectSectionShell
            title={t("Milestones")}
            description={t("Project milestones section description")}
            icon={Milestone}
          >
            <MilestonesTab projectId={project.id} canManage={canManage} />
          </ProjectSectionShell>
        );

      case "team":
        return (
          <ProjectSectionShell
            title={t("Team")}
            description={t("Project team section description")}
            icon={Users}
          >
            <TeamTab projectId={project.id} canManage={canManage} />
          </ProjectSectionShell>
        );

      case "files":
        return (
          <ProjectSectionShell
            title={t("Files")}
            description={t("Project files section description")}
            icon={FileText}
          >
            <FilesTab projectId={project.id} canManage={canManage} />
          </ProjectSectionShell>
        );

      case "sow":
        return (
          <SowTab
            projectId={project.id}
            canManage={canManage}
            project={{
              name: project.name,
              status: project.status,
              start_date: project.start_date,
              end_date: project.end_date,
              timezone: project.timezone ?? null,
            }}
          />
        );

      default:
        return null;
    }
  };

  const leadOptions = members.length ? members : rosterUsers;

  return (
    <div>
      <ProjectOpsHeader
        project={project}
        canManage={canManage}
        setupOpen={setupOpen}
        onSetupOpenChange={setSetupOpen}
        visibleSections={visibleSections}
        onVisibleSectionsChange={setVisibleSections}
        onProjectUpdated={() => {
          loadOpsMeta();
          router.refresh();
        }}
      />
    <div className="flex flex-col gap-8 md:flex-row">
      <aside className="flex-shrink-0 md:w-64">
          <div className="md:sticky md:top-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Lead Agent")}
              </div>
              {canManage ? (
                <Select
                  value={lead ? String(lead.id) : ""}
                  onValueChange={async (v) => {
                    if (!v) return;
                    await fetch(`/api/project/${project.id}/lead`, {
                      method: "PUT",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ user_id: Number(v) }),
                    });
                    loadOpsMeta();
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t("Assign lead…")} />
                  </SelectTrigger>
                  <SelectContent>
                    {leadOptions.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{lead?.name ?? "—"}</p>
              )}
            </div>

            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
              {t("Sections")}
            </div>

          <div className="md:hidden -mx-1 px-1">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {visibleNavSections.map((s) => (
                <Button
                  key={s.id}
                  variant={active === s.id ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap"
                    onClick={() => setActiveTab(s.id)}
                >
                  <s.icon className="mr-2 h-4 w-4" />
                  {t(s.titleKey)}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="hidden h-[min(70vh,calc(100vh-8rem))] md:block">
            <div className="space-y-1 pr-4">
              {visibleNavSections.map((s) => (
                <Button
                  key={s.id}
                  variant="ghost"
                    className={cn(
                      "w-full justify-start",
                      active === s.id && "bg-muted font-medium",
                    )}
                    onClick={() => setActiveTab(s.id)}
                >
                  <s.icon className="mr-2 h-4 w-4 shrink-0" />
                  {t(s.titleKey)}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
          <section className="scroll-mt-6" aria-labelledby={`project-section-${active}`}>
            <h2 id={`project-section-${active}`} className="sr-only">
              {t(PROJECT_SECTIONS.find((x) => x.id === active)?.titleKey ?? "")}
            </h2>
            {renderSection()}
          </section>
        </div>
      </div>
    </div>
  );
}
