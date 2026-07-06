"use client";

import * as React from "react";
import { Copy, Info, Pencil, Plus, Shield, Stethoscope, Trash2, Users } from "lucide-react";
import { appConfirm } from "@/lib/app-confirm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { calcHoursFromTimes } from "@/lib/project-staff-hours";
import { cn } from "@/lib/utils";
import { AssignStaffDialog } from "./assign-staff-dialog";

type StaffRow = {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: string;
  work_date: string | null;
  end_date: string | null;
  status: string;
  on_site: boolean;
  start_time: string | null;
  end_time: string | null;
  position: string | null;
};

type StaffRole = "agent" | "medic" | "security";

const ROLE_THEME = {
  agent: {
    avatar: "bg-violet-100 text-violet-700",
    search: "Search agents…",
    icon: Users,
    emptyMessage: (canManage: boolean) =>
      canManage
        ? "No personnel assigned yet. Click \"Assign Agent\" to get started."
        : "No personnel assigned yet.",
  },
  medic: {
    avatar: "bg-red-100 text-red-700",
    search: "Search medics…",
    icon: Stethoscope,
    emptyMessage: (canManage: boolean) =>
      canManage
        ? "No personnel assigned yet. Click \"Assign Medic\" to get started."
        : "No personnel assigned yet.",
  },
  security: {
    avatar: "bg-emerald-100 text-emerald-700",
    search: "Search security personnel…",
    icon: Shield,
    emptyMessage: (canManage: boolean) =>
      canManage
        ? "No security personnel assigned yet. Click \"Assign Agent\" to get started."
        : "No security personnel assigned yet.",
  },
} as const;

const DRAWER_TITLES: Record<StaffRole, string> = {
  agent: "Assign Agent",
  medic: "Assign Medical Personnel",
  security: "Assign Security Agent",
};

function statusBadgeClass(status: string, role: StaffRole) {
  const s = status.toLowerCase();
  if (s === "confirmed" || s === "complete" || s === "completed") {
    if (role === "medic") return "border-red-200 bg-red-50 text-red-700";
    if (role === "security") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (s === "pending") {
    return "border-border bg-muted/40 text-muted-foreground";
  }
  return "border-border bg-muted/40 text-foreground";
}

function formatStatusLabel(status: string) {
  const s = status.trim();
  if (!s) return "Pending";
  if (s.toLowerCase() === "confirmed") return "Confirmed";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatScheduleLines(
  row: StaffRow,
  settings: Record<string, string>,
): { dates: string | null; times: string | null } {
  const dates =
    row.work_date || row.end_date
      ? `${row.work_date ? fmtDateLib(row.work_date, settings) : "—"}${
          row.end_date && row.end_date !== row.work_date
            ? ` – ${fmtDateLib(row.end_date, settings)}`
            : ""
        }`
      : null;

  let times: string | null = null;
  if (row.start_time && row.end_time) {
    const hours = calcHoursFromTimes(row.start_time, row.end_time);
    times = `${row.start_time} – ${row.end_time} (${hours} hrs)`;
  }

  return { dates, times };
}

function StaffListTab({
  projectId,
  role,
  title,
  assignLabel,
  canManage,
}: {
  projectId: number;
  role: StaffRole;
  title: string;
  assignLabel: string;
  canManage: boolean;
}) {
  const theme = ROLE_THEME[role];
  const Icon = theme.icon;
  const { settings } = useAppSettings();
  const [rows, setRows] = React.useState<StaffRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [assignOpen, setAssignOpen] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch(`/api/project/${projectId}/staff?role=${role}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d.data) ? d.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [projectId, role]);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });

  const remove = async (row: StaffRow) => {
    const ok = await appConfirm({
      title: "Remove assignment?",
      description: `Remove ${row.name} from this project.`,
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (!ok) return;
    await fetch(`/api/project/${projectId}/staff?assignment_id=${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    load();
  };

  const copyRowDetails = async (row: StaffRow) => {
    const { dates, times } = formatScheduleLines(row, settings);
    const parts = [row.name, row.email, dates, times].filter(Boolean);
    try {
      await navigator.clipboard.writeText(parts.join("\n"));
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
          {canManage ? (
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              {assignLabel}
            </Button>
          ) : null}
        </div>

        <div className="p-5">
          <Input
            placeholder={theme.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 max-w-md"
          />

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p
              className={cn(
                "text-sm text-muted-foreground",
                role === "security" && "py-10 text-center",
              )}
            >
              {theme.emptyMessage(canManage)}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {filtered.map((r) => {
                const schedule = formatScheduleLines(r, settings);
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        theme.avatar,
                      )}
                    >
                      {r.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">{r.name}</div>
                      {schedule.dates ? (
                        <div className="text-xs text-muted-foreground">{schedule.dates}</div>
                      ) : null}
                      {schedule.times ? (
                        <div className="text-xs text-muted-foreground">{schedule.times}</div>
                      ) : null}
                      {!schedule.dates && !schedule.times ? (
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      ) : null}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 uppercase", statusBadgeClass(r.status, role))}
                    >
                      {formatStatusLabel(r.status)}
                    </Badge>
                    {canManage ? (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={r.email}
                          aria-label={`Contact ${r.name}`}
                        >
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Copy details for ${r.name}`}
                          onClick={() => void copyRowDetails(r)}
                        >
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Remove ${r.name}`}
                          onClick={() => void remove(r)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Edit ${r.name}`}
                          onClick={() => setAssignOpen(true)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <AssignStaffDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        projectId={projectId}
        role={role}
        drawerTitle={DRAWER_TITLES[role]}
        onAssigned={load}
      />
    </>
  );
}

export function AgentsTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  return (
    <StaffListTab
      projectId={projectId}
      role="agent"
      title="Assigned Agents"
      assignLabel="Assign Agent"
      canManage={canManage}
    />
  );
}

export function MedicsTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  return (
    <StaffListTab
      projectId={projectId}
      role="medic"
      title="Assigned Medical Personnel"
      assignLabel="Assign Medic"
      canManage={canManage}
    />
  );
}

export function SecurityTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  return (
    <StaffListTab
      projectId={projectId}
      role="security"
      title="Assigned Security Personnel"
      assignLabel="Assign Agent"
      canManage={canManage}
    />
  );
}
