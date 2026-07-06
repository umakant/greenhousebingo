"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  Download,
  FileDown,
  FileSignature,
  Plus,
  Shield,
  Stethoscope,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import {
  PROJECT_TYPE_OPTIONS,
  SOW_FORM_TABS,
  US_STATES,
  type SowFormData,
  type SowFormTabId,
  type SowProjectMeta,
} from "@/lib/project-sow-form";
import { cn } from "@/lib/utils";
import { buildWorkPeriodLabelFromDates } from "@/lib/project-sow-document";
import { downloadBlob } from "@/lib/download-html-as-pdf";
import { SowPerDiemMainSection } from "./project-ops-sow-per-diem-section";
import { toast } from "sonner";

type SowListRow = {
  user_id: number;
  name: string;
  email: string;
  roles: string[];
  status: string;
  signed_file_path: string | null;
};

type SowTabProps = {
  projectId: number;
  canManage: boolean;
  project: {
    name: string;
    status: string | null;
    start_date: string | null;
    end_date: string | null;
    timezone?: string | null;
  };
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-sm font-semibold text-foreground">{children}</h3>;
}

function LogoUpload({
  label,
  url,
  onUrl,
  disabled,
}: {
  label: string;
  url: string;
  onUrl: (v: string) => void;
  disabled?: boolean;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="max-h-16 max-w-full object-contain px-2" />
        ) : (
          <span className="text-xs text-muted-foreground">No logo</span>
        )}
      </div>
      {!disabled ? (
        <>
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => { if (typeof reader.result === "string") onUrl(reader.result); };
            reader.readAsDataURL(f);
          }} />
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => ref.current?.click()}>
            <Upload className="mr-1 h-3.5 w-3.5" /> Upload Logo
          </Button>
        </>
      ) : null}
    </div>
  );
}

