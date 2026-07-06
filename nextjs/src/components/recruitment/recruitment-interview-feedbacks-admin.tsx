"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, Edit, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { toast } from "sonner";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";


const RECOMMENDATIONS = [
  { value: "strong_hire", label: "Strong Hire" },
  { value: "hire", label: "Hire" },
  { value: "maybe", label: "Maybe" },
  { value: "no_hire", label: "No Hire" },
  { value: "strong_no_hire", label: "Strong No Hire" },
];

function recommendationBadge(value: string | null) {
  if (!value) return <Badge variant="secondary">—</Badge>;
  const label = RECOMMENDATIONS.find((r) => r.value === value)?.label ?? value;
  if (value === "strong_hire" || value === "hire") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{label}</Badge>;
  if (value === "no_hire" || value === "strong_no_hire") return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{label}</Badge>;
  return <Badge variant="outline">{label}</Badge>;
}

function RatingInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label} <span className="text-muted-foreground text-xs">(1–10)</span></Label>
      <div className="flex items-center gap-2">
        <Input type="number" min={1} max={10} value={value} onChange={(e) => onChange(e.target.value)} className="w-24" />
        {value && Number(value) > 0 && (
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(10, Number(value)) }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type FeedbackRow = {
  id: string;
  technicalRating: number | null;
  communicationRating: number | null;
  culturalFitRating: number | null;
  overallRating: number | null;
  strengths: string | null;
  improvements: string | null;
  notes: string | null;
  recommendation: string | null;
  interviewId: string | null;
  evaluatorId: string | null;
  interview?: {
    id: string;
    scheduledDate: string;
    candidate?: { id: string; firstName: string; lastName: string } | null;
    job?: { id: string; title: string } | null;
  } | null;
};

type InterviewOption = { id: string; label: string };

type FormState = {
  interview_id: string;
  technical_rating: string;
  communication_rating: string;
  cultural_fit_rating: string;
  overall_rating: string;
  strengths: string;
  improvements: string;
  notes: string;
  recommendation: string;
};

const blankForm: FormState = {
  interview_id: "",
  technical_rating: "",
  communication_rating: "",
  cultural_fit_rating: "",
  overall_rating: "",
  strengths: "",
  improvements: "",
  notes: "",
  recommendation: "",
};

export default function RecruitmentInterviewFeedbacksAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-recruitment");

  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const [rows, setRows] = React.useState<FeedbackRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const perPage = 15;
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(blankForm);
  const [interviewOptions, setInterviewOptions] = React.useState<InterviewOption[]>([]);

  async function load(p = page) {
    setLoading(true);
    try {
      const r = await fetch(`/api/recruitment/interview-feedbacks?page=${p}&per_page=${perPage}`, { cache: "no-store" });
      const d = await r.json();
      setRows(d.data ?? []);
      setTotal(d.total ?? 0);
    } catch { toast.error(t("Failed to load")); } finally { setLoading(false); }
  }

  async function loadInterviews() {
    try {
      const r = await fetch("/api/recruitment/interviews?per_page=100", { cache: "no-store" });
      const d = await r.json();
      const opts: InterviewOption[] = (d.data ?? []).map((iv: { id: string; candidate?: { firstName: string; lastName: string } | null; job?: { title: string } | null; scheduledDate?: string }) => ({
        id: String(iv.id),
        label: [
          iv.candidate ? `${iv.candidate.firstName} ${iv.candidate.lastName}` : "Unknown",
          iv.job?.title,
          iv.scheduledDate,
        ].filter(Boolean).join(" — "),
      }));
      setInterviewOptions(opts);
    } catch { /* ignore */ }
  }

  React.useEffect(() => { void load(); }, []); // eslint-disable-line

  function openCreate() {
    setMode("add"); setEditId(null); setForm(blankForm); setOpen(true);
    void loadInterviews();
  }

  function openEdit(row: FeedbackRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      interview_id: row.interviewId ?? "",
      technical_rating: row.technicalRating?.toString() ?? "",
      communication_rating: row.communicationRating?.toString() ?? "",
      cultural_fit_rating: row.culturalFitRating?.toString() ?? "",
      overall_rating: row.overallRating?.toString() ?? "",
      strengths: row.strengths ?? "",
      improvements: row.improvements ?? "",
      notes: row.notes ?? "",
      recommendation: row.recommendation ?? "",
    });
    setOpen(true);
    void loadInterviews();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    const payload = {
      interview_id: form.interview_id || null,
      technical_rating: form.technical_rating ? Number(form.technical_rating) : null,
      communication_rating: form.communication_rating ? Number(form.communication_rating) : null,
      cultural_fit_rating: form.cultural_fit_rating ? Number(form.cultural_fit_rating) : null,
      overall_rating: form.overall_rating ? Number(form.overall_rating) : null,
      strengths: form.strengths || null,
      improvements: form.improvements || null,
      notes: form.notes || null,
      recommendation: form.recommendation || null,
    };
    try {
      const url = mode === "add" ? "/api/recruitment/interview-feedbacks" : `/api/recruitment/interview-feedbacks/${editId}`;
      const method = mode === "add" ? "POST" : "PUT";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      toast.success(mode === "add" ? t("Feedback created") : t("Feedback updated"));
      setOpen(false);
      await load();
    } catch { toast.error(t("Failed to save")); } finally { setProcessing(false); }
  }

  async function handleDelete(id: string) {
    if (!(await appConfirm(t("Delete this feedback?")))) return;
    const res = await fetch(`/api/recruitment/interview-feedbacks/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success(t("Deleted")); await load(); }
    else toast.error(t("Failed to delete"));
  }

  const totalPages = Math.ceil(total / perPage);

  const f = (k: keyof FormState) => (v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{total} {t("record(s)")}</span>
        {can("manage-interview-feedbacks") && (
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />{t("Add Feedback")}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Interview / Candidate")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Job")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Overall Rating")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Recommendation")}</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">{t("Loading...")}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">{t("No interview feedbacks yet")}</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {row.interview?.candidate
                        ? `${row.interview.candidate.firstName} ${row.interview.candidate.lastName}`
                        : <span className="text-muted-foreground">—</span>}
                    </div>
                    {row.interview?.scheduledDate && (
                      <div className="text-xs text-muted-foreground">{fmtDate(row.interview?.scheduledDate)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{row.interview?.job?.title ?? "—"}</td>
                  <td className="px-4 py-3">
                    {row.overallRating != null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{row.overallRating}/10</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: Math.min(10, row.overallRating) }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">{recommendationBadge(row.recommendation)}</td>
                  <td className="px-4 py-3 text-right">
                    <TableActionButton
                      label={t("Edit")}
                      onPrimaryClick={can("manage-interview-feedbacks") ? () => openEdit(row) : undefined}
                      items={[
                        { label: t("Edit"), onSelect: () => openEdit(row), icon: <Edit className="h-4 w-4" />, disabled: !can("manage-interview-feedbacks") },
                        { label: t("Delete"), onSelect: () => handleDelete(row.id), icon: <Trash2 className="h-4 w-4" />, destructive: true, disabled: !can("manage-interview-feedbacks") },
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
        <SheetContent className="w-full sm:max-w-[560px] overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{mode === "add" ? t("Add Interview Feedback") : t("Edit Interview Feedback")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="px-6 py-5 space-y-4 flex-1">
              <div className="space-y-1.5">
                <Label>{t("Interview")}</Label>
                <Select value={form.interview_id || "__none__"} onValueChange={(v) => f("interview_id")(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder={t("Select interview")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("— None —")}</SelectItem>
                    {interviewOptions.map((iv) => <SelectItem key={iv.id} value={iv.id}>{iv.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <RatingInput label={t("Technical Rating")} value={form.technical_rating} onChange={f("technical_rating")} />
                <RatingInput label={t("Communication Rating")} value={form.communication_rating} onChange={f("communication_rating")} />
                <RatingInput label={t("Cultural Fit Rating")} value={form.cultural_fit_rating} onChange={f("cultural_fit_rating")} />
                <RatingInput label={t("Overall Rating")} value={form.overall_rating} onChange={f("overall_rating")} />
              </div>

              <div className="space-y-1.5">
                <Label>{t("Recommendation")}</Label>
                <Select value={form.recommendation || "__none__"} onValueChange={(v) => f("recommendation")(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder={t("Select recommendation")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("— None —")}</SelectItem>
                    {RECOMMENDATIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("Strengths")}</Label>
                <textarea rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" value={form.strengths} onChange={(e) => f("strengths")(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Areas for Improvement")}</Label>
                <textarea rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" value={form.improvements} onChange={(e) => f("improvements")(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Additional Notes")}</Label>
                <textarea rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" value={form.notes} onChange={(e) => f("notes")(e.target.value)} />
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
