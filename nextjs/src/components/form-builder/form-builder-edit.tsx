"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormBuilderEditor, type FormFieldDef } from "./form-builder-editor";

export default function FormBuilderEditContent({ formId }: { formId: string }) {
  const router = useRouter();
  const [form, setForm] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/form-builder/forms/${formId}`)
      .then(r => r.json())
      .then(j => setForm(j.data))
      .catch(() => toast.error("Failed to load form"))
      .finally(() => setLoading(false));
  }, [formId]);

  async function handleSave(data: any) {
    setSaving(true);
    try {
      const res = await fetch(`/api/form-builder/forms/${formId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error || "Failed to save form"); return; }
      toast.success("Form saved successfully!");
      setForm(json.data);
    } finally { setSaving(false); }
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading form...</div>;
  if (!form) return <div className="py-20 text-center text-red-500">Form not found</div>;

  return (
    <FormBuilderEditor
      initialName={form.name}
      initialIsActive={form.isActive}
      initialLayout={form.defaultLayout}
      initialFields={(form.fields ?? []).map((f: any): FormFieldDef => ({
        id: f.id,
        label: f.label,
        type: f.type,
        required: f.required,
        placeholder: f.placeholder ?? "",
        options: f.options != null ? f.options : [],
        order: f.order,
      }))}
      onSave={handleSave}
      saving={saving}
      formCode={form.code}
      formId={formId}
      showConvertButton
      onConvert={() => router.push(`/form-builder/${formId}/convert`)}
    />
  );
}
