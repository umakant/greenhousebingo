"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


const PASS_FAIL_OPTIONS = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "pending", label: "Pending" },
];

function passFailBadge(value: string) {
  if (value === "pass") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pass</Badge>;
  if (value === "fail") return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Fail</Badge>;
  return <Badge variant="secondary">{value || "Pending"}</Badge>;
}

type AssessmentRow = {
  id: string;
  assessmentName: string;
  score: number | null;
  maxScore: number | null;
  passFailStatus: string;
  comments: string | null;
  assessmentDate: string;
  candidateId: string | null;
  candidate?: { id: string; firstName: string; lastName: string; email: string } | null;
};

type CandidateOption = { id: string; label: string };

type FormState = {
  assessment_name: string;
  score: string;
  max_score: string;
  pass_fail_status: string;
  comments: string;
  assessment_date: string;
  candidate_id: string;
};

const blankForm: FormState = {
  assessment_name: "",
  score: "",
  max_score: "",
  pass_fail_status: "pending",
  comments: "",
  assessment_date: new Date().toISOString().slice(0, 10),
  candidate_id: "",
};

export default function RecruitmentCandidateAssessmentsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-recruitment");

  const [rows, setRows] = React.useState<AssessmentRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const perPage = 15;
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(blankForm);
  const [candidateOptions, setCandidateOptions] = React.useState<CandidateOption[]>([]);

  async function load(p = page) {
    setLoading(true);
    try {
      const r = await fetch(`/api/recruitment/candidate-assessments?page=${p}&per_page=${perPage}`, { cache: "no-store" });
      const d = await r.json();
      setRows(d.data ?? []);
      setTotal(d.total ?? 0);
    } catch { toast.error(t("Failed to load")); } finally { setLoading(false); }
  }

  async function loadCandidates() {
    try {
      const r = await fetch("/api/recruitment/candidates?per_page=100", { cache: "no-store" });
      const d = await r.json();
      const opts: CandidateOption[] = (d.data ?? []).map((c: { id: string; firstName: string; lastName: string }) => ({
        id: String(c.id),
        label: `${c.firstName} ${c.lastName}`,
      }));
      setCandidateOptions(opts);
    } catch { /* ignore */ }
  }

  React.useEffect(() => { void load(); }, []); // eslint-disable-line

  function openCreate() {
    setMode("add"); setEditId(null);
    setForm({ ...blankForm, assessment_date: new Date().toISOString().slice(0, 10) });
    setOpen(true);
    void loadCandidates();
  }

  function openEdit(row: AssessmentRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      assessment_name: row.assessmentName,
      score: row.score?.toString() ?? "",
      max_score: row.maxScore?.toString() ?? "",
      pass_fail_status: row.passFailStatus || "pending",
      comments: row.comments ?? "",
      assessment_date: row.assessmentDate,
      candidate_id: row.candidateId ?? "",
    });
    setOpen(true);
    void loadCandidates();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.assessment_name.trim()) { toast.error(t("Assessment name is required")); return; }
    setProcessing(true);
    const payload = {
      assessment_name: form.assessment_name,
      score: form.score ? Number(form.score) : null,
      max_score: form.max_score ? Number(form.max_score) : null,
      pass_fail_status: form.pass_fail_status,
      comments: form.comments || null,
      assessment_date: form.assessment_date,
      candidate_id: form.candidate_id || null,
    };
    try {
      const url = mode === "add" ? "/api/recruitment/candidate-assessments" : `/api/recruitment/candidate-assessments/${editId}`;
      const method = mode === "add" ? "POST" : "PUT";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      toast.success(mode === "add" ? t("Assessment created") : t("Assessment updated"));
      setOpen(false);
      await load();
    } catch { toast.error(t("Failed to save")); } finally { setProcessing(false); }
  }

  async function handleDelete(id: string) {
    if (!(await appConfirm(t("Delete this assessment?")))) return;
    const res = await fetch(`/api/recruitment/candidate-assessments/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success(t("Deleted")); await load(); }
    else toast.error(t("Failed to delete"));
  }

  const totalPages = Math.ceil(total / perPage);
  const f = (k: keyof FormState) => (v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{total} {t("record(s)")}</span>
        {can("manage-candidate-assessments") && (
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />{t("Add Assessment")}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Assessment Name")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Candidate")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Score")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Result")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Date")}</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">{t("Loading...")}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">{t("No candidate assessments yet")}</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{row.assessmentName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {row.candidate
                      ? `${row.candidate.firstName} ${row.candidate.lastName}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.score != null ? (
                      <span className="font-semibold">{row.score}{row.maxScore ? ` / ${row.maxScore}` : ""}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">{passFailBadge(row.passFailStatus)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.assessmentDate}</td>
                  <td className="px-4 py-3 text-right">
                    <TableActionButton
                      label={t("Edit")}
                      onPrimaryClick={can("manage-candidate-assessments") ? () => openEdit(row) : undefined}
                      items={[
                        { label: t("Edit"), onSelect: () => openEdit(row), icon: <Edit className="h-4 w-4" />, disabled: !can("manage-candidate-assessments") },
                        { label: t("Delete"), onSelect: () => handleDelete(row.id), icon: <Trash2 className="h-4 w-4" />, destructive: true, disabled: !can("manage-candidate-assessments") },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(p => p - 1); void load(page - 1); }}>Previous</Button>
          <span className="text-sm px-2 py-1">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); void load(page + 1); }}>Next</Button>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{mode === "add" ? t("Add Candidate Assessment") : t("Edit Candidate Assessment")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="px-6 py-5 space-y-4 flex-1">
              <div className="space-y-1.5">
                <Label required>{t("Assessment Name")}</Label>
                <Input required value={form.assessment_name} onChange={(e) => f("assessment_name")(e.target.value)} placeholder={t("e.g. Technical Skills Assessment")} />
              </div>

              <div className="space-y-1.5">
                <Label>{t("Candidate")}</Label>
                <Select value={form.candidate_id || "__none__"} onValueChange={(v) => f("candidate_id")(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder={t("Select candidate")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("— None —")}</SelectItem>
                    {candidateOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("Score")}</Label>
                  <Input type="number" min={0} value={form.score} onChange={(e) => f("score")(e.target.value)} placeholder="e.g. 85" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Max Score")}</Label>
                  <Input type="number" min={0} value={form.max_score} onChange={(e) => f("max_score")(e.target.value)} placeholder="e.g. 100" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("Result")}</Label>
                <Select value={form.pass_fail_status} onValueChange={f("pass_fail_status")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PASS_FAIL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label required>{t("Assessment Date")}</Label>
                <Input type="date" required value={form.assessment_date} onChange={(e) => f("assessment_date")(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>{t("Comments")}</Label>
                <textarea rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" value={form.comments} onChange={(e) => f("comments")(e.target.value)} placeholder={t("Additional comments about this assessment...")} />
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
