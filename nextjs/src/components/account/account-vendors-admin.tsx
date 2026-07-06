"use client";

import * as React from "react";
import {
  Building2,
  ChevronDown,
  List,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { useTranslation } from "@/contexts/translation-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableActionButton } from "@/components/ui/table-action-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
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
import { AccountVendorFormDialog } from "./account-vendor-form-dialog";
import { formatPhoneDisplay } from "@/lib/phone";
import { usePortalImpersonate } from "@/hooks/use-portal-impersonate";
import { canImpersonateVendors } from "@/lib/portal-impersonate-client";

export type VendorRow = {
  id: number;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  tax_number: string | null;
  status: string;
  user_id: number | null;
  portal_login_enabled?: boolean;
  notes: string | null;
  created_by: number;
  created_at: string | null;
  updated_at: string | null;
};

type ListResponse = {
  data: VendorRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export default function AccountVendorsAdmin({
  permissions,
}: {
  permissions: string[];
}) {
  const { t } = useTranslation();
  const canManage =
    permissions.includes("*") || permissions.includes("manage-vendors");
  const canCreate = canManage || permissions.includes("create-vendors");
  const canEdit = canManage || permissions.includes("edit-vendors");
  const canDelete = canManage || permissions.includes("delete-vendors");
  const showImpersonate = canImpersonateVendors(permissions);
  const { impersonate, isLoading: impersonateLoading } = usePortalImpersonate("/account/vendors");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<VendorRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [lastPage, setLastPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [sortField, setSortField] = React.useState("createdAt");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "desc",
  );
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<VendorRow | null>(null);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [syncingPortal, setSyncingPortal] = React.useState(false);

  const load = React.useCallback(
    async (opts?: {
      nextPage?: number;
      nextPerPage?: number;
      sort?: string;
      direction?: "asc" | "desc";
    }) => {
      setLoading(true);
      setError(null);
      const p = opts?.nextPage ?? page;
      const pp = opts?.nextPerPage ?? perPage;
      const sort = opts?.sort ?? sortField;
      const dir = opts?.direction ?? sortDirection;
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        params.set("per_page", String(pp));
        if (search.trim()) params.set("search", search.trim());
        params.set("sort", sort);
        params.set("direction", dir);
        const res = await fetch(`/api/account/vendors?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || res.statusText);
        }
        const json = (await res.json()) as ListResponse;
        setItems(json.data ?? []);
        setTotal(json.total ?? 0);
        setLastPage(json.last_page ?? 1);
        if (opts?.nextPage != null) setPage(opts.nextPage);
        if (opts?.nextPerPage != null) setPerPage(opts.nextPerPage);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load vendors");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [page, perPage, search, sortField, sortDirection],
  );

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => load({ nextPage: 1 });
  const handleSort = (field: string) => {
    const nextDir =
      sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(nextDir);
    setPage(1);
    load({ nextPage: 1, sort: field, direction: nextDir });
  };
  const syncPortalAccess = async () => {
    setSyncingPortal(true);
    setError(null);
    try {
      const res = await fetch("/api/account/vendors/sync-portal-access", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error || res.statusText);
      }
      alert(json.message ?? t("Portal access updated."));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Failed to sync portal access"));
    } finally {
      setSyncingPortal(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/account/vendors/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteId(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const sortChevron = (field: string) => (
    <ChevronDown
      className={`h-3 w-3 ml-1 inline-block transition-transform ${
        sortField === field && sortDirection === "desc" ? "rotate-180" : ""
      }`}
    />
  );

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="p-6 border-b bg-muted/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[200px] max-w-md">
              <SearchInput
                value={search}
                onChange={setSearch}
                onSearch={handleSearch}
                placeholder={t("Search vendors...")}
                buttonLabel={t("Search")}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(perPage)}
                onValueChange={(v) => {
                  const n = parseInt(v, 10) || 10;
                  setPerPage(n);
                  setPage(1);
                  load({ nextPage: 1, nextPerPage: n });
                }}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {t("per page")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showImpersonate && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={syncingPortal}
                  onClick={() => void syncPortalAccess()}
                >
                  {syncingPortal ? t("Syncing...") : t("Sync portal access")}
                </Button>
              )}
              {canCreate && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("Create Vendor")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>

        {error && (
          <div className="px-6 py-4 text-sm text-destructive">{error}</div>
        )}

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            {t("Loading...")}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <NoRecordsFound
              icon={Building2}
              title={t("No vendors found")}
              description={t("Get started by creating your first vendor.")}
              hasFilters={!!search.trim()}
              onClearFilters={() => {
                setSearch("");
                setPage(1);
                load({ nextPage: 1 });
              }}
            />
            {canCreate && (
              <div className="flex justify-center mt-4">
                <Button
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("Create Vendor")}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center"
                      onClick={() => handleSort("name")}
                    >
                      {t("Name")} {sortChevron("name")}
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center"
                      onClick={() => handleSort("companyName")}
                    >
                      {t("Company")} {sortChevron("companyName")}
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium">{t("Email")}</th>
                  <th className="text-left p-3 font-medium">{t("Phone")}</th>
                  <th className="text-left p-3 font-medium">
                    {t("Tax Number")}
                  </th>
                  <th className="text-left p-3 font-medium">{t("Status")}</th>
                  <th className="text-right p-3 font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 text-muted-foreground">
                      {row.company_name ?? "—"}
                    </td>
                    <td className="p-3">{row.email ?? "—"}</td>
                    <td className="p-3">{formatPhoneDisplay(row.phone, "—")}</td>
                    <td className="p-3">{row.tax_number ?? "—"}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          row.status === "active"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {row.status === "active" ? t("Active") : t("Inactive")}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {(canEdit || canDelete || showImpersonate) && (
                        <TableActionButton
                          label={canEdit ? t("Edit") : t("Delete")}
                          onPrimaryClick={
                            canEdit
                              ? () => {
                                  setEditing(row);
                                  setFormOpen(true);
                                }
                              : () => setDeleteId(row.id)
                          }
                          items={[
                            ...(canEdit
                              ? [
                                  {
                                    label: t("Edit"),
                                    icon: <Pencil className="h-4 w-4" />,
                                    onSelect: () => {
                                      setEditing(row);
                                      setFormOpen(true);
                                    },
                                  },
                                ]
                              : []),
                            ...(showImpersonate
                              ? [
                                  {
                                    label:
                                      row.user_id != null
                                        ? t("Impersonate")
                                        : t("Impersonate (no portal login)"),
                                    icon: <UserRound className="h-4 w-4" />,
                                    onSelect: () => {
                                      const portalUserId =
                                        row.user_id != null ? String(row.user_id) : "";
                                      if (portalUserId) void impersonate(portalUserId);
                                    },
                                    disabled:
                                      row.user_id == null ||
                                      impersonateLoading(
                                        row.user_id != null ? String(row.user_id) : "",
                                      ),
                                  },
                                ]
                              : []),
                            ...(canDelete
                              ? [
                                  {
                                    label: t("Delete"),
                                    icon: <Trash2 className="h-4 w-4" />,
                                    onSelect: () => setDeleteId(row.id),
                                    destructive: true as const,
                                  },
                                ]
                              : []),
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="p-4 border-t flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {t("Showing")} {(page - 1) * perPage + 1}–
              {Math.min(page * perPage, total)} {t("of")} {total}
            </p>
            <Pagination
              page={page}
              lastPage={lastPage}
              total={total}
              from={(page - 1) * perPage + 1}
              to={Math.min(page * perPage, total)}
              onPageChange={(p) => {
                setPage(p);
                load({ nextPage: p });
              }}
            />
          </div>
        )}
      </Card>

      <AccountVendorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        vendor={editing}
        onSaved={() => {
          load();
          setEditing(null);
        }}
      />

      <Dialog
        open={deleteId !== null}
        onOpenChange={(v) => (!v ? setDeleteId(null) : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Delete vendor?")}</DialogTitle>
            <DialogDescription>
              {t("This action cannot be undone.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t("Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t("Deleting...") : t("Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
