"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, Edit, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";


const OFFER_STATUSES = [
  { value: "0", label: "Pending" }, { value: "1", label: "Accepted" }, { value: "2", label: "Rejected" },
  { value: "3", label: "Withdrawn" }, { value: "4", label: "Expired" },
];
const APPROVAL_STATUSES = ["pending", "approved", "rejected"];
const STATUS_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  "0": "secondary", "1": "default", "2": "destructive", "3": "outline", "4": "destructive",
};

type Candidate = { id: string; firstName: string; lastName: string };
type JobPosting = { id: string; title: string };
type OfferRow = {
  id: string; candidateId: string; jobId: string | null; position: string; salary: string;
  offerDate: string; startDate: string; expirationDate: string; status: string; approvalStatus: string;
  candidate?: { id: string; firstName: string; lastName: string } | null;
  job?: { id: string; title: string } | null;
};

export default function RecruitmentOffersAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-recruitment");
  const { settings } = useAppSettings();
  const fmtCurrency = (v: unknown) => formatCurrency(Number(v) || 0, settings);
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const [rows, setRows] = React.useState<OfferRow[]>([]);
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
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = React.useState({
    candidate_id: "", job_id: "", position: "", salary: "", bonus: "", benefits: "",
    offer_date: today, start_date: today, expiration_date: "", status: "0", approval_status: "pending",
  });
  const perPage = 15;

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (filterStatus) params.set("status", filterStatus);
      const r = await fetch(`/api/recruitment/offers?${params}`, { cache: "no-store" });
      const d = await r.json();
      setRows(d.data ?? []); setTotal(d.total ?? 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function loadMeta() {
    const [cand, jp] = await Promise.all([
      fetch("/api/recruitment/candidates?per_page=100", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/recruitment/job-postings?per_page=100", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setCandidates(cand.data ?? []); setJobPostings(jp.data ?? []);
  }

  React.useEffect(() => { void load(); }, [page, filterStatus]); // eslint-disable-line
  React.useEffect(() => { void loadMeta(); }, []); // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function openCreate() {
    setMode("add"); setEditId(null);
    setForm({ candidate_id: "", job_id: "", position: "", salary: "", bonus: "", benefits: "", offer_date: today, start_date: today, expiration_date: "", status: "0", approval_status: "pending" });
    setOpen(true);
  }

  function openEdit(row: OfferRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      candidate_id: row.candidateId, job_id: row.jobId ?? "", position: row.position, salary: row.salary,
      bonus: "", benefits: "", offer_date: row.offerDate?.split("T")[0] ?? today,
      start_date: row.startDate?.split("T")[0] ?? today, expiration_date: row.expirationDate?.split("T")[0] ?? "",
      status: row.status, approval_status: row.approvalStatus,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setProcessing(true);
    const payload = {
      candidate_id: form.candidate_id, job_id: form.job_id || null, position: form.position,
      salary: Number(form.salary), bonus: form.bonus ? Number(form.bonus) : null,
      benefits: form.benefits || null, offer_date: form.offer_date, start_date: form.start_date,
      expiration_date: form.expiration_date, status: form.status, approval_status: form.approval_status,
    };
    try {
      if (mode === "add") {
        await fetch("/api/recruitment/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch(`/api/recruitment/offers/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      setOpen(false); await load();
    } catch (e) { console.error(e); } finally { setProcessing(false); }
  }

  async function handleDelete(id: string) {
    if (!(await appConfirm(t("Delete this offer?")))) return;
    await fetch(`/api/recruitment/offers/${id}`, { method: "DELETE" });
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
              {OFFER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {can("manage-offers") && (
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{t("Create Offer")}</Button>
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Position")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Salary")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Start Date")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Expires")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Status")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("Action")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">{t("Loading...")}</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />{t("No offers found")}
                  </td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{row.candidate ? `${row.candidate.firstName} ${row.candidate.lastName}` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{row.job?.title ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{row.position}</td>
                    <td className="px-4 py-3 text-xs">{fmtCurrency(row.salary)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(row.startDate)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(row.expirationDate)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[row.status] ?? "secondary"}>
                        {OFFER_STATUSES.find((s) => s.value === row.status)?.label ?? row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {can("manage-offers") && (
                        <TableActionButton
                          label={t("Edit")}
                          onPrimaryClick={() => openEdit(row)}
                          items={[
                            { label: t("Edit"), onSelect: () => openEdit(row), icon: <Edit className="h-4 w-4" /> },
                            { label: t("Delete"), onSelect: () => handleDelete(row.id), icon: <Trash2 className="h-4 w-4" />, destructive: true },
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
            <SheetTitle>{mode === "add" ? t("Create Offer") : t("Edit Offer")}</SheetTitle>
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
              <div className="space-y-1.5">
                <Label required>{t("Position / Role")}</Label>
                <Input required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder={t("e.g. Senior Developer")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label required>{t("Salary")}</Label>
                  <Input type="number" required min={0} step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Bonus")}</Label>
                  <Input type="number" min={0} step="0.01" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Offer Date")}</Label>
                  <Input type="date" value={form.offer_date} onChange={(e) => setForm({ ...form, offer_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label required>{t("Start Date")}</Label>
                  <Input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label required>{t("Expires")}</Label>
                  <Input type="date" required value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Status")}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OFFER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Approval")}</Label>
                  <Select value={form.approval_status} onValueChange={(v) => setForm({ ...form, approval_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {APPROVAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Benefits")}</Label>
                <textarea rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} placeholder={t("Benefits included...")} />
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-2 bg-background">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
              <Button type="submit" disabled={processing}>{processing ? t("Saving...") : mode === "add" ? t("Create Offer") : t("Save Changes")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
