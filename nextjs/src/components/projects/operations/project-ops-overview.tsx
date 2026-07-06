"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  ExternalLink,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Shield,
  Stethoscope,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { cn } from "@/lib/utils";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib, parseDate } from "@/lib/format-date";
import { calcHoursFromTimes } from "@/lib/project-staff-hours";

type OpsProject = {
  id: number;
  start_date: string | null;
  end_date: string | null;
  timezone: string | null;
  property_name: string | null;
  address: string | null;
  address_2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  num_attendees: number | null;
  num_agents: number | null;
  num_medics: number | null;
  num_security: number | null;
  security_director_name: string | null;
  security_director_phone: string | null;
  security_director_email: string | null;
};

type ScheduleRow = {
  id: number;
  role: string;
  name: string;
  work_date: string | null;
  start_time: string | null;
  end_time: string | null;
  hours: number | null;
};

type ReportsPayload = {
  by_role?: {
    agent?: { personnel: number; hours: number };
    medic?: { personnel: number; hours: number };
    security?: { personnel: number; hours: number };
  };
  staff_hours?: Array<{ user_id: number; name: string; role: string; days: number; hours: number }>;
};

const LONG_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDayDate(dateStr: string, settings: Record<string, string>) {
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  const day = LONG_DAYS[d.getDay()].toUpperCase();
  return `${day} / ${fmtDateLib(dateStr, settings)}`;
}

function formatTimeRange(start: string | null, end: string | null, hours: number | null) {
  if (!start || !end) return "—";
  const h = hours ?? calcHoursFromTimes(start, end);
  return `${start} – ${end} (${h} hrs)`;
}

function StaffingLine({
  label,
  required,
  assigned,
}: {
  label: string;
  required: number;
  assigned: number;
}) {
  const delta = assigned - required;
  const met = required > 0 && assigned >= required;
  const short = required > 0 && assigned < required;

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">
        {required} / {assigned}
        {required > 0 ? (
          short ? (
            <span className="ml-1 text-amber-600">({delta})</span>
          ) : met ? (
            <span className="ml-1 text-emerald-600">(✔)</span>
          ) : (
            <span className="ml-1 text-muted-foreground">({delta})</span>
          )
        ) : null}
      </span>
    </div>
  );
}

