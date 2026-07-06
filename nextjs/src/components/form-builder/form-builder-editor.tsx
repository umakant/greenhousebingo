"use client";

import * as React from "react";
import { Plus, Trash2, Eye, EyeOff, Save, Copy, ArrowUp, ArrowDown, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  FIELD_TYPES,
  LAYOUT_OPTIONS,
  needsOptions,
  isStructuralFieldType,
  asSelectOptions,
  type FormFieldDef,
} from "./form-field-types";
import { DEFAULT_LICENSE_DOCUMENT_CARDS } from "./license-documents-field";
import { SignaturePad } from "./signature-pad";
import { t } from "@/lib/admin-t";


/** Live signature pad in form preview (local state only). */
function PreviewSignatureField() {
  const [v, setV] = React.useState("");
  return (
    <div className="mt-1">
      <p className="text-[11px] text-muted-foreground mb-2">{t("Draw your signature below (preview).")}</p>
      <SignaturePad value={v} onChange={setV} />
    </div>
  );
}

export type { FormFieldDef };

interface Props {
  initialName?: string;
  initialIsActive?: boolean;
  initialLayout?: string;
  initialFields?: FormFieldDef[];
  onSave: (data: { name: string; is_active: boolean; default_layout: string; fields: FormFieldDef[] }) => Promise<void>;
  saving?: boolean;
  formCode?: string;
  formId?: string;
  showConvertButton?: boolean;
  onConvert?: () => void;
  /** e.g. embedded create flow — shows Back in the toolbar */
  onCancel?: () => void;
}

function getFieldTypeIcon(type: string) {
  const ft = FIELD_TYPES.find(f => f.value === type);
  if (!ft) return null;
  const Icon = ft.icon;
  return <Icon className="h-4 w-4" />;
}

function getFieldTypeBg(type: string) {
  const colors: Record<string, string> = {
    text: "bg-blue-100 text-blue-600",
    email: "bg-purple-100 text-purple-600",
    number: "bg-orange-100 text-orange-600",
    tel: "bg-green-100 text-green-600",
    url: "bg-cyan-100 text-cyan-600",
    password: "bg-red-100 text-red-600",
    textarea: "bg-yellow-100 text-yellow-600",
    select: "bg-indigo-100 text-indigo-600",
    radio: "bg-pink-100 text-pink-600",
    checkbox: "bg-teal-100 text-teal-600",
    date: "bg-lime-100 text-lime-600",
    time: "bg-amber-100 text-amber-600",
    signature: "bg-violet-100 text-violet-700",
    license_documents: "bg-sky-100 text-sky-800",
    uscis_i9_section1: "bg-blue-100 text-blue-900",
    background_check_consent: "bg-emerald-100 text-emerald-900",
    drug_testing_consent: "bg-teal-100 text-teal-900",
    nda_consent: "bg-slate-200 text-slate-800",
    section: "bg-slate-100 text-slate-700",
    heading: "bg-rose-50 text-rose-800",
    description: "bg-muted text-muted-foreground",
  };
  return colors[type] ?? "bg-gray-100 text-gray-600";
}

