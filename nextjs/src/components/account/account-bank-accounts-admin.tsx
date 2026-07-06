"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Building2, CheckCircle, XCircle } from "lucide-react";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useTranslation } from "@/contexts/translation-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import NoRecordsFound from "@/components/no-records-found";
import { Pagination } from "@/components/ui/pagination";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type BankAccountRow = {
  id: number;
  account_number: string;
  account_name: string;
  bank_name: string;
  branch_name: string | null;
  account_type: string;
  opening_balance: string;
  current_balance: string;
  is_active: boolean;
};

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings",  label: "Savings"  },
  { value: "current",  label: "Current"  },
  { value: "business", label: "Business" },
  { value: "credit",   label: "Credit"   },
  { value: "loan",     label: "Loan"     },
  { value: "other",    label: "Other"    },
];

const LEGACY_TYPE_MAP: Record<string, string> = {
  "0": "Checking",
  "1": "Savings",
  "2": "Current",
  "3": "Business",
  "4": "Other",
};

function getAccountTypeLabel(v: string) {
  const match = ACCOUNT_TYPES.find((t) => t.value === v);
  if (match) return match.label;
  if (LEGACY_TYPE_MAP[v]) return LEGACY_TYPE_MAP[v];
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function formatMoney(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00";
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/** Max digits shown in xxxx-xxxx-xxxx style input. */
const BANK_ACCT_MAX_DIGITS = 12;
const BANK_ACCT_MIN_DIGITS = 8;

/** Groups digits as xxxx-xxxx-xxxx (up to 12 digits). */
function formatBankAccountDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, BANK_ACCT_MAX_DIGITS);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join("-");
}

/** For edit: alphanumeric legacy values stay as-is; digit-only values get grouped. */
function accountNumberToFormValue(stored: string): string {
  if (!stored.trim()) return "";
  if (/[a-zA-Z]/.test(stored)) return stored;
  return formatBankAccountDigits(stored);
}

const emptyForm = () => ({
  account_name: "",
  account_number: "",
  bank_name: "",
  branch_name: "",
  account_type: "checking",
  opening_balance: "0",
  is_active: true,
});

