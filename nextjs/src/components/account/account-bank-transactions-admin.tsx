"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, FileX } from "lucide-react";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useTranslation } from "@/contexts/translation-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NoRecordsFound from "@/components/no-records-found";
import { Pagination } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency, parseCurrencyToNumber } from "@/lib/format-currency";
import { formatDate as fmtDateLib } from "@/lib/format-date";

type BankAccountOption = { id: number; account_name: string; bank_name: string };
type TransactionRow = {
  id: number; bank_account_id: number; transaction_date: string; reference_number: string | null;
  description: string | null; type: string; amount: number; balance_after: number | null;
  category: string | null; notes: string | null; bank_account: { account_name: string; bank_name: string } | null;
};


const emptyForm = () => ({
  bank_account_id: "", transaction_date: new Date().toISOString().slice(0, 10),
  type: "credit", amount: "", description: "", reference_number: "", category: "", notes: "",
});

export default function AccountBankTransactionsAdmin({ permissions }: { permissions: string[] }) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const isSuperadmin = permissions.includes("*");
  const canWrite =
    isSuperadmin ||
    permissions.includes("manage-bank-accounts") ||
    permissions.includes("manage-bank-transactions");
  const formatMoney = (v: unknown) => formatCurrency(typeof v === "number" ? v : Number(v) || 0, settings);
  const formatDate = (v: unknown) => fmtDateLib(v as string | null, settings);

  const [data, setData] = React.useState<TransactionRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [bankAccounts, setBankAccounts] = React.useState<BankAccountOption[]>([]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TransactionRow | null>(null);
  const [form, setForm] = React.useState(emptyForm());
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<TransactionRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [amountFocused, setAmountFocused] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/account/bank-accounts?per_page=100")
      .then(async (r) => {
        const j = (await r.json()) as { data?: Array<Record<string, unknown>> };
        if (!r.ok) return;
        setBankAccounts(
          (j.data ?? []).map((b) => ({
            id: Number(b.id),
            account_name: String(b.account_name ?? ""),
            bank_name: String(b.bank_name ?? ""),
          })),
        );
      })
      .catch(() => {});
  }, []);

  const load = React.useCallback(async ({ nextPage = page, nextSearch = search, nextType = typeFilter } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), per_page: "10" });
      if (nextSearch) params.set("search", nextSearch);
      if (nextType) params.set("type", nextType);
      const res = await fetch(`/api/account/bank-transactions?${params}`);
      const json = await res.json();
      setData(json.data ?? []); setTotal(json.total ?? 0); setLastPage(json.last_page ?? 1); setPage(nextPage);
    } finally { setLoading(false); }
  }, [page, search, typeFilter]);

  React.useEffect(() => { load({ nextPage: 1, nextSearch: "", nextType: "" }); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setAmountFocused(false);
    setDialogOpen(true);
  };
  const openEdit = (row: TransactionRow) => {
    setEditing(row);
    setAmountFocused(false);
    setForm({
      bank_account_id: String(row.bank_account_id), transaction_date: row.transaction_date ? new Date(row.transaction_date).toISOString().slice(0, 10) : "",
      type: row.type, amount: String(row.amount), description: row.description ?? "", reference_number: row.reference_number ?? "",
      category: row.category ?? "", notes: row.notes ?? "",
    });
    setFormError(""); setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true); setFormError("");
    try {
      if (!form.bank_account_id?.trim()) {
        setFormError(t("Select a bank account."));
        return;
      }
      const amountNum = parseCurrencyToNumber(String(form.amount), settings);
      if (!Number.isFinite(amountNum) || amountNum < 0) {
        setFormError(t("Enter a valid amount."));
        return;
      }
      if (amountNum <= 0) {
        setFormError(t("Enter an amount greater than zero."));
        return;
      }
      const body = {
        bank_account_id: form.bank_account_id ? Number(form.bank_account_id) : null,
        transaction_date: form.transaction_date,
        type: form.type,
        amount: amountNum,
        description: form.description || null,
        reference_number: form.reference_number || null,
        category: form.category || null,
        notes: form.notes || null,
      };
      const url = editing ? `/api/account/bank-transactions/${editing.id}` : "/api/account/bank-transactions";
      const res = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error ?? "Failed to save"); return; }
      setDialogOpen(false); load({ nextPage: editing ? page : 1 });
    } catch { setFormError("An error occurred"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try {
      await fetch(`/api/account/bank-transactions/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null); load({ nextPage: 1 });
    } finally { setDeleting(false); }
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap gap-2">
              <SearchInput placeholder={t("Search...")} value={search} onChange={(v) => setSearch(v)} onSearch={() => load({ nextPage: 1, nextSearch: search, nextType: typeFilter })} />
              <Select value={typeFilter || "all"} onValueChange={(v) => { const val = v === "all" ? "" : v; setTypeFilter(val); load({ nextPage: 1, nextSearch: search, nextType: val }); }}>
                <SelectTrigger className="w-36"><SelectValue placeholder={t("All Types")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All Types")}</SelectItem>
                  <SelectItem value="credit">{t("Credit")}</SelectItem>
                  <SelectItem value="debit">{t("Debit")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canWrite && <Button onClick={openCreate} size="sm"><Plus className="mr-1 h-4 w-4" />{t("Add Transaction")}</Button>}
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{t("Loading...")}</div>
          ) : data.length === 0 ? <NoRecordsFound icon={FileX} title={t("No transactions found")} description={t("Add your first bank transaction.")} hasFilters={!!search || !!typeFilter} onClearFilters={() => { setSearch(""); setTypeFilter(""); load({ nextPage: 1, nextSearch: "", nextType: "" }); }} /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      {[t("Reference"), t("Bank Account"), t("Date"), t("Type"), t("Amount"), t("Category"), t("Description")].map((h, i) => (
                        <th key={i} className="px-4 py-3 font-medium">{h}</th>
                      ))}
                      {canWrite && <th className="px-4 py-3 font-medium text-right">{t("Actions")}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs">{row.reference_number ?? "—"}</td>
                        <td className="px-4 py-3">{row.bank_account ? `${row.bank_account.account_name} (${row.bank_account.bank_name})` : "—"}</td>
                        <td className="px-4 py-3">{formatDate(row.transaction_date)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${row.type === "credit" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {row.type === "credit" ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                            {t(row.type === "credit" ? "Credit" : "Debit")}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{formatMoney(row.amount)}</td>
                        <td className="px-4 py-3">{row.category ?? "—"}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate">{row.description ?? "—"}</td>
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
              {lastPage > 1 && (
                <div className="flex items-center justify-between p-4">
                  <p className="text-sm text-muted-foreground">{t("Showing")} {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} {t("of")} {total}</p>
                  <Pagination page={page} lastPage={lastPage} total={total} from={(page - 1) * 10 + 1} to={Math.min(page * 10, total)} onPageChange={(p) => load({ nextPage: p })} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{editing ? t("Edit Transaction") : t("Add Transaction")}</SheetTitle>
            <SheetDescription>{t("Record a bank account transaction.")}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 grid gap-3 content-start">
            <div className="grid gap-0.5">
              <Label required>{t("Bank Account")}</Label>
              <Select value={form.bank_account_id} onValueChange={(v) => setForm((p) => ({ ...p, bank_account_id: v }))}>
                <SelectTrigger><SelectValue placeholder={t("Select account...")} /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.account_name} — {b.bank_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-0.5">
                <Label required>{t("Date")}</Label>
                <Input type="date" value={form.transaction_date} onChange={(e) => setForm((p) => ({ ...p, transaction_date: e.target.value }))} />
              </div>
              <div className="grid gap-0.5">
                <Label required>{t("Type")}</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">{t("Credit (Money In)")}</SelectItem>
                    <SelectItem value="debit">{t("Debit (Money Out)")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-0.5">
                <Label required>{t("Amount")}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className="font-mono tabular-nums"
                  placeholder={formatMoney(0)}
                  value={
                    amountFocused
                      ? form.amount
                      : form.amount.trim() === ""
                        ? ""
                        : formatCurrency(Number(form.amount) || 0, settings)
                  }
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => {
                    setAmountFocused(false);
                    const raw = form.amount.trim();
                    if (raw === "") return;
                    const n = parseCurrencyToNumber(form.amount, settings);
                    if (Number.isFinite(n)) setForm((p) => ({ ...p, amount: String(n) }));
                  }}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="grid gap-0.5">
                <Label>{t("Category")}</Label>
                <Input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} placeholder={t("e.g. Sales, Rent...")} />
              </div>
            </div>
            <div className="grid gap-0.5">
              <Label>{t("Reference Number")}</Label>
              <Input value={form.reference_number} onChange={(e) => setForm((p) => ({ ...p, reference_number: e.target.value }))} />
            </div>
            <div className="grid gap-0.5">
              <Label>{t("Description")}</Label>
              <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid gap-0.5">
              <Label>{t("Notes")}</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
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
            <DialogTitle>{t("Confirm Delete")}</DialogTitle>
            <DialogDescription>{t("Are you sure you want to delete this transaction? This cannot be undone.")}</DialogDescription>
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
