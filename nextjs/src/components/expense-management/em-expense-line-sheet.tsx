"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/contexts/translation-context";
import { EM_DEFAULT_EXPENSE_CATEGORY_NAMES } from "@/lib/em-expense-category-defaults";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "INR", "MXN", "BRL"] as const;

const LINE_STATUSES = ["draft", "submitted", "approved", "rejected", "paid", "processed"] as const;

export type EmExpenseLineRow = {
  id: string;
  reportId: string | null;
  expenseDate: string;
  category: string;
  merchant: string | null;
  amount: number;
  currency: string;
  amountUsd: number | null;
  projectId: string | null;
  receiptAttached: boolean;
  billable: string | null;
  mileage: number | null;
  ratePerMile: number | null;
  internalNote: string | null;
  additionalInfo: string | null;
  department: string | null;
  status: string;
  /** Employee / user who created the line (from API). */
  submitterName?: string | null;
};

type FormState = {
  expense_date: string;
  category: string;
  merchant: string;
  amount: string;
  currency: string;
  project_id: string;
  receipt_attached: boolean;
  billable: string;
  mileage: string;
  rate_per_mile: string;
  internal_note: string;
  additional_info: string;
  department: string;
  status: string;
  report_id: string;
};

function emptyFormDefaults(category: string): FormState {
  return {
    expense_date: new Date().toISOString().slice(0, 10),
    category,
    merchant: "",
    amount: "",
    currency: "USD",
    project_id: "",
    receipt_attached: false,
    billable: "Billable",
    mileage: "",
    rate_per_mile: "0.670",
    internal_note: "",
    additional_info: "",
    department: "",
    status: "draft",
    report_id: "",
  };
}

