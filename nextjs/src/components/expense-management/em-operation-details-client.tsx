"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";

import { EmMatterWorkspaceShell } from "@/components/expense-management/em-matter-workspace-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmWorkspaceContext } from "@/hooks/use-em-workspace-context";
import { useTranslation } from "@/contexts/translation-context";

function yesNoLabel(v: boolean, t: (s: string) => string) {
  return v ? t("Yes") : t("No");
}

export function EmOperationDetailsClient({ canEdit }: { canEdit: boolean }) {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const { data, loading, error, patch } = useEmWorkspaceContext();

  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [tsheetsBased, setTsheetsBased] = React.useState(false);
  const [aarRequired, setAarRequired] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!data) return;
    setStartDate(data.operationStartDate ?? "");
    setEndDate(data.operationEndDate ?? "");
    setTsheetsBased(data.tsheetsBased);
    setAarRequired(data.aarRequired);
  }, [data]);

  async function save() {
    if (!canEdit) return;
    setSaving(true);
    setSaveError(null);
    try {
      await patch({
        operationStartDate: startDate || null,
        operationEndDate: endDate || null,
        tsheetsBased,
        aarRequired,
      });
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : t("Failed to save."));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return (
      <EmMatterWorkspaceShell active="operation" panelTitle={t("Operation Details")}>
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("Loading...")}
        </div>
      </EmMatterWorkspaceShell>
    );
  }

  return (
    <EmMatterWorkspaceShell active="operation" panelTitle={t("Operation Details")}>
      <div className="space-y-6">
        {(error || saveError) && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {saveError || error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="em-op-start">{t("Start Date")} *</Label>
            <DatePickerInput
              id="em-op-start"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={!canEdit || saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="em-op-end">{t("End Date")} *</Label>
            <DatePickerInput
              id="em-op-end"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={!canEdit || saving}
            />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("Requesting Department")}
            </p>
            <p className="text-sm">{data?.requestingDepartment ?? "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("Receiving Department")}
            </p>
            <p className="text-sm">{data?.receivingDepartment ?? "—"}</p>
          </div>
          <div className="space-y-2">
            <Label>{t("Is this Tsheets based?")}</Label>
            <Select
              value={tsheetsBased ? "yes" : "no"}
              onValueChange={(v) => setTsheetsBased(v === "yes")}
              disabled={!canEdit || saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">{t("Yes")}</SelectItem>
                <SelectItem value="no">{t("No")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("After Action Report Required?")}</Label>
            <Select
              value={aarRequired ? "yes" : "no"}
              onValueChange={(v) => setAarRequired(v === "yes")}
              disabled={!canEdit || saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">{t("Yes")}</SelectItem>
                <SelectItem value="no">{t("No")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!canEdit ? (
          <p className="text-xs text-muted-foreground">
            {t("Operation flags")}: {t("Tsheets")} {yesNoLabel(tsheetsBased, t)}, {t("AAR required")}{" "}
            {yesNoLabel(aarRequired, t)}
          </p>
        ) : (
          <div className="flex justify-end border-t pt-4">
            <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {t("Save Changes")}
            </Button>
          </div>
        )}
      </div>
    </EmMatterWorkspaceShell>
  );
}