export default function AccountBankAccountsAdmin({ permissions }: { permissions: string[] }) {
  const { t } = useTranslation();
  const canWrite = permissions.includes("*") || permissions.includes("manage-bank-accounts");

  const [data, setData] = React.useState<BankAccountRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [perPage] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BankAccountRow | null>(null);
  const [form, setForm] = React.useState(emptyForm());
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<BankAccountRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async ({ nextPage = page, nextSearch = search } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), per_page: String(perPage) });
      if (nextSearch) params.set("search", nextSearch);
      const res = await fetch(`/api/account/bank-accounts?${params}`, { credentials: "include" });
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
      setLastPage(json.last_page ?? 1);
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  }, [page, search, perPage]);

  React.useEffect(() => { load({ nextPage: 1, nextSearch: "" }); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (row: BankAccountRow) => {
    setEditing(row);
    setForm({
      account_name: row.account_name,
      account_number: accountNumberToFormValue(row.account_number),
      bank_name: row.bank_name,
      branch_name: row.branch_name ?? "",
      account_type: row.account_type === "0" ? "checking"
                  : row.account_type === "1" ? "savings"
                  : row.account_type === "2" ? "current"
                  : row.account_type === "3" ? "business"
                  : row.account_type === "4" ? "other"
                  : row.account_type,
      opening_balance: row.opening_balance,
      is_active: row.is_active,
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError("");
    try {
      const rawAcct = form.account_number.trim();
      let account_number = rawAcct;
      if (!/[a-zA-Z]/.test(rawAcct)) {
        account_number = formatBankAccountDigits(rawAcct);
        const digits = account_number.replace(/\D/g, "");
        if (digits.length < BANK_ACCT_MIN_DIGITS || digits.length > BANK_ACCT_MAX_DIGITS) {
          setFormError(
            t("Account number must be 8–12 digits (format: xxxx-xxxx-xxxx)."),
          );
          return;
        }
      }

      const body = {
        account_name: form.account_name.trim(),
        account_number,
        bank_name: form.bank_name.trim(),
        branch_name: form.branch_name.trim() || null,
        account_type: form.account_type,
        opening_balance: Number(form.opening_balance) || 0,
        is_active: form.is_active,
      };
      if (!body.account_name || !body.account_number || !body.bank_name) {
        setFormError(t("Account Name, Account Number, and Bank Name are required"));
        return;
      }
      const url = editing ? `/api/account/bank-accounts/${editing.id}` : "/api/account/bank-accounts";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const raw = await res.text();
      let payload: { error?: string } = {};
      if (raw.trim()) {
        try {
          payload = JSON.parse(raw) as { error?: string };
        } catch {
          if (!res.ok) {
            setFormError(t("Failed to save") + ` (${res.status})`);
            return;
          }
        }
      }
      if (!res.ok) {
        setFormError(payload.error?.trim() || t("Failed to save"));
        return;
      }
      setDialogOpen(false);
      load({ nextPage: editing ? page : 1 });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t("An error occurred"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/account/bank-accounts/${deleteTarget.id}`, { method: "DELETE", credentials: "include" });
      setDeleteTarget(null);
      load({ nextPage: 1 });
    } finally {
      setDeleting(false);
    }
  };

  const set = (k: keyof ReturnType<typeof emptyForm>, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  const onAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (/[a-zA-Z]/.test(v)) {
      set("account_number", v);
      return;
    }
    set("account_number", formatBankAccountDigits(v));
  };

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b bg-muted/30">
            <SearchInput
              placeholder={t("Search accounts...")}
              value={search}
              onChange={setSearch}
              onSearch={() => load({ nextPage: 1, nextSearch: search })}
              buttonLabel={t("Search")}
            />
            {canWrite && (
              <Button onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" />
                {t("Add Bank Account")}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{t("Loading...")}</div>
          ) : data.length === 0 ? (
            <NoRecordsFound
              icon={Building2}
              title={t("No bank accounts found")}
              description={t("Add your first bank account to track transactions.")}
              hasFilters={!!search}
              onClearFilters={() => { setSearch(""); load({ nextPage: 1, nextSearch: "" }); }}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t("Account Name")}</th>
                      <th className="px-4 py-3 font-medium">{t("Bank Name")}</th>
                      <th className="px-4 py-3 font-medium">{t("Account Number")}</th>
                      <th className="px-4 py-3 font-medium">{t("Type")}</th>
                      <th className="px-4 py-3 font-medium">{t("Current Balance")}</th>
                      <th className="px-4 py-3 font-medium">{t("Status")}</th>
                      {canWrite && <th className="px-4 py-3 font-medium text-right">{t("Actions")}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{row.account_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.bank_name}{row.branch_name ? ` — ${row.branch_name}` : ""}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{row.account_number}</td>
                        <td className="px-4 py-3">{getAccountTypeLabel(row.account_type)}</td>
                        <td className="px-4 py-3 font-medium tabular-nums">{formatMoney(row.current_balance)}</td>
                        <td className="px-4 py-3">
                          {row.is_active ? (
                            <Badge variant="outline" className="border-green-500 text-green-700 gap-1 dark:border-green-600 dark:text-green-400">
                              <CheckCircle className="h-3 w-3" />{t("Active")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-400 text-red-600 gap-1 dark:border-red-500 dark:text-red-400">
                              <XCircle className="h-3 w-3" />{t("Inactive")}
                            </Badge>
                          )}
                        </td>
                        {canWrite && (
                          <td className="px-4 py-3 text-right">
                            <TableActionButton
                              label={t("Edit")}
                              onPrimaryClick={() => openEdit(row)}
                              items={[
                                { label: t("Edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(row) },
                                { label: t("Delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => setDeleteTarget(row), destructive: true },
                              ]}
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {t("Showing")} {from}–{to} {t("of")} {total} {t("results")}
                </p>
                {lastPage > 1 && (
                  <Pagination
                    page={page}
                    lastPage={lastPage}
                    total={total}
                    from={from}
                    to={to}
                    onPageChange={(p) => load({ nextPage: p })}
                  />
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{editing ? t("Edit Bank Account") : t("Add Bank Account")}</SheetTitle>
            <SheetDescription>{t("Bank account details for tracking deposits, withdrawals, and transfers.")}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label required>{t("Account Name")}</Label>
                <Input value={form.account_name} onChange={(e) => set("account_name", e.target.value)} placeholder={t("e.g. Main Business Account")} />
              </div>
              <div className="space-y-1">
                <Label required>{t("Account Number")}</Label>
                <Input
                  value={form.account_number}
                  onChange={onAccountNumberChange}
                  placeholder="xxxx-xxxx-xxxx"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={/[a-zA-Z]/.test(form.account_number) ? 64 : BANK_ACCT_MAX_DIGITS + 2}
                  className="font-mono tracking-wide"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label required>{t("Bank Name")}</Label>
                <Input value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} placeholder={t("e.g. Chase Bank")} />
              </div>
              <div className="space-y-1">
                <Label>{t("Branch / Location")}</Label>
                <Input value={form.branch_name} onChange={(e) => set("branch_name", e.target.value)} placeholder={t("e.g. Downtown Branch")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("Account Type")}</Label>
                <Select value={form.account_type} onValueChange={(v) => set("account_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((at) => <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("Opening Balance")}</Label>
                <Input type="number" step="0.01" min="0" value={form.opening_balance} onChange={(e) => set("opening_balance", e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} id="ba-active" />
              <Label htmlFor="ba-active" className="cursor-pointer">{t("Active")}</Label>
            </div>
            {formError && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{formError}</p>}
          </div>
          <SheetFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{t("Cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t("Saving...") : t("Save")}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Delete Bank Account")}</DialogTitle>
            <DialogDescription>
              {t("Are you sure you want to delete")} <strong>{deleteTarget?.account_name}</strong>?{" "}
              {t("This cannot be undone.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>{t("Cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? t("Deleting...") : t("Delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
