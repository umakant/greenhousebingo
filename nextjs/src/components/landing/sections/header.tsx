"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, Menu, User, X } from "lucide-react";
import { useMemo, useState } from "react";
import { getAdminSetting, getImagePath } from "@/components/landing/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const HEADER_VARIANTS = {
  header1: {
    nav: "bg-white border-b border-gray-200 sticky top-0 z-50",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    wrapper: "flex justify-between items-center h-16",
    logo: "text-2xl font-bold",
    desktop: "hidden md:flex items-center space-x-2",
    mobile: "md:hidden text-gray-600 p-2 transition-colors",
    mobileMenu: "md:hidden bg-white border-t",
  },
  header2: {
    nav: "bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    wrapper: "flex flex-col items-center py-6 space-y-6",
    logo: "text-3xl font-bold",
    desktop: "flex items-center space-x-2 bg-gray-50 px-6 py-3 rounded-full",
    mobile:
      "md:hidden text-gray-600 p-2 transition-colors absolute top-4 right-4 hover:bg-gray-100 rounded-lg",
    mobileMenu: "md:hidden bg-white border-t w-full shadow-lg",
  },
  header3: {
    nav: "bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50",
    container: "max-w-6xl mx-auto px-6 sm:px-8 lg:px-10",
    wrapper: "flex justify-between items-center h-14 py-2",
    logo: "text-xl font-bold",
    desktop: "hidden md:flex items-center space-x-2",
    mobile: "md:hidden text-gray-600 p-2 transition-colors hover:bg-gray-100 rounded-md",
    mobileMenu: "md:hidden bg-white/95 backdrop-blur-md border-t",
  },
  header4: {
    nav: "bg-black/20 backdrop-blur-md absolute top-0 left-0 right-0 z-50 border-b border-white/10",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    wrapper: "flex justify-between items-center h-20 py-4",
    logo: "text-2xl font-bold text-white drop-shadow-lg",
    desktop: "hidden md:flex items-center space-x-2",
    mobile: "md:hidden text-white p-2 transition-colors hover:bg-white/10 rounded-lg",
    mobileMenu: "md:hidden bg-black/90 backdrop-blur-md border-t border-white/10",
  },
  header5: {
    nav: "sticky top-0 z-50 shadow-xl",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    wrapper: "flex justify-between items-center h-20 py-4",
    logo: "text-2xl font-bold text-white drop-shadow-lg",
    desktop: "hidden md:flex items-center space-x-2",
    mobile: "md:hidden text-white p-2 transition-colors hover:bg-white/10 rounded-lg",
    mobileMenu: "md:hidden border-t border-white/20",
  },
} as const;

