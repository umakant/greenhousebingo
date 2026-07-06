"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/contexts/translation-context";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
};

export function EmCostAdjustmentSheet({ open, onOpenChange, onSaved }: Props) {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);

  const [details, setDetails] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [attachmentUrl, setAttachmentUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setDetails("");
      setAmount("");
      setAttachmentUrl("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = details.trim();
    if (!trimmed) {
      setError(t("Adjustment details are required."));
      return;
    }

    const parsedAmount = amount.trim() ? Number(amount) : null;
    if (amount.trim() && (parsedAmount == null || Number.isNaN(parsedAmount))) {
      setError(t("Enter a valid amount or leave it blank."));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/expense-management/cost-adjustments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          details: trimmed,
          amount: parsedAmount,
          attachmentUrl: attachmentUrl.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || t("Failed to add adjustment."));
      onOpenChange(false);
      await onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("Failed to add adjustment."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-[440px]">
        <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b px-6 pb-4 pt-6">
            <SheetHeader className="space-y-1 text-left">
              <SheetTitle className="text-lg">{t("Add cost adjustment")}</SheetTitle>
              <p className="text-sm text-muted-foreground font-normal">
                {t("Record an adjustment for this matter’s cost transfer.")}
              </p>
            </SheetHeader>
          </div>

          <div className="flex-1 space-y-4 px-6 py-4">
            {error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="em-adj-details">{t("Adjustment Details")}</Label>
              <Textarea
                id="em-adj-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                placeholder={t("Describe the adjustment…")}
                disabled={saving}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="em-adj-amount">{t("Amount")}</Label>
              <Input
                id="em-adj-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t("Optional")}
                disabled={saving}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="em-adj-attachment">{t("Attachment URL")}</Label>
              <Input
                id="em-adj-attachment"
                type="url"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://"
                disabled={saving}
              />
            </div>
          </div>

          <SheetFooter className="mt-auto border-t px-6 py-4 sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("Save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
