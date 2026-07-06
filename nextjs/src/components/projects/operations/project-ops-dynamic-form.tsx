"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FormFieldRenderer } from "@/components/form-builder/form-field-renderer";
import type { FormFieldDef } from "@/components/form-builder/form-field-types";
import { isStructuralFieldType } from "@/components/form-builder/form-field-types";
import { collectFieldErrors } from "@/lib/form-field-validation";
import {
  getFieldBindKey,
  mapFormValuesToPayload,
  mapPayloadToFormValues,
} from "@/lib/project-ops-form-utils";
import type { ProjectOpsSectionId } from "@/lib/project-ops-form-templates";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";

const PROJECT_FIELD_TYPES = new Set([
  "file",
  "project_roster",
  "project_members",
  "project_users",
  "project_stages",
  "project_milestones",
  "project_vendors",
]);

type StageOption = { id: number; name: string };
type MemberOption = { id: number; name: string; email?: string };
type MilestoneOption = { id: number; title: string };
type VendorOption = { id: number; name: string };

export type ProjectOpsFormContext = {
  stages?: StageOption[];
  members?: MemberOption[];
  milestones?: MilestoneOption[];
  roster?: MemberOption[];
  vendors?: VendorOption[];
  users?: MemberOption[];
};

type LoadedForm = {
  id: string;
  name: string;
  defaultLayout: string;
  fields: FormFieldDef[];
};

function rosterRoleFromField(field: FormFieldDef): string {
  const opts = field.options;
  if (opts && typeof opts === "object" && !Array.isArray(opts)) {
    const role = (opts as { role?: unknown }).role;
    if (typeof role === "string") return role;
  }
  return "all";
}

function stageKindFromField(field: FormFieldDef): "task" | "bug" {
  const opts = field.options;
  if (opts && typeof opts === "object" && !Array.isArray(opts)) {
    const kind = (opts as { stageKind?: unknown }).stageKind;
    if (kind === "bug") return "bug";
  }
  return "task";
}