export function SowTab({ projectId, canManage, project }: SowTabProps) {
  const { settings } = useAppSettings();
  const [employees, setEmployees] = React.useState<SowListRow[]>([]);
  const [projectMeta, setProjectMeta] = React.useState<SowProjectMeta | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null);
  const [employeeName, setEmployeeName] = React.useState("");
  const [form, setForm] = React.useState<SowFormData | null>(null);
  const [savedForm, setSavedForm] = React.useState<SowFormData | null>(null);
  const [activeTab, setActiveTab] = React.useState<SowFormTabId>("company");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [loadingEmployee, setLoadingEmployee] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const loadSeqRef = React.useRef(0);
  const [downloadingPdf, setDownloadingPdf] = React.useState(false);

  const loadList = React.useCallback(() => {
    setLoading(true);
    fetch(`/api/project/${projectId}/sow`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setEmployees(Array.isArray(d.data) ? d.data : []);
        setProjectMeta(d.project ?? null);
      })
      .catch(() => {
        setEmployees([]);
        setProjectMeta(null);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  React.useEffect(() => { loadList(); }, [loadList]);

  React.useEffect(() => {
    if (!employees.length) {
      setSelectedUserId(null);
      return;
    }
    if (selectedUserId == null || !employees.some((e) => e.user_id === selectedUserId)) {
      setSelectedUserId(employees[0]!.user_id);
    }
  }, [employees, selectedUserId]);

  const loadEmployee = React.useCallback(async (userId: number) => {
    const seq = ++loadSeqRef.current;
    setLoadingEmployee(true);
    try {
      const res = await fetch(`/api/project/${projectId}/sow/${userId}`, { credentials: "include" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to load");
      if (seq !== loadSeqRef.current) return;
      setEmployeeName(d.data.name);
      setForm(d.data.form);
      setSavedForm(d.data.form);
      if (d.project) setProjectMeta(d.project);
    } finally {
      if (seq === loadSeqRef.current) setLoadingEmployee(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    if (selectedUserId == null) return;
    loadEmployee(selectedUserId).catch(() => toast.error("Failed to load SOW"));
  }, [selectedUserId, loadEmployee]);

  const patch = (partial: Partial<SowFormData>) => setForm((f) => (f ? { ...f, ...partial } : f));

  const saveDraft = async () => {
    if (!selectedUserId || !form) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/project/${projectId}/sow/${selectedUserId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, status: "draft" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Save failed");
      setSavedForm(form);
      toast.success("Draft saved");
      loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    if (!selectedUserId || !form) return;
    setDownloadingPdf(true);
    try {
      const safeEmployee = employeeName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "employee";
      const safeProject = project.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "project";
      const filename = `sow-${safeProject}-${safeEmployee}.pdf`;

      const res = await fetch(`/api/project/${projectId}/sow/${selectedUserId}/pdf`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d.error === "string" ? d.error : "Failed to generate PDF");
      }
      const blob = await res.blob();
      downloadBlob(blob, filename);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const timeline =
    project.start_date || project.end_date
      ? `${project.start_date ? fmtDateLib(project.start_date, settings) : "—"} – ${project.end_date ? fmtDateLib(project.end_date, settings) : "—"}`
      : "—";

  const staffing = projectMeta?.staffing ?? { agents: 0, medics: 0, security: 0, total: 0 };
  const isDirty = form && savedForm && JSON.stringify(form) !== JSON.stringify(savedForm);

  if (loading) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Loading Scope of Work…</p>;
  }

  if (!employees.length) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-lg font-semibold">Scope of Work (SOW)</h2>
          <p className="text-sm text-muted-foreground">Define the scope, terms, and conditions for this project.</p>
        </div>
        <div className="flex flex-col items-center px-6 py-20 text-muted-foreground">
          <FileSignature className="mb-3 h-12 w-12 opacity-40" />
          <p className="text-center">No assigned personnel yet. Assign agents, medics, or security staff first.</p>
        </div>
      </div>
    );
  }

  if (!form || !projectMeta || loadingEmployee) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
        Loading employee Scope of Work…
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "company":
        return (
          <div className="space-y-8">
            <div>
              <SectionTitle>Vendor (Our Company)</SectionTitle>
              <div className="grid gap-4 lg:grid-cols-[1fr_140px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Company Name">
                    <Input value={form.vendor_company_name} onChange={(e) => patch({ vendor_company_name: e.target.value })} disabled={!canManage} />
                  </Field>
                  <Field label="Contact Person">
                    <Input value={form.vendor_contact_name} onChange={(e) => patch({ vendor_contact_name: e.target.value })} disabled={!canManage} />
                  </Field>
                  <Field label="Email">
                    <Input type="email" value={form.vendor_email} onChange={(e) => patch({ vendor_email: e.target.value })} disabled={!canManage} />
                  </Field>
                  <Field label="Phone">
                    <PhoneInput
                      value={form.vendor_phone}
                      onChange={(v) => patch({ vendor_phone: v })}
                      disabled={!canManage}
                    />
                  </Field>
                </div>
                <LogoUpload label="Company Logo" url={form.vendor_logo_url} onUrl={(v) => patch({ vendor_logo_url: v })} disabled={!canManage} />
              </div>
            </div>
            <div>
              <SectionTitle>Client Information</SectionTitle>
              <div className="grid gap-4 lg:grid-cols-[1fr_140px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Client Company">
                    <Input value={form.client_company_name} onChange={(e) => patch({ client_company_name: e.target.value })} disabled={!canManage} />
                  </Field>
                  <Field label="Client Contact">
                    <Input value={form.client_contact_name} onChange={(e) => patch({ client_contact_name: e.target.value })} disabled={!canManage} />
                  </Field>
                  <Field label="Email">
                    <Input type="email" value={form.client_email} onChange={(e) => patch({ client_email: e.target.value })} disabled={!canManage} />
                  </Field>
                  <Field label="Phone">
                    <PhoneInput
                      value={form.client_phone}
                      onChange={(v) => patch({ client_phone: v })}
                      disabled={!canManage}
                    />
                  </Field>
                </div>
                <LogoUpload label="Client Logo" url={form.client_logo_url} onUrl={(v) => patch({ client_logo_url: v })} disabled={!canManage} />
              </div>
            </div>
          </div>
        );
      case "project":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project Type">
              <Select value={form.project_type} onValueChange={(v) => patch({ project_type: v })} disabled={!canManage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Event Name">
              <Input value={form.event_name} onChange={(e) => patch({ event_name: e.target.value })} disabled={!canManage} />
            </Field>
            <Field label="Client Reference #">
              <Input value={form.client_reference} onChange={(e) => patch({ client_reference: e.target.value })} disabled={!canManage} />
            </Field>
            <Field label="Internal Project #">
              <Input value={form.internal_reference} onChange={(e) => patch({ internal_reference: e.target.value })} disabled={!canManage} />
            </Field>
          </div>
        );
      case "locations":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary Venue">
                <Input value={form.primary_venue} onChange={(e) => patch({ primary_venue: e.target.value })} disabled={!canManage} />
              </Field>
              <Field label="Venue Address">
                <AddressAutocomplete
                  id="sow-venue-address"
                  apiKey={settings?.googleMapsApiKey}
                  value={form.venue_address}
                  onChange={(v) => patch({ venue_address: v })}
                  onPlaceSelect={(addr) => {
                    patch({
                      venue_address: addr.street || addr.formattedAddress || form.venue_address,
                      ...(addr.city ? { city: addr.city } : {}),
                      ...(addr.state ? { state: addr.state } : {}),
                      ...(addr.zip ? { zip_code: addr.zip } : {}),
                    });
                  }}
                  placeholder="Start typing an address…"
                  disabled={!canManage}
                  inputProps={{ autoComplete: "off" }}
                />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={(e) => patch({ city: e.target.value })} disabled={!canManage} />
              </Field>
              <Field label="State">
                <Select value={form.state || undefined} onValueChange={(v) => patch({ state: v })} disabled={!canManage}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Zip">
                <Input value={form.zip_code} onChange={(e) => patch({ zip_code: e.target.value })} disabled={!canManage} />
              </Field>
              <Field label="Time Zone">
                <Input value={form.timezone} onChange={(e) => patch({ timezone: e.target.value })} placeholder="(GMT-08:00) Pacific Time" disabled={!canManage} />
              </Field>
            </div>
            <div>
              <SectionTitle>Additional Locations</SectionTitle>
              <div className="space-y-2">
                {form.additional_locations.map((loc, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={loc}
                      onChange={(e) => {
                        const next = [...form.additional_locations];
                        next[i] = e.target.value;
                        patch({ additional_locations: next });
                      }}
                      disabled={!canManage}
                    />
                    {canManage && form.additional_locations.length > 1 ? (
                      <Button type="button" variant="ghost" size="icon" onClick={() => patch({ additional_locations: form.additional_locations.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                {canManage ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => patch({ additional_locations: [...form.additional_locations, ""] })}>
                    <Plus className="mr-1 h-4 w-4" /> Add Location
                  </Button>
                ) : null}
              </div>
            </div>
            <div>
              <SectionTitle>Staffing Requirements</SectionTitle>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  { label: "Agents Required", value: staffing.agents, icon: Users, color: "text-violet-600" },
                  { label: "Medics Required", value: staffing.medics, icon: Stethoscope, color: "text-red-500" },
                  { label: "Security Required", value: staffing.security, icon: Shield, color: "text-emerald-600" },
                  { label: "Supervisors", value: 0, icon: Users, color: "text-muted-foreground" },
                  { label: "Total Personnel", value: staffing.total, icon: Users, color: "text-violet-700", highlight: true },
                ].map((c) => (
                  <div key={c.label} className={cn("rounded-lg border border-border p-3 text-center", c.highlight && "border-violet-200 bg-violet-50")}>
                    <c.icon className={cn("mx-auto mb-1 h-4 w-4", c.color)} />
                    <div className="text-lg font-semibold">{c.value}</div>
                    <div className="text-[10px] text-muted-foreground">{c.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case "work_periods":
        return (
          <div className="space-y-4">
            {form.work_periods.map((wp, i) => (
              <div key={wp.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Period {i + 1}</span>
                  {canManage && form.work_periods.length > 1 ? (
                    <Button type="button" variant="ghost" size="icon" onClick={() => patch({ work_periods: form.work_periods.filter((w) => w.id !== wp.id) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <Field label="Label">
                  <Input value={wp.label} placeholder="4/13 – 4/20 Activation Days (8)" onChange={(e) => {
                    const next = [...form.work_periods];
                    next[i] = { ...wp, label: e.target.value };
                    patch({ work_periods: next });
                  }} disabled={!canManage} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Start Date">
                    <DatePickerInput value={wp.start_date} onChange={(e) => {
                      const start = e.target.value;
                      const end = wp.end_date || start;
                      const next = [...form.work_periods];
                      next[i] = {
                        ...wp,
                        start_date: start,
                        end_date: end,
                        label: buildWorkPeriodLabelFromDates(start, end, wp.label),
                      };
                      patch({ work_periods: next });
                    }} disabled={!canManage} />
                  </Field>
                  <Field label="End Date">
                    <DatePickerInput value={wp.end_date} onChange={(e) => {
                      const end = e.target.value;
                      const start = wp.start_date;
                      const next = [...form.work_periods];
                      next[i] = {
                        ...wp,
                        end_date: end,
                        label: buildWorkPeriodLabelFromDates(start, end, wp.label),
                      };
                      patch({ work_periods: next });
                    }} disabled={!canManage} />
                  </Field>
                  <Field label="Rate ($)">
                    <Input value={wp.daily_rate} placeholder="600" onChange={(e) => {
                      const next = [...form.work_periods];
                      next[i] = { ...wp, daily_rate: e.target.value };
                      patch({ work_periods: next });
                    }} disabled={!canManage} />
                  </Field>
                  <Field label="Rate Type">
                    <Select value={wp.rate_type} onValueChange={(v) => {
                      const next = [...form.work_periods];
                      next[i] = { ...wp, rate_type: v };
                      patch({ work_periods: next });
                    }} disabled={!canManage}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["per day", "full day", "half day", "travel day"].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            ))}
            {canManage ? (
              <Button type="button" variant="outline" size="sm" onClick={() => patch({
                work_periods: [...form.work_periods, { id: `${Date.now()}`, label: "", start_date: "", end_date: "", daily_rate: "", rate_type: "per day" }],
              })}>
                <Plus className="mr-1 h-4 w-4" /> Add Work Period
              </Button>
            ) : null}
          </div>
        );
      case "compensation":
        return (
          <Field label="Rate Summary">
            <Input value={form.compensation_summary} placeholder="9 total days @ $5400" onChange={(e) => patch({ compensation_summary: e.target.value })} disabled={!canManage} />
          </Field>
        );
      case "per_diem":
        return (
          <SowPerDiemMainSection
            form={form}
            employeeName={employeeName}
            canManage={canManage}
            onPatch={patch}
          />
        );
      case "travel":
        return (
          <Field label="Travel Information">
            <Textarea value={form.travel_notes} onChange={(e) => patch({ travel_notes: e.target.value })} rows={8} disabled={!canManage} />
          </Field>
        );
      case "payroll":
        return (
          <div className="space-y-4">
            <Field label="Payroll Notes">
              <Textarea value={form.payroll_notes} onChange={(e) => patch({ payroll_notes: e.target.value })} rows={3} disabled={!canManage} />
            </Field>
            <SectionTitle>Pay Period Schedule</SectionTitle>
            {form.payroll_periods.map((pp, i) => (
              <div key={pp.id} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-3">
                <Field label="Pay Period Start">
                  <DatePickerInput value={pp.period_start} onChange={(e) => {
                    const next = [...form.payroll_periods];
                    next[i] = { ...pp, period_start: e.target.value };
                    patch({ payroll_periods: next });
                  }} disabled={!canManage} />
                </Field>
                <Field label="Pay Period End">
                  <DatePickerInput value={pp.period_end} onChange={(e) => {
                    const next = [...form.payroll_periods];
                    next[i] = { ...pp, period_end: e.target.value };
                    patch({ payroll_periods: next });
                  }} disabled={!canManage} />
                </Field>
                <Field label="Pay Date">
                  <DatePickerInput value={pp.pay_date} onChange={(e) => {
                    const next = [...form.payroll_periods];
                    next[i] = { ...pp, pay_date: e.target.value };
                    patch({ payroll_periods: next });
                  }} disabled={!canManage} />
                </Field>
              </div>
            ))}
            {canManage ? (
              <Button type="button" variant="outline" size="sm" onClick={() => patch({
                payroll_periods: [...form.payroll_periods, { id: `${Date.now()}`, period_start: "", period_end: "", pay_date: "" }],
              })}>
                <Plus className="mr-1 h-4 w-4" /> Add Pay Period
              </Button>
            ) : null}
            <Field label="Signatory Name">
              <Input value={form.signatory_name} onChange={(e) => patch({ signatory_name: e.target.value })} disabled={!canManage} />
            </Field>
            <Field label="Sign-by Date">
              <DatePickerInput value={form.sign_by_date} onChange={(e) => patch({ sign_by_date: e.target.value })} disabled={!canManage} />
            </Field>
          </div>
        );
      case "rules":
        return (
          <div className="space-y-4">
            <Field label="Policies">
              <Textarea value={form.policies} onChange={(e) => patch({ policies: e.target.value })} rows={6} disabled={!canManage} />
            </Field>
            <Field label="Additional Rules & Notes">
              <Textarea value={form.rules_notes} onChange={(e) => patch({ rules_notes: e.target.value })} rows={4} disabled={!canManage} />
            </Field>
          </div>
        );
      case "attachments":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Upload the signed Scope of Work PDF returned by the employee.</p>
            {canManage ? (
              <>
                <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !selectedUserId) return;
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await fetch(`/api/project/${projectId}/sow/${selectedUserId}/signed`, { method: "POST", credentials: "include", body: fd });
                  const d = await res.json();
                  if (!res.ok) { toast.error(d.error ?? "Upload failed"); return; }
                  toast.success("Signed SOW uploaded");
                  loadList();
                }} />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-1 h-4 w-4" /> Upload Signed PDF
                </Button>
              </>
            ) : null}
            {employees.find((e) => e.user_id === selectedUserId)?.signed_file_path ? (
              <a
                href={employees.find((e) => e.user_id === selectedUserId)!.signed_file_path!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                <Download className="mr-1 h-4 w-4" /> Download signed document
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">No signed document uploaded yet.</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="-mx-2 space-y-0 sm:-mx-0">
      {/* Header */}
      <div className="rounded-t-xl border border-border bg-card px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Scope of Work (SOW)</h2>
            <p className="text-sm text-muted-foreground">Define the scope, terms, and conditions for this project.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && isDirty ? (
              <Button variant="ghost" size="sm" onClick={() => savedForm && setForm(savedForm)}>
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
            ) : null}
            {canManage ? (
              <Button variant="outline" size="sm" onClick={saveDraft} disabled={saving}>
                {saving ? "Saving…" : "Save Draft"}
              </Button>
            ) : null}
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700"
              onClick={downloadPdf}
              disabled={downloadingPdf}
            >
              <FileDown className="mr-1 h-4 w-4" /> {downloadingPdf ? "Generating…" : "Generate PDF"}
            </Button>
          </div>
        </div>

        {/* Meta bar */}
        <div className="mt-4 flex flex-wrap gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Project:</span>
            <span className="font-medium">{project.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
              {project.status ?? "Not Started"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Project Dates:</span>
            <span>{timeline}</span>
          </div>
          {(project.timezone || form.timezone) ? (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Time Zone:</span>
              <span>{form.timezone || project.timezone}</span>
            </div>
          ) : null}
        </div>

        {/* Employee selector */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employee</span>
          <Select
            value={String(selectedUserId)}
            onValueChange={(v) => setSelectedUserId(Number(v))}
          >
            <SelectTrigger className="w-[min(100%,280px)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.user_id} value={String(e.user_id)}>
                  {e.name} {e.status !== "none" ? `(${e.status})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{employees.length} personnel on this project</span>
        </div>
      </div>

      {/* Editor */}
      <div className="grid border border-t-0 border-border bg-card lg:grid-cols-[180px_1fr] xl:grid-cols-[200px_1fr]">
        {/* Vertical tabs */}
        <nav className="border-b border-border p-2 lg:border-b-0 lg:border-r">
          <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {SOW_FORM_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-2 text-left text-xs font-medium transition-colors lg:w-full lg:text-sm",
                  activeTab === tab.id
                    ? "bg-violet-50 text-violet-700"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Form */}
        <div className="min-w-0 border-b border-border p-4 sm:p-6 lg:border-b-0">
          <h3 className="mb-4 text-base font-semibold">
            {SOW_FORM_TABS.find((t) => t.id === activeTab)?.label}
          </h3>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
