"use client";

import { Fragment, type PropsWithChildren, type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { NavUser } from "@/components/nav-user";
import AppearanceDropdown from "@/components/appearance-dropdown";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CookieConsentWithContext } from "@/components/cookie-consent";
import HeaderLeaveImpersonation from "@/components/header-leave-impersonation";
import NotificationsDropdown from "@/components/notifications-dropdown";
import { MessengerDropdown } from "@/components/messenger-dropdown";
import AppSettingsApplier from "@/components/app-settings-applier";
import { AppSettingsProvider, useAppSettingsOptional } from "@/contexts/app-settings-context";
import { useTranslation } from "@/contexts/translation-context";
import AutoLogoutProvider from "@/components/auto-logout-provider";
import { GlobalSearchProvider } from "@/contexts/global-search-context";

import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { resolveCompanyVisitSiteHref } from "@/lib/website-url";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/** Public marketing site — custom domain, public /sites/{slug}, or signed-in preview. */
function VisitSiteLink({ label }: { label: string }) {
  const appSettings = useAppSettingsOptional();
  const [href, setHref] = useState("/company-website");

  useEffect(() => {
    const settings = appSettings?.settings;
    if (settings) {
      setHref(resolveCompanyVisitSiteHref({
        companyWebsite: settings.companyWebsite,
        company_slug: settings.company_slug,
      }));
      return;
    }
    if (typeof window !== "undefined") {
      setHref(`${window.location.origin}/company-website`);
    }
  }, [appSettings?.settings]);

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      prefetch={false}
      aria-label={label}
      title={label}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground",
      )}
    >
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
      <span className="hidden sm:inline text-xs font-medium">{label}</span>
    </Link>
  );
}

/** Public storefront catalog (`/shop`) — same origin as the admin app. */
function VisitShopLink({ label }: { label: string }) {
  const [href, setHref] = useState(() => {
    const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
    return env ? `${env}/shop` : "/shop";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHref(`${window.location.origin}/shop`);
    }
  }, []);

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      prefetch={false}
      aria-label={label}
      title={label}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground",
      )}
    >
      <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
      <span className="hidden sm:inline text-xs font-medium">{label}</span>
    </Link>
  );
}

type AuthenticatedLayoutProps = PropsWithChildren<{
  header?: ReactNode;
  breadcrumbs?: Array<{ label: string; url?: string }>;
  pageTitle?: string;
  pageActions?: ReactNode;
  user: {
    name: string;
    email: string;
    roles: string[];
    permissions: string[];
    activatedPackages: string[];
    /** pf_role cookie; used for portal sidebar scoping (client / staff / vendor). */
    primaryRole?: string;
  };
}>;

export default function AuthenticatedLayout({
  header,
  children,
  breadcrumbs,
  pageTitle,
  pageActions,
  user,
}: AuthenticatedLayoutProps) {
  const pathname = usePathname() ?? "";
  const { t } = useTranslation();
  const isSuperAdmin = (user.roles ?? []).includes("superadmin");
  const canManageProfile = (user.permissions ?? []).includes("*") || (user.permissions ?? []).includes("manage-profile");
  const perms = user.permissions ?? [];
  const canSwitchCompany =
    isSuperAdmin && (perms.includes("*") || perms.includes("impersonate-users"));
  const marketplaceHref =
    perms.includes("*") || perms.includes("manage-marketplace-settings")
      ? "/marketplace/settings"
      : "/marketplace";
  const canAccessMessenger =
    perms.includes("*") || perms.includes("manage-messenger") || perms.includes("send-messages");

  return (
    <>
      <AppSettingsProvider>
        <AutoLogoutProvider>
        <AppSettingsApplier />
        <GlobalSearchProvider user={user}>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar user={user} currentUrl={pathname} />

          <SidebarInset className="overflow-visible">
            <header className="sticky top-0 z-50 bg-background flex min-h-12 shrink-0 items-center gap-2 px-3 sm:px-4 py-1 border-b mb-2 justify-between flex-wrap sm:flex-nowrap shadow-sm">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />

                <div className="hidden sm:block min-w-0">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                          <Link href="/dashboard">{t("Dashboard")}</Link>
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      {breadcrumbs?.map((crumb, index) => (
                        <Fragment key={index}>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            {crumb.url ? (
                              <BreadcrumbLink asChild>
                                <Link href={crumb.url}>{t(crumb.label)}</Link>
                              </BreadcrumbLink>
                            ) : (
                              <BreadcrumbPage>{t(crumb.label)}</BreadcrumbPage>
                            )}
                          </BreadcrumbItem>
                        </Fragment>
                      ))}
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <VisitShopLink label={t("Visit Shop")} />
                <VisitSiteLink label={t("Visit Site")} />
                <HeaderLeaveImpersonation />
                <LanguageSwitcher compact isSuperAdmin={isSuperAdmin} />
                <AppearanceDropdown />

                <MessengerDropdown canAccess={canAccessMessenger} />

                <NotificationsDropdown />

                <NavUser
                  user={{ name: user.name, email: user.email, role: user.roles[0] ?? "" }}
                  inHeader
                  canManageProfile={canManageProfile}
                  canSwitchCompany={canSwitchCompany}
                  marketplaceHref={marketplaceHref}
                />
              </div>
            </header>

            <main className="p-3 sm:p-4 md:pt-0 h-full">
              {pageTitle && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4" dir="ltr">
                  <h1 className="text-xl font-semibold flex-1 min-w-0">{t(pageTitle)}</h1>
                  {pageActions ? <div className="flex-shrink-0 self-start sm:self-auto">{pageActions}</div> : null}
                </div>
              )}
              {header ? <div className="sr-only">{header}</div> : null}
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
        </GlobalSearchProvider>
        <CookieConsentWithContext />
        </AutoLogoutProvider>
      </AppSettingsProvider>
    </>
  );
}

