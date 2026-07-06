"use client";

import * as React from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

import { appConfirm } from "@/lib/app-confirm";
import { EmCostAdjustmentSheet } from "@/components/expense-management/em-cost-adjustment-sheet";
import { EmMatterWorkspaceShell } from "@/components/expense-management/em-matter-workspace-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEmWorkspaceContext } from "@/hooks/use-em-workspace-context";
import { useTranslation } from "@/contexts/translation-context";
import { EM_WORKSPACE_CONTEXT_CHANGED_EVENT } from "@/lib/em-workspace-events";

type AdjustmentRow = {
  id: string;
  details: string;
  attachmentUrl: string | null;
  amount: number | null;
};

export function EmCostTransferClient({ canEdit }: { canEdit: boolean }) {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const { data: ctx, patch } = useEmWorkspaceContext();

  const [totalHours, setTotalHours] = React.useState(0);
  const [totalExpenses, setTotalExpenses] = React.useState(0);
  const [adjustments, setAdjustments] = React.useState<AdjustmentRow[]>([]);
  const [mode, setMode] = React.useState<"default" | "custom">("default");
  const [customRate, setCustomRate] = React.useState("65");
  const [secondaryMatter, setSecondaryMatter] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [adjustmentOpen, setAdjustmentOpen] = React.useState(false);

  const defaultRate = ctx?.costTransferDefaultRate ?? 60;

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [teRes, linesRes, adjRes] = await Promise.all([
        fetch("/api/expense-management/time-entries", { credentials: "include", cache: "no-store" }),
        fetch("/api/expense-management/lines", { credentials: "include", cache: "no-store" }),
        fetch("/api/expense-management/cost-adjustments", { credentials: "include", cache: "no-store" }),
      ]);
      const teJson = (await teRes.json().catch(() => null)) as { totalHours?: number; error?: string } | null;
      const linesJson = (await linesRes.json().catch(() => null)) as {
        ok?: boolean;
        data?: Array<{ amountUsd?: number | null; amount?: number }>;
      } | null;
      const adjJson = (await adjRes.json().catch(() => null)) as { data?: AdjustmentRow[]; error?: string } | null;

      if (!teRes.ok) throw new Error(teJson?.error || "Failed to load hours.");
      if (!linesRes.ok || !linesJson?.ok) throw new Error("Failed to load expenses.");
      if (!adjRes.ok) throw new Error(adjJson?.error || "Failed to load adjustments.");

      setTotalHours(typeof teJson?.totalHours === "number" ? teJson.totalHours : 0);
      const expTotal = (linesJson.data ?? []).reduce(
        (s, r) => s + Number(r.amountUsd ?? r.amount ?? 0),
        0,
      );
      setTotalExpenses(expTotal);
      setAdjustments(adjJson?.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("Failed to load cost transfer data."));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!ctx) return;
    setMode(ctx.costTransferMode === "custom" ? "custom" : "default");
    setCustomRate(String(ctx.costTransferCustomRate ?? 65));
    setSecondaryMatter(ctx.secondaryMatterNumber ?? "");
  }, [ctx]);

  const rate = mode === "custom" ? Number(customRate) || 0 : defaultRate;
  const laborTotal = totalHours * rate;
  const adjustmentTotal = adjustments.reduce((s, a) => s + (a.amount ?? 0), 0);

  async function saveContext() {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      await patch({
        costTransferMode: mode,
        costTransferCustomRate: mode === "custom" ? Number(customRate) || null : null,
        secondaryMatterNumber: secondaryMatter.trim() || null,
      });
      window.dispatchEvent(new Event(EM_WORKSPACE_CONTEXT_CHANGED_EVENT));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("Failed to save."));
    } finally {
      setSaving(false);
    }
  }

  async function removeAdjustment(id: string) {
    if (!canEdit) return;
    if (!(await appConfirm(t("Delete this adjustment?")))) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/expense-management/cost-adjustments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(t("Failed to delete."));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("Failed to delete."));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !ctx) {
    return (
      <EmMatterWorkspaceShell active="costtransfer" panelTitle={t("Cost Transfer Details")}>
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("Loading...")}
        </div>
      </EmMatterWorkspaceShell>
    );
  }

  return (
    <EmMatterWorkspaceShell active="costtransfer" panelTitle={t("Cost Transfer Details")}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as "default" | "custom")}
          className="space-y-3"
          disabled={!canEdit || saving}
        >
          <div className="flex items-start gap-3 rounded-md border p-3">
            <RadioGroupItem value="default" id="em-ct-default" className="mt-1" />
            <Label htmlFor="em-ct-default" className="cursor-pointer font-normal leading-relaxed">
              {t("Total Hours")} {totalHours.toFixed(2)} × ${defaultRate.toFixed(2)}
            </Label>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
            <RadioGroupItem value="custom" id="em-ct-custom" className="mt-1" />
            <Label htmlFor="em-ct-custom" className="cursor-pointer font-normal">
              {t("Different rate")}: {t("Total Hours")} {totalHours.toFixed(2)} ×
            </Label>
            <Input
              className="h-9 w-20"
              value={customRate}
              onChange={(e) => setCustomRate(e.target.value.replace(/[^\d.]/g, ""))}
              disabled={mode !== "custom" || !canEdit || saving}
            />
          </div>
        </RadioGroup>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("Labor transfer")}</p>
            <p className="text-lg font-semibold tabular-nums">
              ${laborTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("Total Expenses")}</p>
            <p className="text-lg font-semibold tabular-nums">
              ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t("Cost Adjustments")}</h3>
            {canEdit ? (
              <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => setAdjustmentOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t("Add")}
              </Button>
            ) : null}
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-sky-50/80 text-left">
                  <th className="px-3 py-2 font-medium">{t("Adjustment Details")}</th>
                  <th className="px-3 py-2 font-medium">{t("Attachments")}</th>
                  <th className="px-3 py-2 font-medium text-right">{t("Amount")}</th>
                  {canEdit ? <th className="px-3 py-2 w-12" /> : null}
                </tr>
              </thead>
              <tbody>
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 4 : 3} className="px-3 py-8 text-center text-muted-foreground">
                      {t("No records found")}
                    </td>
                  </tr>
                ) : (
                  adjustments.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{row.details}</td>
                      <td className="px-3 py-2">
                        {row.attachmentUrl ? (
                          <a href={row.attachmentUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                            {t("View")}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.amount != null
                          ? `$${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      {canEdit ? (
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => void removeAdjustment(row.id)}
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 border-t pt-4 sm:flex-row sm:items-end">
          <div className="space-y-2 min-w-[200px]">
            <Label htmlFor="em-secondary-matter">{t("Secondary Matter Number")}</Label>
            {canEdit ? (
              <Input
                id="em-secondary-matter"
                value={secondaryMatter}
                onChange={(e) => setSecondaryMatter(e.target.value)}
                disabled={saving}
                placeholder="—"
              />
            ) : (
              <p className="text-sm">{secondaryMatter || "—"}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("Total Cost Adjustment")}
            </p>
            <p className="text-sm font-semibold tabular-nums">
              ${adjustmentTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {canEdit ? (
          <div className="flex justify-end">
            <Button type="button" size="sm" disabled={saving} onClick={() => void saveContext()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {t("Save Changes")}
            </Button>
          </div>
        ) : null}
      </div>

      <EmCostAdjustmentSheet
        open={adjustmentOpen}
        onOpenChange={setAdjustmentOpen}
        onSaved={() => load()}
      />
    </EmMatterWorkspaceShell>
  );
}