export function FormBuilderEditor({
  initialName = "",
  initialIsActive = true,
  initialLayout = "single",
  initialFields = [],
  onSave,
  saving = false,
  formCode,
  showConvertButton = false,
  onConvert,
  onCancel,
}: Props) {
  const [name, setName] = React.useState(initialName);
  const [isActive, setIsActive] = React.useState(initialIsActive);
  const [layout, setLayout] = React.useState(initialLayout);
  const [fields, setFields] = React.useState<FormFieldDef[]>(initialFields);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  const requiredCount = fields.filter(f => f.required && !isStructuralFieldType(f.type)).length;

  // Count how many fields of each type
  const typeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of fields) counts[f.type] = (counts[f.type] ?? 0) + 1;
    return counts;
  }, [fields]);

  const [fieldTypeSearch, setFieldTypeSearch] = React.useState("");

  const filteredFieldTypes = React.useMemo(() => {
    const q = fieldTypeSearch.trim().toLowerCase();
    if (!q) return FIELD_TYPES;
    return FIELD_TYPES.filter(ft => {
      const label = ft.label.toLowerCase();
      const value = ft.value.toLowerCase();
      const valueSpaced = value.replace(/_/g, " ");
      return label.includes(q) || value.includes(q) || valueSpaced.includes(q);
    });
  }, [fieldTypeSearch]);

  function addField(type: string) {
    const ft = FIELD_TYPES.find(f => f.value === type);
    const isStruct = isStructuralFieldType(type);
    const label =
      type === "section"
        ? "Section title"
        : type === "heading"
          ? "GROUP LABEL"
          : type === "description"
            ? "Help text"
            : `${ft?.label ?? "New"} Field`;
    const newField: FormFieldDef = {
      id: `new_${Date.now()}`,
      label,
      type,
      required: false,
      placeholder: isStruct ? "" : type === "signature" ? t("Draw your signature in the box below") : `Enter ${ft?.label?.toLowerCase() ?? "value"}`,
      options: needsOptions(type)
        ? ["Option 1", "Option 2"]
        : type === "license_documents"
          ? { cards: DEFAULT_LICENSE_DOCUMENT_CARDS }
          : type === "uscis_i9_section1" ||
              type === "background_check_consent" ||
              type === "drug_testing_consent" ||
              type === "nda_consent"
            ? {}
            : [],
      order: fields.length,
    };
    setFields(prev => [...prev, newField]);
    setSelectedId(newField.id);
  }

  function updateField(id: string, updates: Partial<FormFieldDef>) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }

  function removeField(id: string) {
    setFields(prev => {
      const next = prev.filter(f => f.id !== id).map((f, i) => ({ ...f, order: i }));
      return next;
    });
    if (selectedId === id) setSelectedId(null);
  }

  function moveField(id: string, dir: "up" | "down") {
    const idx = fields.findIndex(f => f.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === fields.length - 1) return;
    const next = [...fields];
    const target = dir === "up" ? idx - 1 : idx + 1;
    [next[idx], next[target]] = [next[target], next[idx]];
    setFields(next.map((f, i) => ({ ...f, order: i })));
  }

  function addOption(fieldId: string) {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    const cur = asSelectOptions(field.options);
    updateField(fieldId, { options: [...cur, `Option ${cur.length + 1}`] });
  }

  function updateOption(fieldId: string, idx: number, val: string) {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    const opts = [...asSelectOptions(field.options)];
    opts[idx] = val;
    updateField(fieldId, { options: opts });
  }

  function removeOption(fieldId: string, idx: number) {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    const cur = asSelectOptions(field.options);
    updateField(fieldId, { options: cur.filter((_, i) => i !== idx) });
  }

  async function handleSave() {
    if (!name.trim()) { toast.error(t("Form name is required")); return; }
    await onSave({ name: name.trim(), is_active: isActive, default_layout: layout, fields });
  }

  async function copyLink() {
    if (!formCode) return;
    const url = `${window.location.origin}/forms/${formCode}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success(t("Form link copied!"));
  }

  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-0">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t("Back to forms")}
            </Button>
          )}
          {formCode && (
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="h-4 w-4 mr-1" />
              {copiedLink ? t("Copied!") : t("Copy Link")}
            </Button>
          )}
          {showConvertButton && (
            <Button variant="outline" size="sm" onClick={onConvert}>
              {t("Convert To")}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setPreview(p => !p)}>
            {preview ? <><EyeOff className="h-4 w-4 mr-1" />{t("Editor")}</> : <><Eye className="h-4 w-4 mr-1" />{t("Preview")}</>}
          </Button>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="min-w-[110px]">
          <Save className="h-4 w-4 mr-1.5" />
          {saving ? t("Saving...") : t("Save Form")}
        </Button>
      </div>

      {preview ? (
        /* ——— PREVIEW MODE ——— */
        <Card className="shadow-sm max-w-2xl mx-auto">
          <CardHeader className="border-b py-4 px-5">
            <CardTitle className="text-lg">{name || t("Untitled Form")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("Form preview — not editable")}</p>
          </CardHeader>
          <CardContent className="p-5">
            {fields.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">{t("No fields added yet")}</p>
            ) : (
              <div className={layout === "two-column" ? "grid grid-cols-2 gap-4" : "space-y-4"}>
                {sortedFields.map(field => (
                  <div key={field.id} className={layout === "card" ? "border rounded-md p-4" : ""}>
                    <StaticFieldPreview field={field} />
                  </div>
                ))}
              </div>
            )}
            {fields.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <Button className="w-full" size="lg" disabled>{t("Submit Form")}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* ——— EDITOR MODE — two-panel layout ——— */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">

          {/* LEFT PANEL: config + field palette */}
          <div className="lg:col-span-2 space-y-4">

            {/* Form Configuration */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  ⚙️ {t("Form Configuration")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    {t("Form Name")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t("Enter form name")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t("Enable Form")}</Label>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{t("Default Layout")}</Label>
                  <Select value={layout} onValueChange={setLayout}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LAYOUT_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Form Statistics */}
                <div className="space-y-2 pt-1">
                  <Label className="text-sm font-medium">{t("Form Statistics")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">{fields.length}</p>
                      <p className="text-xs text-blue-500 mt-0.5">{t("Fields")}</p>
                    </div>
                    <div className="rounded-md bg-green-50 border border-green-100 p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{requiredCount}</p>
                      <p className="text-xs text-green-500 mt-0.5">{t("Required")}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Field Types */}
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="py-3 px-4 border-b bg-muted/20 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5 shrink-0">
                    <Plus className="h-4 w-4 text-primary" aria-hidden /> {t("Available Field Types")}
                  </CardTitle>
                  <div className="relative w-full sm:max-w-[220px] sm:shrink-0">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      value={fieldTypeSearch}
                      onChange={e => setFieldTypeSearch(e.target.value)}
                      placeholder={t("Search types...")}
                      className="h-9 pl-8 text-xs bg-background"
                      aria-label={t("Filter field types")}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-3 gap-2">
                  {filteredFieldTypes.length === 0 ? (
                    <div className="col-span-3 rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center">
                      <Search className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" aria-hidden />
                      <p className="text-sm font-medium text-foreground">{t("No field types match")}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("Try a different search term.")}</p>
                    </div>
                  ) : (
                    filteredFieldTypes.map(ft => {
                      const Icon = ft.icon;
                      const count = typeCounts[ft.value] ?? 0;
                      return (
                        <button
                          key={ft.value}
                          type="button"
                          onClick={() => addField(ft.value)}
                          className="relative flex flex-col items-center gap-1.5 p-3 rounded-lg border border-dashed border-border/80 bg-background/50 hover:border-primary hover:bg-primary/5 transition-colors text-center group"
                        >
                          {count > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                              {count}
                            </span>
                          )}
                          <div className={`h-8 w-8 rounded-md flex items-center justify-center ${getFieldTypeBg(ft.value)}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-[11px] leading-tight text-muted-foreground group-hover:text-foreground">
                            {ft.label}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT PANEL: form preview / inline editor */}
          <div className="lg:col-span-3">
            <Card className="shadow-sm min-h-[500px]">
              <CardHeader className="py-3 px-5 border-b flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  👁 {t("Form Preview")}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {fields.length} {fields.length === 1 ? t("field") : t("fields")}
                </span>
              </CardHeader>

              <CardContent className="p-4">
                {sortedFields.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="h-14 w-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                      <Plus className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-700">{t("Start Building Your Form")}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("Click on any field type from the sidebar to add it to your form")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className="rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-1">{t("Easy Setup")}</span>
                      <span className="rounded-full bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-1">{t("Click to Add")}</span>
                    </div>
                  </div>
                ) : (
                  /* Field list with inline editing */
                  <div className="space-y-3">
                    {sortedFields.map((field, idx) => (
                      <FieldCard
                        key={field.id}
                        field={field}
                        index={idx}
                        total={fields.length}
                        isSelected={selectedId === field.id}
                        onSelect={() => setSelectedId(selectedId === field.id ? null : field.id)}
                        onUpdate={updates => updateField(field.id, updates)}
                        onDelete={() => removeField(field.id)}
                        onMoveUp={() => moveField(field.id, "up")}
                        onMoveDown={() => moveField(field.id, "down")}
                        onAddOption={() => addOption(field.id)}
                        onUpdateOption={(i, v) => updateOption(field.id, i, v)}
                        onRemoveOption={(i) => removeOption(field.id, i)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

/* ——— Field Card (inline editor) ——— */
interface FieldCardProps {
  field: FormFieldDef;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (u: Partial<FormFieldDef>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddOption: () => void;
  onUpdateOption: (i: number, v: string) => void;
  onRemoveOption: (i: number) => void;
}

function FieldCard({
  field, index, total, isSelected,
  onSelect, onUpdate, onDelete, onMoveUp, onMoveDown,
  onAddOption, onUpdateOption, onRemoveOption,
}: FieldCardProps) {
  const ft = FIELD_TYPES.find(f => f.value === field.type);
  const Icon = ft?.icon;
  const bgClass = getFieldTypeBg(field.type);
  const isStruct = isStructuralFieldType(field.type);

  return (
    <div
      className={`rounded-lg border transition-all ${isSelected ? "border-primary shadow-sm bg-primary/[0.02]" : "border-gray-200 hover:border-gray-300 bg-white"}`}
    >
      {/* Field header row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onSelect}
      >
        <div className={`h-9 w-9 rounded-md flex items-center justify-center flex-shrink-0 ${bgClass}`}>
          {Icon && <Icon className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{field.label}</p>
          <p className="text-xs text-muted-foreground capitalize">{ft?.label ?? field.type}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onMoveUp} disabled={index === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30 text-muted-foreground">
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30 text-muted-foreground">
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Inline editor (when selected) */}
      {isSelected && (
        <div className="border-t px-4 py-3 bg-gray-50/60 rounded-b-lg space-y-3">
            <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">{t("Field Label")}</Label>
              <Input
                value={field.label}
                onChange={e => onUpdate({ label: e.target.value })}
                placeholder={t("Field label")}
                className="h-8 text-sm bg-white"
              />
            </div>
            <div className="space-y-1 flex items-end gap-3">
              {field.type !== "checkbox" && field.type !== "radio" && field.type !== "select" && field.type !== "signature" && field.type !== "license_documents" && field.type !== "uscis_i9_section1" && field.type !== "background_check_consent" && field.type !== "drug_testing_consent" && field.type !== "nda_consent" && !isStruct && (
                <div className="flex-1 space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">{t("Placeholder Text")}</Label>
                  <Input
                    value={field.placeholder}
                    onChange={e => onUpdate({ placeholder: e.target.value })}
                    placeholder={t("Placeholder")}
                    className="h-8 text-sm bg-white"
                  />
                </div>
              )}
              {!isStruct && (
                <div className="flex items-center gap-2 pb-0.5 flex-shrink-0">
                  <Label className="text-xs font-medium text-muted-foreground">{t("Required")}</Label>
                  <Switch
                    checked={field.required}
                    onCheckedChange={v => onUpdate({ required: v })}
                    className="h-5 w-9 data-[state=checked]:bg-primary"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Options for select/radio/checkbox */}
          {needsOptions(field.type) && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t("Options")}</Label>
              <div className="space-y-1.5">
                {asSelectOptions(field.options).map((opt, i) => (
                  <div key={i} className="flex gap-1.5 items-center">
                    <Input
                      value={opt}
                      onChange={e => onUpdateOption(i, e.target.value)}
                      className="h-7 text-sm flex-1 bg-white"
                    />
                    <button
                      onClick={() => onRemoveOption(i)}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 flex-shrink-0"
                      disabled={asSelectOptions(field.options).length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={onAddOption}>
                  <Plus className="h-3 w-3 mr-1" />{t("Add Option")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ——— Static field preview (preview mode) ——— */
function StaticFieldPreview({ field }: { field: FormFieldDef }) {
  if (field.type === "section") {
    return (
      <div className="pt-4 border-t">
        <p className="text-sm font-semibold">{field.label}</p>
      </div>
    );
  }
  if (field.type === "heading") {
    return <p className="text-[11px] font-bold uppercase tracking-wider text-[#722f37]">{field.label}</p>;
  }
  if (field.type === "description") {
    return <p className="text-sm text-muted-foreground">{field.label}</p>;
  }
  const label = (
    <label className="block text-sm font-medium mb-1">
      {field.label}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
  switch (field.type) {
    case "textarea":
      return <div>{label}<textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px] bg-gray-50" placeholder={field.placeholder} disabled /></div>;
    case "select":
      return <div>{label}<select className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50" disabled><option>{field.placeholder || "Select..."}</option></select></div>;
    case "radio":
      return <div>{label}<div className="space-y-1">{asSelectOptions(field.options).map((o, i) => <label key={i} className="flex items-center gap-2 text-sm"><input type="radio" disabled />{o}</label>)}</div></div>;
    case "checkbox":
      return <div className="flex items-center gap-2"><input type="checkbox" disabled /><label className="text-sm">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label></div>;
    case "signature":
      return (
        <div>
          {label}
          <PreviewSignatureField />
        </div>
      );
    case "license_documents":
      return (
        <div>
          {label}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded border border-dashed border-slate-200 bg-slate-50 p-2 text-[10px] text-muted-foreground text-center">
                {t("Front / Back")}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{t("Card list is configurable in field options (JSON).")}</p>
        </div>
      );
    case "uscis_i9_section1":
      return (
        <div>
          {label}
          <div className="mt-2 rounded border border-blue-200 bg-blue-50/50 h-24 flex items-center justify-center text-[11px] text-muted-foreground px-2 text-center">
            {t("Form I-9 Section 1 — employee fields, attestation, signature")}
          </div>
        </div>
      );
    case "background_check_consent":
      return (
        <div>
          {label}
          <div className="mt-2 rounded border border-emerald-200 bg-emerald-50/50 h-20 flex items-center justify-center text-[11px] text-muted-foreground px-2 text-center">
            {t("Consent text, decline checkbox, signature, Sign & Submit")}
          </div>
        </div>
      );
    case "drug_testing_consent":
      return (
        <div>
          {label}
          <div className="mt-2 rounded border border-teal-200 bg-teal-50/50 h-20 flex items-center justify-center text-[11px] text-muted-foreground px-2 text-center">
            {t("Drug screening authorization, signature, Sign & Submit")}
          </div>
        </div>
      );
    case "nda_consent":
      return (
        <div>
          {label}
          <div className="mt-2 rounded border border-slate-300 bg-white h-24 flex items-center justify-center text-[11px] text-muted-foreground px-2 text-center font-serif">
            {t("NDA document (serif) + signature")}
          </div>
        </div>
      );
    default:
      return <div>{label}<input type={field.type} placeholder={field.placeholder} className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50" disabled /></div>;
  }
}
