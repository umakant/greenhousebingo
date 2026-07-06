"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, Edit, TrendingUp, Search, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Textarea } from "@/components/ui/textarea";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { formatCrmLeadFullName } from "@/lib/crm-lead-name";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


const STATUS_OPTIONS = ["open", "won", "lost"];

type Stage = { id: string; name: string; color: string };
type Pipeline = { id: string; name: string; stages: Stage[] };
type LeadOption = { id: string; name: string };
type DealRow = {
  id: string; name: string; amount: string | null; status: string; closeDate: string | null; notes: string | null;
  pipelineId: string | null; stageId: string | null; leadId: string | null; createdAt: string;
  pipeline?: { id: string; name: string } | null;
  stage?: { id: string; name: string; color: string } | null;
  lead?: { id: string; firstName: string; lastName: string | null; email: string } | null;
};

const emptyForm = {
  name: "", amount: "", status: "open", close_date: "", notes: "",
  pipeline_id: "", stage_id: "", lead_id: "",
};

export default function CrmDealsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-crm");
  const { settings } = useAppSettings();
  const fmtCurrency = (v: string | null | undefined) => formatCurrency(Number(v) || 0, settings);
  const fmtDate = (d: string | null | undefined) => formatDate(d, settings);
  const [rows, setRows] = React.useState<DealRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [form, setForm] = React.useState({ ...emptyForm });
  const [pipelines, setPipelines] = React.useState<Pipeline[]>([]);
  const [stages, setStages] = React.useState<Stage[]>([]);
  const [leads, setLeads] = React.useState<LeadOption[]>([]);
  const perPage = 15;

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (search) params.set("search", search);
      const r = await fetch(`/api/crm/deals?${params}`, { cache: "no-store", credentials: "include" });
      const d = await r.json();
      setRows(d.data ?? []); setTotal(d.pagination?.total ?? 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function loadMeta() {
    const [pl, ld] = await Promise.all([
      fetch("/api/crm/pipelines", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/crm/leads?per_page=100", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setPipelines(pl.data ?? []);
    setLeads((ld.data ?? []).map((l: any) => ({ id: l.id, name: formatCrmLeadFullName(l.firstName, l.lastName) })));
  }

  React.useEffect(() => { void load(); }, [page, search]); // eslint-disable-line
  React.useEffect(() => { void loadMeta(); }, []); // eslint-disable-line

  React.useEffect(() => {
    if (form.pipeline_id) {
      const p = pipelines.find((p) => p.id === form.pipeline_id);
      setStages(p?.stages ?? []);
    } else { setStages([]); }
  }, [form.pipeline_id, pipelines]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  function openCreate() {
    setMode("add"); setEditId(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(row: DealRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      name: row.name, amount: row.amount ?? "", status: row.status,
      close_date: row.closeDate ? row.closeDate.substring(0, 10) : "",
      notes: row.notes ?? "",
      pipeline_id: row.pipelineId ?? "", stage_id: row.stageId ?? "", lead_id: row.leadId ?? "",
    });
    if (row.pipelineId) {
      const p = pipelines.find((p) => p.id === row.pipelineId);
      setStages(p?.stages ?? []);
    }
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setProcessing(true);
    try {
      const url = mode === "add" ? "/api/crm/deals" : `/api/crm/deals/${editId}`;
      const method = mode === "add" ? "POST" : "PUT";
      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await r.json().catch(() => ({}));
      if (r.ok) {
        toast.success(mode === "add" ? t("Deal created") : t("Deal saved"));
        setOpen(false);
        void load();
      } else {
        const msg = typeof json.message === "string" ? json.message : json.error ?? t("Failed to save deal");
        toast.error(msg);
      }
    } finally { setProcessing(false); }
  }

  async function del(id: string) {
    if (!(await appConfirm(t("Delete this deal?")))) return;
    await fetch(`/api/crm/deals/${id}`, { method: "DELETE", credentials: "include" });
    void load();
  }

  const sf = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const statusColor: Record<string, "default" | "outline"> = { open: "default", won: "default", lost: "outline" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5" />{t("Deals")}</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("Search...")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8 w-48" />
          </div>
          {can("create-deals") && (
            <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{t("New Deal")}</Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium">{t("Name")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">{t("Lead")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Status")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">{t("Stage")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">{t("Amount")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">{t("Close Date")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">{t("Loading...")}</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground"><TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />{t("No deals found.")}</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {row.lead ? formatCrmLeadFullName(row.lead.firstName, row.lead.lastName) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status === "open" ? "default" : "outline"} className="capitalize">{row.status}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {row.stage ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Circle className="h-2.5 w-2.5" style={{ fill: row.stage.color, color: row.stage.color }} />
                          {row.stage.name}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {row.amount ? fmtCurrency(row.amount) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {fmtDate(row.closeDate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(can("edit-deals") || can("delete-deals")) && (
                        <TableActionButton
                          label={t("Actions")}
                          onPrimaryClick={() => openEdit(row)}
                          items={[
                            can("edit-deals") ? { label: t("Edit"), icon: <Edit className="h-4 w-4" />, onSelect: () => openEdit(row) } : null,
                            can("delete-deals") ? { label: t("Delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => del(row.id), destructive: true } : null,
                          ].filter(Boolean) as any[]}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
              <span>{t("Page")} {page} / {totalPages} ({total})</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{mode === "add" ? t("New Deal") : t("Edit Deal")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label required>{t("Deal Name")}</Label>
              <Input value={form.name} onChange={sf("name")} placeholder={t("e.g. Enterprise Contract")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("Amount")} ({String(settings.currencySymbol ?? "").trim() || "$"})</Label>
                <Input type="number" min="0" value={form.amount} onChange={sf("amount")} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("Pipeline")}</Label>
                <Select value={form.pipeline_id || "__none__"} onValueChange={(v) => setForm((p) => ({ ...p, pipeline_id: v === "__none__" ? "" : v, stage_id: "" }))}>
                  <SelectTrigger><SelectValue placeholder={t("Select pipeline")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("None")}</SelectItem>
                    {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Stage")}</Label>
                <Select value={form.stage_id || "__none__"} onValueChange={(v) => setForm((p) => ({ ...p, stage_id: v === "__none__" ? "" : v }))} disabled={stages.length === 0}>
                  <SelectTrigger><SelectValue placeholder={t("Select stage")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("None")}</SelectItem>
                    {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Related Lead")}</Label>
              <Select value={form.lead_id || "__none__"} onValueChange={(v) => setForm((p) => ({ ...p, lead_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder={t("Select lead (optional)")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("None")}</SelectItem>
                  {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Close Date")}</Label>
              <Input type="date" value={form.close_date} onChange={sf("close_date")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Notes")}</Label>
              <Textarea value={form.notes} onChange={sf("notes")} placeholder={t("Additional notes...")} rows={3} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={processing || !form.name.trim()} className="flex-1">
                {processing ? t("Saving...") : t("Save")}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
