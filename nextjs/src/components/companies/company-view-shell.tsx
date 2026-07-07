"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  CreditCard,
  FileStack,
  FileText,
  FolderKanban,
  FolderOpen,
  History,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  StickyNote,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";

import { EditCompanyTrigger } from "@/components/companies/company-edit-drawer";
import CompanyLoginActions from "@/components/companies/company-login-actions";
import { ImageWithFallback } from "@/components/image-with-fallback";
import CompanyLoginActivitySection from "@/components/companies/company-login-activity-section";
import CompanyCreditNotesSection from "@/components/companies/company-credit-notes-section";
import CompanyContactsSection from "@/components/companies/company-contacts-section";
import CompanyDocumentsSection from "@/components/companies/company-documents-section";
import CompanyNotesSection from "@/components/companies/company-notes-section";
import CompanyOrdersSection from "@/components/companies/company-orders-section";
import CompanyTicketsSection from "@/components/companies/company-tickets-section";
import CompanyPaymentsSection from "@/components/companies/company-payments-section";
import CompanyEstimatesSection from "@/components/companies/company-estimates-section";
import CompanyInvoicesSection from "@/components/companies/company-invoices-section";
import { CompanyBillingPaymentMethodsCard } from "@/components/companies/company-billing-payment-methods-card";
import { CompanyBillingPlanPanel, type CompanyPlanDetailsPayload } from "@/components/companies/company-billing-plan-panel";
import { CompanyEventPlatformOrgCard } from "@/components/companies/company-event-platform-org-card";
import { CompanyLmsOrgCard } from "@/components/companies/company-lms-org-card";
import { CompanyMarketplaceOrgCard } from "@/components/companies/company-marketplace-org-card";
import CompanyProjectsSection from "@/components/companies/company-projects-section";
import SubscriptionSetting from "@/components/plans/subscription-setting";
import type { UserSubscriptionInfo } from "@/components/plans/subscription-setting";
import { formatPhoneDisplay } from "@/lib/phone";
import { resolveCompanyBrandImagePaths } from "@/lib/company-user-avatar";
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
import { useTranslation } from "@/contexts/translation-context";
import { cn } from "@/lib/utils";

function CompanyBrandAvatar({
  settings,
  avatar,
  boxClassName,
  iconClassName,
  emptyLabel,
}: {
  settings: Record<string, string>;
  avatar?: string | null;
  boxClassName: string;
  iconClassName: string;
  emptyLabel?: React.ReactNode;
}) {
  const paths = resolveCompanyBrandImagePaths(settings, avatar);
  return (
    <div className={boxClassName} role="img" aria-hidden={!emptyLabel}>
      <ImageWithFallback
        paths={paths}
        alt=""
        className="h-full w-full object-contain p-1.5"
        fallback={
          emptyLabel ?? <Building2 className={iconClassName} aria-hidden />
        }
      />
    </div>
  );
}

export type SectionId =
  | "overview"
  | "company_details"
  | "plan"
  | "projects"
  | "invoices"
  | "estimates"
  | "credit_note"
  | "payments"
  | "contacts"
  | "documents"
  | "notes"
  | "tickets"
  | "orders"
  | "signin";

/** @deprecated Use SectionId */
export type TabId = SectionId;

