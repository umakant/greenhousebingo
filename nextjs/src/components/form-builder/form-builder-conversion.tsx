"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Zap, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AVAILABLE_MODULES } from "./form-field-types";
import { t } from "@/lib/admin-t";


interface FormField { id: string; label: string; type: string; }

export default function FormBuilderConversion({ formId }: { formId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [formFields, setFormFields] = React.useState<FormField[]>([]);

  const [selectedModule, setSelectedModule] = React.useState("");
  const [selectedSubmodule, setSelectedSubmodule] = React.useState("");
  const [isActive, setIsActive] = React.useState(false);
  const [fieldMappings, setFieldMappings] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    fetch(`/api/form-builder/forms/${formId}/conversion`)
      .then(r => r.json())
      .then(j => {
        setFormFields(j.fields ?? []);
        if (j.conversion) {
          setSelectedModule(j.conversion.moduleName ?? "");
          setSelectedSubmodule(j.conversion.submoduleName ?? "");
          setIsActive(j.conversion.isActive ?? false);
          setFieldMappings(j.conversion.fieldMappings ?? {});
        }
      })
      .catch(() => toast.error(t("Failed to load conversion data")))
      .finally(() => setLoading(false));
  }, [formId]);

  const modules = Object.keys(AVAILABLE_MODULES);
  const submodules = selectedModule ? Object.keys(AVAILABLE_MODULES[selectedModule] ?? {}) : [];
  const moduleFields = (selectedModule && selectedSubmodule)
    ? AVAILABLE_MODULES[selectedModule]?.[selectedSubmodule] ?? {}
    : {};

  function handleModuleChange(mod: string) {
    setSelectedModule(mod);
    setSelectedSubmodule("");
    setFieldMappings({});
  }

  function handleSubmoduleChange(sub: string) {
    setSelectedSubmodule(sub);
    setFieldMappings({});
  }

  function updateMapping(moduleFieldKey: string, formFieldId: string) {
    setFieldMappings(prev => ({ ...prev, [moduleFieldKey]: formFieldId }));
  }

  async function handleSave() {
    if (!selectedModule || !selectedSubmodule) {
      toast.error(t("Please select a module and submodule"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/form-builder/forms/${formId}/conversion`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          module_name: selectedModule,
          submodule_name: selectedSubmodule,
          is_active: isActive,
          field_mappings: fieldMappings,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error || t("Save failed")); return; }
      toast.success(t("Conversion settings saved!"));
    } finally { setSaving(false); }
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">{t("Loading...")}</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <Card className="shadow-sm">
        <CardHeader className="py-4 px-5 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push(`/form-builder/${formId}/edit`)}>
                <ArrowLeft className="h-4 w-4 mr-1" />{t("Back to Editor")}
              </Button>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                {t("Convert Form Responses To Records")}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">{t("Active")}</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          <p className="text-sm text-muted-foreground">
            {t("When someone submits this form, automatically create a record in the selected module.")}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("Module")}</Label>
              <Select value={selectedModule} onValueChange={handleModuleChange}>
                <SelectTrigger><SelectValue placeholder={t("Select module...")} /></SelectTrigger>
                <SelectContent>
                  {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Record Type")}</Label>
              <Select value={selectedSubmodule} onValueChange={handleSubmoduleChange} disabled={!selectedModule}>
                <SelectTrigger><SelectValue placeholder={t("Select type...")} /></SelectTrigger>
                <SelectContent>
                  {submodules.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedModule && selectedSubmodule && Object.keys(moduleFields).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold border-b pb-2">
                {t("Map Form Fields to")} {selectedSubmodule} {t("Fields")}
              </h3>
              <div className="space-y-2">
                {Object.entries(moduleFields).map(([key, meta]) => (
                  <div key={key} className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{meta.type}</p>
                    </div>
                    <Select
                      value={fieldMappings[key] ?? "__none__"}
                      onValueChange={v => updateMapping(key, v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t("Select form field...")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("— Not mapped —")}</SelectItem>
                        {formFields.map(ff => (
                          <SelectItem key={ff.id} value={ff.id}>{ff.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formFields.length === 0 && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
              {t("This form has no fields yet. Add fields first to set up conversion mappings.")}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? t("Saving...") : t("Save Conversion Settings")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
