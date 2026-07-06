"use client";

import * as React from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_EMPLOYEE_PAYOUT,
  parseEmployeePayoutDefaults,
  type EmployeePayRateRow,
  type EmployeePayoutDefaults,
} from "@/lib/employee-payout-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProjectOption = { id: number; name: string };
type StaffOption = { user_id: number; name: string; email: string; roles: string[] };

function RoleRateFields({
  label,
  values,
  onChange,
  disabled,
}: {
  label: string;
  values: { per_day: string; half_day: string };
  onChange: (next: { per_day: string; half_day: string }) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 text-sm font-semibold capitalize">{label}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Per day ($)</Label>
          <Input
            value={values.per_day}
            onChange={(e) => onChange({ ...values, per_day: e.target.value })}
            disabled={disabled}
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Half day ($)</Label>
          <Input
            value={values.half_day}
            onChange={(e) => onChange({ ...values, half_day: e.target.value })}
            disabled={disabled}
            inputMode="decimal"
          />
        </div>
      </div>
    </div>
  );
}

export function EmployeePayoutSettingsSection({
  canEdit,
  initial,
  onFlash,
}: {
  canEdit: boolean;
  initial: Record<string, string>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [defaults, setDefaults] = React.useState<EmployeePayoutDefaults>(() =>
    parseEmployeePayoutDefaults(initial.employee_payout_defaults),
  );
  const [rates, setRates] = React.useState<EmployeePayRateRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectOption[]>([]);
  const [projectFilter, setProjectFilter] = React.useState<string>("all");
  const [staff, setStaff] = React.useState<StaffOption[]>([]);
  const [draftProjectId, setDraftProjectId] = React.useState("");
  const [draftUserId, setDraftUserId] = React.useState("");
  const [draftRole, setDraftRole] = React.useState("agent");
  const [draftPerDay, setDraftPerDay] = React.useState("");
  const [draftHalfDay, setDraftHalfDay] = React.useState("");

  const loadRates = React.useCallback(async (projectId?: string) => {
    const qs = projectId && projectId !== "all" ? `?project_id=${projectId}` : "";
    const res = await fetch(`/api/settings/employee-payout${qs}`, { credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to load pay rates");
    setDefaults(data.defaults ?? parseEmployeePayoutDefaults(initial.employee_payout_defaults));
    setRates(Array.isArray(data.rates) ? data.rates : []);
  }, [initial.employee_payout_defaults]);

  React.useEffect(() => {
    setDefaults(parseEmployeePayoutDefaults(initial.employee_payout_defaults));
  }, [initial.employee_payout_defaults]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      loadRates(projectFilter !== "all" ? projectFilter : undefined),
      fetch("/api/project/list?per_page=100", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([, projectList]) => {
        if (cancelled) return;
        const rows = Array.isArray(projectList?.data) ? projectList.data : [];
        setProjects(rows.map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })));
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load payout settings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadRates, projectFilter]);

  React.useEffect(() => {
    if (!draftProjectId) {
      setStaff([]);
      return;
    }
    fetch(`/api/project/${draftProjectId}/sow`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const rows = Array.isArray(d.data) ? d.data : [];
        setStaff(
          rows.map((s: { user_id: number; name: string; email: string; roles: string[] }) => ({
            user_id: s.user_id,
            name: s.name,
            email: s.email,
            roles: s.roles ?? [],
          })),
        );
      })
      .catch(() => setStaff([]));
  }, [draftProjectId]);

  React.useEffect(() => {
    if (!draftUserId || !draftRole) return;
    const roleDefaults = defaults[draftRole as keyof EmployeePayoutDefaults] ?? DEFAULT_EMPLOYEE_PAYOUT.agent;
    setDraftPerDay((prev) => prev || roleDefaults.per_day);
    setDraftHalfDay((prev) => prev || roleDefaults.half_day);
  }, [draftUserId, draftRole, defaults]);

  const saveDefaults = async () => {
    setSaving(true);
    onFlash(null);
    try {
      const res = await fetch("/api/settings/employee-payout", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaults }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      onFlash({ type: "success", message: "Default pay rates saved." });
      toast.success("Default pay rates saved.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      onFlash({ type: "error", message: msg });
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const saveProjectRate = async () => {
    if (!draftProjectId || !draftUserId || !draftPerDay.trim()) {
      toast.error("Select a project, employee, and per-day rate.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/employee-payout", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rate: {
            project_id: Number(draftProjectId),
            user_id: Number(draftUserId),
            role: draftRole,
            pay_rate: draftPerDay,
            half_day_rate: draftHalfDay || null,
            rate_type: "per_day",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      await loadRates(projectFilter !== "all" ? projectFilter : undefined);
      toast.success("Project pay rate saved.");
      setDraftUserId("");
      setDraftPerDay("");
      setDraftHalfDay("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeRate = async (row: EmployeePayRateRow) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/settings/employee-payout?project_id=${row.project_id}&user_id=${row.user_id}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setRates((prev) => prev.filter((r) => !(r.project_id === row.project_id && r.user_id === row.user_id)));
      toast.success("Pay rate removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Employee Payout</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set default pay rates by role and override rates per employee on specific projects. Rates flow into Scope of Work documents.
          </p>
        </div>
        {canEdit ? (
          <Button onClick={saveDefaults} disabled={saving}>
            Save default rates
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default rates by role</CardTitle>
          <CardDescription>Used when no project-specific rate exists for an employee.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <RoleRateFields
            label="Agents"
            values={defaults.agent}
            onChange={(agent) => setDefaults((d) => ({ ...d, agent }))}
            disabled={!canEdit}
          />
          <RoleRateFields
            label="Medics"
            values={defaults.medic}
            onChange={(medic) => setDefaults((d) => ({ ...d, medic }))}
            disabled={!canEdit}
          />
          <RoleRateFields
            label="Security"
            values={defaults.security}
            onChange={(security) => setDefaults((d) => ({ ...d, security }))}
            disabled={!canEdit}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project pay rates</CardTitle>
          <CardDescription>Override an employee&apos;s pay for a specific project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] space-y-1.5">
              <Label>Filter by project</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {canEdit ? (
            <div className="rounded-lg border border-dashed border-border p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" />
                Add or update project rate
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1.5">
                  <Label>Project</Label>
                  <Select value={draftProjectId || "__none__"} onValueChange={(v) => setDraftProjectId(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select project</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Employee</Label>
                  <Select value={draftUserId || "__none__"} onValueChange={(v) => setDraftUserId(v === "__none__" ? "" : v)} disabled={!draftProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select employee</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.user_id} value={String(s.user_id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={draftRole} onValueChange={setDraftRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="medic">Medic</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Per day ($)</Label>
                  <Input value={draftPerDay} onChange={(e) => setDraftPerDay(e.target.value)} inputMode="decimal" />
                </div>
                <div className="space-y-1.5">
                  <Label>Half day ($)</Label>
                  <Input value={draftHalfDay} onChange={(e) => setDraftHalfDay(e.target.value)} inputMode="decimal" />
                </div>
              </div>
              <Button type="button" className="mt-3" size="sm" onClick={saveProjectRate} disabled={saving}>
                <Plus className="mr-1.5 h-4 w-4" />
                Save project rate
              </Button>
            </div>
          ) : null}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Per day</TableHead>
                  <TableHead>Half day</TableHead>
                  {canEdit ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 6 : 5} className="text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 6 : 5} className="text-muted-foreground">
                      No project-specific pay rates yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rates.map((row) => (
                    <TableRow key={`${row.project_id}-${row.user_id}`}>
                      <TableCell>{row.project_name}</TableCell>
                      <TableCell>
                        <div>{row.user_name}</div>
                        <div className="text-xs text-muted-foreground">{row.user_email}</div>
                      </TableCell>
                      <TableCell className="capitalize">{row.role ?? "—"}</TableCell>
                      <TableCell>${row.pay_rate}</TableCell>
                      <TableCell>{row.half_day_rate ? `$${row.half_day_rate}` : "—"}</TableCell>
                      {canEdit ? (
                        <TableCell className="text-right">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeRate(row)} disabled={saving}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
