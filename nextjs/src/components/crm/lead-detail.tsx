"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Circle,
  Mail,
  Phone,
  Building2,
  Tag,
  DollarSign,
  Clock,
  StickyNote,
  Activity as ActivityIcon,
  MessageSquarePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TableActionButton } from "@/components/ui/table-action-button";
import { appConfirm } from "@/lib/app-confirm";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency, parseCurrencyToNumber, filterMoneyDecimalInput } from "@/lib/format-currency";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatCrmLeadFullName } from "@/lib/crm-lead-name";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


const DEAL_STATUS_OPTIONS = ["open", "won", "lost"];
const ACTIVITY_TYPE_OPTIONS = ["note", "call", "email", "meeting", "task"];

type Stage = { id: string; name: string; color: string };
type Pipeline = { id: string; name: string; stages: Stage[] };

type Lead = {
  id: string;
  firstName: string;
  lastName: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: string;
  value: number | null;
  notes: string | null;
  createdAt: string;
  pipeline?: { id: string; name: string } | null;
  stage?: { id: string; name: string; color: string } | null;
};

type Deal = {
  id: string;
  name: string;
  amount: number | null;
  status: string;
  closeDate: string | null;
  notes: string | null;
  createdAt: string;
  pipeline?: { id: string; name: string } | null;
  stage?: { id: string; name: string; color: string } | null;
};

type LeadActivity = {
  id: string;
  type: string;
  note: string;
  userName: string | null;
  createdAt: string;
};

const emptyDealForm = {
  name: "",
  amount: "",
  status: "open",
  pipeline_id: "",
  stage_id: "",
  close_date: "",
  notes: "",
};

