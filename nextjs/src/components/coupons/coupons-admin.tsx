"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import Link from "next/link";
import { Plus, Ticket, Eye, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { t } from "@/lib/admin-t";


type CouponRow = {
  id: string;
  name: string;
  description?: string | null;
  code: string;
  discount: string;
  type: string;
  limit?: number | null;
  expiry_date?: string | null;
  status: boolean;
};

type CouponsResponse = {
  ok: boolean;
  coupons: { data: CouponRow[]; meta: { total: number; per_page: number; current_page: number; last_page: number } };
  message?: string;
};

function statusBadge(active: boolean) {
  return (
    <span className={["px-2 py-1 rounded-full text-sm", active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"].join(" ")}>
      {active ? t("Active") : t("Inactive")}
    </span>
  );
}

function typeBadge(type: string) {
  return <span className="capitalize px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{type}</span>;
}

function codePill(code: string) {
  return <span className="font-mono bg-gray-100 px-2 py-1 rounded-full text-sm">{code}</span>;
}

export default function CouponsAdmin({ permissions }: { permissions: string[] }) {
  const canCreate = permissions.includes("*") || permissions.includes("create-coupons");
  const canEdit = permissions.includes("*") || permissions.includes("edit-coupons");
  const canDelete = permissions.includes("*") || permissions.includes("delete-coupons");
  const canView = permissions.includes("*") || permissions.includes("view-coupons");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<CouponRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);

  const [filters, setFilters] = React.useState({ name: "", code: "", type: "", status: "" });
  const [showFilters, setShowFilters] = React.useState(false);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"add" | "edit">("add");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    code: "",
    type: "percentage",
    discount: "0",
    limit: "",
    expiry_date: "",
    status: true,
  });
  const [processing, setProcessing] = React.useState(false);

  async function load(opts?: { nextPage?: number; nextPerPage?: number }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("per_page", String(pp));
      if (filters.name.trim()) params.set("name", filters.name.trim());
      if (filters.code.trim()) params.set("code", filters.code.trim());
      if (filters.type.trim()) params.set("type", filters.type.trim());
      if (filters.status.trim()) params.set("status", filters.status.trim());
      const res = await fetch(`/api/coupons?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as CouponsResponse | null;
      if (!res.ok || !json?.ok) throw new Error((json as any)?.message || "Failed to load coupons.");
      setItems(Array.isArray(json.coupons?.data) ? json.coupons.data : []);
      setPage(json.coupons.meta.current_page);
      setPerPage(json.coupons.meta.per_page);
      setTotal(json.coupons.meta.total);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load({ nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function apply() {
    setPage(1);
    void load({ nextPage: 1 });
  }

  function clear() {
    setFilters({ name: "", code: "", type: "", status: "" });
    setPage(1);
    void load({ nextPage: 1 });
  }

  function openCreate() {
    setModalMode("add");
    setEditingId(null);
    setForm({ name: "", description: "", code: "", type: "percentage", discount: "0", limit: "", expiry_date: "", status: true });
    setModalOpen(true);
  }

  function openEdit(c: CouponRow) {
    setModalMode("edit");
    setEditingId(c.id);
    setForm({
      name: c.name,
      description: c.description ?? "",
      code: c.code ?? "",
      type: c.type ?? "percentage",
      discount: String(c.discount ?? "0"),
      limit: c.limit != null ? String(c.limit) : "",
      expiry_date: c.expiry_date ? c.expiry_date.slice(0, 10) : "",
      status: Boolean(c.status),
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (modalMode === "add" && !canCreate) return;
    if (modalMode === "edit" && !canEdit) return;
    setProcessing(true);
    setError(null);
    try {
      const payload: any = {
        name: form.name,
        description: form.description,
        code: form.code,
        type: form.type,
        discount: Number(form.discount || "0"),
        limit: form.limit ? Number(form.limit) : null,
        expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
        status: form.status,
      };
      const res = await fetch(modalMode === "add" ? "/api/coupons" : `/api/coupons/${String(editingId)}`, {
        method: modalMode === "add" ? "POST" : "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Save failed.");
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "Save failed.");
    } finally {
      setProcessing(false);
    }
  }

  async function remove(id: string) {
    if (!canDelete) return;
    if (!(await appConfirm(t("Are you sure you want to delete this coupon?")))) return;
    const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" });
    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok || !json?.ok) {
      setError(json?.message || "Delete failed.");
      return;
    }
    await load();
  }

  function goto(next: number) {
    const clamped = Math.max(1, Math.min(totalPages, next));
    setPage(clamped);
    void load({ nextPage: clamped });
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <div className="flex items-center justify-end">
        {canCreate ? (
          <Button size="sm" onClick={openCreate} aria-label={t("Create")}>
            <Plus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6 border-b bg-gray-50/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 max-w-md min-w-[280px]">
              <div className="flex gap-2">
                <Input value={filters.name} onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))} placeholder={t("Search coupons...")} />
                <Button type="button" onClick={apply}>
                  {t("Search")}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={String(perPage)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10) || 10;
                  setPerPage(v);
                  setPage(1);
                  void load({ nextPage: 1, nextPerPage: v });
                }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} {t("per page")}
                  </option>
                ))}
              </select>

              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setShowFilters((v) => !v)}>
                {t("Filters")}
              </Button>
            </div>
          </div>

          {showFilters ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <Input value={filters.code} onChange={(e) => setFilters((p) => ({ ...p, code: e.target.value }))} placeholder={t("Code")} />
              <Select value={filters.type} onValueChange={(v) => setFilters((p) => ({ ...p, type: v }))}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t("Type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("All")}</SelectItem>
                  <SelectItem value="percentage">{t("Percentage")}</SelectItem>
                  <SelectItem value="flat">{t("Flat Amount")}</SelectItem>
                  <SelectItem value="fixed">{t("Fixed Price")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(v) => setFilters((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t("Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("All")}</SelectItem>
                  <SelectItem value="1">{t("Active")}</SelectItem>
                  <SelectItem value="0">{t("Inactive")}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button type="button" onClick={apply} className="flex-1">
                  {t("Apply")}
                </Button>
                <Button type="button" variant="outline" onClick={clear}>
                  {t("Clear")}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left font-medium px-4 py-3">{t("Name")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Code")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Discount")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Type")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Limit")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Expiry Date")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Status")}</th>
                  <th className="text-right font-medium px-4 py-3">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      {t("Loading...")}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14">
                      <div className="flex flex-col items-center justify-center text-center gap-2">
                        <Ticket className="h-12 w-12 text-muted-foreground" />
                        <div className="font-medium">{t("No coupons found")}</div>
                        <div className="text-sm text-muted-foreground">{t("Get started by creating your first coupon.")}</div>
                        {canCreate ? (
                          <Button className="mt-2" onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            {t("Create Coupon")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-accent/20">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3">{codePill(c.code)}</td>
                      <td className="px-4 py-3">{c.type === "percentage" ? `${c.discount}%` : `$${c.discount}`}</td>
                      <td className="px-4 py-3">{typeBadge(c.type)}</td>
                      <td className="px-4 py-3">{c.limit || t("Unlimited")}</td>
                      <td className="px-4 py-3">{c.expiry_date ? c.expiry_date.slice(0, 10) : "-"}</td>
                      <td className="px-4 py-3">{statusBadge(Boolean(c.status))}</td>
                      <td className="px-4 py-3 text-right">
                        <TableActionButton
                          label={t("Edit")}
                          onPrimaryClick={() => openEdit(c)}
                          disabled={!canEdit}
                          items={[
                            ...(canView ? [{ label: t("View"), href: `/coupons/${c.id}`, icon: <Eye className="h-4 w-4" /> } as const] : []),
                            { label: t("Edit"), onSelect: () => openEdit(c), disabled: !canEdit },
                            { label: t("Delete"), onSelect: () => remove(c.id), disabled: !canDelete, destructive: true, icon: <Trash2 className="h-4 w-4" /> },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        <CardContent className="px-4 py-2 border-t bg-gray-50/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              {t("Showing")} {from} {t("to")} {to} {t("of")} {total} {t("results")}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => goto(page - 1)} disabled={page <= 1}>
                {t("Previous")}
              </Button>
              <Button type="button" variant="secondary" size="sm" className="min-w-9" disabled>
                {page}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => goto(page + 1)} disabled={page >= totalPages}>
                {t("Next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        {modalOpen ? (
          <div className="hidden">
            {/* Dialog content is rendered by layout-level dialog component in this app */}
          </div>
        ) : null}
      </Dialog>

      {/* Lightweight modal using native DialogContent is handled elsewhere in this app; keep form inline for now */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-background shadow-lg">
            <div className="p-4 border-b">
              <div className="font-semibold">{modalMode === "add" ? t("Create Coupon") : t("Edit Coupon")}</div>
            </div>
            <form onSubmit={save} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("Name")}</div>
                  <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("Code")}</div>
                  <div className="flex gap-2">
                    <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} required />
                    <Button type="button" variant="outline" onClick={() => setForm((p) => ({ ...p, code: `COUP-${Date.now()}` }))} disabled={processing}>
                      {t("Generate")}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("Type")}</div>
                  <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{t("Percentage")}</SelectItem>
                      <SelectItem value="flat">{t("Flat Amount")}</SelectItem>
                      <SelectItem value="fixed">{t("Fixed Price")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("Discount")}</div>
                  <Input type="number" min={0} step="0.01" value={form.discount} onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("Usage Limit")}</div>
                  <Input type="number" min={1} value={form.limit} onChange={(e) => setForm((p) => ({ ...p, limit: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("Expiry Date")}</div>
                  <Input type="date" value={form.expiry_date} onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">{t("Description")}</div>
                <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.checked }))} />
                {t("Active")}
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={processing}>
                  {t("Cancel")}
                </Button>
                <Button type="submit" disabled={processing}>
                  {processing ? t("Saving...") : modalMode === "add" ? t("Create") : t("Update")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

