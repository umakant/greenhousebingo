"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, CalendarClock, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t } from "@/lib/admin-t";


const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TYPES = [
  { value: "one_to_one", label: "One-to-One" },
  { value: "group", label: "Group" },
  { value: "round_robin", label: "Round Robin" },
];
const DURATIONS = [15, 30, 45, 60, 90, 120];

type AppRow = {
  id: string;
  appointmentName: string;
  appointmentType: string;
  weekDay: string[] | null;
  duration: number | null;
  phoneEnabled: boolean;
  enabled: boolean;
};

export default function AppointmentAppointmentsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-appointment");
  const [rows, setRows] = React.useState<AppRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [form, setForm] = React.useState({
    appointment_name: "",
    appointment_type: "one_to_one",
    week_day: [] as string[],
    duration: "30",
    phone_enabled: false,
    enabled: true,
  });
  const perPage = 15;

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/appointment/appointments?page=${page}&per_page=${perPage}`, { cache: "no-store" });
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
    setForm({ appointment_name: "", appointment_type: "one_to_one", week_day: [], duration: "30", phone_enabled: false, enabled: true });
    setOpen(true);
  }

  function openEdit(row: AppRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      appointment_name: row.appointmentName,
      appointment_type: row.appointmentType ?? "one_to_one",
      week_day: Array.isArray(row.weekDay) ? row.weekDay : [],
      duration: String(row.duration ?? 30),
      phone_enabled: row.phoneEnabled,
      enabled: row.enabled,
    });
    setOpen(true);
  }

  function toggleDay(day: string) {
    setForm(p => ({
      ...p,
      week_day: p.week_day.includes(day) ? p.week_day.filter(d => d !== day) : [...p.week_day, day],
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setProcessing(true); setError(null);
    try {
      const body = {
        appointment_name: form.appointment_name,
        appointment_type: form.appointment_type,
        week_day: form.week_day,
        duration: Number(form.duration),
        phone_enabled: form.phone_enabled,
        enabled: form.enabled,
      };
      const url = mode === "add" ? "/api/appointment/appointments" : `/api/appointment/appointments/${editId}`;
      const res = await fetch(url, { method: mode === "add" ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Save failed");
      setOpen(false); await load();
    } catch (err: any) { setError(err.message); } finally { setProcessing(false); }
  }

  async function del(id: string) {
    if (!(await appConfirm(t("Delete this appointment type?")))) return;
    const res = await fetch(`/api/appointment/appointments/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json().catch(() => null); setError(j?.error || "Delete failed"); return; }
    await load();
  }

  async function toggleEnabled(row: AppRow) {
    const res = await fetch(`/api/appointment/appointments/${row.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: !row.enabled }) });
    if (!res.ok) { const j = await res.json().catch(() => null); setError(j?.error || "Update failed"); return; }
    await load();
  }

  const typeLabel = (v: string) => TYPES.find(t => t.value === v)?.label ?? v;

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      <Card className="shadow-sm">
        <CardContent className="p-4 border-b bg-gray-50/50">
          <div className="flex justify-end">
            {can("create-appointments") ? <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />{t("Add Appointment")}</Button> : null}
          </div>
        </CardContent>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left font-medium px-4 py-3">{t("Name")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Type")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Days")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Duration")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Phone")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Status")}</th>
                  <th className="text-right font-medium px-4 py-3">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">{t("Loading...")}</td></tr>
                  : rows.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <CalendarClock className="h-10 w-10 text-gray-300" />
                        <div>{t("No appointment types yet")}</div>
                      </div>
                    </td></tr>
                  ) : rows.map(row => (
                    <tr key={row.id} className="border-b hover:bg-accent/20">
                      <td className="px-4 py-3 font-medium">{row.appointmentName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{typeLabel(row.appointmentType)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(row.weekDay) && row.weekDay.length > 0
                            ? row.weekDay.map((d: string) => <Badge key={d} variant="outline" className="text-xs">{d.slice(0, 3)}</Badge>)
                            : <span className="text-muted-foreground">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.duration ? `${row.duration} min` : "-"}</td>
                      <td className="px-4 py-3">{row.phoneEnabled ? <Badge variant="default" className="text-xs">{t("Yes")}</Badge> : <span className="text-muted-foreground text-xs">{t("No")}</span>}</td>
                      <td className="px-4 py-3">
                        {can("edit-appointments") ? (
                          <button onClick={() => toggleEnabled(row)} className="focus:outline-none">
                            {row.enabled
                              ? <Badge variant="default" className="cursor-pointer">{t("Enabled")}</Badge>
                              : <Badge variant="secondary" className="cursor-pointer">{t("Disabled")}</Badge>}
                          </button>
                        ) : row.enabled ? <Badge variant="default">{t("Enabled")}</Badge> : <Badge variant="secondary">{t("Disabled")}</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(can("edit-appointments") || can("delete-appointments")) && (
                          <TableActionButton label={t("Edit")} onPrimaryClick={can("edit-appointments") ? () => openEdit(row) : undefined}
                            items={[
                              { label: t("Edit"), onSelect: () => openEdit(row), disabled: !can("edit-appointments") },
                              { label: t("Delete"), onSelect: () => del(row.id), disabled: !can("delete-appointments"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
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
        <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{mode === "add" ? t("Add Appointment Type") : t("Edit Appointment Type")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={save} className="flex flex-col flex-1">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-2">
                <Label required>{t("Appointment Name")}</Label>
                <Input value={form.appointment_name} onChange={e => setForm(p => ({ ...p, appointment_name: e.target.value }))} required placeholder="e.g. Consultation" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("Type")}</Label>
                  <Select value={form.appointment_type} onValueChange={v => setForm(p => ({ ...p, appointment_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(tp => <SelectItem key={tp.value} value={tp.value}>{tp.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("Duration (min)")}</Label>
                  <Select value={form.duration} onValueChange={v => setForm(p => ({ ...p, duration: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DURATIONS.map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("Available Days")}</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {DAYS.map(day => (
                    <button key={day} type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${form.week_day.includes(day) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"}`}>
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.phone_enabled} onCheckedChange={v => setForm(p => ({ ...p, phone_enabled: v }))} id="phone_enabled" />
                <Label htmlFor="phone_enabled">{t("Phone Enabled")}</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.enabled} onCheckedChange={v => setForm(p => ({ ...p, enabled: v }))} id="enabled" />
                <Label htmlFor="enabled">{t("Enabled")}</Label>
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