export function LeadDetail({ leadId, permissions }: { leadId: string; permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-crm");
  const { settings } = useAppSettings();
  const decimalPlaces = React.useMemo(() => {
    const d = parseInt(String(settings.decimalFormat ?? "2").trim() || "2", 10);
    return Math.min(10, Math.max(0, Number.isFinite(d) ? d : 2));
  }, [settings.decimalFormat]);

  const [lead, setLead] = React.useState<Lead | null>(null);
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [activities, setActivities] = React.useState<LeadActivity[]>([]);
  const [pipelines, setPipelines] = React.useState<Pipeline[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  // Deal sheet state
  const [dealOpen, setDealOpen] = React.useState(false);
  const [dealMode, setDealMode] = React.useState<"add" | "edit">("add");
  const [dealEditId, setDealEditId] = React.useState<string | null>(null);
  const [dealForm, setDealForm] = React.useState({ ...emptyDealForm });
  const [dealStages, setDealStages] = React.useState<Stage[]>([]);
  const [savingDeal, setSavingDeal] = React.useState(false);

  // Notes tab
  const [notesDraft, setNotesDraft] = React.useState("");
  const [savingNotes, setSavingNotes] = React.useState(false);

  // Activity composer
  const [activityType, setActivityType] = React.useState("note");
  const [activityNote, setActivityNote] = React.useState("");
  const [addingActivity, setAddingActivity] = React.useState(false);

  const loadLead = React.useCallback(async () => {
    const r = await fetch(`/api/crm/leads/${leadId}`, { cache: "no-store", credentials: "include" });
    if (r.status === 404) {
      setNotFound(true);
      return;
    }
    const d = await r.json().catch(() => null);
    if (d?.ok && d.data) {
      setLead(d.data as Lead);
      setNotesDraft((d.data as Lead).notes ?? "");
    }
  }, [leadId]);

  const loadDeals = React.useCallback(async () => {
    const r = await fetch(`/api/crm/deals?lead_id=${leadId}&per_page=100`, { cache: "no-store", credentials: "include" });
    const d = await r.json().catch(() => null);
    if (d?.ok) setDeals((d.data ?? []) as Deal[]);
  }, [leadId]);

  const loadActivities = React.useCallback(async () => {
    const r = await fetch(`/api/crm/leads/${leadId}/activities`, { cache: "no-store", credentials: "include" });
    const d = await r.json().catch(() => null);
    if (d?.ok) setActivities((d.data ?? []) as LeadActivity[]);
  }, [leadId]);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadLead(), loadDeals(), loadActivities()]);
        const pr = await fetch("/api/crm/pipelines", { cache: "no-store", credentials: "include" })
          .then((r) => r.json())
          .catch(() => ({ data: [] }));
        setPipelines((pr.data ?? []) as Pipeline[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadLead, loadDeals, loadActivities]);

  React.useEffect(() => {
    if (dealForm.pipeline_id) {
      const p = pipelines.find((p) => p.id === dealForm.pipeline_id);
      setDealStages(p?.stages ?? []);
    } else {
      setDealStages([]);
    }
  }, [dealForm.pipeline_id, pipelines]);

  const fmtCurrency = (v: number | null | undefined) => formatCurrency(Number(v) || 0, settings);
  const fmtDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  function openAddDeal() {
    setDealMode("add");
    setDealEditId(null);
    setDealForm({ ...emptyDealForm, name: lead ? `${displayName} - opportunity` : "" });
    setDealStages([]);
    setDealOpen(true);
  }

  function openEditDeal(deal: Deal) {
    setDealMode("edit");
    setDealEditId(deal.id);
    setDealForm({
      name: deal.name,
      amount: deal.amount != null ? formatCurrency(Number(deal.amount), settings) : "",
      status: deal.status,
      pipeline_id: deal.pipeline?.id ?? "",
      stage_id: deal.stage?.id ?? "",
      close_date: deal.closeDate ? deal.closeDate.slice(0, 10) : "",
      notes: deal.notes ?? "",
    });
    if (deal.pipeline?.id) {
      const p = pipelines.find((p) => p.id === deal.pipeline?.id);
      setDealStages(p?.stages ?? []);
    }
    setDealOpen(true);
  }

  async function saveDeal() {
    if (!dealForm.name.trim()) {
      toast.error(t("Deal name is required"));
      return;
    }
    setSavingDeal(true);
    try {
      let amountNum: number | null = null;
      if (dealForm.amount.trim() !== "") {
        const n = parseCurrencyToNumber(dealForm.amount, settings);
        if (!Number.isFinite(n) || n < 0) {
          toast.error(t("Enter a valid amount"));
          setSavingDeal(false);
          return;
        }
        amountNum = n;
      }
      const payload = {
        name: dealForm.name.trim(),
        amount: amountNum,
        status: dealForm.status,
        pipeline_id: dealForm.pipeline_id || null,
        stage_id: dealForm.stage_id || null,
        close_date: dealForm.close_date || null,
        notes: dealForm.notes.trim() || null,
        lead_id: leadId,
      };
      const url = dealMode === "add" ? "/api/crm/deals" : `/api/crm/deals/${dealEditId}`;
      const method = dealMode === "add" ? "POST" : "PUT";
      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await r.json().catch(() => ({}));
      if (r.ok && json.ok) {
        toast.success(dealMode === "add" ? t("Deal added") : t("Deal updated"));
        setDealOpen(false);
        void loadDeals();
      } else {
        toast.error(typeof json.message === "string" ? json.message : t("Could not save deal"));
      }
    } finally {
      setSavingDeal(false);
    }
  }

  async function updateDealStatus(deal: Deal, status: string) {
    setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, status } : d)));
    const r = await fetch(`/api/crm/deals/${deal.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: deal.name,
        amount: deal.amount,
        status,
        pipeline_id: deal.pipeline?.id ?? null,
        stage_id: deal.stage?.id ?? null,
        close_date: deal.closeDate ?? null,
        notes: deal.notes ?? null,
        lead_id: leadId,
      }),
    });
    if (!r.ok) {
      toast.error(t("Could not update status"));
      void loadDeals();
    }
  }

  async function deleteDeal(id: string) {
    if (!(await appConfirm(t("Delete this deal?")))) return;
    await fetch(`/api/crm/deals/${id}`, { method: "DELETE", credentials: "include" });
    void loadDeals();
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      const r = await fetch(`/api/crm/leads/${leadId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesDraft }),
      });
      if (r.ok) {
        toast.success(t("Notes saved"));
        setLead((p) => (p ? { ...p, notes: notesDraft } : p));
      } else {
        toast.error(t("Could not save notes"));
      }
    } finally {
      setSavingNotes(false);
    }
  }

  async function addActivity() {
    if (!activityNote.trim()) {
      toast.error(t("Enter a note"));
      return;
    }
    setAddingActivity(true);
    try {
      const r = await fetch(`/api/crm/leads/${leadId}/activities`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activityType, note: activityNote.trim() }),
      });
      const json = await r.json().catch(() => ({}));
      if (r.ok && json.ok) {
        setActivityNote("");
        void loadActivities();
      } else {
        toast.error(typeof json.message === "string" ? json.message : t("Could not add activity"));
      }
    } finally {
      setAddingActivity(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">{t("Loading...")}</div>;
  }

  if (notFound || !lead) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-muted-foreground">{t("Lead not found.")}</p>
        <Button asChild variant="outline">
          <Link href="/crm/leads">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("Back to Leads")}
          </Link>
        </Button>
      </div>
    );
  }

  const displayName = formatCrmLeadFullName(lead.firstName, lead.lastName);
  const safeName = displayName === "—" ? (lead.name ?? lead.firstName) : displayName;
  const initials = safeName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  const canEditDeals = can("create-deals") || can("manage-deals");
  const canEditNotes = can("edit-leads") || can("manage-leads");

  const dealStatusBadge = (status: string) => {
    const cls =
      status === "won"
        ? "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
        : status === "lost"
          ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
          : "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300";
    return <Badge variant="outline" className={`capitalize ${cls}`}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/crm/leads">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("Back to Leads")}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Sidebar */}
        <Card className="lg:col-span-4 xl:col-span-3">
          <CardContent className="p-5">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                {initials || <Briefcase className="h-8 w-8" />}
              </div>
              <h2 className="mt-3 text-lg font-semibold">{safeName}</h2>
              <Badge variant="outline" className="mt-1 capitalize">{lead.status}</Badge>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              {lead.email && (
                <div className="flex items-center gap-2 break-all">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={`tel:${lead.phone}`} className="hover:underline">{formatPhoneDisplay(lead.phone)}</a>
                </div>
              )}
              {lead.company && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {lead.company}
                </div>
              )}
              {lead.source && (
                <div className="flex items-center gap-2 capitalize">
                  <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {lead.source.replace(/_/g, " ")}
                </div>
              )}
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                {lead.value ? fmtCurrency(lead.value) : "—"}
              </div>
              {lead.pipeline && (
                <div className="flex items-center gap-2">
                  <Circle
                    className="h-2.5 w-2.5 shrink-0"
                    style={{ fill: lead.stage?.color ?? "#999", color: lead.stage?.color ?? "#999" }}
                  />
                  <span>
                    {lead.pipeline.name}
                    {lead.stage ? ` · ${lead.stage.name}` : ""}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                {t("Created")} {fmtDate(lead.createdAt)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main */}
        <div className="lg:col-span-8 xl:col-span-9">
          <Tabs defaultValue="work" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
              <TabsTrigger value="work" className="gap-1.5">
                <Briefcase className="h-4 w-4" />
                {t("Work Progress")}
              </TabsTrigger>
              <TabsTrigger value="activities" className="gap-1.5">
                <ActivityIcon className="h-4 w-4" />
                {t("Activities")}
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5">
                <StickyNote className="h-4 w-4" />
                {t("Notes")}
              </TabsTrigger>
            </TabsList>

            {/* Work Progress = Deals */}
            <TabsContent value="work">
              <Card>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-2 border-b p-4">
                    <div>
                      <h3 className="text-sm font-semibold">{t("Work Progress")}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t("Deals and opportunities for this lead.")}
                      </p>
                    </div>
                    {canEditDeals && (
                      <Button size="sm" onClick={openAddDeal}>
                        <Plus className="mr-1 h-4 w-4" />
                        {t("Add Deal")}
                      </Button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="px-4 py-3 text-left font-medium">{t("Deal")}</th>
                          <th className="px-4 py-3 text-left font-medium hidden md:table-cell">{t("Pipeline")}</th>
                          <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">{t("Stage")}</th>
                          <th className="px-4 py-3 text-left font-medium">{t("Amount")}</th>
                          <th className="px-4 py-3 text-left font-medium">{t("Status")}</th>
                          <th className="px-4 py-3 text-right font-medium">{t("Actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deals.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                              <Briefcase className="mx-auto mb-2 h-8 w-8 opacity-30" />
                              {t("No deals yet.")}
                              {canEditDeals && (
                                <div className="mt-3">
                                  <Button size="sm" variant="outline" onClick={openAddDeal}>
                                    <Plus className="mr-1 h-4 w-4" />
                                    {t("Add the first deal")}
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ) : (
                          deals.map((deal) => (
                            <tr key={deal.id} className="border-b transition-colors hover:bg-muted/30">
                              <td className="px-4 py-3">
                                <div className="font-medium">{deal.name}</div>
                                <div className="text-xs text-muted-foreground">{fmtDate(deal.createdAt)}</div>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                                {deal.pipeline?.name ?? "—"}
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell">
                                {deal.stage ? (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <Circle className="h-2.5 w-2.5" style={{ fill: deal.stage.color, color: deal.stage.color }} />
                                    {deal.stage.name}
                                  </div>
                                ) : "—"}
                              </td>
                              <td className="px-4 py-3">{deal.amount ? fmtCurrency(deal.amount) : "—"}</td>
                              <td className="px-4 py-3">
                                {canEditDeals ? (
                                  <Select value={deal.status} onValueChange={(v) => void updateDealStatus(deal, v)}>
                                    <SelectTrigger className="h-8 w-28">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DEAL_STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  dealStatusBadge(deal.status)
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {canEditDeals && (
                                  <TableActionButton
                                    label={t("Actions")}
                                    onPrimaryClick={() => openEditDeal(deal)}
                                    items={[
                                      { label: t("Edit"), icon: <Edit className="h-4 w-4" />, onSelect: () => openEditDeal(deal) },
                                      ...(can("delete-deals") || can("manage-deals")
                                        ? [{
                                            label: t("Delete"),
                                            icon: <Trash2 className="h-4 w-4" />,
                                            onSelect: () => deleteDeal(deal.id),
                                            destructive: true,
                                          }]
                                        : []),
                                    ]}
                                  />
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activities */}
            <TabsContent value="activities">
              <Card>
                <CardContent className="space-y-4 p-4">
                  {canEditNotes && (
                    <div className="space-y-2 rounded-lg border p-3">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Select value={activityType} onValueChange={setActivityType}>
                          <SelectTrigger className="sm:w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTIVITY_TYPE_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={activityNote}
                          onChange={(e) => setActivityNote(e.target.value)}
                          placeholder={t("Log a call, email, meeting or note...")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void addActivity();
                            }
                          }}
                          className="flex-1"
                        />
                        <Button onClick={addActivity} disabled={addingActivity || !activityNote.trim()}>
                          <MessageSquarePlus className="mr-1 h-4 w-4" />
                          {addingActivity ? t("Adding...") : t("Add")}
                        </Button>
                      </div>
                    </div>
                  )}

                  {activities.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <ActivityIcon className="mx-auto mb-2 h-8 w-8 opacity-30" />
                      {t("No activity logged yet.")}
                    </div>
                  ) : (
                    <ol className="relative space-y-4 border-l pl-5">
                      {activities.map((a) => (
                        <li key={a.id} className="relative">
                          <span className="absolute -left-[1.42rem] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary" />
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="capitalize">{a.type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {fmtDateTime(a.createdAt)}
                              {a.userName ? ` · ${a.userName}` : ""}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm">{a.note}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes */}
            <TabsContent value="notes">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <Label>{t("Lead notes")}</Label>
                  <Textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={8}
                    placeholder={t("Write internal notes about this lead...")}
                    disabled={!canEditNotes}
                  />
                  {canEditNotes && (
                    <div className="flex justify-end">
                      <Button onClick={saveNotes} disabled={savingNotes || notesDraft === (lead.notes ?? "")}>
                        {savingNotes ? t("Saving...") : t("Save Notes")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Deal sheet */}
      <Sheet open={dealOpen} onOpenChange={setDealOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{dealMode === "add" ? t("Add Deal") : t("Edit Deal")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label required>{t("Deal name")}</Label>
              <Input
                value={dealForm.name}
                onChange={(e) => setDealForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={t("e.g. Catering order for event")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("Amount")}</Label>
                <Input
                  inputMode="decimal"
                  value={dealForm.amount}
                  onChange={(e) =>
                    setDealForm((p) => ({ ...p, amount: filterMoneyDecimalInput(e.target.value, decimalPlaces) }))
                  }
                  onBlur={() => {
                    if (dealForm.amount.trim() === "") return;
                    const n = parseCurrencyToNumber(dealForm.amount, settings);
                    if (Number.isFinite(n)) setDealForm((p) => ({ ...p, amount: formatCurrency(n, settings) }));
                  }}
                  placeholder={formatCurrency(0, settings)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Status")}</Label>
                <Select value={dealForm.status} onValueChange={(v) => setDealForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("Pipeline")}</Label>
                <Select
                  value={dealForm.pipeline_id || "__none__"}
                  onValueChange={(v) => setDealForm((p) => ({ ...p, pipeline_id: v === "__none__" ? "" : v, stage_id: "" }))}
                >
                  <SelectTrigger><SelectValue placeholder={t("Select pipeline")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("None")}</SelectItem>
                    {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Stage")}</Label>
                <Select
                  value={dealForm.stage_id || "__none__"}
                  onValueChange={(v) => setDealForm((p) => ({ ...p, stage_id: v === "__none__" ? "" : v }))}
                  disabled={dealStages.length === 0}
                >
                  <SelectTrigger><SelectValue placeholder={t("Select stage")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("None")}</SelectItem>
                    {dealStages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Close date")}</Label>
              <Input
                type="date"
                value={dealForm.close_date}
                onChange={(e) => setDealForm((p) => ({ ...p, close_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Notes")}</Label>
              <Textarea
                value={dealForm.notes}
                onChange={(e) => setDealForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                placeholder={t("Additional notes...")}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveDeal} disabled={savingDeal || !dealForm.name.trim()} className="flex-1">
                {savingDeal ? t("Saving...") : t("Save")}
              </Button>
              <Button variant="outline" onClick={() => setDealOpen(false)}>{t("Cancel")}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
