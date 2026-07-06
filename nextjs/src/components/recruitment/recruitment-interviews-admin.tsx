"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, Edit, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";


const INTERVIEW_STATUSES = [
  { value: "0", label: "Scheduled" }, { value: "1", label: "In Progress" },
  { value: "2", label: "Completed" }, { value: "3", label: "Cancelled" }, { value: "4", label: "No Show" },
];
const STATUS_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  "0": "secondary", "1": "default", "2": "default", "3": "destructive", "4": "destructive",
};

type Candidate = { id: string; firstName: string; lastName: string };
type JobPosting = { id: string; title: string };
type Round = { id: string; name: string };
type InterviewType = { id: string; name: string };
type InterviewRow = {
  id: string; scheduledDate: string; scheduledTime: string; duration: number | null; status: string;
  location: string | null; meetingLink: string | null; candidateId: string | null; jobId: string | null;
  roundId: string | null; interviewTypeId: string | null;
  candidate?: { id: string; firstName: string; lastName: string } | null;
  job?: { id: string; title: string } | null;
  round?: { id: string; name: string } | null;
  interviewType?: { id: string; name: string } | null;
};

export default function RecruitmentInterviewsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-recruitment");
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const [rows, setRows] = React.useState<InterviewRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState("");
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [jobPostings, setJobPostings] = React.useState<JobPosting[]>([]);
  const [rounds, setRounds] = React.useState<Round[]>([]);
  const [interviewTypes, setInterviewTypes] = React.useState<InterviewType[]>([]);
  const [form, setForm] = React.useState({
    candidate_id: "", job_id: "", round_id: "", interview_type_id: "",
    scheduled_date: "", scheduled_time: "", duration: "", location: "", meeting_link: "", status: "0",
  });
  const perPage = 15;

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (filterStatus) params.set("status", filterStatus);
      const r = await fetch(`/api/recruitment/interviews?${params}`, { cache: "no-store" });
      const d = await r.json();
      setRows(d.data ?? []); setTotal(d.total ?? 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function loadMeta() {
    const [cand, jp, rnd, it] = await Promise.all([
      fetch("/api/recruitment/candidates?per_page=100", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/recruitment/job-postings?per_page=100", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/recruitment/interview-rounds?per_page=100", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/recruitment/interview-types?per_page=100", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setCandidates(cand.data ?? []); setJobPostings(jp.data ?? []); setRounds(rnd.data ?? []); setInterviewTypes(it.data ?? []);
  }

  React.useEffect(() => { void load(); }, [page, filterStatus]); // eslint-disable-line
  React.useEffect(() => { void loadMeta(); }, []); // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function openCreate() {
    setMode("add"); setEditId(null);
    setForm({ candidate_id: "", job_id: "", round_id: "", interview_type_id: "", scheduled_date: "", scheduled_time: "", duration: "", location: "", meeting_link: "", status: "0" });
    setOpen(true);
  }

  function openEdit(row: InterviewRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      candidate_id: row.candidateId ?? "", job_id: row.jobId ?? "", round_id: row.roundId ?? "",
      interview_type_id: row.interviewTypeId ?? "", scheduled_date: row.scheduledDate,
      scheduled_time: row.scheduledTime, duration: row.duration ? String(row.duration) : "",
      location: row.location ?? "", meeting_link: row.meetingLink ?? "", status: row.status,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setProcessing(true);
    const payload = {
      candidate_id: form.candidate_id || null, job_id: form.job_id || null,
      round_id: form.round_id || null, interview_type_id: form.interview_type_id || null,
      scheduled_date: form.scheduled_date, scheduled_time: form.scheduled_time,
      duration: form.duration ? Number(form.duration) : null,
      location: form.location || null, meeting_link: form.meeting_link || null, status: form.status,
    };
    try {
      if (mode === "add") {
        await fetch("/api/recruitment/interviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch(`/api/recruitment/interviews/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      setOpen(false); await load();
    } catch (e) { console.error(e); } finally { setProcessing(false); }
  }

  async function handleDelete(id: string) {
    if (!(await appConfirm(t("Delete this interview?")))) return;
    await fetch(`/api/recruitment/interviews/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder={t("All Status")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Status")}</SelectItem>
              {INTERVIEW_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {can("create-interviews") && (
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{t("Schedule Interview")}</Button>
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Round")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Type")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Scheduled")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Status")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("Action")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">{t("Loading...")}</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />{t("No interviews found")}
                  </td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{row.candidate ? `${row.candidate.firstName} ${row.candidate.lastName}` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{row.job?.title ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{row.round?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{row.interviewType?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      <div>{fmtDate(row.scheduledDate)}</div>
                      <div className="text-muted-foreground">{row.scheduledTime}{row.duration ? ` (${row.duration}min)` : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[row.status] ?? "secondary"}>
                        {INTERVIEW_STATUSES.find((s) => s.value === row.status)?.label ?? row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(can("edit-interviews") || can("delete-interviews")) && (
                        <TableActionButton
                          label={t("Edit")}
                          onPrimaryClick={can("edit-interviews") ? () => openEdit(row) : undefined}
                          items={[
                            { label: t("Edit"), onSelect: () => openEdit(row), icon: <Edit className="h-4 w-4" />, disabled: !can("edit-interviews") },
                            { label: t("Delete"), onSelect: () => handleDelete(row.id), icon: <Trash2 className="h-4 w-4" />, destructive: true, disabled: !can("delete-interviews") },
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
              <span>{from}–{to} {t("of")} {total}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>&larr;</Button>
                <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>&rarr;</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{mode === "add" ? t("Schedule Interview") : t("Edit Interview")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="px-6 py-5 space-y-4 flex-1">
              <div className="space-y-1.5">
                <Label required>{t("Candidate")}</Label>
                <Select value={form.candidate_id} onValueChange={(v) => setForm({ ...form, candidate_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("Select candidate")} /></SelectTrigger>
                  <SelectContent>
                    {candidates.map((c) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Job Posting")}</Label>
                <Select value={form.job_id} onValueChange={(v) => setForm({ ...form, job_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("Select job")} /></SelectTrigger>
                  <SelectContent>
                    {jobPostings.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Round")}</Label>
                  <Select value={form.round_id} onValueChange={(v) => setForm({ ...form, round_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("Select round")} /></SelectTrigger>
                    <SelectContent>
                      {rounds.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Interview Type")}</Label>
                  <Select value={form.interview_type_id} onValueChange={(v) => setForm({ ...form, interview_type_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("Select type")} /></SelectTrigger>
                    <SelectContent>
                      {interviewTypes.map((it) => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label required>{t("Date")}</Label>
                  <Input type="date" required value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label required>{t("Time")}</Label>
                  <Input type="time" required value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Duration (min)")}</Label>
                  <Input type="number" min={15} step={15} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="60" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Status")}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTERVIEW_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Location")}</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t("Office / room")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Meeting Link")}</Label>
                <Input type="url" value={form.meeting_link} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} placeholder="https://meet.google.com/..." />
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-2 bg-background">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
              <Button type="submit" disabled={processing}>{processing ? t("Saving...") : mode === "add" ? t("Schedule") : t("Save Changes")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
