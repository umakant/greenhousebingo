"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FileText, Copy, BarChart3, Zap, List, LayoutGrid, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getOnboardingPacketTemplate } from "@/components/form-builder/onboarding-packet-template";
import { t } from "@/lib/admin-t";


const DELETE_CONFIRM_WORD = "DELETE";

const FormBuilderCreateLazy = dynamic(
  () => import("@/components/form-builder/form-builder-create"),
  { loading: () => <div className="py-10 text-center text-sm text-muted-foreground">{t("Loading editor…")}</div> },
);

interface FormRow {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  defaultLayout: string;
  projectSectionId?: string | null;
  fieldsCount: number;
  responsesCount: number;
  createdAt: string;
}

function PaginationBar({ page, lastPage, onChange }: { page: number; lastPage: number; onChange: (p: number) => void }) {
  if (lastPage <= 1) return null;
  const pages: (number | "...")[] = [];
  if (lastPage <= 7) {
    for (let i = 1; i <= lastPage; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 4) pages.push("...");
    for (let i = Math.max(2, page - 2); i <= Math.min(lastPage - 1, page + 2); i++) pages.push(i);
    if (page < lastPage - 3) pages.push("...");
    pages.push(lastPage);
  }
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1} className="px-3">Previous</Button>
      {pages.map((p, i) =>
        p === "..." ? <span key={`e-${i}`} className="px-2 text-muted-foreground text-sm">…</span> : (
          <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="w-8 px-0" onClick={() => onChange(p as number)}>{p}</Button>
        )
      )}
      <Button variant="outline" size="sm" onClick={() => onChange(page + 1)} disabled={page >= lastPage} className="px-3">Next</Button>
    </div>
  );
}

