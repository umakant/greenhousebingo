"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, Edit, Briefcase, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Switch } from "@/components/ui/switch";
import { t } from "@/lib/admin-t";


const PRIORITY_LABELS: Record<string, string> = { "0": "Low", "1": "Medium", "2": "High" };
const STATUS_LABELS: Record<string, string> = { "0": "Draft", "1": "Open", "2": "On Hold", "3": "Closed", "4": "Cancelled" };

type JobType = { id: string; name: string };
type Location = { id: string; name: string };
type JobRow = {
  id: string; title: string; postingCode: string; priority: string; status: string; isPublished: boolean; isFeatured: boolean;
  position: number | null; minSalary: string | null; maxSalary: string | null; applicationDeadline: string | null;
  jobTypeId: string | null; locationId: string | null; description: string | null; requirements: string | null; skills: string | null;
  jobType?: { id: string; name: string } | null; location?: { id: string; name: string } | null;
};

export default function RecruitmentJobPostingsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-recruitment");
  const [rows, setRows] = React.useState<JobRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [jobTypes, setJobTypes] = React.useState<JobType[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [form, setForm] = React.useState({
    title: "", priority: "0", status: "0", position: "", min_salary: "", max_salary: "",
    application_deadline: "", job_type_id: "", location_id: "", description: "", requirements: "",
    skills: "", is_published: false, is_featured: false,
  });
  const perPage = 15;

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (search) params.set("search", search);
      const r = await fetch(`/api/recruitment/job-postings?${params}`, { cache: "no-store" });
      const d = await r.json();
      setRows(d.data ?? []); setTotal(d.total ?? 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function loadMeta() {
    const [jt, loc] = await Promise.all([
      fetch("/api/recruitment/job-types?per_page=100", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/recruitment/job-locations?per_page=100", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setJobTypes(jt.data ?? []);
    setLocations(loc.data ?? []);
  }

  React.useEffect(() => { void load(); }, [page, search]); // eslint-disable-line
  React.useEffect(() => { void loadMeta(); }, []); // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function openCreate() {
    setMode("add"); setEditId(null);
    setForm({ title: "", priority: "0", status: "0", position: "", min_salary: "", max_salary: "", application_deadline: "", job_type_id: "", location_id: "", description: "", requirements: "", skills: "", is_published: false, is_featured: false });
    setOpen(true);
  }

  function openEdit(row: JobRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      title: row.title, priority: row.priority, status: row.status, position: row.position ? String(row.position) : "",
      min_salary: row.minSalary ?? "", max_salary: row.maxSalary ?? "", application_deadline: row.applicationDeadline ?? "",
      job_type_id: row.jobTypeId ?? "", location_id: row.locationId ?? "", description: row.description ?? "",
      requirements: row.requirements ?? "", skills: row.skills ?? "", is_published: row.isPublished, is_featured: row.isFeatured,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setProcessing(true);
    const payload = {
      title: form.title, priority: form.priority, status: form.status,
      position: form.position ? Number(form.position) : null,
      min_salary: form.min_salary ? Number(form.min_salary) : null,
      max_salary: form.max_salary ? Number(form.max_salary) : null,
      application_deadline: form.application_deadline || null,
      job_type_id: form.job_type_id || null, location_id: form.location_id || null,
      description: form.description || null, requirements: form.requirements || null,
      skills: form.skills || null, is_published: form.is_published, is_featured: form.is_featured,
    };
    try {
      if (mode === "add") {
        await fetch("/api/recruitment/job-postings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch(`/api/recruitment/job-postings/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      setOpen(false); await load();
    } catch (e) { console.error(e); } finally { setProcessing(false); }
  }

  async function handleDelete(id: string) {
    if (!(await appConfirm(t("Delete this job posting?")))) return;
    await fetch(`/api/recruitment/job-postings/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 flex-1">
          <Input placeholder={t("Search job postings...")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        </div>
        {can("create-job-postings") && (
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{t("Add Job Posting")}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Title")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Type")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Location")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Priority")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Status")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Published")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Deadline")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("Action")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">{t("Loading...")}</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {t("No job postings found")}
                  </td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.title}</div>
                      <div className="text-xs text-muted-foreground">{row.postingCode}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.jobType?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.location?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.priority === "2" ? "destructive" : row.priority === "1" ? "default" : "secondary"}>
                        {PRIORITY_LABELS[row.priority] ?? row.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline">{STATUS_LABELS[row.status] ?? row.status}</Badge></td>
                    <td className="px-4 py-3">
                      {row.isPublished ? <Badge variant="default"><Globe className="h-3 w-3 mr-1" />Yes</Badge> : <Badge variant="secondary">No</Badge>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{row.applicationDeadline ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {(can("edit-job-postings") || can("delete-job-postings")) && (
                        <TableActionButton
                          label={t("Edit")}
                          onPrimaryClick={can("edit-job-postings") ? () => openEdit(row) : undefined}
                          items={[
                            { label: t("Edit"), onSelect: () => openEdit(row), icon: <Edit className="h-4 w-4" />, disabled: !can("edit-job-postings") },
                            { label: t("Delete"), onSelect: () => handleDelete(row.id), icon: <Trash2 className="h-4 w-4" />, destructive: true, disabled: !can("delete-job-postings") },
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
              <span>{t("Showing")} {from}–{to} {t("of")} {total}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>&larr;</Button>
                <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>&rarr;</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{mode === "add" ? t("Add Job Posting") : t("Edit Job Posting")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="px-6 py-5 space-y-4 flex-1">
              <div className="space-y-1.5">
                <Label htmlFor="jp-title">{t("Job Title")}</Label>
                <Input id="jp-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("e.g. Senior Developer")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Job Type")}</Label>
                  <Select value={form.job_type_id} onValueChange={(v) => setForm({ ...form, job_type_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("Select type")} /></SelectTrigger>
                    <SelectContent>
                      {jobTypes.map((jt) => <SelectItem key={jt.id} value={jt.id}>{jt.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Location")}</Label>
                  <Select value={form.location_id} onValueChange={(v) => setForm({ ...form, location_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("Select location")} /></SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Priority")}</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Low</SelectItem>
                      <SelectItem value="1">Medium</SelectItem>
                      <SelectItem value="2">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Status")}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Draft</SelectItem>
                      <SelectItem value="1">Open</SelectItem>
                      <SelectItem value="2">On Hold</SelectItem>
                      <SelectItem value="3">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Positions")}</Label>
                  <Input type="number" min={1} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="1" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Application Deadline")}</Label>
                  <Input type="date" value={form.application_deadline} onChange={(e) => setForm({ ...form, application_deadline: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Min Salary")}</Label>
                  <Input type="number" min={0} step="0.01" value={form.min_salary} onChange={(e) => setForm({ ...form, min_salary: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Max Salary")}</Label>
                  <Input type="number" min={0} step="0.01" value={form.max_salary} onChange={(e) => setForm({ ...form, max_salary: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Skills")}</Label>
                <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder={t("e.g. React, TypeScript, Node.js")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Description")}</Label>
                <textarea rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("Job description...")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Requirements")}</Label>
                <textarea rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} placeholder={t("Job requirements...")} />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch id="jp-published" checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                  <Label htmlFor="jp-published">{t("Published")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="jp-featured" checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                  <Label htmlFor="jp-featured">{t("Featured")}</Label>
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-2 bg-background">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
              <Button type="submit" disabled={processing}>{processing ? t("Saving...") : mode === "add" ? t("Create") : t("Save Changes")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
