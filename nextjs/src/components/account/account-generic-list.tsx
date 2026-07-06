"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, FileX } from "lucide-react";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useTranslation } from "@/contexts/translation-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NoRecordsFound from "@/components/no-records-found";
import { Pagination } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency, parseCurrencyToNumber } from "@/lib/format-currency";
import { formatDate as fmtDateLib } from "@/lib/format-date";

export type FieldDef =
  | { type: "text" | "number" | "date"; key: string; label: string; required?: boolean; placeholder?: string }
  | { type: "currency"; key: string; label: string; required?: boolean; placeholder?: string }
  | { type: "select"; key: string; label: string; required?: boolean; options: { value: string; label: string }[] }
  | { type: "remoteSelect"; key: string; label: string; required?: boolean; apiUrl: string; labelKey: string; valueKey?: string }
  | { type: "textarea"; key: string; label: string; required?: boolean; placeholder?: string };

export type ColDef = {
  key: string;
  label: string;
  format?: "money" | "date" | "badge";
  nestedKey?: string;
};

export type GenericListProps = {
  apiUrl: string;
  title: string;
  createLabel?: string;
  columns: ColDef[];
  fields: FieldDef[];
  permissions: string[];
  managePerm?: string;
  createPerm?: string;
  editPerm?: string;
  deletePerm?: string;
  statusFilter?: boolean;
};


function Badge({ status }: { status: string }) {
  const color =
    status === "completed" || status === "approved"
      ? "bg-green-100 text-green-800"
      : status === "pending"
      ? "bg-yellow-100 text-yellow-800"
      : status === "cancelled" || status === "rejected"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-700";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{status}</span>;
}