export default function FormBuilderAdmin({ permissions }: { permissions: string[] }) {
  const router = useRouter();
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-formbuilder");

  const [items, setItems] = React.useState<FormRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [searchInput, setSearchInput] = React.useState("");
  const [activeSearch, setActiveSearch] = React.useState("");
  const [perPage, setPerPage] = React.useState(10);
  const [view, setView] = React.useState<"list" | "grid">("list");
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [createVariant, setCreateVariant] = React.useState<"blank" | "onboarding">("blank");
  const onboardingTemplate = React.useMemo(() => getOnboardingPacketTemplate(), []);

  const [pendingDelete, setPendingDelete] = React.useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = React.useState("");

  const deleteConfirmOk =
    deleteConfirmInput.trim().toUpperCase() === DELETE_CONFIRM_WORD;

  function openCreate(variant: "blank" | "onboarding") {
    setCreateVariant(variant);
    setCreating(true);
  }

  async function load(opts?: { nextPage?: number; search?: string; pp?: number }) {
    const p = opts?.nextPage ?? page;
    const s = opts?.search ?? activeSearch;
    const pp = opts?.pp ?? perPage;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(pp) });
      if (s) params.set("search", s);
      const res = await fetch(`/api/form-builder/forms?${params}`, { cache: "no-store" });
      const json = await res.json();
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
      setLastPage(json.last_page ?? 1);
      setPage(p);
    } catch { toast.error(t("Failed to load forms")); } finally { setLoading(false); }
  }

  React.useEffect(() => { void load(); }, []); // eslint-disable-line

  function handleSearch() {
    setActiveSearch(searchInput);
    void load({ nextPage: 1, search: searchInput });
  }

  async function copyLink(code: string) {
    const url = `${window.location.origin}/forms/${code}`;
    await navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success(t("Form link copied!"));
  }

  function openDeleteDialog(row: FormRow) {
    setPendingDelete({ id: row.id, name: row.name });
    setDeleteConfirmInput("");
  }

  function closeDeleteDialog() {
    setPendingDelete(null);
    setDeleteConfirmInput("");
  }

  async function confirmDeleteForm() {
    if (!pendingDelete || !deleteConfirmOk) return;
    const res = await fetch(`/api/form-builder/forms/${pendingDelete.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("Delete failed"));
      return;
    }
    toast.success(t("Form deleted"));
    closeDeleteDialog();
    await load();
  }

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  if (creating && can("create-formbuilder")) {
    return (
      <div className="space-y-4">
        <FormBuilderCreateLazy
          onCancel={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void load();
          }}
          initialName={createVariant === "onboarding" ? onboardingTemplate.name : undefined}
          initialLayout={createVariant === "onboarding" ? onboardingTemplate.default_layout : undefined}
          initialFields={createVariant === "onboarding" ? onboardingTemplate.fields : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Delete form?")}</DialogTitle>
            <DialogDescription>
              {t("This will permanently delete")}{" "}
              <span className="font-medium text-foreground">{pendingDelete?.name ?? ""}</span>
              {" "}
              {t("and all responses. This cannot be undone.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="form-delete-confirm" className="text-sm">
              {t("Type")}{" "}
              <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-xs">{DELETE_CONFIRM_WORD}</kbd>{" "}
              {t("to confirm")}
            </Label>
            <Input
              id="form-delete-confirm"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={DELETE_CONFIRM_WORD}
              className="font-mono"
              autoComplete="off"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeDeleteDialog}>
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!deleteConfirmOk}
              onClick={() => void confirmDeleteForm()}
            >
              {t("Delete form")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm">
        {/* Search bar */}
        <CardContent className="p-4 border-b bg-gray-50/50">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 w-64"
                  placeholder={t("Search forms...")}
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch}>{t("Search")}</Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border overflow-hidden">
                <button className={`p-2 ${view === "list" ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground hover:bg-muted"}`} onClick={() => setView("list")} title="List view"><List className="h-4 w-4" /></button>
                <button className={`p-2 ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground hover:bg-muted"}`} onClick={() => setView("grid")} title="Grid view"><LayoutGrid className="h-4 w-4" /></button>
              </div>
              <Select value={String(perPage)} onValueChange={v => { const pp = Number(v); setPerPage(pp); void load({ nextPage: 1, pp }); }}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
              {can("create-formbuilder") && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      {t("Create Form")}
                      <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openCreate("blank")}>{t("Blank form")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openCreate("onboarding")}>{t("Onboarding Packet")}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>

        {view === "list" ? (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground border-b">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">{t("Name")}</th>
                    <th className="text-left font-medium px-4 py-3">{t("Fields")}</th>
                    <th className="text-left font-medium px-4 py-3">{t("Responses")}</th>
                    <th className="text-left font-medium px-4 py-3">{t("Layout")}</th>
                    <th className="text-left font-medium px-4 py-3">{t("Status")}</th>
                    <th className="text-right font-medium px-4 py-3">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">{t("Loading...")}</td></tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <FileText className="h-10 w-10 text-gray-300" />
                          <p>{t("No forms found. Create your first form!")}</p>
                          {can("create-formbuilder") && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" className="mt-1">
                                  <Plus className="h-4 w-4 mr-1" />
                                  {t("Create Form")}
                                  <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center">
                                <DropdownMenuItem onClick={() => openCreate("blank")}>{t("Blank form")}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openCreate("onboarding")}>{t("Onboarding Packet")}</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : items.map(row => (
                    <tr key={row.id} className="border-b hover:bg-accent/20">
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.fieldsCount}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.responsesCount}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{row.defaultLayout.replace("-", " ")}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {row.isActive ? t("Active") : t("Inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <TableActionButton
                          label={t("Edit")}
                          onPrimaryClick={() => router.push(`/form-builder/${row.id}/edit`)}
                          items={[
                            { label: t("Edit"), onSelect: () => router.push(`/form-builder/${row.id}/edit`) },
                            { label: copiedCode === row.code ? t("Copied!") : t("Copy Link"), onSelect: () => copyLink(row.code), icon: <Copy className="h-4 w-4" /> },
                            { label: t("View Responses"), onSelect: () => router.push(`/form-builder/${row.id}/responses`), icon: <BarChart3 className="h-4 w-4" /> },
                            { label: t("Convert To"), onSelect: () => router.push(`/form-builder/${row.id}/convert`), icon: <Zap className="h-4 w-4" /> },
                            { label: t("Delete"), onSelect: () => openDeleteDialog(row), disabled: !can("delete-formbuilder-form"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        ) : (
          <CardContent className="p-4">
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">{t("Loading...")}</div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-2 text-muted-foreground">
                <FileText className="h-10 w-10 text-gray-300" />
                <p>{t("No forms found. Create your first form!")}</p>
                {can("create-formbuilder") && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="mt-1">
                        <Plus className="h-4 w-4 mr-1" />
                        {t("Create Form")}
                        <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      <DropdownMenuItem onClick={() => openCreate("blank")}>{t("Blank form")}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openCreate("onboarding")}>{t("Onboarding Packet")}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(row => (
                  <div key={row.id} className="border rounded-lg p-4 bg-white hover:shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{row.name}</p>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">{row.defaultLayout.replace("-", " ")} layout</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {row.isActive ? t("Active") : t("Inactive")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{row.fieldsCount} {t("fields")}</div>
                      <div className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" />{row.responsesCount} {t("responses")}</div>
                    </div>
                    <div className="flex gap-2 border-t pt-2">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => router.push(`/form-builder/${row.id}/edit`)}>
                        {t("Edit")}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs px-2" onClick={() => copyLink(row.code)} title={t("Copy Link")}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs px-2" onClick={() => router.push(`/form-builder/${row.id}/responses`)} title={t("Responses")}>
                        <BarChart3 className="h-3.5 w-3.5" />
                      </Button>
                      {can("delete-formbuilder-form") && (
                        <Button variant="outline" size="sm" className="h-8 text-xs px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => openDeleteDialog(row)} title={t("Delete")}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}

        <CardContent className="px-4 py-3 border-t bg-gray-50/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">{t("Showing")} {from}–{to} {t("of")} {total} {t("results")}</div>
            <PaginationBar page={page} lastPage={lastPage} onChange={p => load({ nextPage: p })} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
