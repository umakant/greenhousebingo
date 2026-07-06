"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useAppSettings } from "@/contexts/app-settings-context";
import { getImagePath } from "@/utils/image-path";
import { ImageWithFallback } from "@/components/image-with-fallback";
import { resolveCompanySidebarIconPaths } from "@/lib/company-user-avatar";
import { useIsDark } from "@/hooks/use-is-dark";
import { resolveBrandPrimaryHex } from "@/lib/brand-theme";
import { brandLogoImageStyle, resolveBrandLogoHeight, resolveBrandLogoWidth } from "@/lib/brand-logo-size";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NavMain } from "@/components/nav-main";
import { getMenuItems } from "@/utils/menu";
import {
  applyDashboardPrefsToNav,
  loadDashboardPrefs,
  DASHBOARD_SIDEBAR_PREFS_EVENT,
  type DashboardSidebarPrefs,
} from "@/lib/dashboard-sidebar-prefs";
import { useGlobalSearch, searchShortcutLabel } from "@/contexts/global-search-context";
import { useTranslation } from "@/contexts/translation-context";

type SidebarUser = {
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
  /** pf_role cookie value; used to detect portal sessions (client / staff / vendor). */
  primaryRole?: string;
};

export function AppSidebar({
  user,
  currentUrl,
  side = "left",
  className,
  style,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: SidebarUser; currentUrl: string }) {
  const { setOpen } = useSidebar();
  const { settings } = useAppSettings();
  const { openSearch } = useGlobalSearch();
  const { t } = useTranslation();

  const expandAndOpenSearch = React.useCallback(() => {
    setOpen(true);
    window.setTimeout(() => openSearch(), 0);
  }, [setOpen, openSearch]);

  const isDark = useIsDark();
  const layoutDirection = (settings.layoutDirection ?? "ltr").trim();
  const sidebarVariantSetting = (settings.sidebarVariant ?? "inset").trim();
  const sidebarStyleSetting = (settings.sidebarStyle ?? "plain").trim();
  const uiVariant =
    sidebarVariantSetting === "floating"
      ? "floating"
      : sidebarVariantSetting === "inset"
        ? "inset"
        : "sidebar";
  const primaryHex = resolveBrandPrimaryHex(
    settings.themeColor ?? "green",
    (settings.customColor ?? "#10b981").trim(),
  );
  const gradientSidebarStyle: React.CSSProperties | undefined =
    sidebarStyleSetting === "gradient"
      ? { backgroundImage: `linear-gradient(135deg, ${primaryHex} 0%, ${primaryHex}CC 100%)` }
      : undefined;

  const logo = isDark ? settings.logo_light : settings.logo_dark;
  const logoStyle = brandLogoImageStyle(
    resolveBrandLogoWidth(settings),
    resolveBrandLogoHeight(settings),
  );
  const sidebarIconPaths = React.useMemo(
    () => resolveCompanySidebarIconPaths(settings),
    [settings],
  );
  const titleText =
    (settings.titleText ?? "").trim() ||
    (settings.company_name ?? "").trim() ||
    "Green House Bingo";
  const poweredByLight = (settings.powered_by_light ?? "").trim();
  const poweredByDark = (settings.powered_by_dark ?? "").trim();
  const poweredBy = isDark ? poweredByDark : poweredByLight;
  /** Avoid duplicating the main sidebar logo in the footer when the same asset is used. */
  const showPoweredBy = Boolean(poweredBy && poweredBy !== logo);

  const rawMenuItems = React.useMemo(
    () =>
      getMenuItems({
        roles: user.roles,
        permissions: user.permissions,
        currentUrl,
        activatedPackages: user.activatedPackages ?? [],
        primaryRole: user.primaryRole ?? user.roles[0],
      }),
    [user.roles, user.permissions, currentUrl, user.activatedPackages, user.primaryRole],
  );

  /** Resolved from `/api/auth/me` so prefs are scoped per company (tenant), not shared across orgs. */
  const [dashboardPrefsTenantId, setDashboardPrefsTenantId] = React.useState<string | null>(null);
  /** Empty until tenant + mount so SSR and first client paint match. */
  const [dashboardPrefs, setDashboardPrefs] = React.useState<DashboardSidebarPrefs>({});

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "same-origin" });
        const j = (await r.json()) as { dashboardSidebarTenantId?: string | null };
        if (cancelled) return;
        const tid = typeof j.dashboardSidebarTenantId === "string" ? j.dashboardSidebarTenantId.trim() : "";
        setDashboardPrefsTenantId(tid.length ? tid : null);
      } catch {
        if (!cancelled) setDashboardPrefsTenantId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!dashboardPrefsTenantId) {
      setDashboardPrefs({});
      return;
    }
    const sync = () => setDashboardPrefs(loadDashboardPrefs(dashboardPrefsTenantId));
    sync();
    const onEvt = (e: Event) => {
      const ce = e as CustomEvent<{ tenantId?: string }>;
      if (ce.detail?.tenantId && ce.detail.tenantId !== dashboardPrefsTenantId) return;
      sync();
    };
    window.addEventListener(DASHBOARD_SIDEBAR_PREFS_EVENT, onEvt);
    return () => window.removeEventListener(DASHBOARD_SIDEBAR_PREFS_EVENT, onEvt);
  }, [dashboardPrefsTenantId]);

  const items = React.useMemo(() => {
    if (!dashboardPrefsTenantId) return rawMenuItems;
    return applyDashboardPrefsToNav(rawMenuItems, dashboardPrefs, t);
  }, [rawMenuItems, dashboardPrefs, dashboardPrefsTenantId, t]);

  const effectiveSide = layoutDirection === "rtl" ? "right" : side;

  return (
    <Sidebar
      {...props}
      collapsible="icon"
      variant={uiVariant}
      side={effectiveSide}
      className={cn(
        (sidebarStyleSetting === "plain" || sidebarStyleSetting === "colored") && "bg-sidebar border-sidebar-border",
        sidebarStyleSetting === "gradient" && "border-sidebar-border",
        className,
      )}
      style={sidebarStyleSetting === "gradient" ? { ...style, ...gradientSidebarStyle } : style}
    >
      <SidebarHeader>
        <div className="flex flex-col gap-2 p-2">
          <div className="w-full min-w-0 px-1 group-data-[collapsible=icon]:hidden">
            {logo ? (
              <div className="flex w-full items-center overflow-hidden rounded-md py-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getImagePath(logo)}
                  alt={titleText}
                  className="w-auto max-w-full object-contain object-left"
                  style={logoStyle}
                />
              </div>
            ) : (
              <div className="flex min-h-12 items-center justify-center rounded-md px-2 py-3 text-lg font-semibold tracking-tight">
                <span className="truncate">{titleText}</span>
              </div>
            )}
          </div>
          {/* When sidebar is collapsed, show icon logo or initials */}
          <div className="hidden items-center justify-center min-h-10 group-data-[collapsible=icon]:flex">
            <ImageWithFallback
              paths={sidebarIconPaths}
              alt={titleText}
              className="h-8 w-8 object-contain"
              fallback={
                <span className="truncate text-xs font-semibold">{titleText.slice(0, 2)}</span>
              }
            />
          </div>
          <div className="min-w-0 px-2">
            <div className="relative min-w-0 group-data-[collapsible=icon]:hidden">
              <Button
                type="button"
                variant="outline"
                className="relative w-full justify-start gap-2 pl-8 h-9 font-normal text-muted-foreground border-sidebar-border bg-background/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={openSearch}
              >
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <span className="truncate">{t("Search…") + " (" + searchShortcutLabel() + ")"}</span>
              </Button>
            </div>
            <div className="hidden justify-center group-data-[collapsible=icon]:flex">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    aria-label={t("Open search")}
                    onClick={expandAndOpenSearch}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={effectiveSide === "right" ? "left" : "right"} className="max-w-xs">
                  {t("Search the application") + " (" + searchShortcutLabel() + ")"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={items} dashboardPrefsTenantId={dashboardPrefsTenantId} />
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="group-data-[collapsible=icon]:hidden flex min-w-0 items-center justify-center overflow-hidden">
          {showPoweredBy ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getImagePath(poweredBy)}
              alt="Powered by"
              className="mx-auto h-10 w-auto max-w-full object-contain object-center opacity-80"
            />
          ) : null}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

