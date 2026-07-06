"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit, Eye, Users, Search, ChevronLeft, ChevronRight, Circle, LayoutGrid, LayoutList, UserPlus, CheckCircle2, Copy } from "lucide-react";
import { CrmLeadsKanban, type LeadRow } from "@/components/crm/crm-leads-kanban";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { formatPhone, formatPhoneDisplay, unformatPhone } from "@/lib/phone";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Textarea } from "@/components/ui/textarea";
import { useAppSettings } from "@/contexts/app-settings-context";
import {
  formatCurrency,
  parseCurrencyToNumber,
  filterMoneyDecimalInput,
} from "@/lib/format-currency";
import { formatCrmLeadFullName } from "@/lib/crm-lead-name";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


const STATUS_OPTIONS = ["new", "contacted", "qualified", "unqualified", "converted", "lost"];
const SOURCE_OPTIONS = ["website", "referral", "social_media", "email", "phone", "other"];
type Stage = { id: string; name: string; color: string; order?: number };
type Pipeline = { id: string; name: string; stages: Stage[]; isDefault?: boolean };

const emptyForm = {
  first_name: "", last_name: "", email: "", phone: "", company: "", source: "", status: "new",
  value: "", notes: "", pipeline_id: "", stage_id: "",
};

const emptyConvertForm = {
  company_name: "",
  contact_person_name: "",
  contact_person_email: "",
  contact_person_mobile: "",
  notes: "",
  mark_converted: true,
};

