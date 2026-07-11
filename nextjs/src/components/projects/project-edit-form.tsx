"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import {
  DEFAULT_LEAD_SECTION_ACCESS,
  PROJECT_LEAD_SECTIONS,
  PROJECT_TIMEZONE_OPTIONS,
  normalizeLeadSectionAccess,
} from "@/lib/project-lead-sections";
import { sortProjectNavSections } from "@/lib/project-visible-sections";

const STATUS_OPTIONS = ["Not Started", "Ongoing", "Finished", "Onhold"];

type AgentOption = { id: number; name: string; email: string };

function splitFullName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: "" };
  return { firstName: trimmed.slice(0, space), lastName: trimmed.slice(space + 1).trim() };
}

function joinFullName(firstName: string, lastName: string): string | null {
  const combined = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
  return combined || null;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
  );
}

export function ProjectEditForm({
  projectId,
  formId = "project-edit-form",
  onSuccess,
  onCancel,
  showActions = true,
}: {
  projectId: number;
  formId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  /** When false, parent drawer supplies Cancel / Save via form id. */
  showActions?: boolean;
}) {
  const appSettings = useAppSettingsOptional();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState("Not Started");
  const [usrNumber, setUsrNumber] = React.useState("");
  const [timezone, setTimezone] = React.useState("");
  const [propertyName, setPropertyName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [address2, setAddress2] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [zipCode, setZipCode] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [leadUserId, setLeadUserId] = React.useState("");
  const [sectionAccess, setSectionAccess] = React.useState<Record<string, boolean>>({
    ...DEFAULT_LEAD_SECTION_ACCESS,
  });
  const [securityDirectorFirstName, setSecurityDirectorFirstName] = React.useState("");
  const [securityDirectorLastName, setSecurityDirectorLastName] = React.useState("");
  const [securityDirectorPhone, setSecurityDirectorPhone] = React.useState("");
  const [securityDirectorEmail, setSecurityDirectorEmail] = React.useState("");
  const [sowPerDiem, setSowPerDiem] = React.useState("");
  const [sowDressCode, setSowDressCode] = React.useState("");
  const [agents, setAgents] = React.useState<AgentOption[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/project/${projectId}`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/project/${projectId}/roster?role=agent`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([project, roster]) => {
        if (cancelled) return;
        if (project?.error) throw new Error(project.error);

        setName(project.name ?? "");
        setDescription(project.description ?? "");
        setStatus(project.status ?? "Not Started");
        setUsrNumber(project.usr_number ?? "");
        setTimezone(project.timezone ?? "");
        setPropertyName(project.property_name ?? "");
        setAddress(project.address ?? "");
        setAddress2(project.address_2 ?? "");
        setCity(project.city ?? "");
        setState(project.state ?? "");
        setZipCode(project.zip_code ?? "");
        setStartDate(project.start_date ?? "");
        setEndDate(project.end_date ?? "");
        const directorName = splitFullName(project.security_director_name ?? "");
        setSecurityDirectorFirstName(directorName.firstName);
        setSecurityDirectorLastName(directorName.lastName);
        setSecurityDirectorPhone(project.security_director_phone ?? "");
        setSecurityDirectorEmail(project.security_director_email ?? "");
        setSowPerDiem(project.sow_per_diem ?? "");
        setSowDressCode(project.sow_dress_code ?? "");
        setLeadUserId(project.lead_user_id ? String(project.lead_user_id) : "");
        setSectionAccess(normalizeLeadSectionAccess(project.lead_section_access));

        const rosterList = Array.isArray(roster?.data) ? roster.data : [];
        setAgents(
          rosterList.map((u: { id: number; name: string; email: string }) => ({
            id: u.id,
            name: u.name ?? u.email ?? "",
            email: u.email ?? "",
          })),
        );
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load project");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const toggleSection = (id: string, enabled: boolean) => {
    setSectionAccess((prev) => ({ ...prev, [id]: enabled }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const projectRes = await fetch(`/api/project/${projectId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
          status: status || "Not Started",
          usr_number: usrNumber.trim() || null,
          timezone: timezone.trim() || null,
          property_name: propertyName.trim() || null,
          address: address.trim() || null,
          address_2: address2.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          zip_code: zipCode.trim() || null,
          security_director_name: joinFullName(securityDirectorFirstName, securityDirectorLastName),
          security_director_phone: securityDirectorPhone.trim() || null,
          security_director_email: securityDirectorEmail.trim() || null,
          sow_per_diem: sowPerDiem.trim() || null,
          sow_dress_code: sowDressCode.trim() || null,
          lead_section_access: sectionAccess,
        }),
      });
      const projectData = await projectRes.json().catch(() => null);
      if (!projectRes.ok) throw new Error(projectData?.error ?? "Failed to save project");

      const leadRes = await fetch(`/api/project/${projectId}/lead`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: leadUserId ? Number(leadUserId) : null,
        }),
      });
      const leadData = await leadRes.json().catch(() => null);
      if (!leadRes.ok) throw new Error(leadData?.error ?? "Failed to save lead agent");

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading project…</p>;
  }

  return (
    <form id={formId} onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <SectionHeading>Project info</SectionHeading>
        <div className="space-y-2">
          <Label htmlFor="edit-proj-name">Program name *</Label>
          <Input
            id="edit-proj-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-proj-desc">Description</Label>
          <Textarea
            id="edit-proj-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the project…"
            rows={3}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-proj-usr">USR #</Label>
            <Input id="edit-proj-usr" value={usrNumber} onChange={(e) => setUsrNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Time zone</Label>
            <Select value={timezone || "__none__"} onValueChange={(v) => setTimezone(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select time zone…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {PROJECT_TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
                {timezone && !PROJECT_TIMEZONE_OPTIONS.includes(timezone as typeof PROJECT_TIMEZONE_OPTIONS[number]) ? (
                  <SelectItem value={timezone}>{timezone}</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-proj-venue">Property / venue name</Label>
          <Input
            id="edit-proj-venue"
            value={propertyName}
            onChange={(e) => setPropertyName(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-proj-address">Address</Label>
            <AddressAutocomplete
              id="edit-proj-address"
              apiKey={appSettings?.settings?.googleMapsApiKey}
              value={address}
              onChange={setAddress}
              onPlaceSelect={(addr) => {
                setAddress(addr.street || addr.formattedAddress || "");
                if (addr.city) setCity(addr.city);
                if (addr.state) setState(addr.state);
                if (addr.zip) setZipCode(addr.zip);
              }}
              placeholder="Start typing an address…"
              inputProps={{ autoComplete: "off" }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-proj-address-2">Address 2</Label>
            <Input
              id="edit-proj-address-2"
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
              placeholder="Apt, suite, unit (optional)"
              autoComplete="address-line2"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="edit-proj-city">City</Label>
            <Input id="edit-proj-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-proj-state">State</Label>
            <Input id="edit-proj-state" value={state} onChange={(e) => setState(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-proj-zip">ZIP code</Label>
            <Input id="edit-proj-zip" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Start date</Label>
            <DatePickerInput value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>End date</Label>
            <DatePickerInput value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeading>Scope of Work defaults</SectionHeading>
        <div className="space-y-2">
          <Label htmlFor="edit-proj-sow-per-diem">Per diem &amp; expenses</Label>
          <Textarea
            id="edit-proj-sow-per-diem"
            value={sowPerDiem}
            onChange={(e) => setSowPerDiem(e.target.value)}
            rows={4}
            placeholder="Default per diem language for all employee SOW documents…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-proj-sow-dress">Dress code</Label>
          <Textarea
            id="edit-proj-sow-dress"
            value={sowDressCode}
            onChange={(e) => setSowDressCode(e.target.value)}
            rows={3}
            placeholder="Default dress code for all employee SOW documents…"
          />
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeading>Team assignment</SectionHeading>
        <div className="space-y-2">
          <Label>Lead agent</Label>
          <Select value={leadUserId || "__none__"} onValueChange={(v) => setLeadUserId(v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select lead agent…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Unassigned</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                  {a.email ? ` (${a.email})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeading>Lead agent section access</SectionHeading>
        <p className="text-sm text-muted-foreground">
          Toggle which sections the lead agent can view for this project.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {sortProjectNavSections([...PROJECT_LEAD_SECTIONS], (s) => s.label).map((section) => (
            <div
              key={section.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <Label htmlFor={`section-${section.id}`} className="text-sm font-normal">
                {section.label}
              </Label>
              <Switch
                id={`section-${section.id}`}
                checked={sectionAccess[section.id] ?? true}
                onCheckedChange={(checked) => toggleSection(section.id, checked)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeading>Hotel security director</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-sec-first-name">First name</Label>
            <Input
              id="edit-sec-first-name"
              value={securityDirectorFirstName}
              onChange={(e) => setSecurityDirectorFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-sec-last-name">Last name</Label>
            <Input
              id="edit-sec-last-name"
              value={securityDirectorLastName}
              onChange={(e) => setSecurityDirectorLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-sec-phone">Phone</Label>
            <PhoneInput
              id="edit-sec-phone"
              value={securityDirectorPhone}
              onChange={(v) => setSecurityDirectorPhone(v)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-sec-email">Email</Label>
            <Input
              id="edit-sec-email"
              type="email"
              value={securityDirectorEmail}
              onChange={(e) => setSecurityDirectorEmail(e.target.value)}
            />
          </div>
        </div>
      </div>

      {showActions ? (
        <div className="flex items-center gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
