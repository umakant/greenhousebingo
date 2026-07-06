"use client";

import * as React from "react";
import {
  CheckCircle2,
  ChevronDown,
  Eye,
  History,
  Key,
  LayoutGrid,
  List,
  LogIn,
  Pencil,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { resolveImpersonationRedirect } from "@/lib/launchpad/resolve-post-login-destination";
import { resolveCompanyBrandImagePaths } from "@/lib/company-user-avatar";
import { ImageWithFallback } from "@/components/image-with-fallback";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import CompanyCreateForm from "@/components/companies/company-create-form";
import CompanyEditForm from "@/components/companies/company-edit-form";
import CompanyChangePasswordDialog from "@/components/companies/company-change-password-dialog";
import { TableActionButton } from "@/components/ui/table-action-button";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { formatPhoneDisplay } from "@/lib/phone";
import { useTranslation } from "@/contexts/translation-context";

type CompanyRow = {
  id: string;
  slug: string | null;
  name: string | null;
  email: string | null;
  mobileNo: string | null;
  type: string | null;
  isEnableLogin: boolean | null;
  /** True when a self-registered company is awaiting superadmin approval (login off, no creator). */
  pendingApproval?: boolean;
  active_plan_name?: string | null;
  /** User profile image (e.g. edit profile / avatar upload). */
  avatar?: string | null;
  company_settings?: Record<string, string>;
};

type CompaniesResponse = {
  ok: boolean;
  page: number;
  perPage: number;
  total: number;
  items: CompanyRow[];
  message?: string;
};

const COMPANIES_COLUMN_STORAGE_KEY = "pf-companies-table-columns-v1";

export type CompanyTableColumnId =
  | "avatar"
  | "name"
  | "email"
  | "mobile"
  | "role"
  | "plan"
  | "login";

const DEFAULT_COMPANY_TABLE_COLUMNS: Record<CompanyTableColumnId, boolean> = {
  avatar: true,
  name: true,
  email: true,
  mobile: true,
  role: true,
  plan: true,
  login: true,
};

const COMPANY_TABLE_COLUMN_DEFS: { id: CompanyTableColumnId; labelKey: string }[] = [
  { id: "avatar", labelKey: "Avatar" },
  { id: "name", labelKey: "Name" },
  { id: "email", labelKey: "Email" },
  { id: "mobile", labelKey: "Mobile No" },
  { id: "role", labelKey: "Role" },
  { id: "plan", labelKey: "Active Plan" },
  { id: "login", labelKey: "Login Status" },
];

function displayPhone(value: string | null | undefined) {
  return formatPhoneDisplay(value, "-");
}

type CompanyLoginStatus = "enabled" | "pending" | "disabled";

/** A self-registered company (no creator) with login off is awaiting approval, not disabled. */
function companyLoginStatus(u: CompanyRow): CompanyLoginStatus {
  if (u.isEnableLogin !== false) return "enabled";
  return u.pendingApproval ? "pending" : "disabled";
}

function statusPill(status: CompanyLoginStatus, t: (s: string) => string) {
  const styles: Record<CompanyLoginStatus, { cls: string; label: string }> = {
    enabled: { cls: "bg-green-100 text-green-800", label: t("Enabled") },
    pending: { cls: "bg-amber-100 text-amber-800", label: t("Pending Approval") },
    disabled: { cls: "bg-red-100 text-red-800", label: t("Disabled") },
  };
  const { cls, label } = styles[status];
  return <span className={["px-2 py-1 rounded-full text-sm whitespace-nowrap", cls].join(" ")}>{label}</span>;
}

function rolePill(role: string) {
  return (
    <span className="capitalize px-2 py-1 bg-gray-100 rounded-full text-sm">
      {role}
    </span>
  );
}

function companyListAvatarPaths(u: CompanyRow): string[] {
  return resolveCompanyBrandImagePaths(u.company_settings ?? null, u.avatar);
}

function CompanyAvatarCell({
  paths,
  boxClassName,
  iconClassName,
  ariaLabel,
}: {
  paths: string[];
  boxClassName: string;
  iconClassName: string;
  ariaLabel: string;
}) {
  return (
    <div className={boxClassName} role="img" aria-label={ariaLabel}>
      <ImageWithFallback
        paths={paths}
        alt=""
        className="w-full h-full object-contain"
        fallback={<UserIcon className={iconClassName} aria-hidden />}
      />
    </div>
  );
}

export default function CompaniesAdmin() {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [items, setItems] = React.useState<CompanyRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);

  const [search, setSearch] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [filterName, setFilterName] = React.useState("");
  const [filterEmail, setFilterEmail] = React.useState("");
  const [filterRole, setFilterRole] = React.useState("");
  const [filterLogin, setFilterLogin] = React.useState("");

  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");

  const [sortField, setSortField] = React.useState("");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "asc",
  );

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [changePasswordId, setChangePasswordId] = React.useState<string | null>(
    null,
  );
  const [impersonatingId, setImpersonatingId] = React.useState<string | null>(
    null,
  );
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(
    null,
  );
  const [deleteProcessing, setDeleteProcessing] = React.useState(false);
  const [approvingId, setApprovingId] = React.useState<string | null>(null);

  const searchRef = React.useRef(search);
  searchRef.current = search;

  async function load(opts?: {
    nextPage?: number;
    nextPerPage?: number;
    searchQuery?: string;
  }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    const searchTerm =
      opts?.searchQuery !== undefined ? opts.searchQuery : searchRef.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("per_page", String(pp));
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (filterName.trim()) params.set("name", filterName.trim());
      if (filterEmail.trim()) params.set("email", filterEmail.trim());
      if (filterLogin.trim()) params.set("is_enable_login", filterLogin.trim()); // 1|0
      if (filterRole.trim()) params.set("role", filterRole.trim());
      if (sortField) {
        params.set("sort", sortField);
        params.set("direction", sortDirection);
      }

      const res = await fetch(`/api/companies?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await res
        .json()
        .catch(() => null)) as CompaniesResponse | null;
      if (!res.ok || !json?.ok)
        throw new Error((json as any)?.message || "Failed to load companies.");

      setItems(Array.isArray(json.items) ? json.items : []);
      setPage(json.page);
      setPerPage(json.perPage);
      setTotal(json.total);
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

  // Debounced search: auto-run when user types (auto-populate results)
  const isFirstSearchRef = React.useRef(true);
  React.useEffect(() => {
    if (isFirstSearchRef.current) {
      isFirstSearchRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      setPage(1);
      void load({ nextPage: 1, searchQuery: search });
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  React.useEffect(() => {
    const onCreate = () => setCreateOpen(true);
    const onRefresh = () => void load();
    window.addEventListener("pf:companies:create", onCreate as any);
    window.addEventListener("pf:companies:refresh", onRefresh as any);
    return () => {
      window.removeEventListener("pf:companies:create", onCreate as any);
      window.removeEventListener("pf:companies:refresh", onRefresh as any);
    };
  }, [
    page,
    perPage,
    search,
    filterName,
    filterEmail,
    filterLogin,
    sortField,
    sortDirection,
  ]);

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  function applyFilters() {
    setPage(1);
    void load({ nextPage: 1, searchQuery: searchRef.current });
  }

  function handleSort(field: string) {
    const dir = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(dir);
    setPage(1);
    void load({ nextPage: 1 });
  }

  async function performDelete(id: string) {
    setDeleteProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.message || t("Delete failed."));
        return;
      }
      setDeleteConfirmId(null);
      await load();
    } finally {
      setDeleteProcessing(false);
    }
  }

  function openEdit(id: string) {
    setEditingId(id);
    setEditOpen(true);
  }

  const {
    columnVisible,
    setVisibility,
    resetVisibility,
    visibleDataColumnCount,
  } = useTableColumnVisibility<CompanyTableColumnId>(
    COMPANIES_COLUMN_STORAGE_KEY,
    DEFAULT_COMPANY_TABLE_COLUMNS,
  );

  const companyColumnMenuDefs = React.useMemo(
    () => COMPANY_TABLE_COLUMN_DEFS.map((c) => ({ id: c.id, label: t(c.labelKey) })),
    [t],
  );

  const listVisibleColumnCount = visibleDataColumnCount(
    COMPANY_TABLE_COLUMN_DEFS.map((c) => c.id),
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("impersonate_error");
    if (err) {
      setError(decodeURIComponent(err));
      const url = new URL(window.location.href);
      url.searchParams.delete("impersonate_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  async function handleApprove(userId: string) {
    if (approvingId) return;
    setApprovingId(userId);
    try {
      const res = await fetch(`/api/companies/${userId}/approve`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        emailSent?: boolean;
        emailError?: string;
        alreadyApproved?: boolean;
      } | null;
      if (!res.ok || !json?.ok) {
        toast.error(json?.message ?? t("Approval failed."));
        return;
      }
      if (json.alreadyApproved) {
        toast.info(t("Login was already enabled for this company."));
        await load();
        return;
      }
      if (json.emailSent) {
        toast.success(t("Company approved. A confirmation email was sent."));
      } else {
        toast.warning(
          `${t("Company approved, but the confirmation email could not be sent.")}${json.emailError ? ` ${json.emailError}` : ""}`,
        );
      }
      await load();
    } catch {
      toast.error(t("Approval failed."));
    } finally {
      setApprovingId(null);
    }
  }

  async function handleImpersonate(userId: string) {
    if (impersonatingId) return;
    setImpersonatingId(userId);
    try {
      const res = await fetch("/api/auth/impersonate-form", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; redirectUrl?: string; error?: string };
      if (res.ok && data.success) {
        let target = data.redirectUrl ?? "/launchpad";
        try {
          target = await resolveImpersonationRedirect(target);
        } catch {
          // Still redirect — impersonation cookies were already set by the API.
        }
        window.location.href = target;
      } else {
        setError(data.error || `Impersonation failed (${res.status}). Please try again.`);
        setImpersonatingId(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Impersonation failed. Please try again.";
      setError(msg);
      setImpersonatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border bg-background">
        <div className="p-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyFilters();
                      }
                    }}
                    placeholder={t("Search users...")}
                  />
                </div>
                <Button type="button" onClick={applyFilters}>
                  {t("Search")}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md overflow-hidden border">
                <Button
                  type="button"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-none border-l"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>

              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={String(perPage)}
                onChange={(e) => {
                  const next = Number(e.target.value || "10");
                  setPerPage(next);
                  setPage(1);
                  void load({ nextPage: 1, nextPerPage: next });
                }}
              >
                <option value="10">{t("10 per page")}</option>
                <option value="20">{t("20 per page")}</option>
                <option value="50">{t("50 per page")}</option>
              </select>

              <DropdownMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    {t("Filters")}
                    <ChevronDown className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-3">
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {t("Name")}
                      </div>
                      <Input
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {t("Email")}
                      </div>
                      <Input
                        value={filterEmail}
                        onChange={(e) => setFilterEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {t("Role")}
                      </div>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                      >
                        <option value="">{t("All")}</option>
                        <option value="company">{t("Company")}</option>
                        <option value="company_admin">
                          {t("Company Admin")}
                        </option>
                      </select>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {t("Login Status")}
                      </div>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={filterLogin}
                        onChange={(e) => setFilterLogin(e.target.value)}
                      >
                        <option value="">{t("All")}</option>
                        <option value="1">{t("Enabled")}</option>
                        <option value="0">{t("Disabled")}</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilterName("");
                          setFilterEmail("");
                          setFilterRole("");
                          setFilterLogin("");
                          setFiltersOpen(false);
                          setPage(1);
                          void load({ nextPage: 1 });
                        }}
                      >
                        {t("Clear")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setFiltersOpen(false);
                          applyFilters();
                        }}
                      >
                        {t("Apply")}
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <TableColumnVisibilityMenu
                columns={companyColumnMenuDefs}
                columnVisible={columnVisible}
                setVisibility={setVisibility}
                onReset={resetVisibility}
              />
            </div>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">
                {t("Loading...")}
              </div>
            ) : (
              items.map((u) => {
                const avatarPaths = companyListAvatarPaths(u);
                const mobile = u.mobileNo;
                const role =
                  u.type === "company_admin" ? "company" : u.type || "company";
                const enabled = u.isEnableLogin !== false;
                return (
                  <div
                    key={u.id}
                    className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <CompanyAvatarCell
                        paths={avatarPaths}
                        boxClassName="w-12 h-12 rounded-lg overflow-hidden bg-muted border flex items-center justify-center shrink-0"
                        iconClassName="w-6 h-6 text-muted-foreground"
                        ariaLabel={
                          u.name ? `${t("Avatar")} ${u.name}` : t("Avatar")
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">
                          {u.name ?? "-"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {t("Email")}: {u.email ?? "-"}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        {rolePill(role)}
                        {statusPill(companyLoginStatus(u), t)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("Active Plan")}:{" "}
                        </span>
                        <span>{u.active_plan_name ?? t("Free")}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("Mobile")}:{" "}
                        </span>
                        <span>{displayPhone(mobile)}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t flex justify-end">
                      <TableActionButton
                        label={t("View")}
                        primaryHref={`/companies/${u.id}`}
                        items={[
                          ...(enabled
                            ? []
                            : [
                                {
                                  label: t("Approve"),
                                  onSelect: () => void handleApprove(u.id),
                                  icon: (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ),
                                  disabled: approvingId === u.id,
                                },
                              ]),
                          {
                            label: t("View"),
                            href: `/companies/${u.id}`,
                            icon: <Eye className="h-4 w-4" />,
                          },
                          {
                            label: t("Edit"),
                            onSelect: () => openEdit(u.id),
                            icon: <Pencil className="h-4 w-4" />,
                          },
                          {
                            label: t("Impersonate"),
                            onSelect: () => void handleImpersonate(u.id),
                            icon: <LogIn className="h-4 w-4" />,
                          },
                          {
                            label: t("Change password"),
                            onSelect: () => setChangePasswordId(u.id),
                            icon: <Key className="h-4 w-4" />,
                          },
                          {
                            label: t("Login history"),
                            href: `/login-history?user_id=${u.id}`,
                            icon: <History className="h-4 w-4" />,
                          },
                          {
                            label: t("Delete"),
                            onSelect: () => setDeleteConfirmId(u.id),
                            destructive: true,
                            icon: <Trash2 className="h-4 w-4" />,
                          },
                        ]}
                      />
                    </div>
                  </div>
                );
              })
            )}
            {!loading && items.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {t("No companies found")}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr className="border-b">
                  {columnVisible("avatar") ? (
                    <th className="text-left font-medium px-4 py-3">{t("Avatar")}</th>
                  ) : null}
                  {columnVisible("name") ? (
                    <th
                      className="text-left font-medium px-4 py-3 cursor-pointer select-none"
                      onClick={() => handleSort("name")}
                    >
                      {t("Name")} <span className="opacity-60">⇅</span>
                    </th>
                  ) : null}
                  {columnVisible("email") ? (
                    <th
                      className="text-left font-medium px-4 py-3 cursor-pointer select-none"
                      onClick={() => handleSort("email")}
                    >
                      {t("Email")} <span className="opacity-60">⇅</span>
                    </th>
                  ) : null}
                  {columnVisible("mobile") ? (
                    <th className="text-left font-medium px-4 py-3">{t("Mobile No")}</th>
                  ) : null}
                  {columnVisible("role") ? (
                    <th
                      className="text-left font-medium px-4 py-3 cursor-pointer select-none"
                      onClick={() => handleSort("type")}
                    >
                      {t("Role")} <span className="opacity-60">⇅</span>
                    </th>
                  ) : null}
                  {columnVisible("plan") ? (
                    <th className="text-left font-medium px-4 py-3">{t("Active Plan")}</th>
                  ) : null}
                  {columnVisible("login") ? (
                    <th
                      className="text-left font-medium px-4 py-3 cursor-pointer select-none"
                      onClick={() => handleSort("is_enable_login")}
                    >
                      {t("Login Status")} <span className="opacity-60">⇅</span>
                    </th>
                  ) : null}
                  <th className="text-right font-medium px-4 py-3">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={listVisibleColumnCount}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      {t("Loading...")}
                    </td>
                  </tr>
                ) : (
                  items.map((u) => {
                    const avatarPaths = companyListAvatarPaths(u);
                    const enabled = u.isEnableLogin !== false;
                    const role =
                      u.type === "company_admin"
                        ? "company"
                        : u.type || "company";
                    return (
                      <tr key={u.id} className="border-b hover:bg-accent/20">
                        {columnVisible("avatar") ? (
                          <td className="px-4 py-3">
                            <CompanyAvatarCell
                              paths={avatarPaths}
                              boxClassName="w-10 h-10 rounded-lg overflow-hidden bg-muted border flex items-center justify-center"
                              iconClassName="w-5 h-5 text-muted-foreground"
                              ariaLabel={
                                u.name ? `${t("Avatar")} ${u.name}` : t("Avatar")
                              }
                            />
                          </td>
                        ) : null}
                        {columnVisible("name") ? (
                          <td className="px-4 py-3">{u.name ?? "-"}</td>
                        ) : null}
                        {columnVisible("email") ? (
                          <td className="px-4 py-3">{u.email ?? "-"}</td>
                        ) : null}
                        {columnVisible("mobile") ? (
                          <td className="px-4 py-3">{displayPhone(u.mobileNo)}</td>
                        ) : null}
                        {columnVisible("role") ? (
                          <td className="px-4 py-3">{rolePill(role)}</td>
                        ) : null}
                        {columnVisible("plan") ? (
                          <td className="px-4 py-3">{u.active_plan_name ?? t("Free")}</td>
                        ) : null}
                        {columnVisible("login") ? (
                          <td className="px-4 py-3">{statusPill(companyLoginStatus(u), t)}</td>
                        ) : null}
                        <td className="px-4 py-3 text-right">
                          <TableActionButton
                            label={t("View")}
                            primaryHref={`/companies/${u.id}`}
                            items={[
                              ...(enabled
                                ? []
                                : [
                                    {
                                      label: t("Approve"),
                                      onSelect: () => void handleApprove(u.id),
                                      icon: (
                                        <CheckCircle2 className="h-4 w-4" />
                                      ),
                                      disabled: approvingId === u.id,
                                    },
                                  ]),
                              {
                                label: t("View"),
                                href: `/companies/${u.id}`,
                                icon: <Eye className="h-4 w-4" />,
                              },
                              {
                                label: t("Edit"),
                                onSelect: () => openEdit(u.id),
                                icon: <Pencil className="h-4 w-4" />,
                              },
                              {
                                label: t("Impersonate"),
                                onSelect: () => void handleImpersonate(u.id),
                                icon: <LogIn className="h-4 w-4" />,
                              },
                              {
                                label: t("Change password"),
                                onSelect: () => setChangePasswordId(u.id),
                                icon: <Key className="h-4 w-4" />,
                              },
                              {
                                label: t("Login history"),
                                href: `/login-history?user_id=${u.id}`,
                                icon: <History className="h-4 w-4" />,
                              },
                              {
                                label: t("Delete"),
                                onSelect: () => setDeleteConfirmId(u.id),
                                destructive: true,
                                icon: <Trash2 className="h-4 w-4" />,
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
                {!loading && items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={listVisibleColumnCount}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      {t("No companies found")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {t("Showing")} {from} {t("to")} {to} {t("of")} {total}{" "}
            {t("results")}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                void load({ nextPage: next });
              }}
            >
              {t("Previous")}
            </Button>
            <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center text-xs font-medium">
              {page}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => {
                const next = Math.min(totalPages, page + 1);
                setPage(next);
                void load({ nextPage: next });
              }}
            >
              {t("Next")}
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent
          side="right"
          className="sm:max-w-none w-[560px] max-w-[92vw] overflow-y-auto"
          onInteractOutside={(e) => {
            if ((e.target as HTMLElement).closest?.(".pac-container"))
              e.preventDefault();
          }}
        >
          <SheetHeader>
            <SheetTitle>{t("Create Company")}</SheetTitle>
            <SheetDescription>{t("Company Information")}</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <CompanyCreateForm
              redirectOnSuccess={false}
              onSuccess={() => {
                setCreateOpen(false);
                void load({ nextPage: 1 });
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingId(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex h-full w-[min(92vw,640px)] max-w-[92vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
          onInteractOutside={(e) => {
            if ((e.target as HTMLElement).closest?.(".pac-container"))
              e.preventDefault();
          }}
        >
          <div className="shrink-0 border-b border-border px-6 pb-4 pt-6 pr-14">
            <SheetHeader>
              <SheetTitle>{t("Edit Company")}</SheetTitle>
              <SheetDescription>{t("Company Information")}</SheetDescription>
            </SheetHeader>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">
            {editingId ? (
              <CompanyEditForm
                key={editingId}
                companyId={editingId}
                redirectOnSuccess={false}
                onSuccess={() => {
                  setEditOpen(false);
                  setEditingId(null);
                  void load();
                }}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <CompanyChangePasswordDialog
        open={Boolean(changePasswordId)}
        onOpenChange={(open) => !open && setChangePasswordId(null)}
        companyId={changePasswordId ?? ""}
        companyName={items.find((i) => i.id === changePasswordId)?.name}
        onSuccess={() => void load()}
      />

      <Dialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Delete Company")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("Are you sure you want to delete this company?")}
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleteProcessing}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                deleteConfirmId != null && void performDelete(deleteConfirmId)
              }
              disabled={deleteProcessing}
            >
              {deleteProcessing ? t("Deleting...") : t("Delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
