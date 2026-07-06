"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, Loader2, Plus, Search, UserRound } from "lucide-react";
import { toast } from "sonner";

import { LmsCreatePortalUserSheet } from "@/components/lms/lms-create-portal-user-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { usePortalImpersonate } from "@/hooks/use-portal-impersonate";
import { canImpersonateLmsStudents } from "@/lib/portal-impersonate-client";
import { t } from "@/lib/admin-t";


type StudentAccountRow = {
  id: string;
  name: string | null;
  email: string | null;
  isActive: boolean;
  enrollmentCount: number;
};

type EnrollmentRow = {
  id: string;
  status: string;
  purchaseKind: string | null;
  enrolledAt: string;
  student: { id: string; name: string | null; email: string | null };
  course: { id: string; title: string; slug: string } | null;
  storefrontOrder: { id: string; orderNumber: string; status: string } | null;
  crmCustomer: { id: string; companyName: string; contactPersonEmail: string } | null;
};

const STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED", "SUSPENDED"] as const;

export function LmsStudentsAdminClient({ permissions }: { permissions: string[] }) {
  const showImpersonate = canImpersonateLmsStudents(permissions);
  const canCreate = permissions.includes("*") || permissions.includes("manage-lms-students") || permissions.includes("manage-lms");
  const { impersonate, isLoading: impersonateLoading } = usePortalImpersonate({
    returnPath: "/lms/students",
    lmsPortal: "student",
  });

  const [createOpen, setCreateOpen] = React.useState(false);
  const [accountsLoading, setAccountsLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<StudentAccountRow[]>([]);
  const [accountSearch, setAccountSearch] = React.useState("");
  const [debouncedAccountSearch, setDebouncedAccountSearch] = React.useState("");

  const [enrollLoading, setEnrollLoading] = React.useState(true);
  const [enrollments, setEnrollments] = React.useState<EnrollmentRow[]>([]);
  const [enrollSearch, setEnrollSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [debouncedEnrollSearch, setDebouncedEnrollSearch] = React.useState("");

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedAccountSearch(accountSearch.trim()), 300);
    return () => window.clearTimeout(id);
  }, [accountSearch]);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedEnrollSearch(enrollSearch.trim()), 300);
    return () => window.clearTimeout(id);
  }, [enrollSearch]);

  const loadAccounts = React.useCallback(async () => {
    setAccountsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedAccountSearch) params.set("search", debouncedAccountSearch);
      const qs = params.toString();
      const res = await fetch(`/api/lms/student-accounts${qs ? `?${qs}` : ""}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: StudentAccountRow[];
        message?: string;
      } | null;
      if (!res.ok || !data?.ok || !Array.isArray(data.items)) {
        toast.error(data?.message ?? "Failed to load student accounts");
        setAccounts([]);
        return;
      }
      setAccounts(data.items);
    } finally {
      setAccountsLoading(false);
    }
  }, [debouncedAccountSearch]);

  const loadEnrollments = React.useCallback(async () => {
    setEnrollLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedEnrollSearch) params.set("search", debouncedEnrollSearch);
      if (status) params.set("status", status);
      const qs = params.toString();
      const res = await fetch(`/api/lms/enrollments${qs ? `?${qs}` : ""}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: EnrollmentRow[];
        message?: string;
      } | null;
      if (!res.ok || !data?.ok || !Array.isArray(data.items)) {
        toast.error(data?.message ?? "Failed to load enrollments");
        setEnrollments([]);
        return;
      }
      setEnrollments(data.items);
    } finally {
      setEnrollLoading(false);
    }
  }, [debouncedEnrollSearch, status]);

  React.useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  React.useEffect(() => {
    void loadEnrollments();
  }, [loadEnrollments]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{t("Students")}</CardTitle>
            <CardDescription>
              {t(
                "Create learner portal logins for your organization, impersonate to test their experience, and track course enrollments.",
              )}
            </CardDescription>
          </div>
          {canCreate ? (
            <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("Create student")}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="accounts">
            <TabsList>
              <TabsTrigger value="accounts">{t("Student accounts")}</TabsTrigger>
              <TabsTrigger value="enrollments">{t("Enrollments")}</TabsTrigger>
            </TabsList>

            <TabsContent value="accounts" className="mt-4 space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                  placeholder={t("Search name or email…")}
                  className="pl-9"
                />
              </div>
              {accountsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("Loading…")}
                </div>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("No student accounts yet. Create one to grant LMS learner access.")}
                </p>
              ) : (
                <StudentAccountsTable
                  items={accounts}
                  showImpersonate={showImpersonate}
                  impersonate={impersonate}
                  impersonateLoading={impersonateLoading}
                />
              )}
            </TabsContent>

            <TabsContent value="enrollments" className="mt-4 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <EnrollmentSearchInput search={enrollSearch} onSearchChange={setEnrollSearch} />
                <StatusFilter value={status} onChange={setStatus} />
              </div>
              {enrollLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("Loading…")}
                </div>
              ) : enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("No enrollments match your filters.")}</p>
              ) : (
                <>
                  <EnrollmentsTable
                    items={enrollments}
                    showImpersonate={showImpersonate}
                    impersonate={impersonate}
                    impersonateLoading={impersonateLoading}
                  />
                  {enrollments.length >= 500 ? (
                    <p className="text-xs text-muted-foreground">{t("Showing the latest 500 enrollments.")}</p>
                  ) : null}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <LmsCreatePortalUserSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        kind="student"
        onCreated={() => void loadAccounts()}
      />
    </>
  );
}

