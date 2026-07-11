"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Plus, Trash2, Users, Smartphone, Mail, CheckCircle2, Loader2, UserRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { HrmProjectsStyleListPage, type HrmViewMode } from "@/components/hrm/hrm-projects-style-list";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { usePortalImpersonate } from "@/hooks/use-portal-impersonate";
import { canImpersonateEmployees } from "@/lib/portal-impersonate-client";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatPhone as maskPhone, unformatPhone } from "@/lib/phone";
import { formatDate, parseDate, toIsoDateString } from "@/lib/format-date";
import { t } from "@/lib/admin-t";



type EmpRow = {
  id: string; firstName: string; lastName?: string | null; email?: string | null; phone?: string | null;
  status: string; employeeId?: string | null; joiningDate?: string | null; userId?: string | null;
  department?: { id: string; name: string } | null;
  designation?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
};

type OptionRow = { id: string; name: string };

type EmpSortField = "first_name" | "employee_id" | "joining_date" | "status" | "created_at";
type EmpColId = "employee" | "id" | "department" | "designation" | "joining" | "status";

const EMP_COL_DEFAULT: Record<EmpColId, boolean> = {
  employee: true,
  id: true,
  department: true,
  designation: true,
  joining: true,
  status: true,
};

function statusBadge(s: string | null | undefined) {
  const key = s && s.length > 0 ? s : "unknown";
  const map: Record<string, string> = { active: "bg-green-100 text-green-800", inactive: "bg-gray-100 text-gray-700", on_leave: "bg-yellow-100 text-yellow-800", terminated: "bg-red-100 text-red-800" };
  return <span className={`px-2 py-1 rounded-full text-xs ${map[key] ?? "bg-gray-100 text-gray-700"}`}>{key.replace(/_/g, " ")}</span>;
}

