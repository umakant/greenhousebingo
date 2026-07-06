"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Briefcase,
  Building2,
  Calendar,
  Clock,
  FileText,
  LayoutDashboard,
  Mail,
  MapPin,
  Phone,
  LogIn,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDate } from "@/lib/format-date";
import { getImagePath } from "@/utils/image-path";
import { useAppSettings } from "@/contexts/app-settings-context";
import { useTranslation } from "@/contexts/translation-context";
import { cn } from "@/lib/utils";

type Rel = { id: string; name: string } | null;
type ShiftRel = { id: string; name: string; startTime?: string; endTime?: string } | null;

export type HrmEmployeeDetail = {
  id: string;
  employeeId: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  status: string;
  employeeType: string | null;
  workType: string | null;
  joiningDate: string | null;
  leavingDate: string | null;
  basicSalary: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankBranchCode: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  profilePhoto: string | null;
  notes: string | null;
  updatedAt: string | null;
  userId: string | null;
  department: Rel;
  designation: Rel;
  branch: Rel;
  shift: ShiftRel;
};

export type SectionId = "overview" | "profile" | "work" | "related";

type NavItem = {
  id: SectionId;
  titleKey: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SECTIONS: NavItem[] = [
  { id: "overview", titleKey: "Overview", icon: LayoutDashboard },
  { id: "profile", titleKey: "Profile", icon: User },
  { id: "work", titleKey: "Work", icon: Clock },
  { id: "related", titleKey: "Related", icon: FileText },
];

function statusBadge(s: string) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    inactive: "bg-muted text-muted-foreground",
    on_leave: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
    terminated: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[s] ?? map.inactive}`}>
      {s.replace(/_/g, " ")}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2.5 border-b border-border/50 last:border-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="sm:col-span-2 text-sm font-medium break-words">{value ?? "—"}</div>
    </div>
  );
}

function EmployeeSectionShell({
  title,
  description,
  icon: Icon,
  actions,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5 shrink-0" />
            {title}
          </CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function HrmEmployeeView({
  employeeId,
  permissions,
}: {
  employeeId: string;
  permissions: string[];
}) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { settings } = useAppSettings();
  const fmtDate = (d: string | Date | null | undefined) => formatDate(d, settings);

  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  const canEdit = can("edit-employees");
  const canReviewPortalExpenses =
    permissions.includes("*") ||
    permissions.includes("manage-expense-management") ||
    permissions.includes("manage-expense-reports");

  const [active, setActive] = React.useState<SectionId>("overview");
  const [emp, setEmp] = React.useState<HrmEmployeeDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [photoBroken, setPhotoBroken] = React.useState(false);
  const [provisioningPortal, setProvisioningPortal] = React.useState(false);

  React.useEffect(() => {
    const raw = searchParams?.get("section");
    if (raw && SECTIONS.some((s) => s.id === raw)) setActive(raw as SectionId);
  }, [searchParams]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPhotoBroken(false);
    fetch(`/api/hrm/employees/${employeeId}`, { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json().catch(() => null);
        if (!r.ok) throw new Error(json?.error || "Failed to load employee");
        return json?.data as HrmEmployeeDetail;
      })
      .then((data) => {
        if (!cancelled) setEmp(data ?? null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  React.useEffect(() => {
    setPhotoBroken(false);
  }, [emp?.profilePhoto]);

  const displayName = emp ? `${emp.firstName} ${emp.lastName ?? ""}`.trim() : "";
  const photoSrc = emp?.profilePhoto?.trim() ? getImagePath(emp.profilePhoto.trim()) : "";

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground text-sm">{t("Loading...")}</div>
    );
  }

  if (error || !emp) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center space-y-4">
          <p className="text-destructive text-sm">{error || t("Employee not found.")}</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hrm/employees">{t("Back to employees")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  async function enablePortalLogin() {
    if (!emp?.email?.trim()) {
      toast.error(t("Add an email on the employee profile before enabling portal login."));
      return;
    }
    setProvisioningPortal(true);
    try {
      const res = await fetch(`/api/hrm/employees/${employeeId}/provision-portal-access`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ send_welcome_email: true }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        portal_password?: string;
        user_id?: string;
      };
      if (!res.ok) throw new Error(json.error || "Failed to enable portal login");
      if (json.portal_password) {
        toast.success(`${json.message ?? t("Portal login enabled.")} ${t("Temporary password:")} ${json.portal_password}`, {
          duration: 20000,
        });
      } else {
        toast.success(json.message ?? t("Portal login enabled."));
      }
      setEmp((prev) => (prev && json.user_id ? { ...prev, userId: json.user_id } : prev));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Failed to enable portal login"));
    } finally {
      setProvisioningPortal(false);
    }
  }

  const profileActions =
    canEdit ? (
      <Button type="button" variant="default" size="sm" asChild>
        <Link href={`/hrm/employees?edit=${emp.id}`}>{t("Edit")}</Link>
      </Button>
    ) : null;

  const renderActive = () => {
    switch (active) {
      case "overview":
        return (
          <EmployeeSectionShell
            title={t("Overview")}
            description={t("Key details and status at a glance.")}
            icon={LayoutDashboard}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setActive("profile")}>
                  {t("Profile")}
                </Button>
                {canEdit ? (
                  <Button type="button" variant="default" size="sm" asChild>
                    <Link href={`/hrm/employees?edit=${emp.id}`}>{t("Edit")}</Link>
                  </Button>
                ) : null}
                {canEdit && !emp.userId ? (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    disabled={provisioningPortal}
                    onClick={() => void enablePortalLogin()}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    {provisioningPortal ? t("Enabling...") : t("Enable portal login")}
                  </Button>
                ) : null}
                {canReviewPortalExpenses && emp.userId ? (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link href={`/expense-management/reports?created_by_user_id=${emp.userId}`}>
                      <Wallet className="mr-2 h-4 w-4" />
                      {t("Portal expenses")}
                    </Link>
                  </Button>
                ) : null}
              </div>
            }
          >
            <div className="space-y-8">
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Summary metrics")}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Card className="border-border/80 bg-gradient-to-b from-muted/40 to-background shadow-none transition-colors hover:border-primary/25">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
                        <Avatar className="h-14 w-14 rounded-xl border-0">
                          {photoSrc && !photoBroken ? (
                            <AvatarImage
                              src={photoSrc}
                              alt=""
                              className="object-cover"
                              onLoadingStatusChange={(s) => {
                                if (s === "error") setPhotoBroken(true);
                              }}
                            />
                          ) : null}
                          <AvatarFallback className="rounded-xl text-lg font-semibold">
                            {displayName.charAt(0).toUpperCase() || <User className="h-7 w-7" />}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold leading-snug">{displayName || "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">{emp.email ?? "—"}</div>
                        <div className="mt-2">{statusBadge(emp.status)}</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-gradient-to-b from-muted/40 to-background shadow-none transition-colors hover:border-primary/25">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">{t("Department")}</div>
                        <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-primary line-clamp-2">
                          {emp.department?.name ?? "—"}
                        </div>
                      </div>
                      <div className="rounded-xl border border-primary/15 bg-primary/10 p-3 text-primary">
                        <Building2 className="h-6 w-6" aria-hidden />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-gradient-to-b from-muted/40 to-background shadow-none transition-colors hover:border-primary/25">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">{t("Designation")}</div>
                        <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-primary line-clamp-2">
                          {emp.designation?.name ?? "—"}
                        </div>
                      </div>
                      <div className="rounded-xl border border-primary/15 bg-primary/10 p-3 text-primary">
                        <Briefcase className="h-6 w-6" aria-hidden />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-gradient-to-b from-muted/40 to-background shadow-none transition-colors hover:border-primary/25">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">{t("Branch")}</div>
                        <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-primary line-clamp-2">
                          {emp.branch?.name ?? "—"}
                        </div>
                      </div>
                      <div className="rounded-xl border border-primary/15 bg-primary/10 p-3 text-primary">
                        <MapPin className="h-6 w-6" aria-hidden />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Employee snapshot")}
                </h3>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-border/80 bg-muted/10 p-5">
                    <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <User className="h-4 w-4" aria-hidden />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t("Identity & contact")}</p>
                        <p className="text-xs text-muted-foreground">{t("Personal identifiers and how to reach this employee.")}</p>
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label={t("Employee ID")}>
                        {emp.employeeId ? <span className="font-mono text-sm">{emp.employeeId}</span> : "—"}
                      </Field>
                      <Field label={t("Email")}>{emp.email ?? "—"}</Field>
                      <Field label={t("Phone")}>{emp.phone ? formatPhoneDisplay(emp.phone, "—") : "—"}</Field>
                      <Field label={t("Gender")}>{emp.gender ?? "—"}</Field>
                      <Field label={t("Date of birth")}>{emp.dateOfBirth ? fmtDate(emp.dateOfBirth) : "—"}</Field>
                      <Field label={t("Address")}>
                        {[emp.address, emp.city, emp.country].filter(Boolean).join(", ") || "—"}
                      </Field>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/10 p-5">
                    <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Briefcase className="h-4 w-4" aria-hidden />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t("Work & assignment")}</p>
                        <p className="text-xs text-muted-foreground">{t("Role, location, and schedule context.")}</p>
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label={t("Department")}>{emp.department?.name ?? "—"}</Field>
                      <Field label={t("Designation")}>{emp.designation?.name ?? "—"}</Field>
                      <Field label={t("Branch")}>{emp.branch?.name ?? "—"}</Field>
                      <Field label={t("Shift")}>
                        {emp.shift
                          ? `${emp.shift.name}${
                              emp.shift.startTime && emp.shift.endTime
                                ? ` (${emp.shift.startTime} – ${emp.shift.endTime})`
                                : ""
                            }`
                          : "—"}
                      </Field>
                      <Field label={t("Joining date")}>{emp.joiningDate ? fmtDate(emp.joiningDate) : "—"}</Field>
                      <Field label={t("Work type")}>{emp.workType ?? "—"}</Field>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                {t("Open Profile in the sidebar for full contact, emergency, and banking details.")}
              </p>
            </div>
          </EmployeeSectionShell>
        );

      case "profile":
        return (
          <EmployeeSectionShell
            title={t("Profile")}
            description={t("Contact, emergency contacts, banking, and internal notes.")}
            icon={User}
            actions={profileActions}
          >
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="shadow-sm border-border/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">{t("Contact")}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <DetailRow
                      label={t("Email")}
                      value={
                        emp.email ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <a href={`mailto:${emp.email}`} className="text-primary hover:underline">
                              {emp.email}
                            </a>
                          </span>
                        ) : null
                      }
                    />
                    <DetailRow
                      label={t("Phone")}
                      value={
                        emp.phone ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {formatPhoneDisplay(emp.phone, "—")}
                          </span>
                        ) : null
                      }
                    />
                    <DetailRow label={t("Gender")} value={emp.gender} />
                    <DetailRow label={t("Date of birth")} value={emp.dateOfBirth ? fmtDate(emp.dateOfBirth) : null} />
                    <DetailRow
                      label={t("Address")}
                      value={
                        [emp.address, emp.city, emp.country].filter(Boolean).length ? (
                          <span className="inline-flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            {[emp.address, emp.city, emp.country].filter(Boolean).join(", ")}
                          </span>
                        ) : null
                      }
                    />
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-border/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">{t("Emergency")}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <DetailRow label={t("Contact name")} value={emp.emergencyName} />
                    <DetailRow
                      label={t("Contact phone")}
                      value={emp.emergencyPhone ? formatPhoneDisplay(emp.emergencyPhone, "—") : null}
                    />
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm border-border/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{t("Banking")}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-0 sm:grid-cols-2">
                    <DetailRow label={t("Bank name")} value={emp.bankName} />
                    <DetailRow label={t("Account number")} value={emp.bankAccountNumber} />
                    <DetailRow label={t("Branch code")} value={emp.bankBranchCode} />
                  </div>
                </CardContent>
              </Card>

              {emp.notes ? (
                <Card className="shadow-sm border-border/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">{t("Notes")}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{emp.notes}</p>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </EmployeeSectionShell>
        );

      case "work":
        return (
          <EmployeeSectionShell
            title={t("Work")}
            description={t("Employment terms, dates, and compensation.")}
            icon={Clock}
            actions={profileActions}
          >
            <Card className="shadow-sm border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{t("Employment")}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <DetailRow label={t("Employee type")} value={emp.employeeType} />
                <DetailRow label={t("Work type")} value={emp.workType} />
                <DetailRow label={t("Joining date")} value={emp.joiningDate ? fmtDate(emp.joiningDate) : null} />
                <DetailRow label={t("Leaving date")} value={emp.leavingDate ? fmtDate(emp.leavingDate) : null} />
                <DetailRow
                  label={t("Shift")}
                  value={
                    emp.shift ? (
                      <span>
                        {emp.shift.name}
                        {emp.shift.startTime && emp.shift.endTime
                          ? ` (${emp.shift.startTime} – ${emp.shift.endTime})`
                          : null}
                      </span>
                    ) : null
                  }
                />
                <DetailRow label={t("Basic salary")} value={emp.basicSalary != null ? String(emp.basicSalary) : null} />
              </CardContent>
            </Card>
          </EmployeeSectionShell>
        );

      case "related":
        return (
          <EmployeeSectionShell
            title={t("Related")}
            description={t("Quick links to other HRM areas.")}
            icon={FileText}
            actions={null}
          >
            <Card className="shadow-sm border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{t("Quick links")}</CardTitle>
                <p className="text-sm text-muted-foreground font-normal">
                  {t("Open an HRM section and use filters or search to narrow records for this employee.")}
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-0">
                <Button variant="outline" size="sm" className="h-9" asChild>
                  <Link href="/hrm/attendances">
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    {t("Attendances")}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="h-9" asChild>
                  <Link href="/hrm/leave-applications">
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    {t("Leave applications")}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="h-9" asChild>
                  <Link href="/hrm/documents">
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    {t("Documents")}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="h-9" asChild>
                  <Link href="/hrm/awards">
                    <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                    {t("Awards")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </EmployeeSectionShell>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <aside className="flex-shrink-0 md:w-64">
        <div className="md:sticky md:top-4">
          <div className="md:hidden -mx-1 px-1">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {SECTIONS.map((s) => (
                <Button
                  key={s.id}
                  variant={active === s.id ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => setActive(s.id)}
                >
                  <s.icon className="mr-2 h-4 w-4" />
                  {t(s.titleKey)}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="hidden h-[min(70vh,calc(100vh-8rem))] md:block">
            <div className="space-y-1 pr-4">
              {SECTIONS.map((s) => (
                <Button
                  key={s.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-foreground",
                    active === s.id && "bg-muted font-medium",
                  )}
                  onClick={() => setActive(s.id)}
                >
                  <s.icon className="mr-2 h-4 w-4 shrink-0" />
                  {t(s.titleKey)}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="pt-0 md:pt-4">
          <section className="scroll-mt-6" aria-labelledby={`employee-section-${active}`}>
            <h2 id={`employee-section-${active}`} className="sr-only">
              {t(SECTIONS.find((x) => x.id === active)?.titleKey ?? "")}
            </h2>
            {renderActive()}
          </section>
        </div>
      </div>
    </div>
  );
}
