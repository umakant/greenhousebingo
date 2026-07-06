"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, Edit, UserCheck, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Switch } from "@/components/ui/switch";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";


const ONBOARDING_STATUSES = ["Pending", "In Progress", "Completed"];
const STATUS_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  "Pending": "secondary", "In Progress": "default", "Completed": "default",
};

type Candidate = { id: string; firstName: string; lastName: string };
type Checklist = { id: string; name: string; items?: ChecklistItem[] };
type ChecklistItem = { id: string; taskName: string; category: string | null; isRequired: boolean; status: boolean };
type OnboardingRow = {
  id: string; startDate: string; status: string; candidateId: string; checklistId: string;
  candidate?: { id: string; firstName: string; lastName: string } | null;
  checklist?: { id: string; name: string } | null;
};

export default function RecruitmentOnboardingAdmin({
  permissions,
  initialTab = "onboardings",
}: {
  permissions: string[];
  initialTab?: "onboardings" | "checklists";
}) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-recruitment");
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const [tab, setTab] = React.useState<"onboardings" | "checklists">(initialTab);
  const [rows, setRows] = React.useState<OnboardingRow[]>([]);
  const [checklists, setChecklists] = React.useState<Checklist[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = React.useState({ candidate_id: "", checklist_id: "", start_date: today, status: "Pending" });
  const [clForm, setClForm] = React.useState({ name: "", description: "", is_default: false, status: true });
  const perPage = 15;

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage), tab });
      const r = await fetch(`/api/recruitment/onboarding?${params}`, { cache: "no-store" });
      const d = await r.json();
      if (tab === "checklists") { setChecklists(d.data ?? []); setTotal(d.total ?? 0); }
      else { setRows(d.data ?? []); setTotal(d.total ?? 0); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function loadMeta() {
    const cand = await fetch("/api/recruitment/candidates?per_page=100", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] }));
    setCandidates(cand.data ?? []);
    const cl = await fetch("/api/recruitment/onboarding?tab=checklists&per_page=100", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] }));
    setChecklists(cl.data ?? []);
  }

  React.useEffect(() => { void load(); }, [page, tab]); // eslint-disable-line
  React.useEffect(() => { void loadMeta(); }, []); // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function openCreate() {
    setMode("add"); setEditId(null);
    if (tab === "checklists") setClForm({ name: "", description: "", is_default: false, status: true });
    else setForm({ candidate_id: "", checklist_id: "", start_date: today, status: "Pending" });
    setOpen(true);
  }

  function openEditRow(row: OnboardingRow) {
    setMode("edit"); setEditId(row.id);
    setForm({ candidate_id: row.candidateId, checklist_id: row.checklistId, start_date: row.startDate?.split("T")[0] ?? today, status: row.status });
    setOpen(true);
  }

  function openEditChecklist(cl: Checklist) {
    setMode("edit"); setEditId(cl.id);
    setClForm({ name: cl.name, description: "", is_default: false, status: true });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setProcessing(true);
    const payload = tab === "checklists"
      ? { type: "checklist", ...clForm }
      : { candidate_id: form.candidate_id, checklist_id: form.checklist_id, start_date: form.start_date, status: form.status };
    try {
      if (mode === "add") {
        await fetch("/api/recruitment/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch(`/api/recruitment/onboarding/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: tab === "checklists" ? "checklist" : "onboarding", ...payload }) });
      }
      setOpen(false); await load(); await loadMeta();
    } catch (e) { console.error(e); } finally { setProcessing(false); }
  }

  async function handleDelete(id: string, isChecklist = false) {
    if (!(await appConfirm(t("Delete this record?")))) return;
    await fetch(`/api/recruitment/onboarding/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: isChecklist ? "checklist" : "onboarding" }) });
    await load(); await loadMeta();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 border rounded-lg p-1">
          <Button variant={tab === "onboardings" ? "default" : "ghost"} size="sm" onClick={() => { setTab("onboardings"); setPage(1); }}>
            <UserCheck className="h-4 w-4 mr-1" />{t("Onboardings")}
          </Button>
          <Button variant={tab === "checklists" ? "default" : "ghost"} size="sm" onClick={() => { setTab("checklists"); setPage(1); }}>
            <List className="h-4 w-4 mr-1" />{t("Checklists")}
          </Button>
        </div>
        {can("manage-candidate-onboardings") && (
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{tab === "checklists" ? t("Add Checklist") : t("Start Onboarding")}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {tab === "onboardings" ? (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Candidate")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Checklist")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Start Date")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Status")}</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">{t("Loading...")}</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">
                      <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />{t("No onboarding records")}
                    </td></tr>
                  ) : rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{row.candidate ? `${row.candidate.firstName} ${row.candidate.lastName}` : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{row.checklist?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(row.startDate)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE[row.status] ?? "secondary"}>{row.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <TableActionButton
                          label={t("Edit")}
                          onPrimaryClick={() => openEditRow(row)}
                          items={[
                            { label: t("Edit"), onSelect: () => openEditRow(row), icon: <Edit className="h-4 w-4" /> },
                            { label: t("Delete"), onSelect: () => handleDelete(row.id), icon: <Trash2 className="h-4 w-4" />, destructive: true },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Checklist Name")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("Items")}</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">{t("Loading...")}</td></tr>
                  ) : checklists.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">
                      <List className="h-8 w-8 mx-auto mb-2 opacity-30" />{t("No checklists yet")}
                    </td></tr>
                  ) : checklists.map((cl) => (
                    <tr key={cl.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{cl.name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{cl.items?.length ?? 0} items</td>
                      <td className="px-4 py-3 text-right">
                        <TableActionButton
                          label={t("Edit")}
                          onPrimaryClick={() => openEditChecklist(cl)}
                          items={[
                            { label: t("Edit"), onSelect: () => openEditChecklist(cl), icon: <Edit className="h-4 w-4" /> },
                            { label: t("Delete"), onSelect: () => handleDelete(cl.id, true), icon: <Trash2 className="h-4 w-4" />, destructive: true },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
            <SheetTitle>{tab === "checklists" ? (mode === "add" ? t("Add Checklist") : t("Edit Checklist")) : (mode === "add" ? t("Start Onboarding") : t("Edit Onboarding"))}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="px-6 py-5 space-y-4 flex-1">
              {tab === "checklists" ? (
                <>
                  <div className="space-y-1.5">
                    <Label required>{t("Checklist Name")}</Label>
                    <Input required value={clForm.name} onChange={(e) => setClForm({ ...clForm, name: e.target.value })} placeholder={t("e.g. Standard Onboarding")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("Description")}</Label>
                    <textarea rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" value={clForm.description} onChange={(e) => setClForm({ ...clForm, description: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="cl-default" checked={clForm.is_default} onCheckedChange={(v) => setClForm({ ...clForm, is_default: v })} />
                    <Label htmlFor="cl-default">{t("Set as Default")}</Label>
                  </div>
                </>
              ) : (
                <>
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
                    <Label required>{t("Checklist")}</Label>
                    <Select value={form.checklist_id} onValueChange={(v) => setForm({ ...form, checklist_id: v })}>
                      <SelectTrigger><SelectValue placeholder={t("Select checklist")} /></SelectTrigger>
                      <SelectContent>
                        {checklists.map((cl) => <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("Start Date")}</Label>
                      <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("Status")}</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ONBOARDING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
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
