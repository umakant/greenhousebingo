"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t } from "@/lib/admin-t";


const QTYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
];

type QRow = { id: string; questionName: string; questionType: string; availableAnswers: string; requiredAnswer: boolean; enabled: boolean };

export default function AppointmentQuestionsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-appointment");
  const [rows, setRows] = React.useState<QRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [form, setForm] = React.useState({
    question_name: "",
    question_type: "text",
    available_answers: "",
    required_answer: false,
    enabled: true,
  });
  const perPage = 15;

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/appointment/questions?page=${page}&per_page=${perPage}`, { cache: "no-store" });
      const d = await r.json();
      setRows(d.data ?? []); setTotal(d.total ?? 0);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  React.useEffect(() => { void load(); }, [page]); // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function openCreate() {
    setMode("add"); setEditId(null);
    setForm({ question_name: "", question_type: "text", available_answers: "", required_answer: false, enabled: true });
    setOpen(true);
  }

  function openEdit(row: QRow) {
    setMode("edit"); setEditId(row.id);
    setForm({ question_name: row.questionName, question_type: row.questionType, available_answers: row.availableAnswers ?? "", required_answer: row.requiredAnswer, enabled: row.enabled });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setProcessing(true); setError(null);
    try {
      const body = { question_name: form.question_name, question_type: form.question_type, available_answers: form.available_answers, required_answer: form.required_answer, enabled: form.enabled };
      const url = mode === "add" ? "/api/appointment/questions" : `/api/appointment/questions/${editId}`;
      const res = await fetch(url, { method: mode === "add" ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Save failed");
      setOpen(false); await load();
    } catch (err: any) { setError(err.message); } finally { setProcessing(false); }
  }

  async function del(id: string) {
    if (!(await appConfirm(t("Delete this question?")))) return;
    const res = await fetch(`/api/appointment/questions/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json().catch(() => null); setError(j?.error || "Delete failed"); return; }
    await load();
  }

  const qtypeLabel = (v: string) => QTYPES.find(q => q.value === v)?.label ?? v;
  const showAnswers = ["select", "radio", "checkbox"].includes(form.question_type);

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      <Card className="shadow-sm">
        <CardContent className="p-4 border-b bg-gray-50/50">
          <div className="flex justify-end">
            {can("create-questions") ? <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />{t("Add Question")}</Button> : null}
          </div>
        </CardContent>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left font-medium px-4 py-3">{t("Question")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Type")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Required")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Status")}</th>
                  <th className="text-right font-medium px-4 py-3">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">{t("Loading...")}</td></tr>
                  : rows.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <HelpCircle className="h-10 w-10 text-gray-300" />
                        <div>{t("No questions yet")}</div>
                      </div>
                    </td></tr>
                  ) : rows.map(row => (
                    <tr key={row.id} className="border-b hover:bg-accent/20">
                      <td className="px-4 py-3 font-medium">{row.questionName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{qtypeLabel(row.questionType)}</td>
                      <td className="px-4 py-3">{row.requiredAnswer ? <Badge variant="default" className="text-xs">{t("Yes")}</Badge> : <span className="text-muted-foreground text-xs">{t("No")}</span>}</td>
                      <td className="px-4 py-3">{row.enabled ? <Badge variant="default">{t("Enabled")}</Badge> : <Badge variant="secondary">{t("Disabled")}</Badge>}</td>
                      <td className="px-4 py-3 text-right">
                        {(can("edit-questions") || can("delete-questions")) && (
                          <TableActionButton label={t("Edit")} onPrimaryClick={can("edit-questions") ? () => openEdit(row) : undefined}
                            items={[
                              { label: t("Edit"), onSelect: () => openEdit(row), disabled: !can("edit-questions") },
                              { label: t("Delete"), onSelect: () => del(row.id), disabled: !can("delete-questions"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
                            ]} />
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardContent className="px-4 py-2 border-t bg-gray-50/30">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">{from}–{to} {t("of")} {total}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>{t("Prev")}</Button>
              <Button variant="secondary" size="sm" className="min-w-8" disabled>{page}</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>{t("Next")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{mode === "add" ? t("Add Question") : t("Edit Question")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={save} className="flex flex-col flex-1">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-2">
                <Label required>{t("Question")}</Label>
                <Input value={form.question_name} onChange={e => setForm(p => ({ ...p, question_name: e.target.value }))} required placeholder="e.g. What is your concern?" />
              </div>
              <div className="space-y-2">
                <Label>{t("Answer Type")}</Label>
                <Select value={form.question_type} onValueChange={v => setForm(p => ({ ...p, question_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{QTYPES.map(q => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {showAnswers && (
                <div className="space-y-2">
                  <Label>{t("Available Answers")} <span className="text-muted-foreground text-xs">(one per line)</span></Label>
                  <Textarea value={form.available_answers} onChange={e => setForm(p => ({ ...p, available_answers: e.target.value }))} rows={4} placeholder={"Option 1\nOption 2\nOption 3"} />
                </div>
              )}
              <div className="flex items-center gap-3">
                <Switch checked={form.required_answer} onCheckedChange={v => setForm(p => ({ ...p, required_answer: v }))} id="required_answer" />
                <Label htmlFor="required_answer">{t("Required")}</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.enabled} onCheckedChange={v => setForm(p => ({ ...p, enabled: v }))} id="q_enabled" />
                <Label htmlFor="q_enabled">{t("Enabled")}</Label>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-2 bg-background">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
              <Button type="submit" disabled={processing}>{processing ? t("Saving...") : mode === "add" ? t("Create") : t("Update")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
