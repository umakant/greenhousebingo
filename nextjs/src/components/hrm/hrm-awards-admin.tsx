"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { Plus, Trash2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate } from "@/lib/format-date";
import { HrmProjectsStyleListPage, type HrmViewMode } from "@/components/hrm/hrm-projects-style-list";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { t } from "@/lib/admin-t";


type AwardRow = {
  id: string;
  awardName: string;
  date: string;
  gift?: string | null;
  cashPrice?: number | null;
  description?: string | null;
  employee?: { id: string; firstName: string; lastName?: string | null } | null;
  awardType?: { id: string; name: string } | null;
};
type AwardTypeRow = { id: string; name: string; description?: string | null };
type OptionRow = { id: string; name: string };
type AwCol = "employee" | "award" | "type" | "date" | "gift";

const AW_COL_DEFAULT: Record<AwCol, boolean> = {
  employee: true,
  award: true,
  type: true,
  date: true,
  gift: true,
};

const awColumnDefs: { id: AwCol; label: string }[] = [
  { id: "employee", label: t("Employee") },
  { id: "award", label: t("Award") },
  { id: "type", label: t("Type") },
  { id: "date", label: t("Date") },
  { id: "gift", label: t("Gift / Cash") },
];

export default function HrmAwardsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  const { settings } = useAppSettings();
  const fmtDate = (d: string | Date | null | undefined) => formatDate(d, settings);
  const [awards, setAwards] = React.useState<AwardRow[]>([]);
  const [awardTypes, setAwardTypes] = React.useState<AwardTypeRow[]>([]);
  const [employees, setEmployees] = React.useState<OptionRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [openType, setOpenType] = React.useState(false);
  const [typeMode, setTypeMode] = React.useState<"add" | "edit">("add");
  const [editTypeId, setEditTypeId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ employee_id: "", award_type_id: "", award_name: "", date: "", gift: "", cash_price: "", description: "" });
  const [typeForm, setTypeForm] = React.useState({ name: "", description: "" });
  const [processing, setProcessing] = React.useState(false);
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<AwCol>("pf-hrm-awards-cols-v1", AW_COL_DEFAULT);

  async function loadSupport() {
    const [at, emp] = await Promise.all([
      fetch("/api/hrm/award-types?per_page=100", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/hrm/employees?per_page=200&status=active", { credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setAwardTypes(at.data ?? []);
    setEmployees((emp.data ?? []).map((e: { id: string; firstName: string; lastName?: string | null }) => ({ id: e.id, name: `${e.firstName} ${e.lastName ?? ""}`.trim() })));
  }

  async function loadAwards(opts?: { nextPage?: number; nextPerPage?: number; nextSearch?: string }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    const q = opts?.nextSearch !== undefined ? opts.nextSearch : search;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(pp) });
      if (q.trim()) params.set("search", q.trim());
      const aw = await fetch(`/api/hrm/awards?${params}`, { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [], total: 0 }));
      setAwards(aw.data ?? []);
      setTotal(aw.total ?? 0);
      setPage(p);
      if (opts?.nextPerPage != null) setPerPage(pp);
      setLastPage(typeof aw.last_page === "number" ? aw.last_page : Math.max(1, Math.ceil((aw.total ?? 0) / pp)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadSupport();
    void loadAwards();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function openCreate() {
    setMode("add");
    setEditId(null);
    setForm({ employee_id: "", award_type_id: "", award_name: "", date: "", gift: "", cash_price: "", description: "" });
    setOpen(true);
  }
  function openEdit(row: AwardRow) {
    setMode("edit");
    setEditId(row.id);
    setForm({
      employee_id: row.employee?.id ?? "",
      award_type_id: row.awardType?.id ?? "",
      award_name: row.awardName,
      date: row.date ? new Date(row.date).toISOString().slice(0, 10) : "",
      gift: row.gift ?? "",
      cash_price: row.cashPrice != null ? String(row.cashPrice) : "",
      description: row.description ?? "",
    });
    setOpen(true);
  }

  async function saveAward(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        award_name: form.award_name,
        date: form.date,
        gift: form.gift || null,
        cash_price: form.cash_price ? Number(form.cash_price) : null,
        description: form.description || null,
      };
      if (mode === "add") {
        body.employee_id = form.employee_id;
        body.award_type_id = form.award_type_id;
      } else if (form.award_type_id) body.award_type_id = form.award_type_id;
      const url = mode === "add" ? "/api/hrm/awards" : `/api/hrm/awards/${editId}`;
      const res = await fetch(url, {
        method: mode === "add" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Save failed");
      setOpen(false);
      await loadAwards();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setProcessing(false);
    }
  }

  async function delAward(id: string) {
    if (!(await appConfirm(t("Delete this award?")))) return;
    const res = await fetch(`/api/hrm/awards/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error || "Delete failed");
      return;
    }
    await loadAwards();
  }

  function openCreateType() {
    setTypeMode("add");
    setEditTypeId(null);
    setTypeForm({ name: "", description: "" });
    setOpenType(true);
  }
  function openEditType(row: AwardTypeRow) {
    setTypeMode("edit");
    setEditTypeId(row.id);
    setTypeForm({ name: row.name, description: row.description ?? "" });
    setOpenType(true);
  }

  async function saveType(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    try {
      const url = typeMode === "add" ? "/api/hrm/award-types" : `/api/hrm/award-types/${editTypeId}`;
      const res = await fetch(url, {
        method: typeMode === "add" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: typeForm.name, description: typeForm.description || null }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Save failed");
      setOpenType(false);
      await loadSupport();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setProcessing(false);
    }
  }

  async function delType(id: string) {
    if (!(await appConfirm(t("Delete this award type?")))) return;
    const res = await fetch(`/api/hrm/award-types/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error || "Delete failed");
      return;
    }
    await loadSupport();
  }

  const empLabel = (row: AwardRow) => (row.employee ? `${row.employee.firstName} ${row.employee.lastName ?? ""}`.trim() : "—");
  const giftCash = (row: AwardRow) => {
    const g = row.gift ? row.gift : "";
    const c = row.cashPrice != null ? ` $${row.cashPrice}` : "";
    return g || c ? `${g}${c}` : "—";
  };

  const rowActionsAward = (row: AwardRow) =>
    can("edit-awards") || can("delete-awards") ? (
      <TableActionButton
        label={t("Edit")}
        onPrimaryClick={can("edit-awards") ? () => openEdit(row) : undefined}
        items={[
          { label: t("Edit"), onSelect: () => openEdit(row), disabled: !can("edit-awards") },
          { label: t("Delete"), onSelect: () => delAward(row.id), disabled: !can("delete-awards"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
        ]}
      />
    ) : null;

  return (
    <div className="w-full min-w-0 space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      <Tabs defaultValue="awards">
        <TabsList>
          <TabsTrigger value="awards">{t("Awards")}</TabsTrigger>
          <TabsTrigger value="award-types">{t("Award Types")}</TabsTrigger>
        </TabsList>

        <TabsContent value="awards" className="mt-4">
          <HrmProjectsStyleListPage
            searchPlaceholder={t("Search awards...")}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearchSubmit={() => {
              const q = searchInput.trim();
              setSearch(q);
              void loadAwards({ nextPage: 1, nextSearch: q });
            }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            perPage={perPage}
            onPerPageChange={(n) => void loadAwards({ nextPage: 1, nextPerPage: n })}
            columnsMenu={
              <TableColumnVisibilityMenu columns={awColumnDefs} columnVisible={columnVisible} setVisibility={setVisibility} onReset={resetVisibility} />
            }
            onRefresh={() => void loadAwards()}
            refreshing={loading}
            primaryAction={
              can("create-awards") ? (
                <Button size="sm" className="gap-1" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  {t("Give Award")}
                </Button>
              ) : undefined
            }
            page={page}
            lastPage={lastPage}
            total={total}
            from={from}
            to={to}
            onPageChange={(p) => void loadAwards({ nextPage: p })}
          >
            {viewMode === "list" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {columnVisible("employee") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Employee")}</th> : null}
                      {columnVisible("award") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Award")}</th> : null}
                      {columnVisible("type") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Type")}</th> : null}
                      {columnVisible("date") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Date")}</th> : null}
                      {columnVisible("gift") ? <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Gift / Cash")}</th> : null}
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                          {t("Loading...")}
                        </td>
                      </tr>
                    ) : awards.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Award className="h-10 w-10 text-gray-300" />
                            <div>{t("No awards found")}</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      awards.map((row) => (
                        <tr key={row.id} className="border-b hover:bg-muted/30">
                          {columnVisible("employee") ? <td className="px-4 py-3 font-medium">{empLabel(row)}</td> : null}
                          {columnVisible("award") ? <td className="px-4 py-3">{row.awardName}</td> : null}
                          {columnVisible("type") ? <td className="px-4 py-3 text-muted-foreground">{row.awardType?.name ?? "—"}</td> : null}
                          {columnVisible("date") ? <td className="px-4 py-3">{fmtDate(row.date)}</td> : null}
                          {columnVisible("gift") ? <td className="px-4 py-3 text-muted-foreground">{giftCash(row)}</td> : null}
                          <td className="px-4 py-3 text-right">{rowActionsAward(row)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                {loading ? (
                  <div className="py-12 text-center text-muted-foreground">{t("Loading...")}</div>
                ) : awards.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <Award className="h-10 w-10 text-gray-300" />
                    <div>{t("No awards found")}</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {awards.map((row) => (
                      <Card key={row.id} className="border-border/60 shadow-sm">
                        <CardContent className="space-y-2 p-4">
                          {columnVisible("employee") ? <div className="text-xs text-muted-foreground">{empLabel(row)}</div> : null}
                          {columnVisible("award") ? <div className="font-semibold">{row.awardName}</div> : null}
                          {columnVisible("type") ? <p className="text-xs">{row.awardType?.name ?? "—"}</p> : null}
                          {columnVisible("date") ? <p className="text-xs text-muted-foreground">{fmtDate(row.date)}</p> : null}
                          {columnVisible("gift") ? <p className="text-xs">{giftCash(row)}</p> : null}
                          <div className="flex justify-end border-t pt-3">{rowActionsAward(row)}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </HrmProjectsStyleListPage>
        </TabsContent>

        <TabsContent value="award-types" className="mt-4">
          <Card className="border-border/80 shadow-sm">
            <CardContent className="border-b bg-muted/30 p-4 sm:p-6">
              <div className="flex justify-end">
                {can("create-awards") ? (
                  <Button size="sm" className="gap-1" onClick={openCreateType}>
                    <Plus className="h-4 w-4" />
                    {t("Add Type")}
                  </Button>
                ) : null}
              </div>
            </CardContent>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Name")}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Description")}</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awardTypes.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                          {t("No award types found")}
                        </td>
                      </tr>
                    ) : (
                      awardTypes.map((row) => (
                        <tr key={row.id} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{row.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.description || "—"}</td>
                          <td className="px-4 py-3 text-right">
                            {(can("edit-awards") || can("delete-awards")) && (
                              <TableActionButton
                                label={t("Edit")}
                                onPrimaryClick={can("edit-awards") ? () => openEditType(row) : undefined}
                                items={[
                                  { label: t("Edit"), onSelect: () => openEditType(row), disabled: !can("edit-awards") },
                                  { label: t("Delete"), onSelect: () => delType(row.id), disabled: !can("delete-awards"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
                                ]}
                              />
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[520px]">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{mode === "add" ? t("Give Award") : t("Edit Award")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={saveAward} className="flex flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {mode === "add" && (
                <div className="space-y-2">
                  <Label required>{t("Employee")}</Label>
                  <Select value={form.employee_id} onValueChange={(v) => setForm((p) => ({ ...p, employee_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select employee...")} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label required>{t("Award Type")}</Label>
                  <Select value={form.award_type_id} onValueChange={(v) => setForm((p) => ({ ...p, award_type_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select type...")} />
                    </SelectTrigger>
                    <SelectContent>
                      {awardTypes.map((at) => (
                        <SelectItem key={at.id} value={at.id}>
                          {at.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label required>{t("Award Name")}</Label>
                  <Input value={form.award_name} onChange={(e) => setForm((p) => ({ ...p, award_name: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label required>{t("Date")}</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("Gift")}</Label>
                  <Input value={form.gift} onChange={(e) => setForm((p) => ({ ...p, gift: e.target.value }))} placeholder="e.g. Trophy" />
                </div>
                <div className="space-y-2">
                  <Label>{t("Cash ($)")}</Label>
                  <Input type="number" min={0} step={0.01} value={form.cash_price} onChange={(e) => setForm((p) => ({ ...p, cash_price: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("Description")}</Label>
                <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? t("Saving...") : mode === "add" ? t("Give Award") : t("Update")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={openType} onOpenChange={setOpenType}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[480px]">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{typeMode === "add" ? t("Add Award Type") : t("Edit Award Type")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={saveType} className="flex flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <Label required>{t("Name")}</Label>
                <Input value={typeForm.name} onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>{t("Description")}</Label>
                <Textarea value={typeForm.description} onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpenType(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? t("Saving...") : typeMode === "add" ? t("Create") : t("Update")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