function ProjectOpsField({
  field,
  value,
  onChange,
  error,
  projectId,
  context,
}: {
  field: FormFieldDef;
  value: unknown;
  onChange: (val: unknown) => void;
  error?: string;
  projectId: number;
  context: ProjectOpsFormContext;
}) {
  const fieldId = `field_${field.id}`;

  if (!PROJECT_FIELD_TYPES.has(field.type)) {
    return <FormFieldRenderer field={field} value={value} onChange={onChange} error={error} />;
  }

  if (field.type === "file") {
    const file = value instanceof File ? value : null;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldId}>{field.label}{field.required ? " *" : ""}</Label>
        <Input
          id={fieldId}
          type="file"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        {file ? <p className="text-xs text-muted-foreground">{file.name}</p> : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "project_roster") {
    const role = rosterRoleFromField(field);
    const [options, setOptions] = React.useState<MemberOption[]>(context.roster ?? []);
    React.useEffect(() => {
      if (context.roster?.length) {
        setOptions(context.roster);
        return;
      }
      const q = role !== "all" ? `?role=${role}` : "";
      fetch(`/api/project/${projectId}/roster${q}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setOptions(Array.isArray(d.data) ? d.data : []))
        .catch(() => setOptions([]));
    }, [context.roster, projectId, role]);

    return (
      <div className="space-y-1.5">
        <Label>{field.label}{field.required ? " *" : ""}</Label>
        <Select value={value != null && value !== "" ? String(value) : ""} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder={field.placeholder || t("Select…")} /></SelectTrigger>
          <SelectContent>
            {options.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "project_vendors") {
    const [options, setOptions] = React.useState<VendorOption[]>(context.vendors ?? []);
    React.useEffect(() => {
      if (context.vendors?.length) {
        setOptions(context.vendors);
        return;
      }
      fetch(`/api/project/${projectId}/vendors?roster=1`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          const list = Array.isArray(d.data) ? d.data : [];
          setOptions(list.map((v: { id: number; name: string }) => ({ id: v.id, name: v.name })));
        })
        .catch(() => setOptions([]));
    }, [context.vendors, projectId]);

    return (
      <div className="space-y-1.5">
        <Label>{field.label}{field.required ? " *" : ""}</Label>
        <Select value={value != null && value !== "" ? String(value) : ""} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder={field.placeholder || t("Select vendor…")} /></SelectTrigger>
          <SelectContent>
            {options.map((v) => (
              <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "project_stages") {
    const stages = context.stages ?? [];
    return (
      <div className="space-y-1.5">
        <Label>{field.label}{field.required ? " *" : ""}</Label>
        <Select
          value={value != null && value !== "" ? String(value) : "__none__"}
          onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
        >
          <SelectTrigger><SelectValue placeholder={t("Select stage…")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t("None")}</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "project_milestones") {
    const milestones = context.milestones ?? [];
    return (
      <div className="space-y-1.5">
        <Label>{field.label}{field.required ? " *" : ""}</Label>
        <Select
          value={value != null && value !== "" ? String(value) : "__none__"}
          onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
        >
          <SelectTrigger><SelectValue placeholder={t("Select milestone…")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t("None")}</SelectItem>
            {milestones.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "project_members") {
    const members = context.members ?? [];
    const selected = Array.isArray(value) ? value.map(String) : [];
    const toggle = (id: number) => {
      const sid = String(id);
      onChange(selected.includes(sid) ? selected.filter((x) => x !== sid) : [...selected, sid]);
    };
    return (
      <div className="space-y-1.5">
        <Label>{field.label}</Label>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                selected.includes(String(m.id))
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted",
              )}
              onClick={() => toggle(m.id)}
            >
              {m.name}
            </button>
          ))}
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "project_users") {
    const [search, setSearch] = React.useState("");
    const [users, setUsers] = React.useState<MemberOption[]>(context.users ?? []);
    React.useEffect(() => {
      const params = new URLSearchParams({ per_page: "200", include_employees: "1" });
      if (search.trim()) params.set("search", search.trim());
      fetch(`/api/users/list?${params}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setUsers(Array.isArray(d.data) ? d.data : []))
        .catch(() => setUsers([]));
    }, [search, context.users]);

    return (
      <div className="space-y-1.5">
        <Label>{field.label}{field.required ? " *" : ""}</Label>
        <Input
          placeholder={t("Search users…")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={value != null && value !== "" ? String(value) : ""} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder={field.placeholder || t("Select user…")} /></SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return null;
}

export function useProjectSectionForm(sectionId: ProjectOpsSectionId) {
  const [form, setForm] = React.useState<LoadedForm | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/project/section-forms/${sectionId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!d?.data) throw new Error(d?.error ?? "Failed to load form");
        setForm(d.data as LoadedForm);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load form"))
      .finally(() => setLoading(false));
  }, [sectionId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  return { form, loading, error, reload };
}

export function ProjectOpsDynamicForm({
  sectionId,
  projectId,
  initialValues,
  context = {},
  onSubmit,
  submitLabel = "Save",
  disabled = false,
  className,
  hideSubmit = false,
  formId,
}: {
  sectionId: ProjectOpsSectionId;
  projectId: number;
  initialValues?: Record<string, unknown>;
  context?: ProjectOpsFormContext;
  onSubmit: (payload: Record<string, unknown>, files: Record<string, File>) => Promise<void>;
  submitLabel?: string;
  disabled?: boolean;
  className?: string;
  hideSubmit?: boolean;
  formId?: string;
}) {
  const { form, loading, error: loadError } = useProjectSectionForm(sectionId);
  const [values, setValues] = React.useState<Record<string, unknown>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!form) return;
    setValues(mapPayloadToFormValues(form.fields, initialValues ?? {}));
  }, [form, initialValues]);

  const setField = (fieldId: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [`field_${fieldId}`]: val }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`field_${fieldId}`];
      return next;
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form || disabled) return;
    setSubmitError(null);

    const validationValues = { ...values };
    for (const field of form.fields) {
      if (field.type !== "file") continue;
      const v = values[`field_${field.id}`];
      validationValues[`field_${field.id}`] = v instanceof File ? v.name : v;
    }

    const fieldErrors = collectFieldErrors(form.fields, validationValues);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const payload = mapFormValuesToPayload(form.fields, values);
    const files: Record<string, File> = {};
    for (const field of form.fields) {
      if (field.type !== "file") continue;
      const v = values[`field_${field.id}`];
      if (v instanceof File) files[getFieldBindKey(field)] = v;
    }

    setSaving(true);
    try {
      await onSubmit(payload, files);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("Save failed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 py-8 text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("Loading form…")}
      </div>
    );
  }

  if (loadError || !form) {
    return <p className={cn("text-sm text-destructive py-4", className)}>{loadError ?? t("Form unavailable")}</p>;
  }

  const content = (
    <div className={cn("space-y-4", className)}>
      {form.fields
        .filter((f) => !isStructuralFieldType(f.type))
        .map((field) => (
          <ProjectOpsField
            key={field.id}
            field={field}
            value={values[`field_${field.id}`]}
            onChange={(val) => setField(field.id, val)}
            error={errors[`field_${field.id}`]}
            projectId={projectId}
            context={context}
          />
        ))}
      {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
      {!hideSubmit ? (
        <Button type="submit" disabled={disabled || saving} onClick={() => void handleSubmit()}>
          {saving ? t("Saving…") : submitLabel}
        </Button>
      ) : null}
    </div>
  );

  if (formId) {
    return (
      <form id={formId} onSubmit={(e) => void handleSubmit(e)}>
        {content}
      </form>
    );
  }

  return content;
}

export function buildProjectOpsFormData(
  payload: Record<string, unknown>,
  files: Record<string, File>,
  extra?: Record<string, string>,
): FormData {
  const fd = new FormData();
  for (const [key, val] of Object.entries(extra ?? {})) fd.append(key, val);
  for (const [key, val] of Object.entries(payload)) {
    if (val == null) continue;
    if (Array.isArray(val)) fd.append(key, val.join(","));
    else fd.append(key, String(val));
  }
  for (const [key, file] of Object.entries(files)) fd.append(key, file);
  return fd;
}

/** Agent checklist column defs from form builder fields. */
export function agentChecklistColumnsFromForm(fields: FormFieldDef[]) {
  return fields
    .filter((f) => f.type === "checkbox" && !isStructuralFieldType(f.type))
    .map((f) => ({
      key: getFieldBindKey(f),
      label: f.label,
    }));
}

export { stageKindFromField };
