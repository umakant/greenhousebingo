"use client";

import * as React from "react";
import {
  AlertTriangle,
  Briefcase,
  FileDown,
  MapPin,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { OpsPanel, OpsPanelBody, OpsPanelHeader } from "./ops-panel";
import {
  ProjectOpsDynamicForm,
  buildProjectOpsFormData,
} from "./project-ops-dynamic-form";
import { cn } from "@/lib/utils";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";

const FACILITY_TYPE_LABEL: Record<string, string> = {
  hospital: "Hospital",
  urgent_care: "Urgent Care",
  pharmacy: "Pharmacy",
};

const FACILITY_BADGE: Record<string, string> = {
  hospital: "border-red-500/50 text-red-300 bg-red-500/10",
  urgent_care: "border-orange-500/50 text-orange-300 bg-orange-500/10",
  pharmacy: "border-violet-500/50 text-violet-300 bg-violet-500/10",
  agent: "border-violet-500/50 text-violet-300 bg-violet-500/10",
  medic: "border-pink-500/50 text-pink-300 bg-pink-500/10",
  security: "border-amber-500/50 text-amber-300 bg-amber-500/10",
};

export function ReportsTab({ projectId }: { projectId: number }) {
  const { settings } = useAppSettings();
  const [data, setData] = React.useState<{
    days: Array<{ date: string; agents: number; medics: number; security: number }>;
    summary: { total_personnel: number; total_hours: number; days_with_coverage: number; avg_hours_per_day: number };
    by_role: { agent: { personnel: number; hours: number }; medic: { personnel: number; hours: number }; security: { personnel: number; hours: number } };
    staff_hours: Array<{ name: string; role: string; days: number; hours: number }>;
  } | null>(null);

  React.useEffect(() => {
    fetch(`/api/project/${projectId}/reports`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [projectId]);

  const openTimesheet = (date: string) => {
    window.open(`/api/project/${projectId}/reports/timesheet?date=${date}`, "_blank");
  };

  const generateAll = () => {
    if (!data?.days.length) return;
    data.days.forEach((d) => openTimesheet(d.date));
  };

  if (!data) return <OpsPanel><OpsPanelBody><p className="text-muted-foreground">Loading…</p></OpsPanelBody></OpsPanel>;

  return (
    <div className="space-y-6">
      <OpsPanel>
        <OpsPanelHeader
          title="Auto-Generate Daily Timesheets"
          description="Click any day to download a formatted conference timesheet for that date."
          actions={<Badge variant="outline" className="border-border text-muted-foreground">PDF · 8.5 × 11 Letter</Badge>}
        />
        <OpsPanelBody className="space-y-3">
          {data.days.map((d) => (
            <div key={d.date} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div>
                <div className="font-medium text-foreground">{fmtDateLib(d.date, settings)}</div>
                <div className="text-xs text-muted-foreground">
                  {d.agents} Agent{d.agents !== 1 ? "s" : ""} · {d.medics} Medic{d.medics !== 1 ? "s" : ""}
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-border" onClick={() => openTimesheet(d.date)}>
                <FileDown className="mr-1 h-4 w-4" /> Generate PDF
              </Button>
            </div>
          ))}
          {data.days.length > 0 ? (
            <Button className="w-full" onClick={generateAll}>
              <Wand2 className="mr-2 h-4 w-4" /> Generate All {data.days.length} Days
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">No scheduled days yet. Assign staff with dates to generate timesheets.</p>
          )}
        </OpsPanelBody>
      </OpsPanel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Personnel", value: data.summary.total_personnel },
          { label: "Total Hours", value: data.summary.total_hours },
          { label: "Days w/ Coverage", value: data.summary.days_with_coverage },
          { label: "Avg Hours / Day", value: data.summary.avg_hours_per_day },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="mt-1 text-2xl font-semibold text-blue-400">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Agents", role: data.by_role.agent, color: "border-t-violet-500" },
          { label: "Medics", role: data.by_role.medic, color: "border-t-pink-500" },
          { label: "Security", role: data.by_role.security, color: "border-t-emerald-500" },
        ].map((c) => (
          <div key={c.label} className={cn("rounded-xl border border-border border-t-2 bg-card p-4", c.color)}>
            <div className="text-sm font-medium text-foreground">{c.label}</div>
            <div className="text-xs text-muted-foreground">{c.role.personnel} personnel</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{c.role.hours} total hours</div>
          </div>
        ))}
      </div>

      <OpsPanel>
        <OpsPanelHeader title="Staff Hours Breakdown" />
        <OpsPanelBody>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr><th className="pb-2 text-left">Name</th><th className="pb-2 text-left">Type</th><th className="pb-2 text-right">Days</th><th className="pb-2 text-right">Hours</th></tr>
            </thead>
            <tbody>
              {data.staff_hours.map((s) => (
                <tr key={`${s.name}-${s.role}`} className="border-t border-border">
                  <td className="py-2 text-foreground">{s.name}</td>
                  <td className="py-2">
                    <Badge variant="outline" className={FACILITY_BADGE[s.role] ?? ""}>{s.role}</Badge>
                  </td>
                  <td className="py-2 text-right text-foreground">{s.days}</td>
                  <td className="py-2 text-right text-foreground">{s.hours}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-medium">
                <td colSpan={3} className="py-2 text-muted-foreground">Total</td>
                <td className="py-2 text-right text-foreground">{data.summary.total_hours}</td>
              </tr>
            </tfoot>
          </table>
        </OpsPanelBody>
      </OpsPanel>
    </div>
  );
}

export function IncidentReportsTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const [rows, setRows] = React.useState<Array<Record<string, unknown>>>([]);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(() => {
    fetch(`/api/project/${projectId}/incident-reports`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d.data) ? d.data : []))
      .catch(() => setRows([]));
  }, [projectId]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <>
      <OpsPanel>
        <OpsPanelHeader
          title="Incident Reports"
          actions={
            canManage ? (
              <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> New Report</Button>
            ) : null
          }
        />
        <OpsPanelBody>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <AlertTriangle className="mb-3 h-12 w-12 opacity-40" />
              <p>No incident reports filed for this project.</p>
              {canManage ? (
                <Button variant="outline" className="mt-4 border-border" onClick={() => setOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> File First Report
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => (
                <li key={r.id as number} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-foreground">{r.title as string}</div>
                      <div className="text-xs text-muted-foreground">{r.location as string ?? "—"} · {r.severity as string}</div>
                      <p className="mt-1 text-sm text-foreground">{r.description as string}</p>
                    </div>
                    {canManage ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={async () => {
                          await fetch(`/api/project/${projectId}/incident-reports?id=${r.id}`, { method: "DELETE", credentials: "include" });
                          load();
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </OpsPanelBody>
      </OpsPanel>
      <ProjectDrawer
        open={open}
        onOpenChange={setOpen}
        title="File Incident Report"
        footer={null}
      >
        <ProjectOpsDynamicForm
          sectionId="incident_reports"
          projectId={projectId}
          submitLabel="Submit Report"
          disabled={!canManage}
          onSubmit={async (payload) => {
            const res = await fetch(`/api/project/${projectId}/incident-reports`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              const d = await res.json().catch(() => ({}));
              throw new Error(d.error ?? "Failed to submit");
            }
            setOpen(false);
            load();
          }}
        />
      </ProjectDrawer>
    </>
  );
}

export function MedicalFacilitiesTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const [rows, setRows] = React.useState<Array<Record<string, unknown>>>([]);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(() => {
    fetch(`/api/project/${projectId}/medical-facilities`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d.data) ? d.data : []))
      .catch(() => setRows([]));
  }, [projectId]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <>
      <OpsPanel>
        <OpsPanelHeader
          title={`Medical Facilities (${rows.length} locations)`}
          actions={canManage ? <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add Location</Button> : null}
        />
        <OpsPanelBody>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Facility Name</th>
                  <th className="pb-2">Address</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Distance</th>
                  <th className="pb-2">Notes</th>
                  {canManage ? <th className="pb-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id as number} className="border-t border-border">
                    <td className="py-2">
                      <Badge variant="outline" className={FACILITY_BADGE[r.facility_type as string] ?? ""}>
                        {FACILITY_TYPE_LABEL[r.facility_type as string] ?? r.facility_type}
                      </Badge>
                    </td>
                    <td className="py-2 text-foreground">{r.name as string}</td>
                    <td className="py-2 text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3 text-blue-400" />{r.address as string ?? "—"}</td>
                    <td className="py-2 text-foreground">{r.phone as string ?? "—"}</td>
                    <td className="py-2 text-foreground">{r.distance as string ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">{r.notes as string ?? "—"}</td>
                    {canManage ? (
                      <td className="py-2">
                        <Button size="icon" variant="ghost" onClick={async () => {
                          await fetch(`/api/project/${projectId}/medical-facilities?id=${r.id}`, { method: "DELETE", credentials: "include" });
                          load();
                        }}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? <p className="mt-4 text-muted-foreground">No medical facilities added yet.</p> : null}
          </div>
        </OpsPanelBody>
      </OpsPanel>
      <ProjectDrawer open={open} onOpenChange={setOpen} title="Add Medical Facility" footer={null}>
        <ProjectOpsDynamicForm
          sectionId="medical_facilities"
          projectId={projectId}
          submitLabel="Add Location"
          disabled={!canManage}
          onSubmit={async (payload) => {
            const res = await fetch(`/api/project/${projectId}/medical-facilities`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Failed to add facility");
            setOpen(false);
            load();
          }}
        />
      </ProjectDrawer>
    </>
  );
}

export function LostFoundTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const [rows, setRows] = React.useState<Array<Record<string, unknown>>>([]);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(() => {
    fetch(`/api/project/${projectId}/lost-found`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d.data) ? d.data : []))
      .catch(() => setRows([]));
  }, [projectId]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <>
      <OpsPanel>
        <OpsPanelHeader
          title="Lost & Found"
          description="Track lost items found on site."
          actions={canManage ? <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Log Item</Button> : null}
        />
        <OpsPanelBody>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <p>No lost items logged yet. Use &apos;Log Item&apos; to record a found item.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => (
                <li key={r.id as number} className="flex gap-4 rounded-lg border border-border p-4">
                  {r.photo_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photo_path as string} alt="" className="h-16 w-16 rounded object-cover" />
                  ) : null}
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{r.item_name as string}</div>
                    <div className="text-xs text-muted-foreground">{r.found_location as string} · {r.status as string}</div>
                    <p className="mt-1 text-sm text-foreground">{r.description as string}</p>
                  </div>
                  {canManage ? (
                    <Button size="icon" variant="ghost" onClick={async () => {
                      await fetch(`/api/project/${projectId}/lost-found?id=${r.id}`, { method: "DELETE", credentials: "include" });
                      load();
                    }}><Trash2 className="h-4 w-4" /></Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </OpsPanelBody>
      </OpsPanel>
      <ProjectDrawer open={open} onOpenChange={setOpen} title="Log Lost & Found Item" footer={null}>
        <ProjectOpsDynamicForm
          sectionId="lost_found"
          projectId={projectId}
          submitLabel="Log Item"
          disabled={!canManage}
          onSubmit={async (payload, files) => {
            const fd = buildProjectOpsFormData(payload, files);
            const res = await fetch(`/api/project/${projectId}/lost-found`, {
              method: "POST",
              credentials: "include",
              body: fd,
            });
            if (!res.ok) throw new Error("Failed to log item");
            setOpen(false);
            load();
          }}
        />
      </ProjectDrawer>
    </>
  );
}

export function AfterActionTab({ projectId, canManage, projectName }: { projectId: number; canManage: boolean; projectName: string }) {
  const [initial, setInitial] = React.useState<Record<string, unknown>>({});
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/project/${projectId}/after-action`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setInitial({
            event_summary: d.data.event_summary ?? "",
            went_well: d.data.went_well ?? "",
            improvements: d.data.improvements ?? "",
            action_items: d.data.action_items ?? "",
            staff_performance: d.data.staff_performance ?? "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [projectId]);

  return (
    <OpsPanel>
      <OpsPanelHeader title="After Action Report" description={projectName} />
      <OpsPanelBody className="space-y-6">
        {loaded ? (
          <ProjectOpsDynamicForm
            sectionId="after_action"
            projectId={projectId}
            initialValues={initial}
            submitLabel="Save Report"
            disabled={!canManage}
            onSubmit={async (payload) => {
              const res = await fetch(`/api/project/${projectId}/after-action`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!res.ok) throw new Error("Failed to save report");
            }}
          />
        ) : (
          <p className="text-muted-foreground">Loading…</p>
        )}
      </OpsPanelBody>
    </OpsPanel>
  );
}

export function PositionsTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const [rows, setRows] = React.useState<Array<{ id: number; name: string }>>([]);

  const load = React.useCallback(() => {
    fetch(`/api/project/${projectId}/positions`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d.data) ? d.data : []))
      .catch(() => setRows([]));
  }, [projectId]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <OpsPanel>
      <OpsPanelHeader title="Position" description="Manage positions for this project." />
      <OpsPanelBody className="space-y-6">
        {canManage ? (
          <ProjectOpsDynamicForm
            sectionId="position"
            projectId={projectId}
            submitLabel="Add Position"
            onSubmit={async (payload) => {
              const res = await fetch(`/api/project/${projectId}/positions`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!res.ok) throw new Error("Failed to add position");
              load();
            }}
          />
        ) : null}
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{r.name}</span>
              </div>
              {canManage ? (
                <Button size="icon" variant="ghost" onClick={async () => {
                  await fetch(`/api/project/${projectId}/positions?id=${r.id}`, { method: "DELETE", credentials: "include" });
                  load();
                }}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              ) : null}
            </li>
          ))}
          {rows.length === 0 ? <p className="text-muted-foreground">No positions defined yet.</p> : null}
        </ul>
      </OpsPanelBody>
    </OpsPanel>
  );
}

type OpsProjectLocation = {
  property_name: string | null;
  address: string | null;
  address_2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  timezone: string | null;
};

export function LocationsTab({ projectId }: { projectId: number }) {
  const [project, setProject] = React.useState<OpsProjectLocation | null>(null);
  const [ganttLocations, setGanttLocations] = React.useState<Array<{ id: string | number; name: string }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/project/${projectId}/operations`, { credentials: "include" }).then((r) => r.json()),
      fetch("/api/gantt-projects", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([ops, ganttList]) => {
        if (cancelled) return;
        setProject(ops?.project ?? null);
        const list = Array.isArray(ganttList) ? ganttList : [];
        const linked = list.find(
          (g: { projectRefId?: number | null }) => Number(g.projectRefId) === projectId,
        );
        const locs = linked?.locations ?? [];
        setGanttLocations(
          Array.isArray(locs)
            ? locs.map((l: { id: string | number; name: string }) => ({ id: l.id, name: l.name }))
            : [],
        );
      })
      .catch(() => {
        if (!cancelled) {
          setProject(null);
          setGanttLocations([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const addressParts = project
    ? [
        project.address,
        project.address_2,
        [project.city, project.state, project.zip_code].filter(Boolean).join(", "),
      ].filter(Boolean)
    : [];
  const fullAddress = addressParts.join(", ") || "—";

  if (loading) {
    return (
      <OpsPanel>
        <OpsPanelBody>
          <p className="text-muted-foreground">Loading…</p>
        </OpsPanelBody>
      </OpsPanel>
    );
  }

  return (
    <div className="space-y-6">
      <OpsPanel>
        <OpsPanelHeader title="Primary venue" />
        <OpsPanelBody className="space-y-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Venue</div>
            <div className="mt-1 text-sm text-foreground">{project?.property_name ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Address</div>
            <div className="mt-1 text-sm text-foreground">{fullAddress}</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Time Zone</div>
            <div className="mt-1 text-sm text-foreground">{project?.timezone ?? "—"}</div>
          </div>
        </OpsPanelBody>
      </OpsPanel>
      {ganttLocations.length > 0 ? (
        <OpsPanel>
          <OpsPanelHeader title="Additional locations" />
          <OpsPanelBody>
            <ul className="space-y-2">
              {ganttLocations.map((loc) => (
                <li
                  key={loc.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground">{loc.name}</span>
                </li>
              ))}
            </ul>
          </OpsPanelBody>
        </OpsPanel>
      ) : null}
    </div>
  );
}
