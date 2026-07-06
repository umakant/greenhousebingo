"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, LayoutList, FileX, CheckCircle, XCircle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

type CoaRow = {
  id: number;
  account_code: string;
  account_name: string;
  account_type_id: number;
  account_type_name: string | null;
  parent_account_id: number | null;
  level: number;
  normal_balance: string;
  current_balance: string;
  description: string | null;
  is_active: boolean;
};

type AccountTypeOption = { id: number; name: string; normal_balance: string };

function formatMoney(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00";
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const emptyForm = () => ({
  account_code: "",
  account_name: "",
  account_type_id: "",
  parent_account_id: "",
  normal_balance: "debit",
  opening_balance: "0",
  description: "",
  is_active: true,
});

export default function AccountChartOfAccountsAdmin({ permissions }: { permissions: string[] }) {
  const { t } = useTranslation();
  const canWrite = permissions.includes("*") || permissions.includes("manage-chart-of-accounts");

  const [data, setData] = React.useState<CoaRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [accountTypes, setAccountTypes] = React.useState<AccountTypeOption[]>([]);
  const [allAccounts, setAllAccounts] = React.useState<{ id: number; account_name: string; account_code: string }[]>([]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CoaRow | null>(null);
  const [form, setForm] = React.useState(emptyForm());
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<CoaRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/account/setup/account-types?per_page=100")
      .then((r) => r.json())
      .then((j) => setAccountTypes((j.data ?? []).map((t: Record<string, unknown>) => ({
        id: Number(t.id), name: String(t.name ?? ""), normal_balance: String(t.normal_balance ?? "debit"),
      }))))
      .catch(() => {});
    fetch("/api/account/chart-of-accounts?per_page=100")
      .then((r) => r.json())
      .then((j) => setAllAccounts((j.data ?? []).map((a: Record<string, unknown>) => ({
        id: Number(a.id), account_name: String(a.account_name ?? ""), account_code: String(a.account_code ?? ""),
      }))))
      .catch(() => {});
  }, []);

  const load = React.useCallback(async ({ nextPage = page, nextSearch = search } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), per_page: "10" });
      if (nextSearch) params.set("search", nextSearch);
      const res = await fetch(`/api/account/chart-of-accounts?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
      setLastPage(json.last_page ?? 1);
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  React.useEffect(() => { load({ nextPage: 1, nextSearch: "" }); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (row: CoaRow) => {
    setEditing(row);
    setForm({
      account_code: row.account_code,
      account_name: row.account_name,
      account_type_id: String(row.account_type_id),
      parent_account_id: row.parent_account_id ? String(row.parent_account_id) : "",
      normal_balance: row.normal_balance,
      opening_balance: "0",
      description: row.description ?? "",
      is_active: row.is_active,
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError("");
    try {
      const body = {
        account_code: form.account_code.trim(),
        account_name: form.account_name.trim(),
        account_type_id: form.account_type_id ? Number(form.account_type_id) : null,
        parent_account_id: form.parent_account_id ? Number(form.parent_account_id) : null,
        normal_balance: form.normal_balance,
        opening_balance: Number(form.opening_balance) || 0,
        description: form.description.trim() || null,
        is_active: form.is_active,
      };
      if (!body.account_code || !body.account_name || !body.account_type_id) {
        setFormError(t("Account Code, Account Name, and Account Type are required"));
        return;
      }
      const url = editing ? `/api/account/chart-of-accounts/${editing.id}` : "/api/account/chart-of-accounts";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error ?? t("Failed to save")); return; }
      setDialogOpen(false);
      load({ nextPage: editing ? page : 1 });
    } catch {
      setFormError(t("An error occurred"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/account/chart-of-accounts/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      load({ nextPage: 1 });
    } finally {
      setDeleting(false);
    }
  };

  const set = (k: keyof ReturnType<typeof emptyForm>, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleTypeChange = (v: string) => {
    const type = accountTypes.find((t) => String(t.id) === v);
    setForm((p) => ({ ...p, account_type_id: v, normal_balance: type?.normal_balance ?? "debit" }));
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              placeholder={t("Search accounts...")}
              value={search}
              onChange={setSearch}
              onSearch={() => load({ nextPage: 1, nextSearch: search })}
            />
            {canWrite && (
              <Button onClick={openCreate} size="sm">
                <Plus className="mr-1 h-4 w-4" />
                {t("Add Account")}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{t("Loading...")}</div>
          ) : data.length === 0 ? (
            <NoRecordsFound
              icon={LayoutList}
              title={t("No chart of accounts found")}
              description={t("Add accounts to structure your financial records.")}
              hasFilters={!!search}
              onClearFilters={() => { setSearch(""); load({ nextPage: 1, nextSearch: "" }); }}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      {[t("Code"), t("Account Name"), t("Type"), t("Normal Balance"), t("Current Balance"), t("Status")].map((h, i) => (
                        <th key={i} className="px-4 py-3 font-medium">{h}</th>
                      ))}
                      {canWrite && <th className="px-4 py-3 font-medium text-right">{t("Actions")}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs">{row.account_code}</td>
                        <td className="px-4 py-3 font-medium">
                          {row.level > 1 && <span className="text-muted-foreground mr-1">{"└".padStart(row.level - 1, "  ")}</span>}
                          {row.account_name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{row.account_type_name ?? "—"}</td>
                        <td className="px-4 py-3 capitalize">{row.normal_balance}</td>
                        <td className="px-4 py-3 font-medium">{formatMoney(row.current_balance)}</td>
                        <td className="px-4 py-3">
                          {row.is_active ? (
                            <Badge variant="outline" className="border-green-500 text-green-700 gap-1">
                              <CheckCircle className="h-3 w-3" />{t("Active")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-400 text-red-600 gap-1">
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
              {lastPage > 1 && (
                <div className="flex items-center justify-between p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("Showing")} {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} {t("of")} {total}
                  </p>
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
            <SheetTitle>{editing ? t("Edit Account") : t("Add Account")}</SheetTitle>
            <SheetDescription>{t("Define a chart of accounts entry.")}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 grid gap-3 content-start">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-0.5">
                <Label required>{t("Account Code")}</Label>
                <Input value={form.account_code} onChange={(e) => set("account_code", e.target.value)} placeholder="1000" />
              </div>
              <div className="grid gap-0.5">
                <Label required>{t("Account Name")}</Label>
                <Input value={form.account_name} onChange={(e) => set("account_name", e.target.value)} placeholder={t("e.g. Cash and Cash Equivalents")} />
              </div>
            </div>
            <div className="grid gap-0.5">
              <Label required>{t("Account Type")}</Label>
              <Select value={form.account_type_id} onValueChange={handleTypeChange}>
                <SelectTrigger><SelectValue placeholder={t("Select type...")} /></SelectTrigger>
                <SelectContent>
                  {accountTypes.length === 0
                    ? <SelectItem value="none" disabled>{t("No account types — add them in System Setup")}</SelectItem>
                    : accountTypes.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-0.5">
                <Label>{t("Normal Balance")}</Label>
                <Select value={form.normal_balance} onValueChange={(v) => set("normal_balance", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">{t("Debit")}</SelectItem>
                    <SelectItem value="credit">{t("Credit")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-0.5">
                <Label>{t("Opening Balance")}</Label>
                <Input type="number" step="0.01" value={form.opening_balance} onChange={(e) => set("opening_balance", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-0.5">
              <Label>{t("Parent Account")}</Label>
              <Select value={form.parent_account_id || "none"} onValueChange={(v) => set("parent_account_id", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder={t("None (top-level)")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("None (top-level)")}</SelectItem>
                  {allAccounts
                    .filter((a) => !editing || a.id !== editing.id)
                    .map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.account_code} — {a.account_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-0.5">
              <Label>{t("Description")}</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} id="coa-active" />
              <Label htmlFor="coa-active">{t("Active")}</Label>
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
