"use client";

import * as React from "react";
import {
  Building2,
  ChevronDown,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Trash2,
  User as UserIcon,
  UserRound,
} from "lucide-react";
import { useTranslation } from "@/contexts/translation-context";
import { hasAccountPermission } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
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
import { AccountCustomerFormDialog } from "./account-customer-form-dialog";
import { usePortalImpersonate } from "@/hooks/use-portal-impersonate";
import { canImpersonateCustomers } from "@/lib/portal-impersonate-client";

export type CustomerRow = {
  id: number;
  user_id: number | null;
  customer_code: string;
  company_name: string;
  contact_person_name: string;
  contact_person_email: string;
  contact_person_mobile: string | null;
  tax_number: string | null;
  payment_terms: string | null;
  billing_address: Record<string, unknown> | null;
  shipping_address: Record<string, unknown> | null;
  same_as_billing: boolean;
  notes: string | null;
  creator_id: number | null;
  created_by: number | null;
  created_at: string | null;
  updated_at: string | null;
  user: { id: number; name: string | null; avatar: string | null } | null;
};

type ListResponse = {
  data: CustomerRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

const defaultAddress = () => ({
  name: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  country: "",
  zip_code: "",
});

export default function AccountCustomersAdmin({
  permissions,
}: {
  permissions: string[];
}) {
  const { t } = useTranslation();
  const canManage =
    permissions.includes("*") || permissions.includes("manage-customers");
  const canCreate = canManage || permissions.includes("create-customers");
  const canEdit = canManage || permissions.includes("edit-customers");
  const canDelete = canManage || permissions.includes("delete-customers");
  const canView = hasAccountPermission(permissions, "manage-customers");
  const showImpersonate = canImpersonateCustomers(permissions);
  const { impersonate, isLoading: impersonateLoading } = usePortalImpersonate({
    returnPath: "/account/customers",
  });

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<CustomerRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [lastPage, setLastPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [sortField, setSortField] = React.useState("createdAt");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "desc",
  );
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
  const [formOpen, setFormOpen] = React.useState(false);
  const [syncingPortal, setSyncingPortal] = React.useState(false);
  const [editing, setEditing] = React.useState<CustomerRow | null>(null);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState(false);

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
        if (search.trim()) params.set("company_name", search.trim());
        params.set("sort", sort);
        params.set("direction", dir);
        const res = await fetch(`/api/account/customers?${params.toString()}`, {
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
        setError(e instanceof Error ? e.message : "Failed to load customers");
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
      const res = await fetch("/api/account/customers/sync-portal-access", {
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
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("Failed to sync portal access"),
      );
    } finally {
      setSyncingPortal(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/account/customers/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteId(null);
      load();
    } catch {
      setDeleting(false);
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
                placeholder={t("Search customers...")}
                buttonLabel={t("Search")}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                aria-label={t("List view")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                aria-label={t("Grid view")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
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
              {canManage && (
                <Button
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
                  {t("Create Customer")}
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
              title={t("No customers found")}
              description={t("Get started by creating your first customer.")}
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
                  {t("Create Customer")}
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">{t("User")}</th>
                  <th className="text-left p-3 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center"
                      onClick={() => handleSort("customerCode")}
                    >
                      {t("Customer Code")} {sortChevron("customerCode")}
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center"
                      onClick={() => handleSort("companyName")}
                    >
                      {t("Company Name")} {sortChevron("companyName")}
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center"
                      onClick={() => handleSort("contactPersonName")}
                    >
                      {t("Contact Person")} {sortChevron("contactPersonName")}
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium">{t("Email")}</th>
                  <th className="text-left p-3 font-medium">
                    {t("Tax Number")}
                  </th>
                  {(canView || canEdit || canDelete || showImpersonate) && (
                    <th className="text-right p-3 font-medium">
                      {t("Actions")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">
                      {row.user ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                            {row.user.avatar ? (
                              <img
                                src={row.user.avatar}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <UserIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <span>{row.user.name ?? ""}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">{row.customer_code}</td>
                    <td className="p-3">{row.company_name}</td>
                    <td className="p-3">{row.contact_person_name}</td>
                    <td className="p-3">{row.contact_person_email}</td>
                    <td className="p-3">{row.tax_number ?? "—"}</td>
                    {(canView || canEdit || canDelete || showImpersonate) && (
                      <td className="p-3 text-right">
                        {(() => {
                          const viewHref = `/account/customers/${row.id}`;
                          const menuItems: TableActionItem[] = [];
                          if (canView && canEdit) {
                            menuItems.push({ label: t("View"), href: viewHref });
                          }
                          if (canEdit) {
                            menuItems.push({
                              label: t("Edit"),
                              icon: <Pencil className="h-4 w-4" />,
                              onSelect: () => {
                                setEditing(row);
                                setFormOpen(true);
                              },
                            });
                          }
                          if (showImpersonate) {
                            const portalUserId = row.user_id != null ? String(row.user_id) : "";
                            menuItems.push({
                              label:
                                portalUserId
                                  ? t("Impersonate")
                                  : t("Impersonate (no portal login)"),
                              icon: <UserRound className="h-4 w-4" />,
                              onSelect: () => {
                                if (portalUserId) void impersonate(portalUserId);
                              },
                              disabled: !portalUserId || impersonateLoading(portalUserId),
                            });
                          }
                          if (canDelete) {
                            menuItems.push({
                              label: t("Delete"),
                              icon: <Trash2 className="h-4 w-4" />,
                              onSelect: () => setDeleteId(row.id),
                              destructive: true as const,
                            });
                          }
                          return (
                            <TableActionButton
                              label={canEdit ? t("Edit") : canView ? t("View") : t("Delete")}
                              primaryHref={!canEdit && canView ? viewHref : undefined}
                              onPrimaryClick={
                                canEdit
                                  ? () => {
                                      setEditing(row);
                                      setFormOpen(true);
                                    }
                                  : !canEdit && canView
                                    ? undefined
                                    : () => setDeleteId(row.id)
                              }
                              items={menuItems}
                            />
                          );
                        })()}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((row) => (
              <Card key={row.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium">{row.company_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {row.customer_code}
                      </p>
                      <p className="text-sm mt-1">{row.contact_person_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {row.contact_person_email}
                      </p>
                    </div>
                    {(canView || canEdit || canDelete || showImpersonate) && (
                      (() => {
                        const viewHref = `/account/customers/${row.id}`;
                        const menuItems: TableActionItem[] = [];
                        if (canView && canEdit) {
                          menuItems.push({ label: t("View"), href: viewHref });
                        }
                        if (canEdit) {
                          menuItems.push({
                            label: t("Edit"),
                            icon: <Pencil className="h-4 w-4" />,
                            onSelect: () => {
                              setEditing(row);
                              setFormOpen(true);
                            },
                          });
                        }
                        if (showImpersonate) {
                          const portalUserId = row.user_id != null ? String(row.user_id) : "";
                          menuItems.push({
                            label:
                              portalUserId
                                ? t("Impersonate")
                                : t("Impersonate (no portal login)"),
                            icon: <UserRound className="h-4 w-4" />,
                            onSelect: () => {
                              if (portalUserId) void impersonate(portalUserId);
                            },
                            disabled: !portalUserId || impersonateLoading(portalUserId),
                          });
                        }
                        if (canDelete) {
                          menuItems.push({
                            label: t("Delete"),
                            icon: <Trash2 className="h-4 w-4" />,
                            onSelect: () => setDeleteId(row.id),
                            destructive: true as const,
                          });
                        }
                        return (
                          <TableActionButton
                            label={canEdit ? t("Edit") : canView ? t("View") : t("Delete")}
                            primaryHref={!canEdit && canView ? viewHref : undefined}
                            onPrimaryClick={
                              canEdit
                                ? () => {
                                    setEditing(row);
                                    setFormOpen(true);
                                  }
                                : !canEdit && canView
                                  ? undefined
                                  : () => setDeleteId(row.id)
                            }
                            items={menuItems}
                          />
                        );
                      })()
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="p-4 border-t">
            <Pagination
              page={page}
              lastPage={lastPage}
              total={total}
              from={from}
              to={to}
              onPageChange={(p) => {
                setPage(p);
                load({ nextPage: p });
              }}
            />
          </div>
        )}
      </Card>

      <AccountCustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        onSuccess={() => {
          setFormOpen(false);
          setEditing(null);
          load();
        }}
      />

      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Delete Customer")}</DialogTitle>
            <DialogDescription>
              {t(
                "Are you sure you want to delete this customer? This action cannot be undone.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={deleting}
            >
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
