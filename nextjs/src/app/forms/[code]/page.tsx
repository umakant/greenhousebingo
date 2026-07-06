"use client";

import * as React from "react";
import { use } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormFieldRenderer } from "@/components/form-builder/form-field-renderer";
import { FormDisplaySettingsProvider } from "@/components/form-builder/form-display-settings-context";
import { OnboardingFormShell, OnboardingSubmitBar } from "@/components/form-builder/onboarding-form-shell";
import { collectFieldErrors } from "@/lib/form-field-validation";
import { t } from "@/lib/admin-t";


interface FormDef {
  id: string;
  name: string;
  defaultLayout: string;
  /** System Settings → Date format (public forms; matches authenticated AppSettings). */
  dateFormat?: string;
  calendarStartDay?: string;
  fields: Array<{
    id: string;
    label: string;
    type: string;
    required: boolean;
    placeholder: string;
    options: unknown;
    order: number;
  }>;
}

export default function PublicFormPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [form, setForm] = React.useState<FormDef | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [values, setValues] = React.useState<Record<string, any>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`/api/forms/${code}`)
      .then(r => { if (r.status === 404) { setNotFound(true); return null; } return r.json(); })
      .then(j => { if (j) setForm(j); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code]);

  function validateForm(): boolean {
    if (!form) return false;
    const errs = collectFieldErrors(form.fields, values);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/forms/${code}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.fieldErrors && typeof json.fieldErrors === "object") {
          setErrors(json.fieldErrors as Record<string, string>);
        }
        setSubmitError(json?.error || t("Submission failed. Please try again."));
        return;
      }
      setSubmitted(true);
    } catch { setSubmitError(t("Network error. Please try again.")); } finally { setSubmitting(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-muted-foreground">{t("Loading form...")}</div>
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">{t("Form Not Found")}</h2>
            <p className="text-muted-foreground text-sm">{t("This form is not available or has been disabled.")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("Thank You!")}</h2>
            <p className="text-muted-foreground">{t("Your response has been submitted successfully.")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedFields = [...form.fields].sort((a, b) => a.order - b.order);

  function renderFields() {
    if (form!.defaultLayout === "onboarding") {
      return (
        <OnboardingFormShell
          formName={form!.name}
          fields={sortedFields}
          values={values}
          errors={errors}
          setErrors={setErrors}
          onChange={(fieldId, v) => setValues(prev => ({ ...prev, [`field_${fieldId}`]: v }))}
        >
          <OnboardingSubmitBar submitting={submitting} />
        </OnboardingFormShell>
      );
    }
    if (form!.defaultLayout === "two-column") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sortedFields.map(field => (
            <div
              key={field.id}
              className={
                field.type === "license_documents" ||
                field.type === "uscis_i9_section1" ||
                field.type === "background_check_consent" ||
                field.type === "drug_testing_consent" ||
                field.type === "nda_consent" ||
                field.type === "signature"
                  ? "md:col-span-2"
                  : undefined
              }
            >
              <FormFieldRenderer
                field={field}
                value={values[`field_${field.id}`]}
                onChange={v => setValues(prev => ({ ...prev, [`field_${field.id}`]: v }))}
                error={errors[`field_${field.id}`]}
              />
            </div>
          ))}
        </div>
      );
    }
    if (form!.defaultLayout === "card") {
      return (
        <div className="space-y-4">
          {sortedFields.map(field => (
            <div key={field.id} className="border rounded-md p-4">
              <FormFieldRenderer
                field={field}
                value={values[`field_${field.id}`]}
                onChange={v => setValues(prev => ({ ...prev, [`field_${field.id}`]: v }))}
                error={errors[`field_${field.id}`]}
              />
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-5">
        {sortedFields.map(field => (
          <FormFieldRenderer
            key={field.id}
            field={field}
            value={values[`field_${field.id}`]}
            onChange={v => setValues(prev => ({ ...prev, [`field_${field.id}`]: v }))}
            error={errors[`field_${field.id}`]}
          />
        ))}
      </div>
    );
  }

  const onboarding = form.defaultLayout === "onboarding";

  const displayPrefs = {
    dateFormat: (form.dateFormat ?? "Y-m-d").trim() || "Y-m-d",
    calendarStartDay: (form.calendarStartDay ?? "0").trim() || "0",
  };

  return (
    <FormDisplaySettingsProvider value={displayPrefs}>
    <div
      className={
        onboarding
          ? "min-h-screen bg-[#eef0f3] py-8 sm:py-10"
          : "min-h-screen bg-gray-50 py-10"
      }
    >
      <div className={onboarding ? "mx-auto max-w-[1600px] px-4 sm:px-6" : "mx-auto max-w-2xl px-4"}>
        <form onSubmit={handleSubmit} noValidate>
          {submitError && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 max-w-4xl mx-auto">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {submitError}
            </div>
          )}
          {form.fields.length === 0 ? (
            <Card className="max-w-2xl mx-auto">
              <CardContent className="py-8 text-center text-muted-foreground">{t("This form has no fields.")}</CardContent>
            </Card>
          ) : onboarding ? (
            renderFields()
          ) : (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">{form.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{t("Please fill out all required fields")}</p>
              </CardHeader>
              <CardContent>
                {renderFields()}
                <div className="pt-6 mt-6 border-t">
                  <Button type="submit" disabled={submitting} className="w-full" size="lg">
                    {submitting ? t("Submitting...") : t("Submit Form")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
    </FormDisplaySettingsProvider>
  );
}