type NavItem = {
  id: SectionId;
  titleKey: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SECTIONS: NavItem[] = [
  { id: "overview", titleKey: "Overview", icon: LayoutDashboard },
  { id: "company_details", titleKey: "Company Details", icon: Building2 },
  { id: "plan", titleKey: "Billing & plans", icon: Package },
  { id: "projects", titleKey: "Projects", icon: FolderKanban },
  { id: "invoices", titleKey: "Invoices", icon: FileText },
  { id: "estimates", titleKey: "Estimates", icon: FileText },
  { id: "credit_note", titleKey: "Credit Note", icon: FileStack },
  { id: "payments", titleKey: "Payments", icon: CreditCard },
  { id: "contacts", titleKey: "Contacts", icon: Users },
  { id: "documents", titleKey: "Documents", icon: FolderOpen },
  { id: "notes", titleKey: "Notes", icon: StickyNote },
  { id: "tickets", titleKey: "Tickets", icon: Ticket },
  { id: "orders", titleKey: "Orders", icon: ShoppingCart },
  { id: "signin", titleKey: "Sign-in activity", icon: History },
];

export type CompanyViewShellProps = {
  companyId: string;
  companyName: string;
  email: string | null;
  mobileNo: string | null;
  slug: string | null;
  lang: string | null;
  loginEnabled: boolean;
  businessModuleName: string | null;
  settings: Record<string, string>;
  totalProjects: number;
  employeeCount: number;
  /** Placeholder until billing APIs are wired */
  totalEarnings?: number;
  dueInvoices?: number;
  companySubscriptionInfo?: UserSubscriptionInfo | null;
  canEditPlans?: boolean;
  canDeletePlans?: boolean;
  companyPlanDetails?: CompanyPlanDetailsPayload;
  /** LMS add-on opt-in for this company (`saas_lms_enabled` setting). */
  lmsOrgEnabled?: boolean;
  /** Event Platform add-on opt-in for this company (`saas_event_platform_enabled` setting). */
  eventPlatformOrgEnabled?: boolean;
  /** Marketplace add-on opt-in for this company (`saas_marketplace_enabled` setting). */
  marketplaceOrgEnabled?: boolean;
  /** Synced user avatar — matches companies list column. */
  avatar?: string | null;
};

function CompanySectionShell({
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export default function CompanyViewShell(props: CompanyViewShellProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = React.useState<SectionId>("overview");
  const {
    companyId,
    companyName,
    email,
    mobileNo,
    slug,
    lang,
    loginEnabled,
    businessModuleName,
    settings,
    totalProjects,
    employeeCount,
    totalEarnings = 0,
    dueInvoices = 0,
    companySubscriptionInfo = null,
    canEditPlans = false,
    canDeletePlans = false,
    companyPlanDetails = null,
    lmsOrgEnabled = false,
    eventPlatformOrgEnabled = false,
    marketplaceOrgEnabled = false,
    avatar = null,
  } = props;

  React.useEffect(() => {
    const raw = searchParams?.get("section");
    if (!raw) return;
    if (SECTIONS.some((s) => s.id === raw)) setActive(raw as SectionId);
  }, [searchParams]);

  const selectSection = React.useCallback(
    (section: SectionId) => {
      setActive(section);
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("section", section);
      if (section !== "invoices") params.delete("invoice");
      router.replace(`/companies/${companyId}?${params.toString()}`, { scroll: false });
    },
    [companyId, router, searchParams],
  );

  const address = [settings.companyAddress, settings.companyAddress2, settings.companyCity, settings.companyState, settings.companyZipCode]
    .filter(Boolean)
    .join(", ");

  const currency = (settings.defaultCurrency ?? "USD").trim() || "USD";

  const earningsFormatted = React.useMemo(() => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency.length === 3 ? currency : "USD",
        maximumFractionDigits: 0,
      }).format(totalEarnings);
    } catch {
      return String(totalEarnings);
    }
  }, [currency, totalEarnings]);

  const subtitle = businessModuleName || email || "—";

  const detailActions = (
    <>
      <CompanyLoginActions companyId={companyId} loginEnabled={loginEnabled} />
      <EditCompanyTrigger companyId={companyId} variant="outline" size="sm">
        {t("Edit")}
      </EditCompanyTrigger>
    </>
  );
  const renderActive = () => {
    switch (active) {
      case "overview":
        return (
          <CompanySectionShell
            title={t("Overview")}
            description={t("Company view overview description")}
            icon={LayoutDashboard}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => selectSection("company_details")}>
                  {t("Company Details")}
                </Button>
                <EditCompanyTrigger companyId={companyId} size="sm">
                  {t("Edit")}
                </EditCompanyTrigger>
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
                      <CompanyBrandAvatar
                        settings={settings}
                        avatar={avatar}
                        boxClassName="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm"
                        iconClassName="h-7 w-7 text-muted-foreground"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold leading-snug">{companyName || "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
                        <div
                          className={cn(
                            "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                            loginEnabled ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" : "bg-amber-500/15 text-amber-900 dark:text-amber-200",
                          )}
                        >
                          {loginEnabled ? t("Active") : t("Pending approval")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-gradient-to-b from-muted/40 to-background shadow-none transition-colors hover:border-primary/25">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">{t("Total projects")}</div>
                        <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-primary">{totalProjects}</div>
                      </div>
                      <div className="rounded-xl border border-primary/15 bg-primary/10 p-3 text-primary">
                        <FolderKanban className="h-6 w-6" aria-hidden />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-gradient-to-b from-muted/40 to-background shadow-none transition-colors hover:border-primary/25">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">{t("Total earnings")}</div>
                        <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-primary">{earningsFormatted}</div>
                      </div>
                      <div className="rounded-xl border border-primary/15 bg-primary/10 p-3 text-primary">
                        <Wallet className="h-6 w-6" aria-hidden />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-gradient-to-b from-muted/40 to-background shadow-none transition-colors hover:border-primary/25">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">{t("Due invoices")}</div>
                        <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-primary">{dueInvoices}</div>
                      </div>
                      <div className="rounded-xl border border-primary/15 bg-primary/10 p-3 text-primary">
                        <FileText className="h-6 w-6" aria-hidden />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <CompanyLmsOrgCard companyId={companyId} initialEnabled={lmsOrgEnabled} />

              <CompanyEventPlatformOrgCard companyId={companyId} initialEnabled={eventPlatformOrgEnabled} />

              <CompanyMarketplaceOrgCard companyId={companyId} initialEnabled={marketplaceOrgEnabled} />

              <Separator />

              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Company snapshot")}
                </h3>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-border/80 bg-muted/10 p-5">
                    <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" aria-hidden />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t("Identity & contact")}</p>
                        <p className="text-xs text-muted-foreground">{t("Identity & contact hint")}</p>
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label={t("Company ID")}>
                        {slug ? <span className="font-mono text-sm">{slug}</span> : "—"}
                      </Field>
                      <Field label={t("Module")}>{businessModuleName ?? "—"}</Field>
                      <Field label={t("Email")}>{email ?? "—"}</Field>
                      <Field label={t("Mobile")}>
                        {formatPhoneDisplay(mobileNo ?? settings.companyPhone ?? "", "—")}
                      </Field>
                      <Field label={t("Language")}>{lang ?? "en"}</Field>
                      <Field label={t("Employees")}>{employeeCount}</Field>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/10 p-5">
                    <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Settings className="h-4 w-4" aria-hidden />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t("Location & preferences")}</p>
                        <p className="text-xs text-muted-foreground">{t("Location & preferences hint")}</p>
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label={t("Website")}>
                        {settings.companyWebsite ? (
                          <a
                            className="text-sm text-primary hover:underline"
                            href={settings.companyWebsite}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {settings.companyWebsite}
                          </a>
                        ) : (
                          "—"
                        )}
                      </Field>
                      <Field label={t("Address")}>
                        <span className="line-clamp-4 sm:line-clamp-none">{address || "—"}</span>
                      </Field>
                      <Field label={t("Default currency")}>{settings.defaultCurrency || "—"}</Field>
                      <Field label={t("GST/VAT Number")}>{settings.companyGstVat || "—"}</Field>
                      <Field label={t("Office phone")}>{formatPhoneDisplay(settings.companyPhone ?? "", "—")}</Field>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">{t("Company overview footer hint")}</p>
            </div>
          </CompanySectionShell>
        );

      case "plan":
        return (
          <CompanySectionShell
            title={t("Billing & plans")}
            description={t("Current subscription, pricing, and plan changes for this organization — similar to account billing settings.")}
            icon={Package}
            actions={null}
          >
            <div className="space-y-10">
              <CompanyBillingPlanPanel
                companyId={companyId}
                companyName={companyName}
                subscriptionInfo={companySubscriptionInfo ?? null}
                planDetails={companyPlanDetails}
                defaultCurrency={currency}
              />
              <CompanyBillingPaymentMethodsCard
                companyId={companyId}
                onGoToPayments={() => selectSection("payments")}
              />
              <div id="company-plan-comparison" className="scroll-mt-6 space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{t("Plans & add-ons")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("Compare packages, modules, and assign or change this company’s plan.")}
                  </p>
                </div>
                <SubscriptionSetting
                  role="superadmin"
                  canCreate={false}
                  canEdit={canEditPlans}
                  canDelete={canDeletePlans}
                  userSubscriptionInfo={companySubscriptionInfo}
                  companyPlanAssignment={{ companyId, hideTopSummary: true }}
                />
              </div>
            </div>
          </CompanySectionShell>
        );

      case "company_details":
        return (
          <CompanySectionShell
            title={t("Company Details")}
            description={t("Read-only profile — use Edit to change fields.")}
            icon={Building2}
            actions={detailActions}
          >
            <div className="space-y-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <CompanyBrandAvatar
                  settings={settings}
                  avatar={avatar}
                  boxClassName="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30"
                  iconClassName="h-8 w-8 text-muted-foreground"
                  emptyLabel={
                    <span className="px-2 text-center text-xs text-muted-foreground">{t("No logo")}</span>
                  }
                />
                <div className="min-w-0">
                  <div className="text-lg font-semibold">{companyName || "—"}</div>
                  {businessModuleName ? <div className="text-sm text-muted-foreground">{businessModuleName}</div> : null}
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{t("Employees")}:</span> {employeeCount}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid gap-8 md:grid-cols-2">
                <Field label={t("Company ID")}>
                  {slug ? <span className="font-mono">{slug}</span> : "—"}
                </Field>
                <Field label={t("Language")}>{lang ?? "en"}</Field>
                <Field label={t("Email")}>{email ?? "—"}</Field>
                <Field label={t("Mobile")}>{formatPhoneDisplay(mobileNo ?? "", "—")}</Field>
              </div>

              <Separator />

              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Location & preferences")}
                </h3>
                <p className="mb-4 text-xs text-muted-foreground">{t("Location & preferences hint")}</p>
                <div className="grid gap-8 md:grid-cols-2">
                  <Field label={t("Website")}>
                    {settings.companyWebsite ? (
                      <a
                        className="text-primary hover:underline"
                        href={settings.companyWebsite}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {settings.companyWebsite}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Field>
                  <Field label={t("Address")}>
                    <span className="line-clamp-6 sm:line-clamp-none">{address || "—"}</span>
                  </Field>
                  <Field label={t("Default currency")}>{settings.defaultCurrency || "—"}</Field>
                  <Field label={t("GST/VAT Number")}>{settings.companyGstVat || "—"}</Field>
                  <Field label={t("Office phone")}>{formatPhoneDisplay(settings.companyPhone ?? "", "—")}</Field>
                </div>
              </div>
            </div>
          </CompanySectionShell>
        );

      case "projects":
        return <CompanyProjectsSection companyId={companyId} defaultCurrency={currency} />;

      case "invoices":
        return <CompanyInvoicesSection companyId={companyId} defaultCurrency={currency} />;
      case "estimates":
        return <CompanyEstimatesSection companyId={companyId} defaultCurrency={currency} />;
      case "credit_note":
        return <CompanyCreditNotesSection companyId={companyId} defaultCurrency={currency} />;
      case "payments":
        return <CompanyPaymentsSection companyId={companyId} defaultCurrency={currency} />;
      case "contacts":
        return <CompanyContactsSection companyId={companyId} />;
      case "documents":
        return <CompanyDocumentsSection companyId={companyId} />;
      case "notes":
        return <CompanyNotesSection companyId={companyId} />;
      case "tickets":
        return <CompanyTicketsSection companyId={companyId} />;
      case "orders":
        return <CompanyOrdersSection companyId={companyId} />;

      case "signin":
        return (
          <CompanySectionShell
            title={t("Sign-in activity")}
            description={t("Recent sign-in attempts for this company account.")}
            icon={History}
            actions={
              <Button variant="outline" size="sm" asChild>
                <Link href={`/login-history?user_id=${companyId}`}>{t("Open full login history")}</Link>
              </Button>
            }
          >
            <CompanyLoginActivitySection companyId={companyId} hideChrome />
          </CompanySectionShell>
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
                  onClick={() => selectSection(s.id)}
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
                  onClick={() => selectSection(s.id)}
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
          <section className="scroll-mt-6" aria-labelledby={`company-section-${active}`}>
            <h2 id={`company-section-${active}`} className="sr-only">
              {t(SECTIONS.find((x) => x.id === active)?.titleKey ?? "")}
            </h2>
            {renderActive()}
          </section>
        </div>
      </div>
    </div>
  );
}
