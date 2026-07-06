"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPhone, unformatPhone } from "@/lib/phone";
import { t } from "@/lib/admin-t";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency, parseCurrencyToNumber, filterMoneyDecimalInput } from "@/lib/format-currency";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "currency" | "textarea" | "select" | "multiselect" | "boolean" | "date" | "phone" | "address";
  options?: { value: string; label: string }[];
  required?: boolean;
  readOnly?: boolean;
  colSpan?: boolean;
};

export type ColDef = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
};

export type FieldTabDef = { id: string; label: string; keys: string[] };

interface PosSimpleAdminProps {
  title: string;
  apiPath: string;
  columns: ColDef[];
  fields: FieldDef[];
  createTitle?: string;
  editTitle?: string;
  defaultValues?: Record<string, unknown>;
  pageActions?: React.ReactNode;
  /** When set, fields are grouped into tabs by key (keys must cover all fields). */
  fieldTabs?: FieldTabDef[];
}


export function PosSimpleAdmin({
  title, apiPath, columns, fields, createTitle, editTitle, defaultValues = {}, pageActions, fieldTabs,
}: PosSimpleAdminProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(defaultValues);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currencyFocusKey, setCurrencyFocusKey] = useState<string | null>(null);
  const { settings } = useAppSettings();
  const decimalPlaces = Math.min(
    10,
    Math.max(0, parseInt(String(settings.decimalFormat ?? "2").trim() || "2", 10) || 2),
  );

  const load = useCallback(() => {
    setLoading(true);
    fetch(apiPath, { credentials: "include" })
      .then(r => r.json()).then(setRows).catch(console.error).finally(() => setLoading(false));
  }, [apiPath]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultValues);
    setError(null);
    setCurrencyFocusKey(null);
    setOpen(true);
  };
  const openEdit = (row: Record<string, unknown>) => {
    const merged = { ...row };
    for (const f of fields) {
      if (f.type === "multiselect" && !Array.isArray(merged[f.key])) {
        merged[f.key] = [];
      }
    }
    setEditing(row);
    setForm(merged);
    setError(null);
    setCurrencyFocusKey(null);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      for (const field of fields) {
        if (field.type !== "currency") continue;
        const raw = String(form[field.key] ?? "").trim();
        if (!raw) {
          payload[field.key] = null;
          continue;
        }
        const n = parseCurrencyToNumber(raw, settings);
        if (!Number.isFinite(n)) {
          setError(t("Enter a valid amount for") + ` ${field.label}.`);
          return;
        }
        if (field.required && n < 0) {
          setError(t("Enter a valid amount for") + ` ${field.label}.`);
          return;
        }
        payload[field.key] = n;
      }

      const isEdit = !!editing;
      const url = isEdit ? `${apiPath}/${editing!.id}` : apiPath;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); setError(e.error || "Error saving"); return; }
      setOpen(false); load();
    } finally { setSaving(false); }
  };

  const del = async () => {
    if (!deleteId) return;
    await fetch(`${apiPath}/${deleteId}`, { method: "DELETE", credentials: "include" });
    setDeleteId(null); load();
  };

  const filtered = rows.filter((row) =>
    columns.some((col) => {
      const v = row[col.key];
      const hay =
        Array.isArray(v) ? v.join(" ") : String(v ?? "");
      return hay.toLowerCase().includes(search.toLowerCase());
    }),
  );

  const fv = (key: string) => form[key] ?? "";
  const sf = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const renderField = (field: FieldDef) => {
    if (field.readOnly && !editing) return null;
    const val = String(fv(field.key));

    const fieldEl = (() => {
      switch (field.type) {
        case "phone":
          return (
            <Input
              type="tel"
              value={formatPhone(val)}
              placeholder="(000) 000-0000"
              onChange={e => {
                const raw = unformatPhone(e.target.value);
                sf(field.key, raw);
              }}
            />
          );
        case "address":
          return (
            <AddressAutocomplete
              value={val}
              onChange={v => sf(field.key, v)}
              placeholder="Start typing an address..."
            />
          );
        case "textarea":
          return (
            <Textarea value={val} onChange={e => sf(field.key, e.target.value)} rows={3} />
          );
        case "select":
          return (
            <select
              value={val}
              onChange={e => sf(field.key, e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— {t("Select")} —</option>
              {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          );
        case "multiselect": {
          const selected = Array.isArray(form[field.key]) ? (form[field.key] as string[]) : [];
          return (
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-input p-2">
              {field.options?.length ? (
                field.options.map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(o.value)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selected, o.value]
                          : selected.filter((x) => x !== o.value);
                        sf(field.key, next);
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span>{o.label}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t("No options loaded")}</p>
              )}
            </div>
          );
        }
        case "boolean":
          return (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={field.key}
                checked={!!fv(field.key)}
                onChange={e => sf(field.key, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor={field.key} className="text-sm">{t("Active")}</label>
            </div>
          );
        case "currency": {
          const raw = String(form[field.key] ?? "");
          const display =
            currencyFocusKey === field.key
              ? raw
              : raw.trim() === ""
                ? ""
                : formatCurrency(Number(raw) || parseCurrencyToNumber(raw, settings) || 0, settings);
          return (
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className="font-mono tabular-nums"
              placeholder={formatCurrency(0, settings)}
              value={display}
              onFocus={() => setCurrencyFocusKey(field.key)}
              onBlur={() => {
                setCurrencyFocusKey(null);
                const trimmed = raw.trim();
                if (!trimmed) return;
                const n = parseCurrencyToNumber(trimmed, settings);
                if (Number.isFinite(n)) sf(field.key, String(n));
              }}
              onChange={(e) => sf(field.key, filterMoneyDecimalInput(e.target.value, decimalPlaces))}
            />
          );
        }
        default:
          return (
            <Input
              type={field.type === "number" || field.type === "date" ? field.type : "text"}
              value={val}
              onChange={e => sf(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
            />
          );
      }
    })();

    return (
      <div key={field.key}>
        <Label className="mb-1.5 block">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {fieldEl}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("Search...")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {pageActions}
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            {createTitle || t("Add New")}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => <TableHead key={col.key}>{col.label}</TableHead>)}
              <TableHead className="w-24 text-right">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center py-10 text-muted-foreground">
                  {t("Loading...")}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center py-10 text-muted-foreground">
                  {t("No records found")}
                </TableCell>
              </TableRow>
            ) : filtered.map((row, i) => (
              <TableRow key={String(row.id ?? i)}>
                {columns.map(col => (
                  <TableCell key={col.key}>
                    {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <TableActionButton
                    label={t("Edit")}
                    onPrimaryClick={() => openEdit(row)}
                    items={[
                      { label: t("Edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(row) },
                      { label: t("Delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => setDeleteId(String(row.id)), destructive: true },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!loading && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCurrencyFocusKey(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>
              {editing ? (editTitle || t("Edit")) : (createTitle || t("Add New"))}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
            )}
            {fieldTabs?.length ? (
              <Tabs defaultValue={fieldTabs[0]!.id} className="w-full">
                <TabsList className="mb-2 w-full flex-wrap justify-start">
                  {fieldTabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id} type="button">
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {fieldTabs.map((tab) => (
                  <TabsContent key={tab.id} value={tab.id} className="space-y-4">
                    {fields
                      .filter((f) => tab.keys.includes(f.key))
                      .map((field) => renderField(field))}
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              fields.map((field) => renderField(field))
            )}
          </div>

          <SheetFooter className="px-6 py-4 border-t flex flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? t("Saving...") : t("Save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Record")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete this record? This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={del}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
    draft: "bg-gray-100 text-gray-800",
    open: "bg-blue-100 text-blue-800",
    closed: "bg-slate-100 text-slate-800",
    received: "bg-green-100 text-green-800",
    approved: "bg-emerald-100 text-emerald-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] || "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
}
