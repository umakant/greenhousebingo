"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormBuilderEditor } from "./form-builder-editor";
import type { FormFieldDef } from "./form-field-types";

export type FormBuilderCreateContentProps = {
  /** When set (e.g. Settings → Form Builder tab), success stays in context instead of only navigating away */
  onCreated?: (formId: string) => void;
  onCancel?: () => void;
  /** Pre-filled from template (e.g. Onboarding Packet) */
  initialName?: string;
  initialLayout?: string;
  initialFields?: FormFieldDef[];
};

export default function FormBuilderCreateContent({
  onCreated,
  onCancel,
  initialName,
  initialLayout,
  initialFields,
}: FormBuilderCreateContentProps = {}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const saveLock = React.useRef(false);

  async function handleSave(data: {
    name: string;
    is_active: boolean;
    default_layout: string;
    fields: FormFieldDef[];
  }) {
    if (saveLock.current || saving) return;
    saveLock.current = true;
    setSaving(true);
    try {
      const res = await fetch("/api/form-builder/forms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Failed to create form");
        return;
      }
      toast.success("Form created successfully!");
      const id = String(json.data?.id ?? "");
      if (onCreated) {
        onCreated(id);
        return;
      }
      router.push(`/form-builder/${id}/edit`);
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  return (
    <FormBuilderEditor
      onSave={handleSave}
      onCancel={onCancel}
      initialName={initialName}
      initialLayout={initialLayout}
      initialFields={initialFields}
      saving={saving}
    />
  );
}