export default function HrmEmployeesAdmin({ permissions }: { permissions: string[] }) {
  const router = useRouter();
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  const showImpersonate = canImpersonateEmployees(permissions);
  const { impersonate, isLoading: impersonateLoading } = usePortalImpersonate("/hrm/employees");
  const { settings } = useAppSettings();
  const fmtDate = (d: string | Date | null | undefined) => formatDate(d, settings);
  const [items, setItems] = React.useState<EmpRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");
  const [perPage, setPerPage] = React.useState(10);
  const [sortField, setSortField] = React.useState<EmpSortField>("created_at");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");
  const [departments, setDepartments] = React.useState<OptionRow[]>([]);
  const [designations, setDesignations] = React.useState<OptionRow[]>([]);
  const [branches, setBranches] = React.useState<OptionRow[]>([]);
  const [open, setOpen] = React.useState(false); const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null); const [processing, setProcessing] = React.useState(false);
  const emptyForm = { first_name: "", last_name: "", email: "", phone: "", gender: "", employee_id: "", department_id: "", designation_id: "", branch_id: "", status: "active", employee_type: "", work_type: "", joining_date: "", notes: "" };
  const [form, setForm] = React.useState(emptyForm);
  const [phoneOtpSent, setPhoneOtpSent] = React.useState(false);
  const [emailOtpSent, setEmailOtpSent] = React.useState(false);
  const [phoneOtpInput, setPhoneOtpInput] = React.useState("");
  const [emailOtpInput, setEmailOtpInput] = React.useState("");
  const [phoneVerified, setPhoneVerified] = React.useState(false);
  const [emailVerified, setEmailVerified] = React.useState(false);
  const [otpLoading, setOtpLoading] = React.useState<"phone-send" | "phone-verify" | "email-send" | "email-verify" | null>(null);
  /** When true (default), server creates staff user + welcome email after OTP checks. */
  const [createPortalAccess, setCreatePortalAccess] = React.useState(true);
  const [editHasPortalLogin, setEditHasPortalLogin] = React.useState(false);
  const [syncingPortal, setSyncingPortal] = React.useState(false);
  const [provisioningPortalId, setProvisioningPortalId] = React.useState<string | null>(null);
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<EmpColId>(
    "pf-hrm-employees-admin-cols-v1",
    EMP_COL_DEFAULT,
  );
  const editFromQueryRef = React.useRef<string | null>(null);
  const otpVerifyLock = React.useRef(false);

  async function loadOptions() {
    const [d, des, b] = await Promise.all([
      fetch("/api/hrm/departments?per_page=100").then(r => r.json()).catch(() => ({ data: [] })),
      fetch("/api/hrm/designations?per_page=100").then(r => r.json()).catch(() => ({ data: [] })),
      fetch("/api/hrm/branches?per_page=100").then(r => r.json()).catch(() => ({ data: [] })),
    ]);
    setDepartments(d.data ?? []); setDesignations(des.data ?? []); setBranches(b.data ?? []);
  }

  async function load(opts?: { nextPage?: number; nextPerPage?: number; nextSearch?: string; nextSort?: EmpSortField; nextDir?: "asc" | "desc" }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    const q = opts?.nextSearch !== undefined ? opts.nextSearch : search;
    const sf = opts?.nextSort ?? sortField;
    const sd = opts?.nextDir ?? sortDirection;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        per_page: String(pp),
        sort: sf,
        direction: sd,
      });
      if (q.trim()) params.set("search", q.trim());
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/hrm/employees?${params}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
      setPage(p);
      if (opts?.nextPerPage != null) setPerPage(pp);
      const lp = typeof json.last_page === "number" ? json.last_page : Math.max(1, Math.ceil((json.total ?? 0) / pp) || 1);
      setLastPage(lp);
      setSortField(sf);
      setSortDirection(sd);
    } catch (e: any) {
      toast.error(e?.message || t("Failed to load employees"));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void loadOptions(); void load(); }, []); // eslint-disable-line

  React.useEffect(() => {
    if (loading) return;
    const q =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("edit") : null;
    if (!q) {
      editFromQueryRef.current = null;
      return;
    }
    if (editFromQueryRef.current === q) return;
    const row = items.find((i) => i.id === q);
    if (row) openEdit(row);
    editFromQueryRef.current = q;
    router.replace("/hrm/employees", { scroll: false });
  }, [loading, items, router]);

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  const sortChevron = (field: EmpSortField) => (
    <ChevronDown
      className={`ml-1 inline-block h-3 w-3 transition-transform ${
        sortField === field && sortDirection === "desc" ? "rotate-180" : ""
      }`}
    />
  );

  const handleSort = (field: EmpSortField) => {
    if (sortField === field) {
      const nextDir = sortDirection === "asc" ? "desc" : "asc";
      void load({ nextPage: 1, nextSort: field, nextDir: nextDir });
    } else {
      const nextDir = field === "first_name" ? "asc" : "desc";
      void load({ nextPage: 1, nextSort: field, nextDir: nextDir });
    }
  };

  const empColumnDefs = React.useMemo(
    () => [
      { id: "employee" as const, label: t("Employee") },
      { id: "id" as const, label: t("ID") },
      { id: "department" as const, label: t("Department") },
      { id: "designation" as const, label: t("Designation") },
      { id: "joining" as const, label: t("Joining Date") },
      { id: "status" as const, label: t("Status") },
    ],
    [],
  );

  function resetOtpState() {
    setPhoneOtpSent(false); setEmailOtpSent(false);
    setPhoneOtpInput(""); setEmailOtpInput("");
    setPhoneVerified(false); setEmailVerified(false);
    setOtpLoading(null);
  }

  async function syncPortalAccess() {
    setSyncingPortal(true);
    try {
      const res = await fetch("/api/hrm/employees/sync-portal-access", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        errors?: string[];
      };
      if (!res.ok) throw new Error(json.error || "Failed to sync portal access");
      toast.success(json.message ?? t("Portal access updated."));
      if (json.errors?.length) {
        toast.warning(`${t("Some employees were skipped:")} ${json.errors.slice(0, 3).join("; ")}`);
      }
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Failed to sync portal access"));
    } finally {
      setSyncingPortal(false);
    }
  }

  async function enablePortalForRow(row: EmpRow) {
    if (!row.email?.trim()) {
      toast.error(t("Add an email to this employee before enabling portal login."));
      openEdit(row);
      return;
    }
    setProvisioningPortalId(row.id);
    try {
      const res = await fetch(`/api/hrm/employees/${row.id}/provision-portal-access`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ send_welcome_email: true }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        portal_password?: string;
      };
      if (!res.ok) throw new Error(json.error || "Failed to enable portal login");
      if (json.portal_password) {
        toast.success(`${json.message ?? t("Portal login enabled.")} ${t("Temporary password:")} ${json.portal_password}`, {
          duration: 20000,
        });
      } else {
        toast.success(json.message ?? t("Portal login enabled."));
      }
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Failed to enable portal login"));
    } finally {
      setProvisioningPortalId(null);
    }
  }

  function openCreate() {
    setMode("add");
    setEditId(null);
    setForm(emptyForm);
    resetOtpState();
    setCreatePortalAccess(true);
    setEditHasPortalLogin(false);
    setOpen(true);
  }
  function openEdit(row: EmpRow) {
    setMode("edit"); setEditId(row.id);
    setEditHasPortalLogin(Boolean(row.userId?.trim()));
    setCreatePortalAccess(!row.userId?.trim());
    const joiningParsed = parseDate(row.joiningDate);
    const joining_date = joiningParsed ? toIsoDateString(joiningParsed) : "";
    setForm({
      first_name: row.firstName,
      last_name: row.lastName ?? "",
      email: row.email ?? "",
      phone: maskPhone(row.phone ?? ""),
      gender: "",
      employee_id: row.employeeId ?? "",
      department_id: row.department?.id ?? "",
      designation_id: row.designation?.id ?? "",
      branch_id: row.branch?.id ?? "",
      status: row.status ?? "active",
      employee_type: "",
      work_type: "",
      joining_date,
      notes: "",
    });
    resetOtpState(); setOpen(true);
  }

  async function sendOtp(type: "phone" | "email") {
    const value = type === "phone" ? unformatPhone(form.phone).trim() : form.email.trim();
    if (!value) { toast.error(type === "phone" ? t("Enter phone number first") : t("Enter email first")); return; }
    setOtpLoading(`${type}-send`);
    try {
      const res = await fetch("/api/hrm/employees/send-otp", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, value }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to send OTP");
      if (type === "phone") { setPhoneOtpSent(true); setPhoneOtpInput(""); }
      else { setEmailOtpSent(true); setEmailOtpInput(""); }
      if (json?.otp) {
        toast.info(`${type === "phone" ? t("Phone") : t("Email")} OTP: ${json.otp}`, { duration: 30000 });
      } else {
        toast.success(json?.message ?? t("OTP sent successfully"));
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setOtpLoading(null); }
  }

  async function verifyOtp(type: "phone" | "email") {
    if (otpVerifyLock.current) return;
    otpVerifyLock.current = true;
    const value = type === "phone" ? unformatPhone(form.phone).trim() : form.email.trim();
    const otp = type === "phone" ? phoneOtpInput : emailOtpInput;
    if (!otp) { toast.error(t("Enter the OTP code")); otpVerifyLock.current = false; return; }
    setOtpLoading(`${type}-verify`);
    try {
      const res = await fetch("/api/hrm/employees/verify-otp", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, value, otp }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Invalid OTP");
      if (type === "phone") { setPhoneVerified(true); setPhoneOtpSent(false); }
      else { setEmailVerified(true); setEmailOtpSent(false); }
      toast.success(`${type === "phone" ? t("Phone") : t("Email")} ${t("verified successfully")}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setOtpLoading(null); otpVerifyLock.current = false; }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setProcessing(true);
    try {
      const phoneDigits = unformatPhone(form.phone).trim();
      const emailTrim = form.email.trim();
      if (mode === "add") {
        if (phoneDigits && !phoneVerified) {
          toast.error(t("Verify your phone number with OTP before saving."));
          return;
        }
        if (emailTrim && !emailVerified) {
          toast.error(t("Verify your email with OTP before saving."));
          return;
        }
        if (createPortalAccess && !emailTrim) {
          toast.error(t("Email is required for portal login and welcome email."));
          return;
        }
      }

      const body: Record<string, unknown> = {
        first_name: form.first_name,
        last_name: form.last_name || null,
        email: emailTrim || null,
        phone: phoneDigits || null,
        employee_id: form.employee_id || null,
        status: form.status,
        joining_date: form.joining_date || null,
        notes: form.notes || null,
      };
      if (form.department_id) body.department_id = form.department_id;
      if (form.designation_id) body.designation_id = form.designation_id;
      if (form.branch_id) body.branch_id = form.branch_id;
      if (mode === "add") {
        body.create_portal_access = createPortalAccess;
      } else if (!editHasPortalLogin && createPortalAccess) {
        body.create_portal_access = true;
        body.send_welcome_email = true;
      }
      const url = mode === "add" ? "/api/hrm/employees" : `/api/hrm/employees/${editId}`;
      const res = await fetch(url, {
        method: mode === "add" ? "POST" : "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Save failed");
      if (json?.portal_password) {
        toast.success(
          `${mode === "add" ? t("Employee created.") : t("Portal login enabled.")} ${t("Temporary password:")} ${json.portal_password}`,
          { duration: 20000 },
        );
      } else if (json?.portal_message) {
        toast.success(json.portal_message);
      } else {
        toast.success(mode === "add" ? t("Employee created.") : t("Employee updated."));
      }
      if (mode === "add" && json?.welcome_email_sent === false && json?.welcome_email_error) {
        toast.warning(`${t("Welcome email could not be sent:")} ${json.welcome_email_error}`);
      }
      setOpen(false); await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Save failed"));
    } finally { setProcessing(false); }
  }

  async function del(id: string) {
    if (!(await appConfirm(t("Delete this employee?")))) return;
    const res = await fetch(`/api/hrm/employees/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(json?.error || t("Delete failed"));
      return;
    }
    toast.success(t("Employee deleted."));
    await load();
  }

  const set = (k: keyof typeof emptyForm) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  const rowActions = (row: EmpRow) => {
    const portalUserId = row.userId?.trim();
    const items = [
      { label: t("View"), href: `/hrm/employees/${row.id}` },
      {
        label: t("Edit"),
        onSelect: () => openEdit(row),
        disabled: !can("edit-employees"),
      },
      ...(showImpersonate
        ? portalUserId
          ? [
              {
                label: t("Impersonate"),
                icon: <UserRound className="h-4 w-4" />,
                onSelect: () => void impersonate(portalUserId),
                disabled: impersonateLoading(portalUserId),
              },
            ]
          : can("edit-employees")
            ? [
                {
                  label: t("Enable portal login"),
                  icon: <UserRound className="h-4 w-4" />,
                  onSelect: () => void enablePortalForRow(row),
                  disabled: provisioningPortalId === row.id,
                },
              ]
            : [
                {
                  label: t("Impersonate (no portal login)"),
                  icon: <UserRound className="h-4 w-4" />,
                  onSelect: () => undefined,
                  disabled: true,
                },
              ]
        : []),
      {
        label: t("Delete"),
        onSelect: () => del(row.id),
        disabled: !can("delete-employees"),
        destructive: true,
        icon: <Trash2 className="h-4 w-4" />,
      },
    ];
    return (
      <TableActionButton
        label={t("View")}
        primaryHref={`/hrm/employees/${row.id}`}
        items={items}
      />
    );
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      <HrmProjectsStyleListPage
        searchPlaceholder={t("Search employees...")}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={() => {
          const q = searchInput.trim();
          setSearch(q);
          void load({ nextPage: 1, nextSearch: q });
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        perPage={perPage}
        onPerPageChange={(n) => void load({ nextPage: 1, nextPerPage: n })}
        activeFilterCount={activeFilterCount}
        filtersMenuContent={
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("Status")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                void load({ nextPage: 1 });
              }}
            >
              <DropdownMenuRadioItem value="all">{t("All Status")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="active">{t("Active")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="inactive">{t("Inactive")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="on_leave">{t("On Leave")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="terminated">{t("Terminated")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        }
        columnsMenu={
          <TableColumnVisibilityMenu
            columns={empColumnDefs}
            columnVisible={columnVisible}
            setVisibility={setVisibility}
            onReset={resetVisibility}
          />
        }
        onRefresh={() => void load()}
        refreshing={loading}
        primaryAction={
          can("manage-employees") || can("create-employees") ? (
            <div className="flex items-center gap-2">
              {can("manage-employees") ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={syncingPortal}
                  onClick={() => void syncPortalAccess()}
                >
                  {syncingPortal ? t("Syncing...") : t("Provision portal logins")}
                </Button>
              ) : null}
              {can("create-employees") ? (
                <Button size="sm" className="gap-1" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  {t("Add Employee")}
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
        page={page}
        lastPage={lastPage}
        total={total}
        from={from}
        to={to}
        onPageChange={(p) => void load({ nextPage: p })}
      >
        {viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {columnVisible("employee") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("first_name")}>
                        {t("Employee")}
                        {sortChevron("first_name")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("id") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("employee_id")}>
                        {t("ID")}
                        {sortChevron("employee_id")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("department") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Department")}</th>
                  ) : null}
                  {columnVisible("designation") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Designation")}</th>
                  ) : null}
                  {columnVisible("joining") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("joining_date")}>
                        {t("Joining Date")}
                        {sortChevron("joining_date")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("status") ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("status")}>
                        {t("Status")}
                        {sortChevron("status")}
                      </button>
                    </th>
                  ) : null}
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("Actions")}</th>
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
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-10 w-10 text-gray-300" />
                        <div>{t("No employees found")}</div>
                        {can("create-employees") ? (
                          <Button size="sm" onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-1" />
                            {t("Add Employee")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      {columnVisible("employee") ? (
                        <td className="px-4 py-3">
                          <Link href={`/hrm/employees/${row.id}`} className="font-medium text-primary hover:underline">
                            {row.firstName} {row.lastName ?? ""}
                          </Link>
                          {row.email ? <div className="text-xs text-muted-foreground">{row.email}</div> : null}
                        </td>
                      ) : null}
                      {columnVisible("id") ? (
                        <td className="px-4 py-3 text-muted-foreground">{row.employeeId || "—"}</td>
                      ) : null}
                      {columnVisible("department") ? (
                        <td className="px-4 py-3">{row.department?.name ?? "—"}</td>
                      ) : null}
                      {columnVisible("designation") ? (
                        <td className="px-4 py-3">{row.designation?.name ?? "—"}</td>
                      ) : null}
                      {columnVisible("joining") ? <td className="px-4 py-3">{fmtDate(row.joiningDate)}</td> : null}
                      {columnVisible("status") ? <td className="px-4 py-3">{statusBadge(row.status)}</td> : null}
                      <td className="px-4 py-3 text-right">{rowActions(row)}</td>
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
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Users className="h-10 w-10 text-gray-300" />
                <div>{t("No employees found")}</div>
                {can("create-employees") ? (
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t("Add Employee")}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((row) => (
                  <Card key={row.id} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-2 p-4">
                      {columnVisible("employee") ? (
                        <div>
                          <Link href={`/hrm/employees/${row.id}`} className="font-semibold text-primary hover:underline">
                            {row.firstName} {row.lastName ?? ""}
                          </Link>
                          {row.email ? <p className="text-xs text-muted-foreground">{row.email}</p> : null}
                        </div>
                      ) : null}
                      {columnVisible("id") ? (
                        <p className="text-xs text-muted-foreground">
                          {t("ID")}: {row.employeeId || "—"}
                        </p>
                      ) : null}
                      {columnVisible("department") ? (
                        <p className="text-xs">
                          {t("Department")}: {row.department?.name ?? "—"}
                        </p>
                      ) : null}
                      {columnVisible("designation") ? (
                        <p className="text-xs">
                          {t("Designation")}: {row.designation?.name ?? "—"}
                        </p>
                      ) : null}
                      {columnVisible("joining") ? (
                        <p className="text-xs text-muted-foreground">
                          {t("Joining")}: {fmtDate(row.joiningDate)}
                        </p>
                      ) : null}
                      {columnVisible("status") ? <div>{statusBadge(row.status)}</div> : null}
                      <div className="flex justify-end border-t pt-3">{rowActions(row)}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </HrmProjectsStyleListPage>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b"><SheetTitle>{mode === "add" ? t("Add Employee") : t("Edit Employee")}</SheetTitle></SheetHeader>
          <form onSubmit={save} className="flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label required>{t("First Name")}</Label><Input value={form.first_name} onChange={e => set("first_name")(e.target.value)} required /></div>
              <div className="space-y-2"><Label>{t("Last Name")}</Label><Input value={form.last_name} onChange={e => set("last_name")(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>{t("Phone")}</Label>
              <div className="flex flex-wrap items-center gap-2">
                <PhoneInput
                  value={form.phone}
                  onChange={v => { set("phone")(v); setPhoneVerified(false); setPhoneOtpSent(false); setPhoneOtpInput(""); }}
                  maxLength={14}
                  className="min-w-[140px] flex-1"
                />
                {phoneOtpSent && !phoneVerified ? (
                  <Input
                    placeholder={t("OTP")}
                    value={phoneOtpInput}
                    onChange={e => setPhoneOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="w-24 shrink-0 font-mono tracking-widest"
                    aria-label={t("Enter 6-digit OTP")}
                  />
                ) : null}
                {phoneVerified ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" aria-hidden />
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1"
                      disabled={!phoneOtpSent || phoneOtpInput.length < 6 || otpLoading === "phone-verify"}
                      onClick={() => verifyOtp("phone")}
                    >
                      {otpLoading === "phone-verify" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      {t("Verify")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1"
                      disabled={!form.phone || otpLoading === "phone-send"}
                      onClick={() => sendOtp("phone")}
                    >
                      {otpLoading === "phone-send" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Smartphone className="h-3.5 w-3.5" />}
                      {t("Send OTP")}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("Email")}</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => { set("email")(e.target.value); setEmailVerified(false); setEmailOtpSent(false); setEmailOtpInput(""); }}
                  className="min-w-[140px] flex-1"
                />
                {emailOtpSent && !emailVerified ? (
                  <Input
                    placeholder={t("OTP")}
                    value={emailOtpInput}
                    onChange={e => setEmailOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="w-24 shrink-0 font-mono tracking-widest"
                    aria-label={t("Enter 6-digit OTP")}
                  />
                ) : null}
                {emailVerified ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" aria-hidden />
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1"
                      disabled={!emailOtpSent || emailOtpInput.length < 6 || otpLoading === "email-verify"}
                      onClick={() => verifyOtp("email")}
                    >
                      {otpLoading === "email-verify" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      {t("Verify")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1"
                      disabled={!form.email || otpLoading === "email-send"}
                      onClick={() => sendOtp("email")}
                    >
                      {otpLoading === "email-send" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                      {t("Send OTP")}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("Employee ID")}</Label><Input value={form.employee_id} onChange={e => set("employee_id")(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>{t("Status")}</Label>
                <Select value={form.status} onValueChange={set("status")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("Active")}</SelectItem>
                    <SelectItem value="inactive">{t("Inactive")}</SelectItem>
                    <SelectItem value="on_leave">{t("On Leave")}</SelectItem>
                    <SelectItem value="terminated">{t("Terminated")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label>{t("Department")}</Label>
                <Select value={form.department_id || "__none__"} onValueChange={v => set("department_id")(v === "__none__" ? "" : v)}>
                  <SelectTrigger title={departments.find(d => d.id === form.department_id)?.name}>
                    <SelectValue placeholder={t("Select...")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("None")}</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {departments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("No departments found.")}{" "}
                    <Link href="/hrm/setup" className="text-primary underline underline-offset-2">
                      {t("Add in System Setup")}
                    </Link>
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 space-y-2">
                <Label>{t("Designation")}</Label>
                <Select value={form.designation_id || "__none__"} onValueChange={v => set("designation_id")(v === "__none__" ? "" : v)}>
                  <SelectTrigger title={designations.find(d => d.id === form.designation_id)?.name}>
                    <SelectValue placeholder={t("Select...")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("None")}</SelectItem>
                    {designations.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {designations.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("No designations found.")}{" "}
                    <Link href="/hrm/setup" className="text-primary underline underline-offset-2">
                      {t("Add in System Setup")}
                    </Link>
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 space-y-2 sm:col-span-2">
                <Label>{t("Branch")}</Label>
                <Select value={form.branch_id || "__none__"} onValueChange={v => set("branch_id")(v === "__none__" ? "" : v)}>
                  <SelectTrigger title={branches.find(b => b.id === form.branch_id)?.name}>
                    <SelectValue placeholder={t("Select...")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("None")}</SelectItem>
                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {branches.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("No branches found.")}{" "}
                    <Link href="/hrm/setup" className="text-primary underline underline-offset-2">
                      {t("Add in System Setup")}
                    </Link>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("Joining Date")}</Label>
              <Input type="date" value={form.joining_date} onChange={e => set("joining_date")(e.target.value)} />
            </div>
            <div className="space-y-2"><Label>{t("Notes")}</Label><Textarea value={form.notes} onChange={e => set("notes")(e.target.value)} rows={2} /></div>

            {mode === "add" || (mode === "edit" && !editHasPortalLogin) ? (
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <Checkbox
                  id="hrm-portal"
                  checked={createPortalAccess}
                  onCheckedChange={(v) => setCreatePortalAccess(!!v)}
                />
                <div className="grid gap-0.5">
                  <label htmlFor="hrm-portal" className="text-sm font-medium leading-none cursor-pointer">
                    {mode === "add"
                      ? t("Create portal login & send welcome email")
                      : t("Enable portal login & send welcome email")}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t("Creates an Employee portal login with Expense Management access (reports, entries, receipts) plus dashboard and profile. Run Sync portal access after enabling Expense Management on your plan.")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Sends a welcome email with a temporary password using your Email Settings (SMTP). Employee must have an email address.")}
                  </p>
                  {mode === "add" ? (
                    <p className="text-xs text-muted-foreground">
                      {t("Phone OTP uses Twilio from Twilio SMS settings; email OTP uses SMTP.")}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : mode === "edit" && editHasPortalLogin ? (
              <p className="text-sm text-muted-foreground rounded-lg border bg-muted/20 p-3">
                {t("Portal login is enabled. Use Impersonate from the list or Sync portal access to refresh permissions.")}
              </p>
            ) : null}

            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-2 bg-background">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
              <Button type="submit" disabled={processing}>{processing ? t("Saving...") : mode === "add" ? t("Create") : t("Update")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
