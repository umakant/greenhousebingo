"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, Edit, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { formatPhone, unformatPhone } from "@/lib/phone";
import { t } from "@/lib/admin-t";


const CANDIDATE_STATUSES = [
  { value: "0", label: "Applied" }, { value: "1", label: "Screening" }, { value: "2", label: "Interview" },
  { value: "3", label: "Offered" }, { value: "4", label: "Hired" }, { value: "5", label: "Rejected" },
];
const STATUS_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  "0": "secondary", "1": "outline", "2": "default", "3": "default", "4": "default", "5": "destructive",
};

type JobPosting = { id: string; title: string };
type Source = { id: string; name: string };
type CandidateRow = {
  id: string; firstName: string; lastName: string; email: string; phone: string | null;
  gender: string | null; status: string; jobId: string | null; sourceId: string | null;
  experienceYears: string | null; expectedSalary: string | null; noticePeriod: string | null;
  currentCompany: string | null; currentPosition: string | null; skills: string | null;
  portfolioUrl: string | null; linkedinUrl: string | null; trackingId: string | null;
  job?: { id: string; title: string } | null; source?: { id: string; name: string } | null;
};

export default function RecruitmentCandidatesAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-recruitment");
  const [rows, setRows] = React.useState<CandidateRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("");
  const [jobPostings, setJobPostings] = React.useState<JobPosting[]>([]);
  const [sources, setSources] = React.useState<Source[]>([]);
  const [form, setForm] = React.useState({
    first_name: "", last_name: "", email: "", phone: "", gender: "", country: "", city: "",
    current_company: "", current_position: "", experience_years: "", expected_salary: "", notice_period: "",
    skills: "", education: "", portfolio_url: "", linkedin_url: "", status: "0", job_id: "", source_id: "",
  });
  const perPage = 15;

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      const r = await fetch(`/api/recruitment/candidates?${params}`, { cache: "no-store" });
      const d = await r.json();
      setRows(d.data ?? []); setTotal(d.total ?? 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function loadMeta() {
    const [jp, src] = await Promise.all([
      fetch("/api/recruitment/job-postings?per_page=100", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/recruitment/candidate-sources?per_page=100", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setJobPostings(jp.data ?? []); setSources(src.data ?? []);
  }

  React.useEffect(() => { void load(); }, [page, search, filterStatus]); // eslint-disable-line
  React.useEffect(() => { void loadMeta(); }, []); // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function resetForm() {
    setForm({ first_name: "", last_name: "", email: "", phone: "", gender: "", country: "", city: "", current_company: "", current_position: "", experience_years: "", expected_salary: "", notice_period: "", skills: "", education: "", portfolio_url: "", linkedin_url: "", status: "0", job_id: "", source_id: "" });
  }

  function openCreate() { setMode("add"); setEditId(null); resetForm(); setOpen(true); }

  function openEdit(row: CandidateRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      first_name: row.firstName, last_name: row.lastName, email: row.email, phone: formatPhone(row.phone ?? ""),
      gender: row.gender ?? "", country: "", city: row.job?.title ?? "", current_company: row.currentCompany ?? "",
      current_position: row.currentPosition ?? "", experience_years: row.experienceYears ?? "",
      expected_salary: row.expectedSalary ?? "", notice_period: row.noticePeriod ?? "",
      skills: row.skills ?? "", education: "", portfolio_url: row.portfolioUrl ?? "",
      linkedin_url: row.linkedinUrl ?? "", status: row.status, job_id: row.jobId ?? "", source_id: row.sourceId ?? "",
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setProcessing(true);
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: unformatPhone(form.phone).trim() || null,
      gender: form.gender || null, current_company: form.current_company || null, current_position: form.current_position || null,
      experience_years: form.experience_years ? Number(form.experience_years) : null,
      expected_salary: form.expected_salary ? Number(form.expected_salary) : null,
      notice_period: form.notice_period || null, skills: form.skills || null, education: form.education || null,
      portfolio_url: form.portfolio_url || null, linkedin_url: form.linkedin_url || null,
      status: form.status, job_id: form.job_id || null, source_id: form.source_id || null,
    };
    try {
      if (mode === "add") {
        await fetch("/api/recruitment/candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch(`/api/recruitment/candidates/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      setOpen(false); await load();
    } catch (e) { console.error(e); } finally { setProcessing(false); }
  }

  async function handleDelete(id: string) {
    if (!(await appConfirm(t("Delete this candidate? This will also remove related interviews and offers.")))) return;
    await fetch(`/api/recruitment/candidates/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-1">
          <Input placeholder={t("Search candidates...")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder={t("All Status")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Status")}</SelectItem>
              {CANDIDATE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {can("create-candidates") && (
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{t("Add Candidate")}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Candidate")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Job")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Source")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Experience")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Status")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("Action")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">{t("Loading...")}</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />{t("No candidates found")}
                  </td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.firstName} {row.lastName}</div>
                      <div className="text-xs text-muted-foreground">{row.email}</div>
                      {row.trackingId && <div className="text-xs text-muted-foreground">{row.trackingId}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{row.job?.title ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{row.source?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{row.experienceYears ? `${row.experienceYears} yrs` : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[row.status] ?? "secondary"}>
                        {CANDIDATE_STATUSES.find((s) => s.value === row.status)?.label ?? row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(can("edit-candidates") || can("delete-candidates")) && (
                        <TableActionButton
                          label={t("Edit")}
                          onPrimaryClick={can("edit-candidates") ? () => openEdit(row) : undefined}
                          items={[
                            { label: t("Edit"), onSelect: () => openEdit(row), icon: <Edit className="h-4 w-4" />, disabled: !can("edit-candidates") },
                            { label: t("Delete"), onSelect: () => handleDelete(row.id), icon: <Trash2 className="h-4 w-4" />, destructive: true, disabled: !can("delete-candidates") },
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
            <SheetTitle>{mode === "add" ? t("Add Candidate") : t("Edit Candidate")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="px-6 py-5 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label required>{t("First Name")}</Label>
                  <Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder={t("First name")} />
                </div>
                <div className="space-y-1.5">
                  <Label required>{t("Last Name")}</Label>
                  <Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder={t("Last name")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label required>{t("Email")}</Label>
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Phone")}</Label>
                  <PhoneInput
                    value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: v })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Gender")}</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder={t("Select")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Job Posting")}</Label>
                  <Select value={form.job_id} onValueChange={(v) => setForm({ ...form, job_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("Select job")} /></SelectTrigger>
                    <SelectContent>
                      {jobPostings.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Source")}</Label>
                  <Select value={form.source_id} onValueChange={(v) => setForm({ ...form, source_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("Select source")} /></SelectTrigger>
                    <SelectContent>
                      {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Current Company")}</Label>
                  <Input value={form.current_company} onChange={(e) => setForm({ ...form, current_company: e.target.value })} placeholder={t("Company name")} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Current Position")}</Label>
                  <Input value={form.current_position} onChange={(e) => setForm({ ...form, current_position: e.target.value })} placeholder={t("Position")} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Experience (years)")}</Label>
                  <Input type="number" min={0} step="0.5" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Expected Salary")}</Label>
                  <Input type="number" min={0} step="0.01" value={form.expected_salary} onChange={(e) => setForm({ ...form, expected_salary: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Notice Period")}</Label>
                  <Input value={form.notice_period} onChange={(e) => setForm({ ...form, notice_period: e.target.value })} placeholder={t("e.g. 30 days")} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Status")}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CANDIDATE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Skills")}</Label>
                <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder={t("e.g. React, TypeScript")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Portfolio URL")}</Label>
                  <Input type="url" value={form.portfolio_url} onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })} placeholder="https://" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("LinkedIn URL")}</Label>
                  <Input type="url" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/" />
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-2 bg-background">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
              <Button type="submit" disabled={processing}>{processing ? t("Saving...") : mode === "add" ? t("Add Candidate") : t("Save Changes")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
