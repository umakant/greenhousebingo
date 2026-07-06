"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Download,
  FileText,
  MapPin,
  Plus,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { OpsPanel, OpsPanelBody, OpsPanelHeader } from "./ops-panel";
import {
  ProjectOpsDynamicForm,
  buildProjectOpsFormData,
} from "./project-ops-dynamic-form";
import { cn } from "@/lib/utils";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";

function statusBadgeClass(role: string) {
  if (role === "medic") return "border-red-200 text-red-700 bg-red-50";
  if (role === "security") return "border-emerald-200 text-emerald-700 bg-emerald-50";
  return "border-violet-200 text-violet-700 bg-violet-50";
}

export { AgentsTab, MedicsTab, SecurityTab } from "./project-ops-staff-tab";

export { ChecklistTab } from "./project-ops-checklist";

export { AgentChecklistTab } from "./project-ops-agent-checklist";

export function VendorsTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const [vendors, setVendors] = React.useState<Array<{ id: number; name: string; email: string | null; phone: string | null }>>([]);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(() => {
    fetch(`/api/project/${projectId}/vendors`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setVendors(Array.isArray(d.data) ? d.data : []))
      .catch(() => setVendors([]));
  }, [projectId]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <>
      <OpsPanel>
        <OpsPanelHeader
          title={`Vendors (${vendors.length})`}
          actions={
            canManage ? (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Add Vendor
              </Button>
            ) : null
          }
        />
        <OpsPanelBody>
          {vendors.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Building2 className="mb-3 h-10 w-10 opacity-50" />
              <p>No vendors yet. Add one to get started.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {vendors.map((v) => (
                <li key={v.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div>
                    <div className="font-medium text-foreground">{v.name}</div>
                    <div className="text-xs text-muted-foreground">{v.email ?? v.phone ?? "—"}</div>
                  </div>
                  {canManage ? (
                    <Button type="button" variant="ghost" size="icon" onClick={() => void (async () => {
                      await fetch(`/api/project/${projectId}/vendors?id=${v.id}`, { method: "DELETE", credentials: "include" });
                      load();
                    })()}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </OpsPanelBody>
      </OpsPanel>
      <ProjectDrawer open={open} onOpenChange={setOpen} title="Add Vendor" footer={null}>
        <ProjectOpsDynamicForm
          sectionId="vendors"
          projectId={projectId}
          submitLabel="Add Vendor"
          disabled={!canManage}
          onSubmit={async (payload) => {
            const body: Record<string, unknown> = {};
            const mode = String(payload.vendor_mode ?? "existing");
            if (mode === "existing" && payload.vendor_id) body.vendor_id = Number(payload.vendor_id);
            else {
              body.name = payload.name;
              body.email = payload.email;
              body.phone = payload.phone;
            }
            const res = await fetch(`/api/project/${projectId}/vendors`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error("Failed to add vendor");
            setOpen(false);
            load();
          }}
        />
      </ProjectDrawer>
    </>
  );
}

export { ScheduleTab } from "./project-ops-schedule";

export function LodgingTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const [hotels, setHotels] = React.useState<Array<{ id: number; name: string; address: string | null }>>([]);
  const [assignments, setAssignments] = React.useState<Array<Record<string, unknown>>>([]);
  const [showAddHotel, setShowAddHotel] = React.useState(false);

  const load = React.useCallback(() => {
    fetch(`/api/project/${projectId}/lodging`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setHotels(Array.isArray(d.hotels) ? d.hotels : []);
        setAssignments(Array.isArray(d.assignments) ? d.assignments : []);
      })
      .catch(() => {
        setHotels([]);
        setAssignments([]);
      });
  }, [projectId]);

  React.useEffect(() => { load(); }, [load]);

  const agents = assignments.filter((a) => a.role === "agent");
  const medics = assignments.filter((a) => a.role === "medic");

  return (
    <OpsPanel>
      <OpsPanelHeader
        title="Lodging Hotels"
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setShowAddHotel(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add Hotel
            </Button>
          ) : null
        }
      />
      <OpsPanelBody className="space-y-6">
        {hotels.map((h) => (
          <div key={h.id} className="rounded-lg border border-border p-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-blue-400" />
              <div>
                <div className="font-medium text-foreground">{h.name}</div>
                <div className="text-sm text-muted-foreground">{h.address ?? "—"}</div>
              </div>
            </div>
          </div>
        ))}
        <LodgingTable title="Agents" icon={Users} rows={agents} />
        <LodgingTable title="Medics" icon={Shield} rows={medics} />
      </OpsPanelBody>
      <ProjectDrawer open={showAddHotel} onOpenChange={setShowAddHotel} title="Add Hotel" footer={null}>
        <ProjectOpsDynamicForm
          sectionId="lodging"
          projectId={projectId}
          submitLabel="Add Hotel"
          disabled={!canManage}
          onSubmit={async (payload) => {
            const res = await fetch(`/api/project/${projectId}/lodging`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "hotel", name: payload.name, address: payload.address }),
            });
            if (!res.ok) throw new Error("Failed to add hotel");
            setShowAddHotel(false);
            load();
          }}
        />
      </ProjectDrawer>
    </OpsPanel>
  );
}

function LodgingTable({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: Array<Record<string, unknown>>;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr>
            <th className="pb-2">Name</th>
            <th className="pb-2">Hotel</th>
            <th className="pb-2">Room</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id as number} className="border-t border-border">
              <td className="py-2 text-foreground">{r.name as string}</td>
              <td className="py-2 text-muted-foreground">{r.hotel_name as string}</td>
              <td className="py-2 text-muted-foreground">{r.room as string ?? "—"}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr><td colSpan={3} className="py-2 text-muted-foreground">No assignments</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function DocumentsPanel({
  projectId,
  canManage,
  docType,
  title,
  description,
  uploadLabel,
  sectionId,
}: {
  projectId: number;
  canManage: boolean;
  docType: string;
  title: string;
  description?: string;
  uploadLabel: string;
  sectionId: "documents" | "risk_assessment" | "files";
}) {
  const { settings } = useAppSettings();
  const [files, setFiles] = React.useState<Array<Record<string, unknown>>>([]);
  const [showUpload, setShowUpload] = React.useState(false);

  const load = React.useCallback(() => {
    fetch(`/api/project/${projectId}/files?doc_type=${docType}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setFiles(Array.isArray(d.data) ? d.data : []))
      .catch(() => setFiles([]));
  }, [projectId, docType]);

  React.useEffect(() => { load(); }, [load]);

  const remove = async (id: number) => {
    await fetch(`/api/project/${projectId}/files?file_id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  return (
    <>
      <OpsPanel>
        <OpsPanelHeader
          title={title}
          description={description}
          actions={
            canManage ? (
              <Button size="sm" onClick={() => setShowUpload(true)}>
                <Plus className="mr-1 h-4 w-4" />{uploadLabel}
              </Button>
            ) : null
          }
        />
        <OpsPanelBody>
          {files.length === 0 ? (
            <p className="text-muted-foreground">No documents yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {files.map((f) => (
                <div key={f.id as number} className="rounded-lg border border-border bg-background/50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <FileText className="h-5 w-5 text-red-400" />
                    <Badge variant="outline" className="border-border text-foreground">{f.category as string}</Badge>
                  </div>
                  <div className="mt-2 font-medium text-foreground">{f.title as string}</div>
                  <div className="text-xs text-muted-foreground">{f.file_name as string}</div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{fmtDateLib(String(f.created_at).slice(0, 10), settings)}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                        <a href={f.file_path as string} download><Download className="h-4 w-4" /></a>
                      </Button>
                      {canManage ? (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(f.id as number)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </OpsPanelBody>
      </OpsPanel>
      <ProjectDrawer open={showUpload} onOpenChange={setShowUpload} title={uploadLabel} footer={null}>
        <ProjectOpsDynamicForm
          sectionId={sectionId}
          projectId={projectId}
          submitLabel={uploadLabel}
          disabled={!canManage}
          onSubmit={async (payload, filesMap) => {
            const file = filesMap.file;
            if (!(file instanceof File)) throw new Error("File is required");
            const fd = buildProjectOpsFormData(
              {
                title: payload.title || file.name,
                category: payload.category || (sectionId === "risk_assessment" ? "Risk Assessment" : "Document"),
              },
              { file },
              { doc_type: docType },
            );
            const res = await fetch(`/api/project/${projectId}/files`, { method: "POST", credentials: "include", body: fd });
            if (!res.ok) throw new Error("Upload failed");
            setShowUpload(false);
            load();
          }}
        />
      </ProjectDrawer>
    </>
  );
}

export function DocumentsTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  return (
    <DocumentsPanel
      projectId={projectId}
      canManage={canManage}
      docType="document"
      sectionId="documents"
      title="Project Documents"
      uploadLabel="Add Document"
    />
  );
}

export function RiskAssessmentTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  return (
    <DocumentsPanel
      projectId={projectId}
      canManage={canManage}
      docType="risk"
      sectionId="risk_assessment"
      title="Risk Assessment Documents"
      description="Upload and manage risk assessment files for this project."
      uploadLabel="Upload Document"
    />
  );
}

export function NotesTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const { settings } = useAppSettings();
  const [notes, setNotes] = React.useState<Array<{ id: number; content: string; author: string; created_at: string }>>([]);

  const load = React.useCallback(() => {
    fetch(`/api/project/${projectId}/notes`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setNotes(Array.isArray(d.data) ? d.data : []))
      .catch(() => setNotes([]));
  }, [projectId]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <OpsPanel>
      <OpsPanelHeader title="Project Notes" />
      <OpsPanelBody>
        {canManage ? (
          <div className="mb-6">
            <ProjectOpsDynamicForm
              key={`note-${notes.length}`}
              sectionId="notes"
              projectId={projectId}
              submitLabel="Post"
              onSubmit={async (payload) => {
                const res = await fetch(`/api/project/${projectId}/notes`, {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content: payload.content }),
                });
                if (!res.ok) throw new Error("Failed to post note");
                load();
              }}
            />
          </div>
        ) : null}
        <ul className="space-y-4">
          {notes.map((n) => (
            <li key={n.id} className="flex gap-3 rounded-lg border border-border p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-xs text-blue-300">
                {n.author.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{n.author}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtDateLib(n.created_at.slice(0, 10), settings)} at {new Date(n.created_at).toLocaleTimeString()}
                </div>
                <p className="mt-1 text-sm text-foreground">{n.content}</p>
              </div>
            </li>
          ))}
        </ul>
      </OpsPanelBody>
    </OpsPanel>
  );
}

export function ActivityTab({ projectId }: { projectId: number }) {
  const { settings } = useAppSettings();
  const [logs, setLogs] = React.useState<Array<{ id: number; author: string; remark: string | null; created_at: string }>>([]);

  React.useEffect(() => {
    fetch(`/api/project/${projectId}/activity`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setLogs(Array.isArray(d.data) ? d.data : []))
      .catch(() => setLogs([]));
  }, [projectId]);

  return (
    <OpsPanel>
      <OpsPanelHeader title="Action Timeline" />
      <OpsPanelBody>
        <ul className="space-y-4">
          {logs.map((l) => (
            <li key={l.id} className="relative pl-6">
              <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
              <div className="text-sm font-medium text-foreground">{l.author}</div>
              <div className="text-sm text-foreground">{l.remark ?? l.author}</div>
              <div className="text-xs text-muted-foreground">
                {fmtDateLib(l.created_at.slice(0, 10), settings)} {new Date(l.created_at).toLocaleTimeString()}
              </div>
            </li>
          ))}
          {logs.length === 0 ? <p className="text-muted-foreground">No activity yet.</p> : null}
        </ul>
      </OpsPanelBody>
    </OpsPanel>
  );
}

export function LeadershipTab({
  projectId,
  lead,
  members,
  canManage,
  onLeadChange,
}: {
  projectId: number;
  lead: { id: number; name: string; email: string } | null;
  members: Array<{ id: number; name: string; email: string }>;
  canManage: boolean;
  onLeadChange: () => void;
}) {
  return (
    <OpsPanel>
      <OpsPanelHeader title="Leadership" description="Lead agent and project team access." />
      <OpsPanelBody className="space-y-6">
        {canManage ? (
          <ProjectOpsDynamicForm
            sectionId="leadership"
            projectId={projectId}
            initialValues={{ user_id: lead?.id ?? "" }}
            context={{ roster: members }}
            submitLabel="Save Lead"
            onSubmit={async (payload) => {
              if (!payload.user_id) throw new Error("Select a lead agent");
              const res = await fetch(`/api/project/${projectId}/lead`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: Number(payload.user_id) }),
              });
              if (!res.ok) throw new Error("Failed to update lead");
              onLeadChange();
            }}
          />
        ) : (
          <div>
            <Label className="text-muted-foreground">Lead Agent</Label>
            <p className="mt-2 text-foreground">{lead?.name ?? "—"}</p>
          </div>
        )}
        <div>
          <h4 className="mb-2 text-sm font-medium text-foreground">Team Members</h4>
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm text-foreground">
                <Users className="h-4 w-4 text-muted-foreground" />
                {m.name} <span className="text-muted-foreground">({m.email})</span>
              </li>
            ))}
            {members.length === 0 ? <li className="text-muted-foreground">No team members.</li> : null}
          </ul>
        </div>
        <Button variant="outline" size="sm" asChild className="border-border">
          <Link href={`/project/report?project_id=${projectId}`}>View Reports</Link>
        </Button>
      </OpsPanelBody>
    </OpsPanel>
  );
}

