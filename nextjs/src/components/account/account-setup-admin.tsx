"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, FileX, TrendingUp, TrendingDown, Layers } from "lucide-react";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useTranslation } from "@/contexts/translation-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { cn } from "@/lib/utils";

type CategoryRow = { id: number; name: string; code: string; type: string; description: string | null; is_active: boolean };
type AccountTypeRow = { id: number; category_id: number; category_name: string | null; name: string; code: string; normal_balance: string; description: string | null; is_active: boolean };

function CategoryManager({
  type,
  title,
  permissions,
}: {
  type: string;
  title: string;
  permissions: string[];
}) {
  const { t } = useTranslation();
  const canWrite = permissions.includes("*") || permissions.includes("manage-account-setup") || permissions.includes("manage-account");

  const [data, setData] = React.useState<CategoryRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CategoryRow | null>(null);
  const [form, setForm] = React.useState({ name: "", code: "", description: "", is_active: true });
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<CategoryRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async ({ nextPage = page, nextSearch = search } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), per_page: "10", type });
      if (nextSearch) params.set("search", nextSearch);
      const res = await fetch(`/api/account/setup/categories?${params}`);
      const json = await res.json();
      setData(json.data ?? []); setTotal(json.total ?? 0); setLastPage(json.last_page ?? 1); setPage(nextPage);
    } finally { setLoading(false); }
  }, [page, search, type]);

  React.useEffect(() => { load({ nextPage: 1, nextSearch: "" }); }, [type]);

  const openCreate = () => { setEditing(null); setForm({ name: "", code: "", description: "", is_active: true }); setFormError(""); setDialogOpen(true); };
  const openEdit = (row: CategoryRow) => { setEditing(row); setForm({ name: row.name, code: row.code, description: row.description ?? "", is_active: row.is_active }); setFormError(""); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true); setFormError("");
    try {
      if (!form.name.trim()) { setFormError(t("Name is required")); return; }
      const body = { name: form.name.trim(), code: form.code.trim() || undefined, description: form.description.trim() || null, is_active: form.is_active, type };
      const url = editing ? `/api/account/setup/categories/${editing.id}` : "/api/account/setup/categories";
      const res = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error ?? t("Failed to save")); return; }
      setDialogOpen(false); load({ nextPage: editing ? page : 1 });
    } catch { setFormError(t("An error occurred")); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try {
      await fetch(`/api/account/setup/categories/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null); load({ nextPage: 1 });
    } finally { setDeleting(false); }
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <SearchInput placeholder={t(`Search ${title}...`)} value={search} onChange={setSearch} onSearch={() => load({ nextPage: 1, nextSearch: search })} />
        {canWrite && <Button onClick={openCreate} size="sm"><Plus className="mr-1 h-4 w-4" />{t(`Add ${title}`)}</Button>}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">{t("Loading...")}</div>
      ) : data.length === 0 ? (
        <NoRecordsFound icon={FileX} title={t(`No ${title} found`)} description={t(`Create ${title} to categorize your transactions.`)} hasFilters={!!search} onClearFilters={() => { setSearch(""); load({ nextPage: 1, nextSearch: "" }); }} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  {[t("Name"), t("Code"), t("Description"), t("Status")].map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}
                  {canWrite && <th className="px-4 py-3 font-medium text-right">{t("Actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{row.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.is_active ? "default" : "secondary"}>{row.is_active ? t("Active") : t("Inactive")}</Badge>
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
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t("Showing")} {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} {t("of")} {total}</p>
              <Pagination page={page} lastPage={lastPage} total={total} from={(page - 1) * 10 + 1} to={Math.min(page * 10, total)} onPageChange={(p) => load({ nextPage: p })} />
            </div>
          )}
        </>
      )}

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{editing ? t(`Edit ${title}`) : t(`Add ${title}`)}</SheetTitle>
            <SheetDescription>{t(`Manage your ${title.toLowerCase()} for transaction categorization.`)}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 grid gap-3 content-start">
            <div className="grid gap-0.5">
              <Label required>{t("Name")}</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-0.5">
              <Label>{t("Code")}</Label>
              <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder={t("Auto-generated if empty")} />
            </div>
            <div className="grid gap-0.5">
              <Label>{t("Description")}</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} id={`cat-${type}-active`} />
              <Label htmlFor={`cat-${type}-active`}>{t("Active")}</Label>
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
          <DialogHeader><DialogTitle>{t("Confirm Delete")}</DialogTitle><DialogDescription>{t("Are you sure you want to delete")} <strong>{deleteTarget?.name}</strong>?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>{t("Cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? t("Deleting...") : t("Delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AccountTypeManager({ permissions }: { permissions: string[] }) {
  const { t } = useTranslation();
  const canWrite = permissions.includes("*") || permissions.includes("manage-account-setup") || permissions.includes("manage-account");

  const [data, setData] = React.useState<AccountTypeRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [categories, setCategories] = React.useState<{ id: number; name: string }[]>([]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AccountTypeRow | null>(null);
  const [form, setForm] = React.useState({ name: "", code: "", category_id: "", normal_balance: "debit", description: "", is_active: true });
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<AccountTypeRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/account/setup/categories?per_page=100").then((r) => r.json()).then((j) => {
      setCategories((j.data ?? []).map((c: Record<string, unknown>) => ({ id: Number(c.id), name: String(c.name ?? "") })));
    }).catch(() => {});
  }, []);

  const load = React.useCallback(async ({ nextPage = page, nextSearch = search } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), per_page: "10" });
      if (nextSearch) params.set("search", nextSearch);
      const res = await fetch(`/api/account/setup/account-types?${params}`);
      const json = await res.json();
      setData(json.data ?? []); setTotal(json.total ?? 0); setLastPage(json.last_page ?? 1); setPage(nextPage);
    } finally { setLoading(false); }
  }, [page, search]);

  React.useEffect(() => { load({ nextPage: 1, nextSearch: "" }); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: "", code: "", category_id: "", normal_balance: "debit", description: "", is_active: true }); setFormError(""); setDialogOpen(true); };
  const openEdit = (row: AccountTypeRow) => { setEditing(row); setForm({ name: row.name, code: row.code, category_id: String(row.category_id), normal_balance: row.normal_balance, description: row.description ?? "", is_active: row.is_active }); setFormError(""); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true); setFormError("");
    try {
      if (!form.name.trim() || !form.category_id) { setFormError(t("Name and Category are required")); return; }
      const body = { name: form.name.trim(), code: form.code.trim() || undefined, category_id: Number(form.category_id), normal_balance: form.normal_balance, description: form.description.trim() || null, is_active: form.is_active };
      const url = editing ? `/api/account/setup/account-types/${editing.id}` : "/api/account/setup/account-types";
      const res = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error ?? t("Failed to save")); return; }
      setDialogOpen(false); load({ nextPage: editing ? page : 1 });
    } catch { setFormError(t("An error occurred")); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try {
      await fetch(`/api/account/setup/account-types/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null); load({ nextPage: 1 });
    } finally { setDeleting(false); }
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <SearchInput placeholder={t("Search account types...")} value={search} onChange={setSearch} onSearch={() => load({ nextPage: 1, nextSearch: search })} />
        {canWrite && <Button onClick={openCreate} size="sm"><Plus className="mr-1 h-4 w-4" />{t("Add Account Type")}</Button>}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">{t("Loading...")}</div>
      ) : data.length === 0 ? (
        <NoRecordsFound icon={FileX} title={t("No account types found")} description={t("Account types define how chart of accounts entries are categorized.")} hasFilters={!!search} onClearFilters={() => { setSearch(""); load({ nextPage: 1, nextSearch: "" }); }} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  {[t("Name"), t("Code"), t("Category"), t("Normal Balance"), t("Status")].map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}
                  {canWrite && <th className="px-4 py-3 font-medium text-right">{t("Actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.category_name ?? "—"}</td>
                    <td className="px-4 py-3 capitalize">{row.normal_balance}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.is_active ? "default" : "secondary"}>{row.is_active ? t("Active") : t("Inactive")}</Badge>
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
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t("Showing")} {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} {t("of")} {total}</p>
              <Pagination page={page} lastPage={lastPage} total={total} from={(page - 1) * 10 + 1} to={Math.min(page * 10, total)} onPageChange={(p) => load({ nextPage: p })} />
            </div>
          )}
        </>
      )}

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{editing ? t("Edit Account Type") : t("Add Account Type")}</SheetTitle>
            <SheetDescription>{t("Account types group chart of accounts entries.")}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 grid gap-3 content-start">
            <div className="grid gap-0.5">
              <Label required>{t("Name")}</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-0.5">
              <Label>{t("Code")}</Label>
              <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder={t("Auto-generated if empty")} />
            </div>
            <div className="grid gap-0.5">
              <Label required>{t("Category")}</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm((p) => ({ ...p, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder={t("Select category...")} /></SelectTrigger>
                <SelectContent>
                  {categories.length === 0
                    ? <SelectItem value="none" disabled>{t("No categories found")}</SelectItem>
                    : categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-0.5">
              <Label>{t("Normal Balance")}</Label>
              <Select value={form.normal_balance} onValueChange={(v) => setForm((p) => ({ ...p, normal_balance: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">{t("Debit")}</SelectItem>
                  <SelectItem value="credit">{t("Credit")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-0.5">
              <Label>{t("Description")}</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} id="at-active" />
              <Label htmlFor="at-active">{t("Active")}</Label>
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
          <DialogHeader><DialogTitle>{t("Confirm Delete")}</DialogTitle><DialogDescription>{t("Are you sure you want to delete")} <strong>{deleteTarget?.name}</strong>?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>{t("Cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? t("Deleting...") : t("Delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const SETUP_SECTIONS = [
  {
    id: "revenue-categories" as const,
    title: "Revenue Categories",
    description: "Create and manage revenue categories to classify incoming transactions.",
    icon: TrendingUp,
  },
  {
    id: "expense-categories" as const,
    title: "Expense Categories",
    description: "Create and manage expense categories to classify outgoing transactions.",
    icon: TrendingDown,
  },
  {
    id: "account-types" as const,
    title: "Account Types",
    description: "Define account types and how they map to categories in your chart of accounts.",
    icon: Layers,
  },
];

export default function AccountSetupAdmin({ permissions }: { permissions: string[] }) {
  const { t } = useTranslation();
  const canView = permissions.includes("*") || permissions.includes("manage-account-setup") || permissions.includes("manage-account");
  const [active, setActive] = React.useState<(typeof SETUP_SECTIONS)[number]["id"]>("revenue-categories");

  if (!canView) {
    return (
      <Card>
        <CardContent className="p-6 text-muted-foreground">
          {t("You do not have permission to view accounting setup.")}
        </CardContent>
      </Card>
    );
  }

  const section = SETUP_SECTIONS.find((s) => s.id === active)!;
  const SectionIcon = section.icon;

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="md:w-64 flex-shrink-0">
        <div className="md:sticky md:top-4 space-y-2">
          <p className="hidden md:block text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            {t("System Setup")}
          </p>
          <div className="md:hidden -mx-1">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {SETUP_SECTIONS.map((s) => (
                <Button
                  key={s.id}
                  type="button"
                  variant={active === s.id ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap shrink-0"
                  onClick={() => setActive(s.id)}
                >
                  <s.icon className="h-4 w-4 mr-2" />
                  {t(s.title)}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="hidden md:block h-[min(70vh,calc(100vh-8rem))]">
            <div className="pr-4 space-y-1">
              {SETUP_SECTIONS.map((s) => (
                <Button
                  key={s.id}
                  type="button"
                  variant="ghost"
                  className={cn("w-full justify-start", active === s.id && "bg-muted font-medium")}
                  onClick={() => setActive(s.id)}
                >
                  <s.icon className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
                  <span className="text-left">{t(s.title)}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-4">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <SectionIcon className="h-5 w-5 shrink-0" />
                {t(section.title)}
              </CardTitle>
              <CardDescription className="mt-1.5">{t(section.description)}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {active === "revenue-categories" && (
              <CategoryManager type="revenue" title="Revenue Category" permissions={permissions} />
            )}
            {active === "expense-categories" && (
              <CategoryManager type="expense" title="Expense Category" permissions={permissions} />
            )}
            {active === "account-types" && <AccountTypeManager permissions={permissions} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