function StudentAccountsTable({
  items,
  showImpersonate,
  impersonate,
  impersonateLoading,
}: {
  items: StudentAccountRow[];
  showImpersonate: boolean;
  impersonate: (userId: string) => Promise<void>;
  impersonateLoading: (id: string) => boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("Name")}</TableHead>
            <TableHead>{t("Email")}</TableHead>
            <TableHead>{t("Enrollments")}</TableHead>
            <TableHead>{t("Status")}</TableHead>
            <TableHead className="text-right">{t("Actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => {
            const menuItems: TableActionItem[] = [];
            if (showImpersonate) {
              menuItems.push({
                label: t("Impersonate"),
                icon: <UserRound className="h-4 w-4" />,
                onSelect: () => void impersonate(r.id),
                disabled: impersonateLoading(r.id),
              });
            }
            return (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.email ?? "—"}</TableCell>
                <TableCell className="tabular-nums">{r.enrollmentCount}</TableCell>
                <TableCell>{r.isActive ? t("Active") : t("Inactive")}</TableCell>
                <TableCell className="text-right">
                  {menuItems.length > 0 ? (
                    <TableActionButton label={t("Actions")} items={menuItems} />
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function EnrollmentSearchInput(props: { search: string; onSearchChange: (v: string) => void }) {
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={props.search}
        onChange={(e) => props.onSearchChange(e.target.value)}
        placeholder={t("Search learner or course…")}
        className="pl-9"
      />
    </div>
  );
}

function StatusFilter(props: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={props.value || "__all__"} onValueChange={(v) => props.onChange(v === "__all__" ? "" : v)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={t("All statuses")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{t("All statuses")}</SelectItem>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EnrollmentsTable({
  items,
  showImpersonate,
  impersonate,
  impersonateLoading,
}: {
  items: EnrollmentRow[];
  showImpersonate: boolean;
  impersonate: (userId: string) => Promise<void>;
  impersonateLoading: (id: string) => boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("Learner")}</TableHead>
            <TableHead>{t("Course")}</TableHead>
            <TableHead>{t("Status")}</TableHead>
            <TableHead>{t("Kind")}</TableHead>
            <TableHead>{t("Order")}</TableHead>
            <TableHead>{t("CRM")}</TableHead>
            <TableHead>{t("Enrolled")}</TableHead>
            <TableHead className="text-right">{t("Actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => {
            const portalUserId = r.student.id?.trim() ?? "";
            const menuItems: TableActionItem[] = [];
            if (r.course) {
              menuItems.push({
                label: t("View course"),
                icon: <Eye className="h-4 w-4" />,
                href: `/lms/courses/${r.course.id}`,
              });
            }
            if (showImpersonate) {
              menuItems.push({
                label: t("Impersonate"),
                icon: <UserRound className="h-4 w-4" />,
                onSelect: () => {
                  if (portalUserId) void impersonate(portalUserId);
                },
                disabled: !portalUserId || impersonateLoading(portalUserId),
              });
            }

            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="text-sm font-medium">{r.student.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.student.email ?? r.student.id}</div>
                </TableCell>
                <TableCell>
                  {r.course ? (
                    <Link
                      href={`/lms/courses?edit=${r.course.id}`}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {r.course.title}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-xs">{r.status}</TableCell>
                <TableCell className="text-xs">{r.purchaseKind ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  {r.storefrontOrder ? (
                    <span>
                      {r.storefrontOrder.orderNumber}
                      <span className="text-muted-foreground"> ({r.storefrontOrder.status})</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {r.crmCustomer ? (
                    <span className="line-clamp-2" title={r.crmCustomer.contactPersonEmail}>
                      {r.crmCustomer.companyName}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">{new Date(r.enrolledAt).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {menuItems.length > 0 ? (
                    <TableActionButton label={t("View")} items={menuItems} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