function formFromRow(row: EmExpenseLineRow): FormState {
  return {
    expense_date: row.expenseDate,
    category: row.category,
    merchant: row.merchant ?? "",
    amount: String(row.amount),
    currency: row.currency,
    project_id: row.projectId ?? "",
    receipt_attached: row.receiptAttached,
    billable: row.billable ?? "Billable",
    mileage: row.mileage != null ? String(row.mileage) : "",
    rate_per_mile: row.ratePerMile != null ? String(row.ratePerMile) : "",
    internal_note: row.internalNote ?? "",
    additional_info: row.additionalInfo ?? "",
    department: row.department ?? "",
    status: row.status,
    report_id: row.reportId ?? "",
  };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

export function EmExpenseLineSheet({
  open,
  onOpenChange,
  edit,
  categoryList,
  onAfterSave,
  onRequestDelete,
  showStatusField = true,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  edit: EmExpenseLineRow | null;
  categoryList: string[];
  onAfterSave: () => void;
  onRequestDelete?: () => void | Promise<void>;
  /** False for employees / portal submitters — status is set via report approval workflow. */
  showStatusField?: boolean;
}) {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);

  const [form, setForm] = React.useState<FormState>(() =>
    emptyFormDefaults(categoryList[0] ?? EM_DEFAULT_EXPENSE_CATEGORY_NAMES[0] ?? "Mileage"),
  );

  React.useEffect(() => {
    if (!open) return;
    const cat = categoryList[0] ?? EM_DEFAULT_EXPENSE_CATEGORY_NAMES[0] ?? "Mileage";
    if (edit) setForm(formFromRow(edit));
    else setForm(emptyFormDefaults(cat));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when opening / switching rows
  }, [open, edit?.id]);

  const categorySelectOptions = React.useMemo(() => {
    const s = new Set(categoryList);
    if (form.category) s.add(form.category);
    if (edit?.category) s.add(edit.category);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [categoryList, form.category, edit?.category]);

  const isMileage = form.category.trim().toLowerCase() === "mileage";

  const summaryAmount = React.useMemo(() => {
    const n = parseFloat(form.amount);
    if (Number.isNaN(n)) return null;
    return n;
  }, [form.amount]);

  async function save() {
    const amount = parseFloat(form.amount);
    if (Number.isNaN(amount)) return;
    const amountUsd = form.currency.trim().toUpperCase() === "USD" ? amount : null;
    const mileage = form.mileage.trim() === "" ? null : parseFloat(form.mileage);
    const rate = form.rate_per_mile.trim() === "" ? null : parseFloat(form.rate_per_mile);

    const payload: Record<string, unknown> = {
      expense_date: form.expense_date,
      category: form.category,
      merchant: form.merchant || null,
      amount,
      currency: form.currency,
      amount_usd: amountUsd != null && !Number.isNaN(amountUsd) ? amountUsd : null,
      project_id: form.project_id || null,
      receipt_attached: form.receipt_attached,
      billable: form.billable || null,
      mileage,
      rate_per_mile: rate,
      internal_note: form.internal_note || null,
      additional_info: form.additional_info || null,
      department: form.department || null,
      report_id: form.report_id.trim() === "" ? null : form.report_id.trim(),
    };
    if (showStatusField) payload.status = form.status;

    if (edit) {
      await fetch(`/api/expense-management/lines/${edit.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/expense-management/lines", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    onOpenChange(false);
    onAfterSave();
  }

  const currencySet = React.useMemo(() => {
    const s = new Set<string>([...CURRENCY_OPTIONS]);
    if (form.currency) s.add(form.currency);
    if (edit?.currency) s.add(edit.currency);
    return Array.from(s);
  }, [form.currency, edit?.currency]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-[440px]">
        <div className="border-b px-6 pb-4 pt-6">
          <SheetHeader className="space-y-3 text-left">
            <SheetTitle className="text-lg">{edit ? t("Edit expense") : t("New expense")}</SheetTitle>
            {edit ? (
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-2xl font-semibold tabular-nums">
                  {summaryAmount != null
                    ? summaryAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}{" "}
                  <span className="text-base font-medium text-muted-foreground">{form.currency || "USD"}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {form.expense_date} · {form.category} · {form.merchant.trim() ? form.merchant : "—"}
                </p>
              </div>
            ) : null}
          </SheetHeader>
        </div>

        <div className="flex-1 space-y-6 px-6 py-4">
          <div className="space-y-3">
            <SectionTitle>{t("Details")}</SectionTitle>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>{t("Category")}</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorySelectOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={showStatusField ? "grid grid-cols-2 gap-3" : "grid gap-2"}>
                <div className="grid gap-2">
                  <Label>{t("Date")}</Label>
                  <Input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                  />
                </div>
                {showStatusField ? (
                  <div className="grid gap-2">
                    <Label>{t("Status")}</Label>
                    <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LINE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label>{t("Merchant")}</Label>
                <Input
                  value={form.merchant}
                  onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>{t("Amount")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("Currency")}</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencySet.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {isMileage ? (
            <>
              <Separator />
              <div className="space-y-3">
                <SectionTitle>{t("Mileage")}</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>{t("Miles")}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={form.mileage}
                      onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("Rate / mile")}</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={form.rate_per_mile}
                      onChange={(e) => setForm((f) => ({ ...f, rate_per_mile: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <Separator />

          <div className="space-y-3">
            <SectionTitle>{t("Receipt")}</SectionTitle>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <div className="text-sm font-medium">{t("Receipt attached")}</div>
                <div className="text-xs text-muted-foreground">{t("Mark when documentation is on file")}</div>
              </div>
              <Switch
                checked={form.receipt_attached}
                onCheckedChange={(v) => setForm((f) => ({ ...f, receipt_attached: v }))}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <SectionTitle>{t("Billing & project")}</SectionTitle>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>{t("Billable")}</Label>
                <Select value={form.billable} onValueChange={(v) => setForm((f) => ({ ...f, billable: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Billable">{t("Billable")}</SelectItem>
                    <SelectItem value="Non-billable">{t("Non-billable")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("Project ID")}</Label>
                <Input
                  value={form.project_id}
                  onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("Department")}</Label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <SectionTitle>{t("Notes")}</SectionTitle>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>{t("Internal note")}</Label>
                <Input
                  value={form.internal_note}
                  onChange={(e) => setForm((f) => ({ ...f, internal_note: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("Additional information")}</Label>
                <Textarea
                  rows={4}
                  value={form.additional_info}
                  onChange={(e) => setForm((f) => ({ ...f, additional_info: e.target.value }))}
                  placeholder={t("Additional details…")}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <SectionTitle>{t("Financial dimensions")}</SectionTitle>
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <div className="grid gap-2">
                <div className="grid gap-2">
                  <Label className="text-xs font-normal text-muted-foreground">{t("Report ID")}</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder={t("Optional")}
                    value={form.report_id}
                    onChange={(e) => setForm((f) => ({ ...f, report_id: e.target.value }))}
                  />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  <span>
                    {t("Project")}: {form.project_id.trim() || "—"}
                  </span>
                  <span>
                    {t("Department")}: {form.department.trim() || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="mt-auto flex-col gap-3 border-t bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          {onRequestDelete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-1">
                  <MoreHorizontal className="h-4 w-4" />
                  {t("Actions")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => void onRequestDelete()}
                >
                  {t("Delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div />
          )}
          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            <Button type="button" onClick={() => void save()}>
              {t("Save and continue")}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