function RoleOverviewCard({
  projectId,
  title,
  role,
  theme,
  icon: Icon,
  scheduleRows,
  personnel,
  daysAssigned,
  totalHours,
  emptyLabel,
  settings,
}: {
  projectId: number;
  title: string;
  role: string;
  theme: "violet" | "red" | "emerald";
  icon: React.ComponentType<{ className?: string }>;
  scheduleRows: ScheduleRow[];
  personnel: number;
  daysAssigned: number;
  totalHours: number;
  emptyLabel: string;
  settings: Record<string, string>;
}) {
  const themeClasses = {
    violet: {
      border: "border-violet-200",
      header: "text-violet-700",
      stat: "text-violet-600",
    },
    red: {
      border: "border-red-200",
      header: "text-red-700",
      stat: "text-red-600",
    },
    emerald: {
      border: "border-emerald-200",
      header: "text-emerald-700",
      stat: "text-emerald-600",
    },
  }[theme];

  const rows = scheduleRows
    .filter((r) => r.role === role && r.work_date)
    .sort((a, b) => (a.work_date ?? "").localeCompare(b.work_date ?? ""));

  return (
    <div className={cn("rounded-xl border bg-card shadow-sm", themeClasses.border)}>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Icon className={cn("h-4 w-4", themeClasses.header)} />
        <h3 className={cn("text-sm font-semibold", themeClasses.header)}>{title}</h3>
      </div>
      <div className="grid grid-cols-3 gap-2 border-b px-4 py-3 text-center text-xs">
        <div>
          <div className="text-muted-foreground">Personnel</div>
          <div className={cn("text-lg font-semibold tabular-nums", themeClasses.stat)}>{personnel}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Days Assigned</div>
          <div className="text-lg font-semibold tabular-nums text-foreground">{daysAssigned}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Total Hours</div>
          <div className="text-lg font-semibold tabular-nums text-foreground">{totalHours}</div>
        </div>
      </div>
      <div className="p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{formatDayDate(r.work_date!, settings)}</div>
                  <div className="text-foreground">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeRange(r.start_time, r.end_time, r.hours)}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                  <Link
                    href={`/project/${projectId}?tab=schedule`}
                    aria-label={`View schedule for ${r.name}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EditEventOverviewDrawer({
  open,
  onOpenChange,
  projectId,
  project,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  project: OpsProject;
  onSaved: (project: OpsProject) => void;
}) {
  const [attendees, setAttendees] = React.useState("");
  const [agents, setAgents] = React.useState("");
  const [medics, setMedics] = React.useState("");
  const [security, setSecurity] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setAttendees(project.num_attendees != null ? String(project.num_attendees) : "");
    setAgents(project.num_agents != null ? String(project.num_agents) : "");
    setMedics(project.num_medics != null ? String(project.num_medics) : "");
    setSecurity(project.num_security != null ? String(project.num_security) : "");
    setError(null);
  }, [open, project]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/project/${projectId}/operations`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          num_attendees: attendees.trim() === "" ? null : Number(attendees),
          num_agents: agents.trim() === "" ? null : Number(agents),
          num_medics: medics.trim() === "" ? null : Number(medics),
          num_security: security.trim() === "" ? null : Number(security),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Failed to save");
        return;
      }
      if (data?.project) onSaved(data.project as OpsProject);
      onOpenChange(false);
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProjectDrawer
      narrow
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Event Overview"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="event-attendees"># of Attendees</Label>
          <Input
            id="event-attendees"
            type="number"
            min={0}
            step={1}
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-agents"># of Agents</Label>
          <Input
            id="event-agents"
            type="number"
            min={0}
            step={1}
            value={agents}
            onChange={(e) => setAgents(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-medics"># of Medics</Label>
          <Input
            id="event-medics"
            type="number"
            min={0}
            step={1}
            value={medics}
            onChange={(e) => setMedics(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-security"># of Security</Label>
          <Input
            id="event-security"
            type="number"
            min={0}
            step={1}
            value={security}
            onChange={(e) => setSecurity(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </ProjectDrawer>
  );
}

export function OpsOverviewTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const { settings } = useAppSettings();
  const [loading, setLoading] = React.useState(true);
  const [project, setProject] = React.useState<OpsProject | null>(null);
  const [schedule, setSchedule] = React.useState<ScheduleRow[]>([]);
  const [reports, setReports] = React.useState<ReportsPayload | null>(null);
  const [editEventOpen, setEditEventOpen] = React.useState(false);

  const loadOverview = React.useCallback(async () => {
    setLoading(true);
    try {
      const [ops, sched, rep] = await Promise.all([
        fetch(`/api/project/${projectId}/operations`, { credentials: "include" }).then((r) => r.json()),
        fetch(`/api/project/${projectId}/schedule`, { credentials: "include" }).then((r) => r.json()),
        fetch(`/api/project/${projectId}/reports`, { credentials: "include" }).then((r) => r.json()),
      ]);
      setProject(ops?.project ?? null);
      setSchedule(Array.isArray(sched?.data) ? sched.data : []);
      setReports(rep ?? null);
    } catch {
      setProject(null);
      setSchedule([]);
      setReports(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  if (loading) {
    return <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">Loading overview…</div>;
  }

  if (!project) {
    return <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">Unable to load overview.</div>;
  }

  const datesLabel =
    project.start_date || project.end_date
      ? `${project.start_date ? fmtDateLib(project.start_date, settings) : "—"} – ${project.end_date ? fmtDateLib(project.end_date, settings) : "—"}`
      : "—";

  const addressParts = [
    project.address,
    project.address_2,
    [project.city, project.state, project.zip_code].filter(Boolean).join(", "),
  ].filter(Boolean);
  const fullAddress = addressParts.join(", ") || "—";

  const byRole = reports?.by_role ?? {};
  const staffHours = reports?.staff_hours ?? [];

  const roleDays = (role: string) =>
    staffHours.filter((s) => s.role === role).reduce((sum, s) => sum + s.days, 0);

  const rolePersonnel = (role: string) => byRole[role as keyof typeof byRole]?.personnel ?? 0;
  const roleHours = (role: string) => Math.round(byRole[role as keyof typeof byRole]?.hours ?? 0);

  return (
    <>
    <div className="space-y-4">
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="grid gap-6 p-5 lg:grid-cols-3 lg:divide-x lg:divide-border">
          <div className="space-y-4 lg:pr-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Event Overview</h3>
              </div>
              {canManage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Edit event overview"
                  onClick={() => setEditEventOpen(true)}
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
              ) : null}
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Event Dates</div>
                <div className="mt-1 text-sm font-medium text-foreground">{datesLabel}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground"># of Attendees</div>
                <div className="mt-1 text-sm font-medium text-foreground">{project.num_attendees ?? "—"}</div>
              </div>
              <StaffingLine
                label="# of Agents"
                required={project.num_agents ?? 0}
                assigned={rolePersonnel("agent")}
              />
              <StaffingLine
                label="# of Medics"
                required={project.num_medics ?? 0}
                assigned={rolePersonnel("medic")}
              />
              <StaffingLine
                label="# of Security"
                required={project.num_security ?? 0}
                assigned={rolePersonnel("security")}
              />
            </div>
          </div>

          <div className="space-y-4 lg:px-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Location Details</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Venue</div>
                <div className="mt-1 text-sm font-medium text-foreground">{project.property_name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Address</div>
                <div className="mt-1 text-sm text-foreground">{fullAddress}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Time Zone</div>
                <div className="mt-1 text-sm text-foreground">{project.timezone ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:pl-6">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Security Director</h3>
            </div>
            <div className="space-y-3">
              <div className="text-base font-semibold text-foreground">
                {project.security_director_name ?? "—"}
              </div>
              {project.security_director_phone ? (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {project.security_director_phone}
                </div>
              ) : null}
              {project.security_director_email ? (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {project.security_director_email}
                </div>
              ) : null}
              {!project.security_director_phone && !project.security_director_email ? (
                <p className="text-sm text-muted-foreground">No contact details on file.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RoleOverviewCard
          projectId={projectId}
          title="Agents"
          role="agent"
          theme="violet"
          icon={Users}
          scheduleRows={schedule}
          personnel={rolePersonnel("agent")}
          daysAssigned={roleDays("agent")}
          totalHours={roleHours("agent")}
          emptyLabel="No agents assigned yet."
          settings={settings}
        />
        <RoleOverviewCard
          projectId={projectId}
          title="Medics"
          role="medic"
          theme="red"
          icon={Stethoscope}
          scheduleRows={schedule}
          personnel={rolePersonnel("medic")}
          daysAssigned={roleDays("medic")}
          totalHours={roleHours("medic")}
          emptyLabel="No medics assigned yet."
          settings={settings}
        />
        <RoleOverviewCard
          projectId={projectId}
          title="Security"
          role="security"
          theme="emerald"
          icon={Shield}
          scheduleRows={schedule}
          personnel={rolePersonnel("security")}
          daysAssigned={roleDays("security")}
          totalHours={roleHours("security")}
          emptyLabel="No security assigned yet."
          settings={settings}
        />
      </div>
    </div>
    {canManage ? (
      <EditEventOverviewDrawer
        open={editEventOpen}
        onOpenChange={setEditEventOpen}
        projectId={projectId}
        project={project}
        onSaved={setProject}
      />
    ) : null}
    </>
  );
}