function LandingHeaderUserMenu({
  variant,
  colors,
  userEmail,
  isMobile,
}: {
  variant: string;
  colors: { primary: string; secondary: string; accent: string };
  userEmail?: string;
  isMobile: boolean;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const isTransparent = variant === "header4" || variant === "header5";
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "U";
  const truncatedEmail = userEmail
    ? userEmail.length > 18
      ? `${userEmail.slice(0, 18)}…`
      : userEmail
    : "Account";

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    } finally {
      router.push("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  const sizeClass = isMobile
    ? "w-full justify-center px-4 py-2 text-sm"
    : variant === "header3"
      ? "px-3 py-1 text-xs"
      : "px-4 py-2 text-sm";

  const triggerClass = isTransparent
    ? `flex items-center gap-2 rounded-full border border-white/20 bg-white/10 ${sizeClass} text-white hover:bg-white/15 outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-60`
    : `flex items-center gap-2 rounded-full border border-slate-200 bg-white ${sizeClass} text-slate-700 hover:bg-slate-50 outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60`;

  const emailClass = isTransparent ? "max-w-[140px] truncate text-white/90" : "max-w-[140px] truncate text-slate-600";
  const chevronClass = isTransparent ? "h-3.5 w-3.5 shrink-0 text-white/70" : "h-3.5 w-3.5 shrink-0 text-slate-500";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" disabled={loggingOut} className={triggerClass} aria-label="Account menu">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: colors.primary }}
          >
            {initials}
          </span>
          <span className={emailClass}>{truncatedEmail}</span>
          <ChevronDown className={chevronClass} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <DropdownMenuItem asChild>
          <Link href="/profile/edit" className="cursor-pointer">
            <User className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          disabled={loggingOut}
          onSelect={() => void logout()}
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "Logging out…" : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Header({ settings }: { settings?: any }) {
  const router = useRouter();
  const sectionData = settings?.config_sections?.sections?.header || {};
  const variant = sectionData.variant || "header1";
  const config = (HEADER_VARIANTS as any)[variant] || HEADER_VARIANTS.header1;

  const storedCompanyName = sectionData.company_name ?? "";
  const companyName =
    storedCompanyName && storedCompanyName !== "WorkDo Dash"
      ? storedCompanyName
      : (settings?.company_name || "PaperFlight");
  const isAuthenticated = !!settings?.is_authenticated;
  const ctaText = isAuthenticated ? "Dashboard" : sectionData.cta_text || "Get Started";
  const colors = settings?.config_sections?.colors || { primary: "#10b981", secondary: "#059669", accent: "#f59e0b" };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logoUrl = useMemo(() => {
    const logoKey = "logo_dark";
    const logoPath = getAdminSetting(settings, logoKey);
    return logoPath ? getImagePath(logoPath) : null;
  }, [settings]);

  const navigationItems = sectionData.navigation_items || [];

  const resolveHref = (href: string | undefined) => {
    if (!href) return "#";
    if (href.startsWith("/page/")) return href; // already Next-friendly
    return href;
  };

  const navChrome = (isMobile: boolean) => {
    const isTransparentOrGradient = variant === "header4" || variant === "header5";
    const textColor = isTransparentOrGradient ? "text-white" : "text-slate-700";
    const hoverBg =
      variant === "header2"
        ? "hover:bg-white hover:shadow-sm"
        : variant === "header3"
          ? "hover:bg-gray-50"
          : isTransparentOrGradient
            ? "hover:bg-white/10"
            : "hover:bg-gray-50";
    return { isTransparentOrGradient, textColor, hoverBg };
  };

  const renderNavItems = (isMobile = false) => {
    const { isTransparentOrGradient, textColor, hoverBg } = navChrome(isMobile);

    return navigationItems.map((item: any) => {
      const href = resolveHref(item.href);
      const className = isMobile
        ? `block px-4 py-3 text-base font-medium ${textColor} ${hoverBg} rounded-lg transition-all`
        : `${textColor} px-4 py-2 text-sm font-medium ${hoverBg} rounded-lg transition-all duration-200`;

      if (item.target === "_blank") {
        return (
          <a key={item.text} href={href} target="_blank" rel="noopener noreferrer" className={className}>
            {item.text}
          </a>
        );
      }

      return (
        <Link
          key={item.text}
          href={href}
          className={className}
          onMouseEnter={
            !isMobile
              ? (e) => {
                  if (!isTransparentOrGradient) e.currentTarget.style.color = colors.primary;
                }
              : undefined
          }
          onMouseLeave={!isMobile ? (e) => (e.currentTarget.style.color = "") : undefined}
        >
          {item.text}
        </Link>
      );
    });
  };

  /** Text-style login between nav links and primary CTA (desktop + mobile). */
  const renderLoginNavLink = (isMobile = false) => {
    if (isAuthenticated) return null;
    const { isTransparentOrGradient, textColor, hoverBg } = navChrome(isMobile);
    const className = isMobile
      ? `block px-4 py-3 text-base font-medium ${textColor} ${hoverBg} rounded-lg transition-all`
      : `${textColor} px-4 py-2 text-sm font-medium ${hoverBg} rounded-lg transition-all duration-200`;

    return (
      <Link
        href="/login"
        className={className}
        onMouseEnter={
          !isMobile
            ? (e) => {
                if (!isTransparentOrGradient) e.currentTarget.style.color = colors.primary;
              }
            : undefined
        }
        onMouseLeave={!isMobile ? (e) => (e.currentTarget.style.color = "") : undefined}
      >
        Login
      </Link>
    );
  };

  const renderCTAButtons = (isMobile = false) => {
    const enableRegistration = settings?.enable_registration !== false;

    if (isAuthenticated) {
      return (
        <LandingHeaderUserMenu
          variant={variant}
          colors={colors}
          userEmail={settings?.user_email}
          isMobile={isMobile}
        />
      );
    }

    if (enableRegistration) {
      return (
        <div className={`flex ${isMobile ? "flex-col space-y-2" : "items-center space-x-2"}`}>
          <button
            onClick={() => router.push("/register")}
            className={`text-white rounded-md font-medium transition-colors ${
              isMobile ? "px-4 py-2 text-sm w-full" : variant === "header3" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
            }`}
            style={{ backgroundColor: colors.primary }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.secondary)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.primary)}
          >
            {ctaText}
          </button>
        </div>
      );
    }

    const primaryLabel = (sectionData.cta_text || "Sign In").trim() || "Sign In";
    return (
      <button
        onClick={() => router.push("/login")}
        className={`text-white rounded-md font-medium transition-colors ${
          isMobile ? "px-4 py-2 text-sm w-full" : variant === "header3" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
        }`}
        style={{ backgroundColor: colors.primary }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.secondary)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.primary)}
      >
        {primaryLabel}
      </button>
    );
  };

  const getGradientStyle = () => {
    if (variant === "header5") {
      return { background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary}, ${colors.accent})` };
    }
    return {};
  };

  const getMobileMenuStyle = () => {
    if (variant === "header5") {
      return { background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})` };
    }
    return {};
  };

  return (
    <nav className={config.nav} style={getGradientStyle()}>
      <div className={config.container}>
        <div className={config.wrapper}>
          <Link href="/" className={config.logo} style={{ color: colors.primary }}>
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="w-auto max-w-24 object-contain" />
            ) : (
              companyName
            )}
          </Link>

          <div className={config.desktop}>
            {renderNavItems()}
            {sectionData?.enable_addon_link !== false && (
              <Link
                href="/addons"
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
                  variant === "header4" || variant === "header5"
                    ? "text-white hover:bg-white/10"
                    : variant === "header2"
                      ? "text-slate-700 hover:bg-white hover:shadow-sm"
                      : "text-slate-700 hover:bg-slate-50"
                }`}
                onMouseEnter={(e) => {
                  if (variant !== "header4" && variant !== "header5") e.currentTarget.style.color = colors.primary;
                }}
                onMouseLeave={(e) => (e.currentTarget.style.color = "")}
              >
                Add-Ons
              </Link>
            )}
            {sectionData?.enable_pricing_link !== false && (
              <Link
                href="/pricing"
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
                  variant === "header4" || variant === "header5"
                    ? "text-white hover:bg-white/10"
                    : variant === "header2"
                      ? "text-slate-700 hover:bg-white hover:shadow-sm"
                      : "text-slate-700 hover:bg-slate-50"
                }`}
                onMouseEnter={(e) => {
                  if (variant !== "header4" && variant !== "header5") e.currentTarget.style.color = colors.primary;
                }}
                onMouseLeave={(e) => (e.currentTarget.style.color = "")}
              >
                Pricing
              </Link>
            )}
            {renderLoginNavLink()}
            {renderCTAButtons()}
          </div>

          <button
            className={config.mobile}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.primary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = "")}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className={config.mobileMenu} style={getMobileMenuStyle()}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            {renderNavItems(true)}
            <div className="px-3 py-2">
              {sectionData?.enable_addon_link !== false && (
                <Link href="/addons" className="block px-3 py-2 text-base font-medium text-slate-700">
                  Addons
                </Link>
              )}
              {sectionData?.enable_pricing_link !== false && (
                <Link href="/pricing" className="block px-3 py-2 text-base font-medium text-slate-700">
                  Pricing
                </Link>
              )}
              {renderLoginNavLink(true)}
              {renderCTAButtons(true)}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

