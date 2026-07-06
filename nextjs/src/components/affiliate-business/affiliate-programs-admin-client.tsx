"use client";

import * as React from "react";
import { Box, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AffiliateAdminListShell,
  useAffiliateListPagination,
} from "@/components/affiliate-business/affiliate-admin-list-shell";
import { AffiliateStatusBadge } from "@/components/affiliate-business/affiliate-status-badge";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/admin-t";

type ProgramRow = {
  id: string;
  name: string;
  description: string | null;
  commissionType: string;
  commissionValue: number;
  cookieDays: number;
  status: string;
  commissionCount: number;
};


export function AffiliateProgramsAdminClient() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<ProgramRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    commissionType: "percentage",
    commissionValue: 15,
    cookieDays: 30,
    status: "active",
  });

  const { page, perPage, setPage, setPerPage, resetPage, paginate } = useAffiliateListPagination(10);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appliedSearch) params.set("search", appliedSearch);
      const qs = params.toString();
      const res = await fetch(`/api/affiliate-business/programs${qs ? `?${qs}` : ""}`, {
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: ProgramRow[] };
      if (!res.ok || !data?.ok) {
        toast.error("Failed to load programs");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSearch = () => {
    setAppliedSearch(search.trim());
    resetPage();
  };

  const { slice, total, lastPage, from, to, safePage } = paginate(items);
  React.useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [safePage, page, setPage]);

  const openCreate = () => {
    setEditId(null);
    setForm({
      name: "",
      description: "",
      commissionType: "percentage",
      commissionValue: 15,
      cookieDays: 30,
      status: "active",
    });
    setDialogOpen(true);
  };

  const openEdit = (row: ProgramRow) => {
    setEditId(row.id);
    setForm({
      name: row.name,
      description: row.description ?? "",
      commissionType: row.commissionType,
      commissionValue: row.commissionValue,
      cookieDays: row.cookieDays,
      status: row.status,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Program name is required");
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `/api/affiliate-business/programs/${editId}` : "/api/affiliate-business/programs";
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Save failed");
        return;
      }
      toast.success(editId ? "Program updated" : "Program created");
      setDialogOpen(false);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const formatCommission = (row: ProgramRow) =>
    row.commissionType === "flat" ? `$${row.commissionValue}` : `${row.commissionValue}%`;

  const programActions = (row: ProgramRow) => {
    const menuItems: TableActionItem[] = [
      {
        label: t("Affiliate links"),
        href: `/affiliate-business/links?program=${row.id}`,
        icon: <Link2 className="h-4 w-4" />,
      },
      { label: t("Edit"), onSelect: () => openEdit(row) },
    ];
    return { label: t("Edit"), onPrimaryClick: () => openEdit(row), items: menuItems };
  };

  return (
    <>
      <AffiliateAdminListShell
        search={search}
        onSearchChange={setSearch}
        onSearch={handleSearch}
        searchPlaceholder={t("Search programs...")}
        loading={loading}
        itemCount={items.length}
        pagination={{ page, perPage, onPageChange: setPage, onPerPageChange: setPerPage }}
        paginatedTotal={total}
        paginatedLastPage={lastPage}
        paginatedFrom={from}
        paginatedTo={to}
        createLabel={t("Add Program")}
        onCreateClick={openCreate}
        emptyIcon={Box}
        emptyTitle={t("No programs found")}
        emptyDescription={t("Create a program to define commission rules for affiliates.")}
        hasFilters={!!appliedSearch.trim()}
        onClearFilters={() => {
          setSearch("");
          setAppliedSearch("");
          resetPage();
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">{t("Program")}</th>
                <th className="p-3 text-left font-medium">{t("Commission")}</th>
                <th className="p-3 text-left font-medium">{t("Cookie")}</th>
                <th className="p-3 text-left font-medium">{t("Status")}</th>
                <th className="p-3 text-right font-medium">{t("Commissions")}</th>
                <th className="p-3 text-right font-medium">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{row.name}</div>
                    {row.description ? (
                      <p className="line-clamp-2 max-w-md text-xs text-muted-foreground">{row.description}</p>
                    ) : null}
                  </td>
                  <td className="p-3">{formatCommission(row)}</td>
                  <td className="p-3">
                    {row.cookieDays} {t("days")}
                  </td>
                  <td className="p-3">
                    <AffiliateStatusBadge status={row.status} />
                  </td>
                  <td className="p-3 text-right tabular-nums">{row.commissionCount}</td>
                  <td className="p-3 text-right">
                    <TableActionButton {...programActions(row)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AffiliateAdminListShell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? t("Edit Program") : t("New Program")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t("Name")}</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>{t("Description")}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>{t("Type")}</Label>
                <Select
                  value={form.commissionType}
                  onValueChange={(v) => setForm((f) => ({ ...f, commissionType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t("Percentage")}</SelectItem>
                    <SelectItem value="flat">{t("Flat amount")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("Value")}</Label>
                <Input
                  type="number"
                  value={form.commissionValue}
                  onChange={(e) => setForm((f) => ({ ...f, commissionValue: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>{t("Cookie days")}</Label>
                <Input
                  type="number"
                  value={form.cookieDays}
                  onChange={(e) => setForm((f) => ({ ...f, cookieDays: Number(e.target.value) || 30 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("Status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("Active")}</SelectItem>
                    <SelectItem value="paused">{t("Paused")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t("Cancel")}
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
