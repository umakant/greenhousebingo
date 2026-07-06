"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  CircleHelp,
  Edit,
  Layers,
  MapPin,
  Plus,
  Tags,
  Trash2,
  UserCircle2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";


type SimpleRow = { id: string; name: string; description: string | null; isActive: boolean };
type LocationRow = {
  id: string;
  name: string;
  address?: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode?: string | null;
  remoteWork: boolean;
  status: boolean;
};
type QuestionRow = { id: string; question: string; type: string; options: string | null; isRequired: boolean; isActive: boolean; sortOrder: number | null };

const QUESTION_TYPES = ["text", "textarea", "select", "radio", "checkbox", "date", "number"];

function SimpleList({
  title, endpoint, can,
}: {
  title: string; endpoint: string; can: (p: string) => boolean;
}) {
  const [rows, setRows] = React.useState<SimpleRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", description: "", is_active: false });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${endpoint}?per_page=50`, { cache: "no-store" });
      const d = await r.json();
      setRows(d.data ?? []); setTotal(d.total ?? 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  React.useEffect(() => { void load(); }, []); // eslint-disable-line

  function openCreate() { setMode("add"); setEditId(null); setForm({ name: "", description: "", is_active: false }); setOpen(true); }
  function openEdit(row: SimpleRow) { setMode("edit"); setEditId(row.id); setForm({ name: row.name, description: row.description ?? "", is_active: row.isActive }); setOpen(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setProcessing(true);
    const payload = { name: form.name, description: form.description || null, is_active: form.is_active };
    try {
      if (mode === "add") { await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
      else { await fetch(`${endpoint}/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
      setOpen(false); await load();
    } catch (e) { console.error(e); } finally { setProcessing(false); }
  }

  async function handleDelete(id: string) {
    if (!(await appConfirm(t("Delete this record?")))) return;
    await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{total} record{total !== 1 ? "s" : ""}</span>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{t(`Add ${title}`)}</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Name")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Description")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Active")}</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">{t("Loading...")}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">{t(`No ${title.toLowerCase()}s yet`)}</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">{row.name}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{row.description ?? "—"}</td>
                  <td className="px-4 py-2"><Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Yes" : "No"}</Badge></td>
                  <td className="px-4 py-2 text-right">
                    <TableActionButton
                      label={t("Edit")}
                      onPrimaryClick={() => openEdit(row)}
                      items={[
                        { label: t("Edit"), onSelect: () => openEdit(row), icon: <Edit className="h-4 w-4" /> },
                        { label: t("Delete"), onSelect: () => handleDelete(row.id), icon: <Trash2 className="h-4 w-4" />, destructive: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{mode === "add" ? `Add ${title}` : `Edit ${title}`}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="px-6 py-5 space-y-4 flex-1">
              <div className="space-y-1.5"><Label required>{t("Name")}</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("Description")}</Label><textarea rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>{t("Active")}</Label></div>
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

function LocationList({ can }: { can: (p: string) => boolean }) {
  const appSettings = useAppSettingsOptional();
  const googleMapsApiKey = appSettings?.settings?.googleMapsApiKey?.trim() || undefined;
  const [rows, setRows] = React.useState<LocationRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", address: "", city: "", state: "", country: "", postal_code: "", remote_work: false, status: false });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/recruitment/job-locations?per_page=50", { cache: "no-store" });
      const d = await r.json();
      setRows(d.data ?? []); setTotal(d.total ?? 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  React.useEffect(() => { void load(); }, []); // eslint-disable-line

  function openCreate() { setMode("add"); setEditId(null); setForm({ name: "", address: "", city: "", state: "", country: "", postal_code: "", remote_work: false, status: false }); setOpen(true); }
  function openEdit(row: LocationRow) {
    setMode("edit");
    setEditId(row.id);
    setForm({
      name: row.name,
      address: row.address ?? "",
      city: row.city ?? "",
      state: row.state ?? "",
      country: row.country ?? "",
      postal_code: row.postalCode ?? "",
      remote_work: row.remoteWork,
      status: row.status,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setProcessing(true);
    const payload = { name: form.name, address: form.address || null, city: form.city || null, state: form.state || null, country: form.country || null, postal_code: form.postal_code || null, remote_work: form.remote_work, status: form.status };
    try {
      if (mode === "add") { await fetch("/api/recruitment/job-locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
      else { await fetch(`/api/recruitment/job-locations/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
      setOpen(false); await load();
    } catch (e) { console.error(e); } finally { setProcessing(false); }
  }

  async function handleDelete(id: string) {
    if (!(await appConfirm(t("Delete this location?")))) return;
    await fetch(`/api/recruitment/job-locations/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{total} location{total !== 1 ? "s" : ""}</span>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{t("Add Location")}</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Name")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("City / State")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Country")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Remote")}</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">{t("Loading...")}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">{t("No locations yet")}</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">{row.name}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{[row.city, row.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{row.country ?? "—"}</td>
                  <td className="px-4 py-2"><Badge variant={row.remoteWork ? "default" : "secondary"}>{row.remoteWork ? "Yes" : "No"}</Badge></td>
                  <td className="px-4 py-2 text-right">
                    <TableActionButton
                      label={t("Edit")}
                      onPrimaryClick={() => openEdit(row)}
                      items={[
                        { label: t("Edit"), onSelect: () => openEdit(row), icon: <Edit className="h-4 w-4" /> },
                        { label: t("Delete"), onSelect: () => handleDelete(row.id), icon: <Trash2 className="h-4 w-4" />, destructive: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b"><SheetTitle>{mode === "add" ? t("Add Location") : t("Edit Location")}</SheetTitle></SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="px-6 py-5 space-y-4 flex-1">
              <div className="space-y-1.5"><Label required>{t("Name")}</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. New York Office" /></div>
              <div className="space-y-1.5">
                <Label htmlFor="job-location-address">{t("Address")}</Label>
                <AddressAutocomplete
                  id="job-location-address"
                  apiKey={googleMapsApiKey}
                  value={form.address}
                  onChange={(v) => setForm((prev) => ({ ...prev, address: v }))}
                  onPlaceSelect={(addr) =>
                    setForm((prev) => ({
                      ...prev,
                      address: addr.street,
                      city: addr.city,
                      state: addr.state,
                      country: addr.country,
                      postal_code: addr.zip,
                    }))
                  }
                  placeholder={t("Start typing an address...")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t("City")}</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>{t("State")}</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t("Country")}</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>{t("Postal Code")}</Label><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.remote_work} onCheckedChange={(v) => setForm({ ...form, remote_work: v })} /><Label>{t("Remote Work")}</Label></div>
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

function CustomQuestionList({ can }: { can: (p: string) => boolean }) {
  const [rows, setRows] = React.useState<QuestionRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [form, setForm] = React.useState({ question: "", type: "text", options: "", is_required: false, is_active: true });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/recruitment/custom-questions?per_page=50", { cache: "no-store" });
      const d = await r.json();
      setRows(d.data ?? []); setTotal(d.total ?? 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  React.useEffect(() => { void load(); }, []); // eslint-disable-line

  function openCreate() { setMode("add"); setEditId(null); setForm({ question: "", type: "text", options: "", is_required: false, is_active: true }); setOpen(true); }
  function openEdit(row: QuestionRow) { setMode("edit"); setEditId(row.id); setForm({ question: row.question, type: row.type, options: row.options ?? "", is_required: row.isRequired, is_active: row.isActive }); setOpen(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setProcessing(true);
    const payload = { question: form.question, type: form.type, options: form.options || null, is_required: form.is_required, is_active: form.is_active };
    try {
      if (mode === "add") { await fetch("/api/recruitment/custom-questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
      else { await fetch(`/api/recruitment/custom-questions/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
      setOpen(false); await load();
    } catch (e) { console.error(e); } finally { setProcessing(false); }
  }

  async function handleDelete(id: string) {
    if (!(await appConfirm(t("Delete this question?")))) return;
    await fetch(`/api/recruitment/custom-questions/${id}`, { method: "DELETE" });
    await load();
  }

  const needsOptions = ["select", "radio", "checkbox"].includes(form.type);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{total} question{total !== 1 ? "s" : ""}</span>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{t("Add Question")}</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Question")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Type")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Required")}</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("Active")}</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">{t("Loading...")}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">{t("No custom questions yet")}</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium max-w-xs truncate">{row.question}</td>
                  <td className="px-4 py-2"><Badge variant="outline">{row.type}</Badge></td>
                  <td className="px-4 py-2"><Badge variant={row.isRequired ? "default" : "secondary"}>{row.isRequired ? "Yes" : "No"}</Badge></td>
                  <td className="px-4 py-2"><Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Yes" : "No"}</Badge></td>
                  <td className="px-4 py-2 text-right">
                    <TableActionButton
                      label={t("Edit")}
                      onPrimaryClick={() => openEdit(row)}
                      items={[
                        { label: t("Edit"), onSelect: () => openEdit(row), icon: <Edit className="h-4 w-4" /> },
                        { label: t("Delete"), onSelect: () => handleDelete(row.id), icon: <Trash2 className="h-4 w-4" />, destructive: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b"><SheetTitle>{mode === "add" ? t("Add Custom Question") : t("Edit Custom Question")}</SheetTitle></SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="px-6 py-5 space-y-4 flex-1">
              <div className="space-y-1.5"><Label required>{t("Question")}</Label><Input required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder={t("Enter your question")} /></div>
              <div className="space-y-1.5">
                <Label>{t("Type")}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{QUESTION_TYPES.map((qt) => <SelectItem key={qt} value={qt}>{qt.charAt(0).toUpperCase() + qt.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {needsOptions && (
                <div className="space-y-1.5">
                  <Label>{t("Options (one per line)")}</Label>
                  <textarea rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder={"Option 1\nOption 2\nOption 3"} />
                </div>
              )}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><Switch checked={form.is_required} onCheckedChange={(v) => setForm({ ...form, is_required: v })} /><Label>{t("Required")}</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>{t("Active")}</Label></div>
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

export type SetupTabId =
  | "job-types"
  | "candidate-sources"
  | "interview-types"
  | "job-locations"
  | "custom-questions"
  | "interview-rounds";

type SetupNavEntry = {
  id: SetupTabId;
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const SETUP_NAV: SetupNavEntry[] = [
  {
    id: "job-types",
    href: "/recruitment/job-types",
    title: "Job Types",
    description: "Define categories used when posting roles and reporting on requisitions.",
    icon: Tags,
  },
  {
    id: "candidate-sources",
    href: "/recruitment/candidate-sources",
    title: "Candidate Sources",
    description: "Track where applicants discover your openings for better sourcing decisions.",
    icon: UserCircle2,
  },
  {
    id: "interview-types",
    href: "/recruitment/interview-types",
    title: "Interview Types",
    description: "Standardize interview formats (phone screen, panel, technical, etc.).",
    icon: Video,
  },
  {
    id: "job-locations",
    href: "/recruitment/job-locations",
    title: "Job Locations",
    description: "Manage offices and remote options linked to job postings.",
    icon: MapPin,
  },
  {
    id: "custom-questions",
    href: "/recruitment/custom-questions",
    title: "Custom Questions",
    description: "Extra application fields collected before candidates reach your pipeline.",
    icon: CircleHelp,
  },
  {
    id: "interview-rounds",
    href: "/recruitment/interview-rounds",
    title: "Interview Rounds",
    description: "Name the stages of your interview process for scheduling and feedback.",
    icon: Layers,
  },
];

function renderSetupPanel(tab: SetupTabId, can: (p: string) => boolean) {
  switch (tab) {
    case "job-types":
      return <SimpleList title="Job Type" endpoint="/api/recruitment/job-types" can={can} />;
    case "candidate-sources":
      return <SimpleList title="Candidate Source" endpoint="/api/recruitment/candidate-sources" can={can} />;
    case "interview-types":
      return <SimpleList title="Interview Type" endpoint="/api/recruitment/interview-types" can={can} />;
    case "job-locations":
      return <LocationList can={can} />;
    case "custom-questions":
      return <CustomQuestionList can={can} />;
    case "interview-rounds":
      return <SimpleList title="Interview Round" endpoint="/api/recruitment/interview-rounds" can={can} />;
    default:
      return null;
  }
}

export default function RecruitmentSetupAdmin({
  permissions,
  initialTab = "job-types",
}: {
  permissions: string[];
  initialTab?: SetupTabId;
}) {
  const router = useRouter();
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-recruitment");

  const active = SETUP_NAV.find((s) => s.id === initialTab) ?? SETUP_NAV[0];
  const Icon = active.icon;

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <aside className="shrink-0 md:w-64">
        <div className="md:sticky md:top-4">
          <p className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground md:block">
            {t("Recruitment setup")}
          </p>
          <div className="md:hidden -mx-1 px-1">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {SETUP_NAV.map((s) => {
                const Si = s.icon;
                const isOn = s.id === active.id;
                return (
                  <Button
                    key={s.id}
                    type="button"
                    variant={isOn ? "default" : "outline"}
                    size="sm"
                    className="shrink-0 whitespace-nowrap"
                    onClick={() => router.push(s.href)}
                  >
                    <Si className="mr-2 h-4 w-4" />
                    {t(s.title)}
                  </Button>
                );
              })}
            </div>
          </div>
          <ScrollArea className="hidden h-[min(70vh,calc(100vh-8rem))] md:block">
            <div className="space-y-1 pr-3">
              {SETUP_NAV.map((s) => {
                const Si = s.icon;
                const isOn = s.id === active.id;
                return (
                  <Button
                    key={s.id}
                    type="button"
                    variant="ghost"
                    className={cn("w-full justify-start", isOn && "bg-muted font-medium")}
                    onClick={() => router.push(s.href)}
                  >
                    <Si className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate text-left">{t(s.title)}</span>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <Card className="min-w-0 border-border/80 shadow-sm">
          <CardHeader className="flex flex-col gap-1 border-b pb-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
            <div className="min-w-0 space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                {t(active.title)}
              </CardTitle>
              <CardDescription>{t(active.description)}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">{renderSetupPanel(active.id, can)}</CardContent>
        </Card>
      </div>
    </div>
  );
}