export function AccountGenericList({
  apiUrl,
  title,
  createLabel,
  columns,
  fields,
  permissions,
  managePerm,
  createPerm,
  editPerm,
  deletePerm,
  statusFilter,
}: GenericListProps) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const formatMoney = (v: unknown) => { const n = Number(v); if (!Number.isFinite(n)) return "—"; return formatCurrency(n, settings); };
  const formatDate = (v: unknown) => fmtDateLib(v as string | null, settings);
  const isSuperadmin = permissions.includes("*");
  const canManage = isSuperadmin || (managePerm ? permissions.includes(managePerm) : false);
  const canCreate = canManage || (!createPerm && !managePerm) || (!!createPerm && permissions.includes(createPerm));
  const canEdit = canManage || (!editPerm && !managePerm) || (!!editPerm && permissions.includes(editPerm));
  const canDelete = canManage || (!deletePerm && !managePerm) || (!!deletePerm && permissions.includes(deletePerm));

  const [data, setData] = React.useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [perPage] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [statusVal, setStatusVal] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Record<string, unknown> | null>(null);
  const [form, setForm] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const [deleteTarget, setDeleteTarget] = React.useState<Record<string, unknown> | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [remoteOptions, setRemoteOptions] = React.useState<Record<string, { value: string; label: string }[]>>({});

  /** Which `currency` field input is focused (for masked display like bank transactions). */
  const [currencyFocusKey, setCurrencyFocusKey] = React.useState<string | null>(null);

  const remoteFields = fields.filter((f) => f.type === "remoteSelect") as Extract<FieldDef, { type: "remoteSelect" }>[];

  React.useEffect(() => {
    remoteFields.forEach((f) => {
      if (remoteOptions[f.key]) return;
      fetch(f.apiUrl + "?per_page=200")
        .then((r) => r.json())
        .then((res) => {
          const rows: Record<string, unknown>[] = Array.isArray(res) ? res : (res.data ?? []);
          const opts = rows.map((row) => ({
            value: String(row[f.valueKey ?? "id"]),
            label: String(row[f.labelKey] ?? ""),
          }));
          setRemoteOptions((prev) => ({ ...prev, [f.key]: opts }));
        })
        .catch(() => {});
    });
  }, []);

  const load = React.useCallback(
    async ({ nextPage = page, nextSearch = search, nextStatus = statusVal } = {}) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(nextPage), per_page: String(perPage) });
        if (nextSearch) params.set("search", nextSearch);
        if (nextStatus) params.set("status", nextStatus);
        const res = await fetch(`${apiUrl}?${params}`);
        const json = await res.json();
        setData(json.data ?? []);
        setTotal(json.total ?? 0);
        setLastPage(json.last_page ?? 1);
        setPage(nextPage);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl, page, perPage, search, statusVal]
  );

  React.useEffect(() => { load({ nextPage: 1, nextSearch: "", nextStatus: "" }); }, [apiUrl]);

  const openCreate = () => {
    setEditing(null);
    const defaults: Record<string, string> = {};
    fields.forEach((f) => { defaults[f.key] = ""; });
    setForm(defaults);
    setFormError("");
    setCurrencyFocusKey(null);
    setDialogOpen(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row);
    const vals: Record<string, string> = {};
    fields.forEach((f) => {
      const v = row[f.key];
      if (v == null) { vals[f.key] = ""; return; }
      if (f.type === "date") {
        vals[f.key] = new Date(String(v)).toISOString().slice(0, 10);
      } else {
        vals[f.key] = String(v);
      }
    });
    setForm(vals);
    setFormError("");
    setCurrencyFocusKey(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError("");
    try {
      const body: Record<string, unknown> = {};
      for (const f of fields) {
        const v = form[f.key];
        if (f.type === "currency") {
          const n = parseCurrencyToNumber(String(v ?? ""), settings);
          if (f.required) {
            if (!String(v ?? "").trim()) {
              setFormError(t("Enter a valid amount."));
              return;
            }
            if (!Number.isFinite(n) || n < 0) {
              setFormError(t("Enter a valid amount."));
              return;
            }
            if (n <= 0) {
              setFormError(t("Enter an amount greater than zero."));
              return;
            }
          }
          body[f.key] = v !== "" && Number.isFinite(n) ? n : null;
        } else if (f.type === "number") {
          body[f.key] = v !== "" ? Number(v) : null;
        } else {
          body[f.key] = v !== "" ? v : null;
        }
      }

      const url = editing ? `${apiUrl}/${editing.id}` : apiUrl;
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error ?? "Failed to save"); return; }
      setDialogOpen(false);
      load({ nextPage: editing ? page : 1 });
    } catch {
      setFormError("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${apiUrl}/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      load({ nextPage: 1 });
    } finally {
      setDeleting(false);
    }
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    load({ nextPage: 1, nextSearch: v, nextStatus: statusVal });
  };

  const handleStatus = (v: string) => {
    const val = v === "all" ? "" : v;
    setStatusVal(val);
    load({ nextPage: 1, nextSearch: search, nextStatus: val });
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-2">
              <SearchInput
                placeholder={t("Search...")}
                value={search}
                onChange={(v) => setSearch(v)}
                onSearch={() => handleSearch(search)}
              />
              {statusFilter && (
                <Select value={statusVal || "all"} onValueChange={handleStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t("All Status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Status")}</SelectItem>
                    <SelectItem value="pending">{t("Pending")}</SelectItem>
                    <SelectItem value="completed">{t("Completed")}</SelectItem>
                    <SelectItem value="approved">{t("Approved")}</SelectItem>
                    <SelectItem value="cancelled">{t("Cancelled")}</SelectItem>
                    <SelectItem value="rejected">{t("Rejected")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            {canCreate && (
              <Button onClick={openCreate} size="sm">
                <Plus className="mr-1 h-4 w-4" />
                {createLabel ?? t("Add New")}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">{t("Loading...")}</div>
          ) : data.length === 0 ? (
            <NoRecordsFound icon={FileX} title={t("No records found")} description={t("Get started by adding your first record.")} hasFilters={!!search} onClearFilters={() => { setSearch(""); load({ nextPage: 1, nextSearch: "" }); }} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      {columns.map((c) => (
                        <th key={c.key} className="px-4 py-3 font-medium">
                          {t(c.label)}
                        </th>
                      ))}
                      {(canEdit || canDelete) && (
                        <th className="px-4 py-3 font-medium text-right">{t("Actions")}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <tr key={String(row.id ?? idx)} className="border-t hover:bg-muted/30">
                        {columns.map((c) => {
                          const v = row[c.key];
                          const displayVal = c.nestedKey && v != null && typeof v === "object"
                            ? (v as Record<string, unknown>)[c.nestedKey]
                            : v;
                          return (
                            <td key={c.key} className="px-4 py-3">
                              {c.format === "money"
                                ? formatMoney(v)
                                : c.format === "date"
                                ? formatDate(v)
                                : c.format === "badge"
                                ? <Badge status={String(displayVal ?? "")} />
                                : displayVal != null
                                ? String(displayVal)
                                : "—"}
                            </td>
                          );
                        })}
                        {(canEdit || canDelete) && (
                          <td className="px-4 py-3 text-right">
                            <TableActionButton
                              label={canEdit ? t("Edit") : t("Delete")}
                              onPrimaryClick={canEdit ? () => openEdit(row) : () => setDeleteTarget(row)}
                              items={[
                                ...(canEdit ? [{ label: t("Edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(row) }] : []),
                                ...(canDelete ? [{ label: t("Delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => setDeleteTarget(row), destructive: true as const }] : []),
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
                    {t("Showing")} {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} {t("of")} {total}
                  </p>
                  <Pagination
                    page={page}
                    lastPage={lastPage}
                    total={total}
                    from={(page - 1) * perPage + 1}
                    to={Math.min(page * perPage, total)}
                    onPageChange={(p) => load({ nextPage: p })}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{editing ? t("Edit") : t("Add")} {title}</SheetTitle>
            <SheetDescription>{editing ? t("Update the record details below.") : t("Fill in the details to create a new record.")}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 grid gap-3 content-start">
            {fields.map((f) => (
              <div key={f.key} className="grid gap-0.5">
                <Label htmlFor={f.key}>
                  {t(f.label)}
                  {f.required && <span className="ml-0.5 text-destructive">*</span>}
                </Label>
                {f.type === "textarea" ? (
                  <Textarea
                    id={f.key}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={"placeholder" in f ? f.placeholder : undefined}
                    rows={3}
                  />
                ) : f.type === "select" ? (
                  <Select
                    value={form[f.key] ?? ""}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
                  >
                    <SelectTrigger id={f.key}>
                      <SelectValue placeholder={t("Select...")} />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {t(o.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : f.type === "remoteSelect" ? (
                  <Select
                    value={form[f.key] ? String(form[f.key]) : "__none__"}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v === "__none__" ? "" : v }))}
                  >
                    <SelectTrigger id={f.key}>
                      <SelectValue placeholder={t("Select...")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("None")}</SelectItem>
                      {(remoteOptions[f.key] ?? []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : f.type === "currency" ? (
                  <Input
                    id={f.key}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className="font-mono tabular-nums"
                    placeholder={formatMoney(0)}
                    value={
                      currencyFocusKey === f.key
                        ? (form[f.key] ?? "")
                        : (form[f.key] ?? "").trim() === ""
                          ? ""
                          : formatCurrency(Number(form[f.key]) || 0, settings)
                    }
                    onFocus={() => setCurrencyFocusKey(f.key)}
                    onBlur={() => {
                      setCurrencyFocusKey(null);
                      const raw = (form[f.key] ?? "").trim();
                      if (raw === "") return;
                      const n = parseCurrencyToNumber(form[f.key] ?? "", settings);
                      if (Number.isFinite(n)) setForm((prev) => ({ ...prev, [f.key]: String(n) }));
                    }}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={f.key}
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={"placeholder" in f ? f.placeholder : undefined}
                    step={f.type === "number" ? "0.01" : undefined}
                    min={f.type === "number" ? "0" : undefined}
                  />
                )}
              </div>
            ))}
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <SheetFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("Saving...") : t("Save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Confirm Delete")}</DialogTitle>
            <DialogDescription>{t("This action cannot be undone. Are you sure you want to delete this record?")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("Deleting...") : t("Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
