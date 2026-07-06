"use client";

import * as React from "react";
import {
  AlertCircle,
  Car,
  Check,
  CircleDollarSign,
  Hotel,
  Info,
  Pencil,
  Plane,
  Plus,
  Utensils,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import type { SowFormData } from "@/lib/project-sow-form";
import {
  buildExpensePolicySummary,
  buildPerDiemTextFromPolicy,
  defaultPerDiemPolicy,
  mergePerDiemPolicy,
  SOW_EXPENSE_LABELS,
  type SowExpenseCategory,
  type SowPerDiemPolicy,
  type SowRecentExpense,
} from "@/lib/project-sow-per-diem";
import { cn } from "@/lib/utils";

const EXPENSE_ICONS: Record<SowExpenseCategory, React.ComponentType<{ className?: string }>> = {
  parking: Car,
  rideshare: Car,
  airfare: Plane,
  lodging: Hotel,
};

function CardShell({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-violet-600" />
          <h4 className="text-sm font-semibold">{title}</h4>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function statusBadge(status: SowRecentExpense["status"]) {
  if (status === "approved") {
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Approved</Badge>;
  }
  if (status === "covered") {
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Covered</Badge>;
  }
  return <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Pending</Badge>;
}

type Props = {
  form: SowFormData;
  employeeName: string;
  canManage: boolean;
  onPatch: (partial: Partial<SowFormData>) => void;
};

export function SowPerDiemMainSection({ form, employeeName, canManage, onPatch }: Props) {
  const policy = mergePerDiemPolicy(form.per_diem_policy, defaultPerDiemPolicy());
  const [editPolicyOpen, setEditPolicyOpen] = React.useState(false);
  const [draftMax, setDraftMax] = React.useState(policy.max_meal_reimbursement);
  const [draftMealsProvided, setDraftMealsProvided] = React.useState(policy.meals_provided_by_client);

  const patchPolicy = (next: SowPerDiemPolicy) => {
    onPatch({
      per_diem_policy: next,
      per_diem: buildPerDiemTextFromPolicy(next, form.client_company_name),
    });
  };

  const maxDisplay = policy.max_meal_reimbursement.startsWith("$")
    ? policy.max_meal_reimbursement
    : `$${policy.max_meal_reimbursement}`;

  return (
    <div className="space-y-5">
      <CardShell
        title="Per Diem Policy"
        icon={Utensils}
        action={
          canManage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setDraftMax(policy.max_meal_reimbursement);
                setDraftMealsProvided(policy.meals_provided_by_client);
                setEditPolicyOpen(true);
              }}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
            </Button>
          ) : null
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs font-medium text-muted-foreground">Meals Provided By Client</p>
            <div className="mt-2 flex items-center gap-2">
              {policy.meals_provided_by_client ? (
                <>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-semibold text-emerald-700">Yes</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">No</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs font-medium text-muted-foreground">Maximum Meal Reimbursement</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">
              {maxDisplay}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/ day</span>
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
          <p>
            If meals are not provided by the client due to your assigned task/post, you may submit for reimbursement with receipts up to the maximum amount shown above.
          </p>
        </div>
      </CardShell>

      <CardShell title="Reimbursable Expenses" icon={CircleDollarSign}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(SOW_EXPENSE_LABELS) as SowExpenseCategory[]).map((key) => {
            const meta = SOW_EXPENSE_LABELS[key];
            const cfg = policy.expenses[key];
            const Icon = EXPENSE_ICONS[key];
            return (
              <div key={key} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-violet-600" />
                    <span className="text-sm font-medium">{meta.title}</span>
                  </div>
                  <Switch
                    checked={cfg.enabled}
                    disabled={!canManage}
                    onCheckedChange={(enabled) =>
                      patchPolicy({
                        ...policy,
                        expenses: { ...policy.expenses, [key]: { ...cfg, enabled } },
                      })
                    }
                  />
                </div>
                <p className="mb-2 text-[11px] leading-snug text-muted-foreground">{meta.description}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    cfg.coverage === "covered"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700",
                  )}
                >
                  {cfg.coverage === "covered" ? "Covered" : "Reimbursable"}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardShell>

      <CardShell title="General Notes" icon={AlertCircle}>
        <Textarea
          value={policy.general_notes}
          onChange={(e) => patchPolicy({ ...policy, general_notes: e.target.value })}
          rows={3}
          disabled={!canManage}
          className="resize-none text-sm"
        />
      </CardShell>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold">Per Diem Rates Breakdown</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Rate / Limit</th>
                <th className="px-4 py-2.5 font-medium">Frequency</th>
                <th className="px-4 py-2.5 font-medium">Applies To</th>
                <th className="px-4 py-2.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {policy.rate_rows.map((row, i) => (
                <tr key={row.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{row.category}</td>
                  <td className="px-4 py-3">
                    {canManage && i === 0 ? (
                      <Input
                        value={row.rate_limit}
                        className="h-8 w-28"
                        onChange={(e) => {
                          const nextRows = [...policy.rate_rows];
                          nextRows[i] = { ...row, rate_limit: e.target.value };
                          patchPolicy({
                            ...policy,
                            rate_rows: nextRows,
                            max_meal_reimbursement: e.target.value.replace(/[^\d.]/g, "") || policy.max_meal_reimbursement,
                          });
                        }}
                      />
                    ) : (
                      row.rate_limit
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.frequency}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.applies_to}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <Label className="text-xs font-medium text-muted-foreground">Dress Code</Label>
        <Textarea
          className="mt-2 resize-none text-sm"
          rows={3}
          value={form.dress_code}
          onChange={(e) => onPatch({ dress_code: e.target.value })}
          disabled={!canManage}
        />
      </div>

      <Dialog open={editPolicyOpen} onOpenChange={setEditPolicyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Per Diem Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <Label htmlFor="meals-provided" className="text-sm">
                Meals provided by client
              </Label>
              <Switch id="meals-provided" checked={draftMealsProvided} onCheckedChange={setDraftMealsProvided} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-meal">Maximum meal reimbursement ($/day)</Label>
              <Input
                id="max-meal"
                value={draftMax}
                onChange={(e) => setDraftMax(e.target.value)}
                placeholder="85.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditPolicyOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-violet-600 hover:bg-violet-700"
              onClick={() => {
                const max = draftMax.replace(/[^\d.]/g, "") || "85.00";
                const nextRows = policy.rate_rows.map((r) =>
                  r.id === "meal" ? { ...r, rate_limit: max.startsWith("$") ? max : `$${max}` } : r,
                );
                patchPolicy({
                  ...policy,
                  meals_provided_by_client: draftMealsProvided,
                  max_meal_reimbursement: max,
                  rate_rows: nextRows,
                });
                setEditPolicyOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SowPerDiemSidebar
        form={form}
        employeeName={employeeName}
        canManage={canManage}
        onPatch={onPatch}
      />
    </div>
  );
}

export function SowPerDiemSidebar({
  form,
  employeeName,
  canManage,
  onPatch,
}: Props) {
  const { settings } = useAppSettings();
  const policy = mergePerDiemPolicy(form.per_diem_policy, defaultPerDiemPolicy());
  const summary = buildExpensePolicySummary(policy);

  const patchPolicy = (next: SowPerDiemPolicy) => {
    onPatch({
      per_diem_policy: next,
      per_diem: buildPerDiemTextFromPolicy(next, form.client_company_name),
    });
  };

  const addExpense = () => {
    const item: SowRecentExpense = {
      id: `${Date.now()}`,
      category: "Parking",
      amount: "0.00",
      status: "pending",
      date: new Date().toISOString().slice(0, 10),
      employee: employeeName,
    };
    patchPolicy({ ...policy, recent_expenses: [item, ...policy.recent_expenses] });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold">Expense Policy Summary</h4>
        </div>
        <ul className="space-y-2.5 p-4">
          {summary.map((line) => (
            <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold">Recent Expenses / Reimbursements</h4>
          {canManage ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-violet-700" onClick={addExpense}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Expense
            </Button>
          ) : null}
        </div>
        <div className="divide-y divide-border">
          {policy.recent_expenses.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">No expenses recorded yet.</p>
          ) : (
            policy.recent_expenses.map((exp) => (
              <div key={exp.id} className="flex items-start justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{exp.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateLib(exp.date, settings)} · {exp.employee}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">${exp.amount}</p>
                  {statusBadge(exp.status)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