export default function CrmLeadsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-crm");
  const canCreateCustomer =
    permissions.includes("*") ||
    permissions.includes("manage-customers") ||
    permissions.includes("create-customers");
  const router = useRouter();
  const { settings } = useAppSettings();
  const fmtCurrency = (v: string | null | undefined) => formatCurrency(Number(v) || 0, settings);
  const decimalPlaces = React.useMemo(() => {
    const d = parseInt(String(settings.decimalFormat ?? "2").trim() || "2", 10);
    return Math.min(10, Math.max(0, Number.isFinite(d) ? d : 2));
  }, [settings.decimalFormat]);
  const [rows, setRows] = React.useState<LeadRow[]>([]);
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
  const [listView, setListView] = React.useState<"table" | "board">("table");
  const [boardRefresh, setBoardRefresh] = React.useState(0);
  const [convertOpen, setConvertOpen] = React.useState(false);
  const [convertLead, setConvertLead] = React.useState<LeadRow | null>(null);
  const [convertForm, setConvertForm] = React.useState({ ...emptyConvertForm });
  const [converting, setConverting] = React.useState(false);
  const [convertResult, setConvertResult] = React.useState<
    { customerCode?: string; portalPassword?: string; welcomeSent?: boolean } | null
  >(null);
  const perPage = 15;

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (search) params.set("search", search);
      const r = await fetch(`/api/crm/leads?${params}`, { cache: "no-store", credentials: "include" });
      const d = await r.json();
      if (!r.ok) {
        const msg = typeof d.message === "string" ? d.message : t("Could not load leads");
        toast.error(msg);
        setRows([]);
        setTotal(0);
        return;
      }
      setRows(d.data ?? []);
      setTotal(d.pagination?.total ?? 0);
    } catch (e) {
      console.error(e);
      toast.error(t("Could not load leads"));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function loadPipelines() {
    const r = await fetch("/api/crm/pipelines", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] }));
    setPipelines(r.data ?? []);
  }

  React.useEffect(() => {
    void load();
  }, [page, search]);
  React.useEffect(() => {
    void loadPipelines();
  }, []);

  React.useEffect(() => {
    if (form.pipeline_id) {
      const p = pipelines.find((p) => p.id === form.pipeline_id);
      setStages(p?.stages ?? []);
    } else {
      setStages([]);
    }
  }, [form.pipeline_id, pipelines]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  function openCreate() {
    setMode("add"); setEditId(null);
    const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
    const firstStage = def?.stages?.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
    setForm({
      ...emptyForm,
      pipeline_id: def?.id ?? "",
      stage_id: firstStage?.id ?? "",
    });
    setStages(def?.stages ?? []);
    setOpen(true);
  }

  function openEdit(row: LeadRow) {
    setMode("edit"); setEditId(row.id);
    const valueStr =
      row.value != null && row.value !== "" && Number.isFinite(Number(row.value))
        ? formatCurrency(Number(row.value), settings)
        : "";
    setForm({
      first_name: row.firstName ?? "",
      last_name: row.lastName ?? "",
      email: row.email ?? "", phone: formatPhone(row.phone ?? ""),
      company: row.company ?? "", source: row.source ?? "", status: row.status,
      value: valueStr,
      notes: row.notes ?? "",
      pipeline_id: row.pipelineId ?? "", stage_id: row.stageId ?? "",
    });
    if (row.pipelineId) {
      const p = pipelines.find((p) => p.id === row.pipelineId);
      setStages(p?.stages ?? []);
    }
    setOpen(true);
  }

  async function save() {
    if (!form.first_name.trim()) return;
    setProcessing(true);
    try {
      const url = mode === "add" ? "/api/crm/leads" : `/api/crm/leads/${editId}`;
      const method = mode === "add" ? "POST" : "PUT";
      let valueNum: number | null = null;
      if (form.value.trim() !== "") {
        const n = parseCurrencyToNumber(form.value, settings);
        if (!Number.isFinite(n) || n < 0) {
          toast.error(t("Enter a valid value"));
          return;
        }
        valueNum = n;
      }
      const payload = {
        ...form,
        phone: unformatPhone(form.phone).trim() || null,
        value: valueNum,
      };
      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await r.json().catch(() => ({}));
      if (r.ok) {
        toast.success(mode === "add" ? t("Lead created") : t("Lead saved"));
        setOpen(false);
        void load();
        void loadPipelines();
        setBoardRefresh((x) => x + 1);
      } else {
        const msg = typeof json.message === "string" ? json.message : json.error ?? t("Failed to save lead");
        toast.error(msg);
      }
    } finally { setProcessing(false); }
  }

  async function del(id: string) {
    if (!(await appConfirm(t("Delete this lead?")))) return;
    await fetch(`/api/crm/leads/${id}`, { method: "DELETE", credentials: "include" });
    void load();
    setBoardRefresh((x) => x + 1);
  }

  function openConvert(row: LeadRow) {
    const full = formatCrmLeadFullName(row.firstName, row.lastName);
    setConvertLead(row);
    setConvertResult(null);
    setConvertForm({
      company_name: row.company ?? "",
      contact_person_name: full === "—" ? (row.firstName ?? "") : full,
      contact_person_email: row.email ?? "",
      contact_person_mobile: formatPhone(row.phone ?? ""),
      notes: row.notes ?? "",
      mark_converted: true,
    });
    setConvertOpen(true);
  }

  async function submitConvert() {
    if (!convertLead) return;
    if (!convertForm.contact_person_name.trim()) {
      toast.error(t("Contact name is required"));
      return;
    }
    if (!convertForm.contact_person_email.trim()) {
      toast.error(t("Email is required to create a customer"));
      return;
    }
    setConverting(true);
    try {
      const r = await fetch(`/api/crm/leads/${convertLead.id}/convert`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: convertForm.company_name.trim() || undefined,
          contact_person_name: convertForm.contact_person_name.trim(),
          contact_person_email: convertForm.contact_person_email.trim(),
          contact_person_mobile: unformatPhone(convertForm.contact_person_mobile).trim() || undefined,
          notes: convertForm.notes.trim() || undefined,
          mark_converted: convertForm.mark_converted,
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (r.ok && json.ok) {
        toast.success(t("Customer created from lead"));
        setConvertResult({
          customerCode: json.customer_code,
          portalPassword: json.portal_password,
          welcomeSent: json.welcome_email_sent,
        });
        void load();
        setBoardRefresh((x) => x + 1);
      } else {
        const msg = typeof json.message === "string" ? json.message : json.error ?? t("Could not create customer");
        toast.error(msg);
      }
    } catch (e) {
      console.error(e);
      toast.error(t("Could not create customer"));
    } finally {
      setConverting(false);
    }
  }

  const sf = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  const displayName = (row: LeadRow) => formatCrmLeadFullName(row.firstName, row.lastName);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Users className="h-5 w-5" />{t("Leads")}</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex rounded-lg border bg-muted/40 p-1">
            <Button
              type="button"
              variant={listView === "table" ? "default" : "ghost"}
              size="sm"
              className="gap-1"
              onClick={() => setListView("table")}
            >
              <LayoutList className="h-4 w-4" />
              {t("Table")}
            </Button>
            <Button type="button" variant={listView === "board" ? "default" : "ghost"} size="sm" className="gap-1" onClick={() => setListView("board")}>
              <LayoutGrid className="h-4 w-4" />
              {t("Board")}
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("Search...")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 w-full sm:w-48"
            />
          </div>
          {can("create-leads") && (
            <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{t("New Lead")}</Button>
          )}
        </div>
      </div>

      {listView === "board" ? (
        <CrmLeadsKanban key={boardRefresh} permissions={permissions} pipelines={pipelines} search={search} onEdit={openEdit} />
      ) : null}

      {listView === "table" ? (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium">{t("Name")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">{t("Company")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">{t("Source")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Status")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">{t("Stage")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">{t("Value")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">{t("Loading...")}</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-30" />{t("No leads found.")}</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => router.push(`/crm/leads/${row.id}`)}
                        className="text-left font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {displayName(row)}
                      </button>
                      {row.email && <div className="text-xs text-muted-foreground">{row.email}</div>}
                      {row.phone && (
                        <div className="text-xs text-muted-foreground">{formatPhoneDisplay(row.phone)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{row.company ?? "—"}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground capitalize">{row.source?.replace("_", " ") ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">{row.status}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {row.stage ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Circle className="h-2.5 w-2.5" style={{ fill: row.stage.color, color: row.stage.color }} />
                          {row.stage.name}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {row.value ? fmtCurrency(row.value) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <TableActionButton
                          label={t("Actions")}
                          onPrimaryClick={() => router.push(`/crm/leads/${row.id}`)}
                          items={[
                            { label: t("View details"), icon: <Eye className="h-4 w-4" />, onSelect: () => router.push(`/crm/leads/${row.id}`) },
                            ...(can("edit-leads")
                              ? [{ label: t("Edit"), icon: <Edit className="h-4 w-4" />, onSelect: () => openEdit(row) }]
                              : []),
                            ...(canCreateCustomer
                              ? [
                                  {
                                    label:
                                      row.status === "converted"
                                        ? t("Create customer again")
                                        : t("Create customer"),
                                    icon: <UserPlus className="h-4 w-4" />,
                                    onSelect: () => openConvert(row),
                                  },
                                ]
                              : []),
                            ...(can("delete-leads")
                              ? [
                                  {
                                    label: t("Delete"),
                                    icon: <Trash2 className="h-4 w-4" />,
                                    onSelect: () => del(row.id),
                                    destructive: true,
                                  },
                                ]
                              : []),
                          ]}
                        />
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
      ) : null}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{mode === "add" ? t("New Lead") : t("Edit Lead")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label required>{t("First Name")}</Label>
                <Input value={form.first_name} onChange={sf("first_name")} placeholder={t("First name")} autoComplete="given-name" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Last Name")}</Label>
                <Input value={form.last_name} onChange={sf("last_name")} placeholder={t("Last name")} autoComplete="family-name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("Email")}</Label>
                <Input type="email" value={form.email} onChange={sf("email")} placeholder="email@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Phone")}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                  placeholder="(000) 000-0000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Company")}</Label>
              <Input value={form.company} onChange={sf("company")} placeholder={t("Company name")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("Source")}</Label>
                <Select value={form.source} onValueChange={(v) => setForm((p) => ({ ...p, source: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("Select source")} /></SelectTrigger>
                  <SelectContent>{SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
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
              <Label>{t("Value ($)")}</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={form.value}
                onChange={(e) =>
                  setForm((p) => ({ ...p, value: filterMoneyDecimalInput(e.target.value, decimalPlaces) }))
                }
                onBlur={() => {
                  if (form.value.trim() === "") return;
                  const n = parseCurrencyToNumber(form.value, settings);
                  if (Number.isFinite(n)) setForm((p) => ({ ...p, value: formatCurrency(n, settings) }));
                }}
                placeholder={formatCurrency(0, settings)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Notes")}</Label>
              <Textarea value={form.notes} onChange={sf("notes")} placeholder={t("Additional notes...")} rows={3} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={processing || !form.first_name.trim()} className="flex-1">
                {processing ? t("Saving...") : t("Save")}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={convertOpen} onOpenChange={setConvertOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {t("Create customer from lead")}
            </SheetTitle>
          </SheetHeader>

          {convertResult ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    {t("Customer created successfully")}
                  </p>
                  {convertResult.customerCode && (
                    <p className="text-green-700 dark:text-green-300">
                      {t("Customer code")}: <span className="font-mono">{convertResult.customerCode}</span>
                    </p>
                  )}
                  <p className="text-green-700 dark:text-green-300">
                    {convertResult.welcomeSent
                      ? t("A welcome email with portal login was sent.")
                      : t("Customer saved. Welcome email could not be sent — share the password below.")}
                  </p>
                </div>
              </div>

              {convertResult.portalPassword && (
                <div className="space-y-1.5">
                  <Label>{t("Portal password")}</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={convertResult.portalPassword} className="font-mono" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard?.writeText(convertResult.portalPassword ?? "");
                        toast.success(t("Password copied"));
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("Save this now — it won't be shown again.")}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={() => setConvertOpen(false)} className="flex-1">{t("Done")}</Button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("This creates an accounting customer with a client portal login and sends a welcome email.")}
              </p>
              <div className="space-y-1.5">
                <Label>{t("Company name")}</Label>
                <Input
                  value={convertForm.company_name}
                  onChange={(e) => setConvertForm((p) => ({ ...p, company_name: e.target.value }))}
                  placeholder={t("Company name")}
                />
              </div>
              <div className="space-y-1.5">
                <Label required>{t("Contact name")}</Label>
                <Input
                  value={convertForm.contact_person_name}
                  onChange={(e) => setConvertForm((p) => ({ ...p, contact_person_name: e.target.value }))}
                  placeholder={t("Contact person")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label required>{t("Email")}</Label>
                  <Input
                    type="email"
                    value={convertForm.contact_person_email}
                    onChange={(e) => setConvertForm((p) => ({ ...p, contact_person_email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Phone")}</Label>
                  <Input
                    value={convertForm.contact_person_mobile}
                    onChange={(e) => setConvertForm((p) => ({ ...p, contact_person_mobile: formatPhone(e.target.value) }))}
                    placeholder="(000) 000-0000"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Notes")}</Label>
                <Textarea
                  value={convertForm.notes}
                  onChange={(e) => setConvertForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder={t("Additional notes...")}
                  rows={3}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={convertForm.mark_converted}
                  onChange={(e) => setConvertForm((p) => ({ ...p, mark_converted: e.target.checked }))}
                />
                {t("Mark this lead as converted")}
              </label>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={submitConvert}
                  disabled={converting || !convertForm.contact_person_name.trim() || !convertForm.contact_person_email.trim()}
                  className="flex-1"
                >
                  {converting ? t("Creating...") : t("Create customer")}
                </Button>
                <Button variant="outline" onClick={() => setConvertOpen(false)}>{t("Cancel")}</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
