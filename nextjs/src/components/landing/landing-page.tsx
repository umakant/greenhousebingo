"use client";
import { useState, useEffect, useRef, useMemo, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  User,
  Menu,
  Play,
  CheckCircle2,
  Sparkles,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tv,
  MessageCircle,
  Check,
  Plus,
  Star,
  Bug,
  Leaf,
  Waves,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getAdminSetting, getImagePath } from "@/components/landing/utils";
import type { LandingPageSettings } from "@/lib/landing-page-data";
import { industries, industryCategories } from "@/lib/landing-industries-data";
import type { IndustryCategory } from "@/lib/landing-industries-data";
import { LANDING_BRAND } from "@/lib/landing-brand-colors";
import { cn } from "@/lib/utils";
import { VendorHeroPlacesSearch } from "@/components/landing/vendor-hero-places-search";
import { SimpleStepsLeadForm, STEPS_FORM_TEAL } from "@/components/landing/simple-steps-lead-form";

/** Reference palette from landing screenshots */
const LP = {
  navy: "#2c3e50",
  navyDeep: "#0f172a",
  cyan: "#48c1d2",
  cyanMuted: "#7dd3e8",
  tabActiveBg: "#d6f3f8",
  salmon: "#ff7f72",
  coralGrid: "#F86E6D",
  footerBlue: "#0060E9",
  tealAccent: "#2dd4bf",
  coralBar: "#f87171",
} as const;

const CATEGORY_ORDER: IndustryCategory[] = ["home", "local", "rental", "product", "medical"];

type BrandLogoOrder = "lightFirst" | "darkFirst";

/**
 * Brand logos from System Settings (same keys as settings Brand / logos).
 * - `darkFirst`: light UI (e.g. white nav) — prefer dark logo, then light.
 * - `lightFirst`: dark UI (e.g. navy footer) — prefer light logo, then dark.
 */
function brandLogoFromSettings(
  settings?: LandingPageSettings,
  order: BrandLogoOrder = "lightFirst",
): { src: string | null; label: string } {
  const label = settings?.company_name?.trim() || "Paper Flight";
  const light = getAdminSetting(settings, "logo_light")?.trim();
  const dark = getAdminSetting(settings, "logo_dark")?.trim();
  const path = order === "darkFirst" ? dark || light : light || dark;
  return { src: path ? getImagePath(path) : null, label };
}

function NavDropdown({
  label,
  items,
  navTone = "default",
}: {
  label: string;
  items: { name: string; href: string }[];
  navTone?: "default" | "softBlue";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const blue = navTone === "softBlue";
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex items-center gap-1 text-sm font-medium transition-colors",
          blue ? "text-white/90 hover:text-white" : "text-foreground/80 hover:text-foreground",
        )}
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[180px] rounded-xl border border-border bg-popover p-2 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const BULK_NAV = [
  { id: "homeowners" as const, label: "For Homeowners", href: "/industries" },
  { id: "vendors" as const, label: "For Vendors", href: "/signup" },
  { id: "about" as const, label: "About Us", href: "/features" },
];

const BULK_NAVY = "#1A2B3C";

/** Header CTA teal (second marketing reference) */
const BULK_HEADER_CTA_TEAL = "#40a99b";

function bulkNavActiveId(pathname: string | null): (typeof BULK_NAV)[number]["id"] {
  const p = pathname ?? "/";
  if (p.startsWith("/features")) return "about";
  if (p.startsWith("/industries")) return "homeowners";
  if (p.startsWith("/signup")) return "vendors";
  if (p === "/") return "vendors";
  return "vendors";
}
export function Navbar({
  settings,
  isAuthenticated,
  userEmail,
  navTone = "default",
  theme = "default",
}: {
  settings?: LandingPageSettings;
  isAuthenticated: boolean;
  userEmail?: string;
  /** Dark blue header + light links for marketing pages */
  navTone?: "default" | "softBlue";
  /** Bulqit-style: logo left, centered audience links, mint-friendly bar */
  theme?: "default" | "bulkMarketing";
}) {
  const blue = navTone === "softBlue" && theme !== "bulkMarketing";
  const bulk = theme === "bulkMarketing";
  const router = useRouter();
  const pathname = usePathname();
  const bulkActiveId = bulkNavActiveId(pathname);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "HI";
  const truncatedEmail = userEmail ? (userEmail.length > 18 ? userEmail.slice(0, 18) + "…" : userEmail) : "";
  const { src: logoSrc, label: brandLabel } = brandLogoFromSettings(settings, blue ? "lightFirst" : "darkFirst");

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

  const servicesItems = [
    { name: "Scheduling", href: "/features#scheduling" },
    { name: "Invoicing", href: "/features#invoicing" },
    { name: "CRM", href: "/features#crm" },
    { name: "Payments", href: "/features#payments" },
    { name: "Client Portal", href: "/features#portal" },
  ];
  const featuresItems = [
    { name: "Smart Scheduling", href: "/features#scheduling" },
    { name: "Automated Invoicing", href: "/features#invoicing" },
    { name: "Customer Communication", href: "/features#communication" },
    { name: "Team Management", href: "/features#team" },
    { name: "Route Optimization", href: "/features#routing" },
    { name: "Analytics & Reporting", href: "/features#analytics" },
  ];

  if (bulk) {
    return (
      <nav className="sticky top-0 z-50 border-b border-slate-200/90 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div
          className="relative mx-auto flex min-h-[4.25rem] max-w-[1400px] items-center px-5 py-3 sm:min-h-[5rem] sm:px-10 sm:py-3.5 lg:px-14"
          style={{ color: BULK_NAVY }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-black/[0.04] md:hidden"
                  style={{ color: BULK_NAVY }}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(100vw-2rem,320px)]">
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1 text-sm" aria-label="Mobile">
                  {BULK_NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "rounded-lg px-3 py-2.5 font-medium",
                        bulkActiveId === item.id ? "bg-[#E8F5F1] text-[#1A2B3C]" : "text-[#1A2B3C]/90 hover:bg-[#F5F7FA]",
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href="/industries#stories"
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-white"
                    style={{ backgroundColor: BULK_HEADER_CTA_TEAL }}
                    onClick={() => setMobileOpen(false)}
                  >
                    Find your block
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white">
                      <ChevronRight className="h-3.5 w-3.5 text-[#1A2B3C]" strokeWidth={2.5} />
                    </span>
                  </Link>
                  <Link
                    href="/login"
                    className="mt-2 rounded-lg px-3 py-2.5 text-center text-sm font-semibold text-[#1A2B3C]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Login
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2.5 text-[#1A2B3C]"
              style={{ color: BULK_NAVY }}
            >
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={brandLabel}
                  className="h-8 w-auto max-h-9 max-w-[220px] object-contain object-left sm:h-9 sm:max-h-10 sm:max-w-[260px]"
                  loading="eager"
                />
              ) : (
                <>
                  <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0 text-[#1A2B3C] sm:h-8 sm:w-8" aria-hidden>
                    <path d="M28 4L4 14l9 4 2 9 4-7 9-16z" opacity="0.9" fill="currentColor" />
                    <path d="M13 18l4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                  <span className="truncate text-lg font-bold tracking-tight sm:text-[1.15rem]">{brandLabel}</span>
                </>
              )}
            </Link>
          </div>
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
            <div className="flex items-center gap-10 lg:gap-12">
              {BULK_NAV.map((item) => {
                const active = bulkActiveId === item.id;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "border-b-2 border-transparent pb-1 text-sm transition-colors",
                      active
                        ? "border-[#1A2B3C] font-semibold text-[#1A2B3C]"
                        : "font-medium text-[#1A2B3C]/80 hover:border-[#1A2B3C]/20 hover:text-[#1A2B3C]",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
            {!isAuthenticated ? (
              <Link
                href="/login"
                className="hidden shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-[#1A2B3C]/90 transition-colors hover:bg-black/[0.04] hover:text-[#1A2B3C] md:inline-flex"
              >
                Login
              </Link>
            ) : null}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={loggingOut}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-[#1A2B3C] shadow-sm outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#40a99b]/35 disabled:opacity-60"
                    aria-label="Account menu"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#40a99b] text-xs font-semibold text-white">
                      {initials}
                    </span>
                    <span className="hidden max-w-[140px] truncate text-[#1A2B3C]/80 sm:inline">{truncatedEmail}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#1A2B3C]/45" />
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
            ) : (
              <Link
                href="/industries#stories"
                className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-sm transition hover:opacity-95 sm:px-7 sm:py-3 sm:text-xs"
                style={{ backgroundColor: BULK_HEADER_CTA_TEAL }}
              >
                Find your block
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white">
                  <ChevronRight className="h-4 w-4 text-[#1A2B3C]" strokeWidth={2.5} />
                </span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur",
        blue
          ? "border-white/15 bg-[#0A66C2]/95 text-white shadow-sm supports-[backdrop-filter]:bg-[#0A66C2]/88"
          : "border-border bg-background/95 supports-[backdrop-filter]:bg-background/80",
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md md:hidden",
                  blue ? "text-white hover:bg-white/10" : "text-foreground hover:bg-accent",
                )}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100vw-2rem,320px)]">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1 text-sm" aria-label="Mobile">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Services</div>
                {servicesItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-foreground hover:bg-accent"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Features</div>
                {featuresItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-foreground hover:bg-accent"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <Link
                  href="/pricing"
                  className="mt-4 rounded-lg px-3 py-2 font-medium text-foreground hover:bg-accent"
                  onClick={() => setMobileOpen(false)}
                >
                  Pricing
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          <Link
            href="/"
            className={cn(
              "flex min-w-0 max-w-[min(100%,220px)] items-center gap-2 sm:max-w-[280px]",
              blue ? "text-white" : "text-primary",
            )}
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={brandLabel}
                className="h-7 w-auto max-h-8 max-w-full object-contain object-left sm:h-9 sm:max-h-10"
                loading="eager"
              />
            ) : (
              <>
                <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0 fill-current sm:h-8 sm:w-8" aria-hidden="true">
                  <path d="M28 4L4 14l9 4 2 9 4-7 9-16z" opacity="0.9" />
                  <path
                    d="M13 18l4-4"
                    className={blue ? "stroke-white" : "stroke-background"}
                    strokeWidth="1.5"
                    fill="none"
                  />
                </svg>
                <span
                  className={cn(
                    "truncate text-base font-bold tracking-tight sm:text-lg",
                    blue ? "text-white" : "text-primary",
                  )}
                >
                  {brandLabel}
                </span>
              </>
            )}
          </Link>
        </div>
        <div className="hidden items-center gap-4 lg:gap-6 md:flex">
          <NavDropdown label="Services" items={servicesItems} navTone={navTone} />
          <NavDropdown label="Features" items={featuresItems} navTone={navTone} />
          <Link
            href="/pricing"
            className={cn(
              "text-sm font-medium transition-colors",
              blue ? "text-white/90 hover:text-white" : "text-foreground/80 hover:text-foreground",
            )}
          >
            Pricing
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={loggingOut}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60",
                    blue
                      ? "border-white/25 bg-white/10 text-white hover:bg-white/15"
                      : "border-border bg-card hover:bg-accent",
                  )}
                  aria-label="Account menu"
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      blue ? "bg-white text-[#0A66C2]" : "bg-primary text-primary-foreground",
                    )}
                  >
                    {initials}
                  </span>
                  <span
                    className={cn("hidden max-w-[140px] truncate sm:inline", blue ? "text-white/90" : "text-muted-foreground")}
                  >
                    {truncatedEmail}
                  </span>
                  <ChevronDown className={cn("h-3.5 w-3.5 shrink-0", blue ? "text-white/80" : "text-muted-foreground")} />
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
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium transition-colors sm:text-sm",
                  blue ? "text-white/90 hover:text-white" : "text-foreground/80 hover:text-foreground",
                )}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors sm:px-4 sm:py-2 sm:text-sm",
                  blue
                    ? "bg-[#1877F2] text-white hover:bg-[#1DA1F2]"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

const HERO_MINT = "#e6f4ef";
const HERO_CREAM = "#f7f3eb";

/**
 * Hero background video (Bulqit-style). `.woff2` is a **font** — it cannot be used as video.
 * Use a real `.mp4` / `.webm` (or hosted URL):
 * 1. Drop file at `nextjs/public/marketing/bulqit-hero-bg.mp4` (auto-tried), and/or
 * 2. Set `NEXT_PUBLIC_BULQIT_HERO_VIDEO` in `.env.local` to `/marketing/your-file.mp4` or `https://...`
 */
function bulqitHeroVideoCandidates(): string[] {
  const env = (process.env.NEXT_PUBLIC_BULQIT_HERO_VIDEO ?? "").trim();
  const local = "/marketing/bulqit-hero-bg.mp4";
  const list: string[] = [];
  if (env) list.push(env);
  if (!list.includes(local)) list.push(local);
  return list;
}

/**
 * “Setting up is simple” gray band — same video sources as hero, plus optional
 * `NEXT_PUBLIC_BULQIT_STEPS_PANEL_VIDEO` and `/marketing/bulqit-steps-bg.mp4`.
 */
function bulqitStepsPanelVideoCandidates(): string[] {
  const stepsEnv = (process.env.NEXT_PUBLIC_BULQIT_STEPS_PANEL_VIDEO ?? "").trim();
  const list: string[] = [];
  if (stepsEnv) list.push(stepsEnv);
  const stepsLocal = "/marketing/bulqit-steps-bg.mp4";
  if (!list.includes(stepsLocal)) list.push(stepsLocal);
  for (const u of bulqitHeroVideoCandidates()) {
    if (u && !list.includes(u)) list.push(u);
  }
  return list;
}

const STEPS_PANEL_GRID: CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, rgba(26,43,60,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,43,60,0.06) 1px, transparent 1px)",
  backgroundSize: "26px 26px",
};

function SimpleStepsMediaBackdrop() {
  const candidates = useMemo(() => bulqitStepsPanelVideoCandidates(), []);
  const [srcIndex, setSrcIndex] = useState(0);
  const [videoDisabled, setVideoDisabled] = useState(false);

  const src = candidates[srcIndex];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {!videoDisabled && src ? (
        <video
          key={src}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          src={src}
          onError={() => {
            if (srcIndex < candidates.length - 1) setSrcIndex((i) => i + 1);
            else setVideoDisabled(true);
          }}
          aria-hidden
          title=""
        />
      ) : null}
      <div
        className={cn(
          "absolute inset-0",
          videoDisabled || !src ? "bg-[#e8ecef]" : "bg-gradient-to-b from-[#e8ecef]/92 via-[#e8ecef]/72 to-[#dce1e6]/94",
        )}
      />
      <div className="absolute inset-0 opacity-[0.38]" style={STEPS_PANEL_GRID} />
    </div>
  );
}

function VendorHeroStaticSplitBg() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ backgroundColor: HERO_CREAM }} />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 640" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fill={HERO_MINT}
          d="M0,0 L0,640 L520,640 Q 620 520 680 400 Q 740 260 820 200 Q 900 120 1000 80 Q 1120 40 1280 20 Q 1360 10 1440 0 Z"
        />
      </svg>
    </div>
  );
}

function VendorHeroMediaBackground() {
  const candidates = useMemo(() => bulqitHeroVideoCandidates(), []);
  const [srcIndex, setSrcIndex] = useState(0);
  const [useStatic, setUseStatic] = useState(false);

  const src = candidates[srcIndex];

  if (useStatic || !src) {
    return <VendorHeroStaticSplitBg />;
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <video
        key={src}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        src={src}
        onError={() => {
          if (srcIndex < candidates.length - 1) setSrcIndex((i) => i + 1);
          else setUseStatic(true);
        }}
        aria-hidden
        title=""
      />
      {/* Soft wash so hero copy stays readable (mint/cream feel over footage). */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#e6f4ef]/90 via-white/55 to-[#f7f3eb]/88" />
      {/* Light grid (Bulqit reference) */}
      <div
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(26,43,60,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,43,60,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
}

function WaveformBars({ className }: { className?: string }) {
  const heights = [4, 10, 6, 14, 8, 12, 5, 11, 7, 9];
  return (
    <div className={cn("flex items-end gap-0.5", className)} aria-hidden>
      {heights.map((h, i) => (
        <span key={i} className="w-0.5 rounded-full bg-white/90" style={{ height: h }} />
      ))}
    </div>
  );
}

function VendorRouteMap() {
  const road = "#f5b347";
  const route = "#22c55e";
  return (
    <div className="relative mx-auto w-full max-w-[520px] lg:max-w-[560px]">
      <svg viewBox="0 0 420 360" className="h-auto w-full drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M20 280 L120 260 L200 200 L280 140 L360 100" stroke={road} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        <path d="M40 100 L160 120 L260 200" stroke={road} strokeWidth="8" strokeLinecap="round" opacity="0.7" />
        <rect x="95" y="95" width="210" height="190" rx="18" stroke="#94a3b8" strokeWidth="2" strokeDasharray="8 6" fill="rgba(255,255,255,0.35)" />
        <path
          d="M130 240 L175 215 L220 200 L265 175 L310 155 L340 138"
          stroke={route}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {[
          { x: 140, y: 230 },
          { x: 185, y: 205 },
          { x: 230, y: 192 },
          { x: 275, y: 168 },
        ].map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y})`}>
            <rect x="-8" y="-6" width="16" height="14" rx="2" fill="#e2e8f0" stroke="#cbd5e1" />
            <path d="M0 -10 L-6 -4 H6 Z" fill="#fb923c" />
          </g>
        ))}
        <g transform="translate(318 118)">
          <rect x="-24" y="-16" width="48" height="32" rx="16" fill="#22c55e" />
          <circle cx="0" cy="-4" r="5" fill="none" stroke="white" strokeWidth="1.5" />
          <path d="M0 -4 V0" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <text x="0" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="system-ui, sans-serif">
            8 MIN
          </text>
        </g>
        <g transform="translate(332 128)">
          <rect x="-14" y="-10" width="36" height="22" rx="4" fill="#1e293b" />
          <path d="M-6 2 H10 M2 -4 V8" stroke="white" strokeWidth="2" />
        </g>
        <g transform="translate(348 108)">
          <rect x="-18" y="-28" width="36" height="40" rx="3" fill="#1A2B3C" />
          <path d="M0 -32 L-14 -22 H14 Z" fill="#334155" />
        </g>
      </svg>
      <div className="absolute bottom-6 right-4 flex items-center gap-2 rounded-full bg-white/90 p-1 shadow-md ring-1 ring-black/[0.06]">
        <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold tracking-wide text-[#1A2B3C] shadow-sm">YOU TODAY</span>
        <span className="rounded-full bg-[#1A2B3C] px-3 py-1.5 text-[10px] font-bold tracking-wide text-white">YOU TOMORROW</span>
      </div>
    </div>
  );
}

function BulqitHero() {
  return (
    <section className="relative flex min-h-[calc(100svh-4.25rem)] flex-col overflow-hidden sm:min-h-[calc(100svh-5rem)]">
      <VendorHeroMediaBackground />
      <div
        className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-12 px-4 py-10 pb-16 sm:px-6 sm:py-12 sm:pb-20 lg:flex-row lg:items-center lg:gap-16 lg:px-10"
        style={{ color: BULK_NAVY }}
      >
        <div className="min-w-0 flex-1 lg:max-w-xl">
          <h1 className="text-balance text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl md:text-[2.65rem] md:leading-[1.1]">
            Your next 25 customers live on the same street.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#1A2B3C]/75 sm:text-lg">
            We deliver the jobs. You deliver the work. Simple as that.
          </p>
          <VendorHeroPlacesSearch className="mt-9 max-w-xl" />
          <div className="mt-5 flex max-w-xl overflow-hidden rounded-full border border-black/[0.05] bg-[#cfe9de]/65 shadow-sm backdrop-blur-[2px]">
            <div className="flex flex-1 items-center px-4 py-2.5 sm:py-3">
              <span className="text-sm font-semibold text-[#1A2B3C]">What&apos;s a Bulqit Block?</span>
            </div>
            <div className="flex min-w-0 flex-[1.1] items-center gap-2 rounded-full bg-[#1A2B3C] px-3 py-2 sm:px-4">
              <Play className="h-4 w-4 shrink-0 fill-white text-white" aria-hidden />
              <WaveformBars className="flex h-4 max-w-[100px] flex-1 opacity-90" />
              <span className="ml-auto shrink-0 text-xs font-semibold tabular-nums text-white">0:53</span>
            </div>
          </div>
        </div>
        <div className="relative flex flex-1 justify-center lg:justify-end">
          <VendorRouteMap />
        </div>
      </div>
    </section>
  );
}

const DISPUTE_TABS = [
  { id: "t1", label: "All-In-One System" },
  { id: "t2", label: "1-Click Import & Disputes" },
  { id: "t3", label: "Automated Emails" },
  { id: "t4", label: "Mobile Apps & SMS" },
  { id: "t5", label: "Client Portal" },
] as const;

const PORTAL_FEATURES = [
  "Provide Branded Customer Access",
  "Required Documents Checklist",
  "Add Your Custom Resources",
  "Digital Client Agreement Signature",
  "Tablet and Mobile Friendly",
] as const;

function ScoreRing({ value, tone }: { value: string; tone: "a" | "b" }) {
  const stroke = tone === "a" ? LP.cyan : "#94a3b8";
  return (
    <div className="flex flex-col items-center">
      <svg width="56" height="56" viewBox="0 0 56 56" className="drop-shadow-sm" aria-hidden>
        <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle cx="28" cy="28" r="22" fill="none" stroke={stroke} strokeWidth="6" strokeDasharray="95 140" strokeLinecap="round" transform="rotate(-90 28 28)" />
      </svg>
      <span className="mt-1 text-xs font-bold text-[#2c3e50]">{value}</span>
    </div>
  );
}

function DisputeMockupStack() {
  const chrome = (
    <div className="flex items-center gap-1.5 border-b border-black/[0.06] bg-[#f8fafc] px-2.5 py-1.5">
      <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
      <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
      <span className="h-2 w-2 rounded-full bg-[#28c840]" />
      <span className="ml-1.5 truncate text-[10px] text-slate-400">app.disputeportal.com</span>
    </div>
  );
  return (
    <div className="relative mx-auto min-h-[340px] w-full max-w-[520px] lg:max-w-none">
      <div
        className="absolute left-0 top-10 z-0 w-[92%] overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_18px_40px_-12px_rgba(15,23,42,0.25)]"
        style={{ transform: "rotate(-1.5deg)" }}
      >
        {chrome}
        <div className="space-y-2 p-3">
          <div className="h-2 w-1/3 rounded bg-slate-200" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-20 rounded-lg bg-slate-100" />
            <div className="h-20 rounded-lg bg-[#e6f7fa]" />
            <div className="h-20 rounded-lg bg-slate-100" />
          </div>
          <div className="h-16 rounded-lg border border-dashed border-slate-200 bg-white" />
        </div>
      </div>
      <div
        className="absolute left-6 top-0 z-[1] w-[92%] overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_22px_50px_-12px_rgba(15,23,42,0.3)]"
        style={{ transform: "rotate(1deg)" }}
      >
        {chrome}
        <div className="grid grid-cols-4 gap-1.5 p-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-md bg-slate-100" />
          ))}
          <div className="col-span-4 h-24 rounded-lg bg-gradient-to-br from-[#e6f7fa] to-white" />
        </div>
      </div>
      <div
        className="absolute bottom-2 right-0 z-[2] w-[42%] max-w-[150px] overflow-hidden rounded-[1.5rem] border border-black/[0.1] bg-white p-2 shadow-[0_16px_40px_-8px_rgba(15,23,42,0.35)] sm:max-w-[170px]"
        style={{ transform: "rotate(4deg)" }}
      >
        <div className="flex items-center justify-between px-1 pt-0.5 text-[9px] text-slate-400">
          <span>9:41</span>
          <div className="h-1 w-8 rounded-full bg-slate-200" />
        </div>
        <div className="mt-2 flex justify-center gap-3 px-1 pb-2">
          <ScoreRing value="624" tone="a" />
          <ScoreRing value="561" tone="b" />
        </div>
      </div>
    </div>
  );
}

function DisputeAutomationSection() {
  const [tab, setTab] = useState(4);
  return (
    <section className="relative border-t border-black/[0.04] bg-white py-16 sm:py-24" style={{ color: LP.navy }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.35rem]">
            <span style={{ color: LP.navy }}>Dispute Automation That </span>
            <span style={{ color: LP.salmon }}>Works</span>
          </h2>
          <p className="mt-4 text-base text-slate-500 sm:text-lg">
            Save time and money by using the latest Credit Repair technology
          </p>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-2.5 sm:gap-3" role="tablist" aria-label="Product features">
          {DISPUTE_TABS.map((t, i) => {
            const active = tab === i;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(i)}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-left text-xs font-semibold transition sm:px-4 sm:text-sm",
                  active
                    ? "shadow-sm"
                    : "border-[#7dd3e8] bg-white text-[#2c3e50] hover:bg-slate-50",
                )}
                style={
                  active
                    ? { backgroundColor: LP.tabActiveBg, borderColor: LP.cyan, color: LP.navy }
                    : { borderColor: LP.cyanMuted }
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="mt-14 grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <DisputeMockupStack />
          <div>
            <h3 className="text-2xl font-bold" style={{ color: LP.navy }}>
              Branded Client Portal
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              Customize your Client Portal with your logo and branding colors!
            </p>
            <ul className="mt-6 space-y-3.5">
              {PORTAL_FEATURES.map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm text-[#2c3e50] sm:text-[15px]">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: LP.cyan }} aria-hidden strokeWidth={2.25} />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-base font-bold" style={{ color: LP.navy }}>
              Schedule a free system demo today!
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/signup"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
                style={{ backgroundColor: LP.salmon }}
              >
                <Calendar className="h-4 w-4 shrink-0 text-white" aria-hidden />
                Schedule Demo
              </Link>
              <Link
                href="/pricing"
                className="inline-flex flex-1 items-center justify-center rounded-full border-2 bg-white px-6 py-3 text-sm font-semibold transition hover:bg-slate-50"
                style={{ borderColor: LP.cyan, color: LP.cyan }}
              >
                Pricing & Options
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const TABLET_BULLETS_A = [
  "All Pages Optimized for Tablet",
  "99% of pages available on your PHONE",
  "Intelligently laid out compacted views",
  "Optimized framework for fast use",
] as const;

const TABLET_BULLETS_B = [
  "All Pages Optimized for Tablet",
  "99% of pages available on your PHONE",
  "Intelligently laid out compacted views",
  "Optimized framework for fast use",
  "Customer Portal also on Tablet & Phone",
  "Clients can upload photos of documents",
  "Clients Sign Agreements with their finger",
] as const;

function TabletDeviceMocks() {
  return (
    <div className="relative mx-auto flex min-h-[320px] max-w-[540px] items-center justify-center lg:max-w-none lg:justify-end">
      <div
        className="relative w-[min(100%,420px)] origin-bottom-right rounded-2xl border border-black/[0.08] bg-white p-3 shadow-[0_24px_60px_-16px_rgba(15,23,42,0.28)]"
        style={{ transform: "perspective(900px) rotateY(-12deg) rotateX(4deg) rotate(-2deg)" }}
      >
        <div className="mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="mt-3 h-32 rounded-lg bg-gradient-to-br from-rose-50 via-white to-slate-50">
          <div className="h-full w-full rounded-lg border border-slate-100 bg-[linear-gradient(105deg,transparent_40%,rgba(248,113,113,0.35)_40%,rgba(248,113,113,0.35)_42%,transparent_42%)]" />
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded bg-slate-100" />
          ))}
        </div>
      </div>
      <div
        className="absolute -bottom-4 right-4 w-[38%] max-w-[158px] rounded-[1.35rem] border border-black/[0.1] bg-white p-2 shadow-[0_18px_40px_-10px_rgba(15,23,42,0.35)]"
        style={{ transform: "perspective(700px) rotateY(8deg) rotate(6deg)" }}
      >
        <div className="flex justify-between px-0.5 pt-0.5 text-[8px] text-slate-400">
          <span>9:41</span>
          <div className="h-1 w-7 rounded-full bg-slate-200" />
        </div>
        <div className="mt-1.5 flex justify-center gap-2 pb-1">
          <ScoreRing value="624" tone="a" />
          <ScoreRing value="561" tone="b" />
        </div>
      </div>
    </div>
  );
}

function TabletMobileSection() {
  return (
    <section className="relative bg-white pb-8 pt-16 sm:pb-12 sm:pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              <span style={{ color: LP.navy }}>Tablet & Yes, </span>
              <span style={{ color: LP.salmon }}>Mobile!</span>
            </h2>
            <p className="mt-3 text-base font-medium sm:text-lg" style={{ color: LP.cyan }}>
              Run your Credit Repair business from your cell phone
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              We think its pretty important to be able to access all your clients and tools while on the go!
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-[#2c3e50] sm:text-[15px]">
              {TABLET_BULLETS_A.map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: LP.cyan }} aria-hidden strokeWidth={2.25} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <TabletDeviceMocks />
        </div>

        <div className="mt-16 border-t border-slate-200 pt-12">
          <ul className="mx-auto max-w-3xl space-y-2.5 text-sm text-[#2c3e50] sm:text-[15px]">
            {TABLET_BULLETS_B.map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: LP.cyan }} aria-hidden strokeWidth={2.25} />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-center text-base font-bold sm:text-lg" style={{ color: LP.navy }}>
            Have Questions? Give us a Call!
          </p>
          <div className="mx-auto mt-6 flex max-w-lg flex-col justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/features"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#ef4444] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#dc2626]"
            >
              <Tv className="h-4 w-4 shrink-0" aria-hidden />
              Watch the Demo
            </Link>
            <Link
              href="/pricing"
              className="inline-flex flex-1 items-center justify-center rounded-full border-2 bg-white px-6 py-3 text-sm font-semibold transition hover:bg-slate-50"
              style={{ borderColor: LP.cyan, color: LP.cyan }}
            >
              Pricing & Options
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const SPOTLIGHT_CARD_COPY: { title: string; body: string }[] = [
  {
    title: "Lawn Care",
    body: "Regular mowing, edging, trimming, blowing, and basic lawn maintenance across your entire property",
  },
  {
    title: "Pool Maintenance",
    body: "Regular pool and spa cleaning, chemical balancing, and basic equipment inspection",
  },
  {
    title: "Pest Control",
    body: "Exterior pest treatment and prevention for ants, spiders, and common outdoor insects",
  },
  {
    title: "Outdoor Cleaning",
    body: "Light cleaning and detailing of first floor patios, outdoor kitchens, and furnishings in your yard",
  },
  {
    title: "Window Cleaning",
    body: "Exterior window washing, frame wipe-down, and streak-free finish",
  },
  {
    title: "Trash Bin Cleaning",
    body: "Trash, recycling, and green waste bin cleaning, exterior wash, and odor reduction",
  },
];

const SPOTLIGHT_GRID_CARDS = [...SPOTLIGHT_CARD_COPY, ...SPOTLIGHT_CARD_COPY, ...SPOTLIGHT_CARD_COPY.slice(0, 3)];

const BULK_STEP_TEAL = STEPS_FORM_TEAL;

type BulkServiceDef = { id: string; title: string; Icon: typeof Leaf };

const BULK_STEP_SERVICES: BulkServiceDef[] = [
  { id: "lawn", title: "Lawn Care", Icon: Leaf },
  { id: "pest", title: "Pest Control", Icon: Bug },
  { id: "pool", title: "Pool Maintenance", Icon: Waves },
];

type BulkVendorDef = {
  id: string;
  name: string;
  initials: string;
  rating: string;
  status: "bidder" | "selected";
  avatar: string;
};

const BULK_STEP_VENDORS: BulkVendorDef[] = [
  { id: "v1", name: "Green Thumb Co.", initials: "GT", rating: "4.2", status: "bidder", avatar: "from-emerald-500 to-teal-600" },
  { id: "v2", name: "Neighborhood Pros", initials: "NP", rating: "4.6", status: "bidder", avatar: "from-sky-500 to-blue-600" },
  { id: "v3", name: "Emerald City Lawn Co", initials: "EC", rating: "4.0", status: "selected", avatar: "from-lime-500 to-emerald-600" },
  { id: "v4", name: "Sunrise Services", initials: "SS", rating: "4.8", status: "bidder", avatar: "from-amber-400 to-orange-500" },
];

function BulkStepServicesPanel({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
      {BULK_STEP_SERVICES.map((svc) => {
        const on = selected.has(svc.id);
        const Icon = svc.Icon;
        return (
          <button
            key={svc.id}
            type="button"
            onClick={() => onToggle(svc.id)}
            className={cn(
              "relative flex min-h-[220px] flex-col rounded-2xl border bg-white p-5 text-left shadow-[0_4px_24px_-6px_rgba(15,23,42,0.12)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-h-[240px] sm:p-6",
              on ? "border-2 shadow-[0_8px_28px_-8px_rgba(56,161,140,0.35)]" : "border-slate-200/90 hover:border-slate-300",
            )}
            style={on ? { borderColor: BULK_STEP_TEAL } : undefined}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-inner sm:h-14 sm:w-14"
              style={{ backgroundColor: BULK_STEP_TEAL }}
            >
              <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} aria-hidden />
            </div>
            <div className="mt-auto pt-10">
              <div className="text-lg font-bold text-[#1a1a1a] sm:text-xl">{svc.title}</div>
            </div>
            <div className="absolute right-4 top-4 sm:right-5 sm:top-5">
              {on ? (
                <div className="relative">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white sm:text-[11px]"
                    style={{ backgroundColor: "#22c55e" }}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                    I&apos;M INTERESTED
                  </span>
                  <span
                    className="absolute -bottom-5 right-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                    style={{ backgroundColor: BULK_STEP_TEAL }}
                  >
                    You
                  </span>
                </div>
              ) : (
                <span className="text-[11px] font-semibold tracking-wide text-slate-500 sm:text-xs">
                  SELECT <Plus className="ml-0.5 inline h-3.5 w-3.5 align-text-bottom" strokeWidth={2.5} aria-hidden />
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function BulkStepVendorsPanel() {
  return (
    <div className="relative mx-auto max-w-7xl pt-6">
      <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 py-2 text-xs font-bold tracking-wide text-[#1a1a1a] shadow-md sm:text-sm">
          <Sparkles className="h-4 w-4 shrink-0" style={{ color: BULK_STEP_TEAL }} aria-hidden />
          Bulqit Selects
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {BULK_STEP_VENDORS.map((v) => {
          const sel = v.status === "selected";
          return (
            <div
              key={v.id}
              className={cn(
                "relative flex flex-col rounded-2xl border p-5 shadow-sm sm:p-6",
                sel ? "border-2 bg-[#ecf8f5]" : "border-slate-200/90 bg-white",
              )}
              style={sel ? { borderColor: BULK_STEP_TEAL } : undefined}
            >
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-inner",
                  v.avatar,
                )}
              >
                {v.initials}
              </div>
              <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">Vendor</p>
              <p className="mt-1 text-base font-bold text-[#1a1a1a]">{v.name}</p>
              <p className="mt-2 flex items-center gap-1 text-sm text-slate-600">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                <span>({v.rating})</span>
              </p>
              <div className="mt-6">
                {sel ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white sm:text-[11px]"
                    style={{ backgroundColor: BULK_STEP_TEAL }}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                    SELECTED VENDOR
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-slate-200/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 sm:text-[11px]">
                    BIDDER
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BulkStepBlockActivatedPanel() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="relative overflow-hidden rounded-3xl border border-teal-100/80 bg-gradient-to-b from-[#f0faf7] via-[#e8f6f2] to-[#dff3ec] px-6 py-12 sm:px-10 sm:py-16 md:py-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-xs font-bold tracking-wide text-[#1A2B3C] shadow-sm sm:text-sm"
            style={{ boxShadow: "0 8px 30px -8px rgba(56,161,140,0.35)" }}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#1A2B3C] text-[10px] font-black text-white">b</span>
            bulqit BLOCK ACTIVATED
          </div>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-[#1A2B3C]/75 sm:text-base">
            Your neighbors are synced, your vendor is lined up, and recurring visits stay on autopilot.
          </p>
        </div>

        <div className="relative mx-auto mt-10 h-[min(52vw,320px)] max-w-2xl sm:h-[340px] md:mt-12 md:h-[380px]" aria-hidden>
          <div className="absolute inset-x-[8%] bottom-[18%] top-[28%] rounded-2xl bg-gradient-to-b from-emerald-100/90 to-emerald-200/60 shadow-inner ring-1 ring-emerald-900/10" />
          <div className="absolute bottom-[22%] left-[12%] flex h-16 w-14 flex-col items-center justify-end rounded-lg bg-white/95 pb-1 shadow-md ring-1 ring-black/[0.06] sm:h-20 sm:w-16">
            <div className="mb-1 h-5 w-8 rounded-sm bg-slate-300/80" />
            <div className="h-2 w-10 rounded-full bg-slate-200" />
          </div>
          <div className="absolute bottom-[24%] left-[32%] flex h-20 w-16 flex-col items-center justify-end rounded-lg bg-white shadow-md ring-1 ring-black/[0.06] sm:h-24 sm:w-[4.25rem]">
            <div className="mb-1 h-6 w-10 rounded-sm bg-emerald-200/90" />
            <div className="h-2 w-11 rounded-full bg-slate-200" />
          </div>
          <div className="absolute bottom-[20%] right-[18%] flex h-[4.5rem] w-16 flex-col items-center justify-end rounded-lg bg-white/95 pb-1 shadow-md ring-1 ring-black/[0.06] sm:h-[5.25rem] sm:w-[4.5rem]">
            <div className="mb-1 h-6 w-10 rounded-sm bg-sky-200/90" />
            <div className="h-2 w-11 rounded-full bg-slate-200" />
          </div>
          <div
            className="absolute left-[46%] top-[22%] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold text-white shadow-lg sm:text-xs"
            style={{ backgroundColor: BULK_STEP_TEAL }}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
            bulqit
          </div>
          <div className="absolute right-[14%] top-[32%] rounded-lg border border-white/90 bg-white px-2 py-1.5 text-[9px] font-semibold text-[#1A2B3C] shadow-md sm:text-[10px]">
            Lawn Care <span className="text-slate-400">$$$</span>
          </div>
          <div className="absolute left-[20%] top-[38%] rounded-lg border border-white/90 bg-white px-2 py-1.5 text-[9px] font-semibold text-[#1A2B3C] shadow-md sm:text-[10px]">
            Lawn Care <span className="text-slate-400">$$$</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceSalmonGrid() {
  return (
    <section
      className="relative z-[1] -mt-10 overflow-hidden pt-16 sm:-mt-14 sm:pt-20"
      style={{
        backgroundColor: LP.coralGrid,
        clipPath: "polygon(0 48px, 100% 0, 100% 100%, 0 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute -right-24 top-1/4 h-[420px] w-[420px] rounded-full border border-white/[0.08] opacity-[0.12]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pb-20 lg:px-8">
        <h2 className="text-center text-2xl font-bold sm:text-3xl md:text-[1.75rem]">
          <span className="text-white">Credit Repair </span>
          <span style={{ color: LP.navyDeep }}>Features Spotlight</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/90 sm:text-base">
          A quick peek at what makes Bulqit amazing
        </p>
        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {SPOTLIGHT_GRID_CARDS.map((card, i) => (
            <li
              key={`${card.title}-${i}`}
              className="rounded-[1.35rem] bg-white p-8 text-left shadow-[0_4px_24px_-4px_rgba(15,23,42,0.12)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dcfce7]">
                <Sparkles className="h-5 w-5 text-[#166534]" aria-hidden strokeWidth={2} />
              </div>
              <div className="mt-5 text-lg font-bold" style={{ color: LP.navy }}>
                {card.title}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SimpleStepsSection() {
  const [activeStep, setActiveStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(() => new Set(["lawn"]));

  const toggleService = (id: string) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const steps = [
    {
      n: 1,
      title: "Find your Bulqit Block",
      desc: "Enter your street address to find your personalized experience.",
    },
    {
      n: 2,
      title: "Choose your services",
      desc: "Pick your desired home services such as lawn care, window washing, and more.",
    },
    {
      n: 3,
      title: "We find the best vendor",
      desc: "We vet dozens of vendors and pick one for your Bulqit Block.",
    },
    {
      n: 4,
      title: "Set it and forget it",
      desc: "Confirm your participation, select your preferences and sit back and relax.",
    },
  ] as const;

  const stepInk = "#1a1a1a";
  const stepMuted = "#6b7280";
  const stepMutedFaint = "#9ca3af";

  return (
    <section className="bg-white pb-16 pt-0 sm:pb-24">
      <div className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: stepInk }}>
            Setting up is simple.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base" style={{ color: stepMuted }}>
            Simple steps, recurring home services made easy.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-6xl sm:mt-14">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4 lg:gap-6">
            {steps.map((s) => {
              const active = activeStep === s.n;
              return (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => setActiveStep(s.n)}
                  className="w-full rounded-lg text-left transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38a18c]/35 focus-visible:ring-offset-2"
                >
                  <div className="mb-4 h-1 w-full rounded-full bg-slate-100 sm:mb-5">
                    {active ? <div className="h-full w-full rounded-full" style={{ backgroundColor: STEPS_FORM_TEAL }} /> : null}
                  </div>
                  <div
                    className={cn("inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white transition-all")}
                    style={{
                      backgroundColor: STEPS_FORM_TEAL,
                      opacity: active ? 1 : 0.38,
                      boxShadow: active ? "0 4px 14px rgba(56,161,140,0.35)" : undefined,
                    }}
                  >
                    {s.n}
                  </div>
                  <h3
                    className="mt-4 text-base font-bold leading-snug sm:mt-5"
                    style={{
                      color: active ? stepInk : stepMutedFaint,
                      opacity: active ? 1 : 0.72,
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="mt-2 text-sm leading-relaxed"
                    style={{
                      color: active ? stepMuted : stepMutedFaint,
                      opacity: active ? 1 : 0.65,
                    }}
                  >
                    {s.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative mt-12 sm:mt-14">
        <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-x-clip">
          {/* Same min-height for all four steps (Bulqit reference: tall gray band + vertically centered content). */}
          <div
            className={cn(
              "relative flex flex-col justify-center overflow-hidden border-y border-slate-200/70",
              "min-h-[520px] py-12 sm:min-h-[560px] sm:py-14 md:min-h-[620px] md:py-16 lg:min-h-[680px] lg:py-20",
            )}
          >
            <SimpleStepsMediaBackdrop />
            <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-10">
              {activeStep === 1 ? (
                <div className="mx-auto w-full max-w-5xl">
                  <SimpleStepsLeadForm />
                </div>
              ) : null}
              {activeStep === 2 ? (
                <BulkStepServicesPanel selected={selectedServices} onToggle={toggleService} />
              ) : null}
              {activeStep === 3 ? <BulkStepVendorsPanel /> : null}
              {activeStep === 4 ? <BulkStepBlockActivatedPanel /> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Local asset: `public/marketing/neighbors.png` (from workspace image when copied). */
const NEIGHBORS_HERO_IMAGE = "/marketing/neighbors.png";

type BulkCarouselSlide = {
  quote: string;
  author: string;
  role: string;
  image: string;
};

const BULK_CAROUSEL_SLIDES: BulkCarouselSlide[] = [
  {
    quote:
      "I don't have time to chase down lawn guys or reschedule missed appointments. Bulqit will handle it — same crew, same day, every time. It's one less thing on my plate.",
    author: "Ferdy S.",
    role: "Homeowner",
    image: "https://images.unsplash.com/photo-1476703993599-783dee7d4ea0?auto=format&fit=crop&w=1200&q=80",
  },
  {
    quote:
      "Paper Flight cut our admin time in half. We're booking more jobs and spending less time on paperwork.",
    author: "Sarah Chen",
    role: "Owner, Sparkle Clean Co.",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    quote:
      "I didn't realize how much time and money we could save by syncing up with our neighbors. We always shared vendors, but now we all get a better deal. It just makes sense.",
    author: "Samira R.",
    role: "Homeowner",
    image: NEIGHBORS_HERO_IMAGE,
  },
  {
    quote:
      "Our customers love the automatic reminders and easy online booking. We've reduced no-shows by 60%.",
    author: "Emily Rodriguez",
    role: "Founder, Pawfect Grooming",
    image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
  },
];

function TestimonialPhotoCard({
  slide,
  variant,
  onActivate,
}: {
  slide: BulkCarouselSlide;
  variant: "peek" | "center";
  onActivate?: () => void;
}) {
  const isPeek = variant === "peek";
  return (
    <button
      type="button"
      onClick={onActivate}
      className={cn(
        "group relative w-full overflow-hidden rounded-3xl border border-black/[0.07] text-left shadow-lg outline-none ring-0 transition duration-300 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
        isPeek
          ? "h-[240px] shadow-[0_14px_36px_-12px_rgba(15,23,42,0.28)] sm:h-[270px] md:h-[300px] md:opacity-[0.9]"
          : "h-[320px] md:h-[400px] shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)]",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.image}
        alt=""
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]",
          isPeek && "md:brightness-[0.97]",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15",
          isPeek && "from-black/78 via-black/5 to-black/20",
        )}
      />
      {isPeek ? <div className="absolute inset-0 bg-black/20 backdrop-blur-[0.5px]" aria-hidden /> : null}
      <div className={cn("relative z-10 flex h-full flex-col justify-end p-5 md:p-6", isPeek && "opacity-95")}>
        <p
          className={cn(
            "font-medium leading-relaxed text-white drop-shadow-sm",
            isPeek ? "line-clamp-4 text-[13px] leading-snug sm:text-sm md:text-[0.9375rem]" : "text-base sm:text-lg",
          )}
        >
          &ldquo;{slide.quote}&rdquo;
        </p>
        <p className={cn("mt-3 font-bold tracking-tight text-white", isPeek ? "text-xs sm:text-[13px]" : "text-sm")}>
          {slide.author}
        </p>
        <p className={cn("font-normal text-white/85", isPeek ? "text-[10px] sm:text-xs" : "text-xs")}>{slide.role}</p>
      </div>
    </button>
  );
}

function TestimonialsBulkSection() {
  const slides = BULK_CAROUSEL_SLIDES;
  const n = slides.length;
  const [active, setActive] = useState(0);
  const goPrev = () => setActive((i) => (i - 1 + n) % n);
  const goNext = () => setActive((i) => (i + 1) % n);
  const li = (active - 1 + n) % n;
  const ri = (active + 1) % n;
  const left = slides[li]!;
  const mid = slides[active]!;
  const right = slides[ri]!;

  /** Left-to-right read + bottom weight (Bulqit reference). */
  const centerOverlayStyle: CSSProperties = {
    background: `
      linear-gradient(90deg, rgba(26,43,60,0.88) 0%, rgba(26,43,60,0.5) 42%, rgba(26,43,60,0) 72%),
      linear-gradient(180deg, rgba(26,43,60,0) 35%, rgba(26,43,60,0.62) 100%)
    `,
  };

  return (
    <section id="stories" className="border-t border-slate-200/80 bg-white py-20 sm:py-24 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          className="text-balance text-center text-[1.625rem] font-bold leading-[1.15] tracking-tight sm:text-4xl md:text-[2.35rem]"
          style={{ color: BULK_NAVY }}
        >
          Why your neighbors love Bulqit
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm font-normal leading-relaxed text-slate-500 sm:mt-5 sm:text-[1.05rem]">
          Smart homeowners helped us reinvent the system from the ground up.
        </p>
      </div>

      <div className="relative mt-12 sm:mt-16">
        {/* Full viewport width — side columns flex so peek cards fill edge-to-edge (see Bulqit reference). */}
        <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-x-clip px-0">
          <div className="flex w-full items-stretch justify-center gap-2 md:items-center md:gap-3 lg:gap-4">
            <div className="hidden min-h-0 min-w-0 md:flex md:flex-1 md:justify-end">
              <TestimonialPhotoCard slide={left} variant="peek" onActivate={goPrev} />
            </div>

            <article className="relative z-[2] w-full min-w-0 shrink-0 px-3 sm:px-4 md:w-[min(760px,54vw)] md:max-w-[760px] md:flex-none md:-my-1 md:px-0">
              <div className="relative h-[min(92vw,380px)] min-h-[300px] overflow-hidden rounded-3xl border border-black/[0.08] shadow-[0_28px_80px_-18px_rgba(15,23,42,0.45)] sm:h-[400px] md:h-[420px] lg:h-[440px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mid.image} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
                <div className="absolute inset-0" style={centerOverlayStyle} />
                <div
                  className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#F5CC47] text-white shadow-md ring-2 ring-white/35 md:left-7 md:top-7 md:h-12 md:w-12"
                  aria-hidden
                >
                  <MessageCircle className="h-5 w-5 text-white md:h-[1.35rem] md:w-[1.35rem]" strokeWidth={2.25} />
                </div>
                <div className="relative z-10 flex h-full max-w-xl flex-col justify-end px-6 pb-8 pt-24 text-left text-white sm:px-8 sm:pb-9 md:pb-10">
                  <p className="text-base font-medium leading-relaxed sm:text-lg md:text-xl md:leading-snug">
                    &ldquo;{mid.quote}&rdquo;
                  </p>
                  <p className="mt-5 text-sm font-bold tracking-tight sm:text-base">{mid.author}</p>
                  <p className="mt-0.5 text-xs font-normal text-white/90 sm:text-sm">{mid.role}</p>
                </div>
              </div>
            </article>

            <div className="hidden min-h-0 min-w-0 md:flex md:flex-1 md:justify-start">
              <TestimonialPhotoCard slide={right} variant="peek" onActivate={goNext} />
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl items-center justify-center gap-4 px-4 sm:mt-12 sm:gap-5 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={goPrev}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <div className="flex items-center gap-2 sm:gap-2.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full transition-colors sm:h-2.5 sm:w-2.5",
                  i === active ? "bg-neutral-800" : "bg-neutral-300 hover:bg-neutral-400",
                )}
                aria-label={`Go to testimonial ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </section>
  );
}

function SectionWrapper({
  title,
  subtitle,
  children,
  variant = "default",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Blue gradient band + light headings (industry spotlight) */
  variant?: "default" | "spotlight";
}) {
  const spotlight = variant === "spotlight";
  return (
    <section
      className={cn(
        "py-12 sm:py-16",
        spotlight && "bg-gradient-to-br from-[#1877F2] via-[#1270d9] to-[#0A66C2]",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className={cn("mb-8 sm:mb-10", spotlight && "text-center sm:text-left")}>
          <h2 className={cn("text-2xl font-semibold tracking-tight sm:text-3xl", spotlight && "text-white")}>{title}</h2>
          {subtitle && (
            <p className={cn("mt-3 max-w-3xl text-sm sm:text-base", spotlight ? "text-blue-100" : "text-muted-foreground")}>
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

export function IndustryCard({
  slug,
  name,
  description,
  elevated,
}: {
  slug: string;
  name: string;
  description: string;
  /** White card on blue spotlight section */
  elevated?: boolean;
}) {
  return (
    <Link
      href={`/industries/${slug}`}
      className={cn(
        "group block rounded-2xl border p-6 shadow-sm transition hover:shadow-md",
        elevated
          ? "border-white/20 bg-white text-slate-900 hover:border-[#1877F2]/45"
          : "border-border bg-card text-foreground hover-elevate",
      )}
      data-testid={`card-industry-${slug}`}
    >
      <div className={cn("text-lg font-semibold", elevated ? "text-slate-900" : "text-foreground")}>{name}</div>
      <div className={cn("mt-2 text-sm", elevated ? "text-slate-600" : "text-muted-foreground")}>{description}</div>
      <div
        className="mt-4 text-sm font-semibold transition-opacity group-hover:opacity-90"
        style={{ color: LANDING_BRAND.accentGreen }}
      >
        View industry details →
      </div>
    </Link>
  );
}

/** Home shows a preview (6 per category); `/industries` passes a large max to list all. */
export function IndustriesSection({
  maxPerCategory = 6,
  spotlight = false,
}: { maxPerCategory?: number; spotlight?: boolean } = {}) {
  const blocks = CATEGORY_ORDER.map((cat) => {
    const label = industryCategories[cat];
    const items = industries.filter((ind) => ind.category === cat).slice(0, maxPerCategory);
    if (!items.length) return null;
    return (
      <div key={cat} className="mb-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h3 className={cn("text-xl font-semibold", spotlight ? "text-white" : "text-foreground")}>{label}</h3>
          <Link
            href="/industries"
            className={cn(
              "text-sm font-semibold transition-colors",
              spotlight ? "text-blue-100 hover:text-white" : "text-[#1FA97A] hover:opacity-90",
            )}
            data-testid={`link-category-${cat}`}
            style={!spotlight ? { color: LANDING_BRAND.accentGreen } : undefined}
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((ind) => (
            <IndustryCard
              key={ind.slug}
              slug={ind.slug}
              name={ind.name}
              description={ind.description}
              elevated={spotlight}
            />
          ))}
        </div>
      </div>
    );
  });

  return (
    <SectionWrapper
      title="Industries"
      subtitle="Choose a module (niche) and launch with industry-ready workflows and a custom website page."
      variant={spotlight ? "spotlight" : "default"}
    >
      {blocks}
    </SectionWrapper>
  );
}

export function FooterSection({
  settings,
  navTone = "default",
  footerLayout = "default",
}: {
  settings: LandingPageSettings;
  navTone?: "default" | "softBlue";
  /** Bulqit-style: footer navy, four columns + contact box + legal row */
  footerLayout?: "default" | "softBlue" | "bulk";
}) {
  const blue = navTone === "softBlue" && footerLayout !== "bulk";
  const bulk = footerLayout === "bulk";
  /** Dark footer / blue marketing bar: use light-mode logo first (Brand Settings). */
  const { src: logoSrc, label: brandLabel } = brandLogoFromSettings(settings, bulk || blue ? "lightFirst" : "darkFirst");
  const hasLightBrandLogo = Boolean(getAdminSetting(settings, "logo_light")?.trim());
  /** Dark-colored logo asset on dark footer — invert to read as white. */
  const footerLogoInvert = bulk && Boolean(logoSrc) && !hasLightBrandLogo;
  const footerLink = cn(
    "inline-block rounded px-1 py-0.5 transition-colors",
    blue ? "text-blue-100/90 hover:text-white" : "text-muted-foreground hover-elevate",
  );
  const heading = blue ? "text-white" : "text-foreground";
  const body = blue ? "text-blue-100/85" : "text-muted-foreground";
  const border = blue ? "border-white/15" : "border-border";

  if (bulk) {
    const footLink = "text-sm text-white/85 transition hover:text-white";
    return (
      <footer className="border-t border-white/10 text-white" style={{ backgroundColor: LP.footerBlue }}>
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-16 lg:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-3">
              <Link href="/" className="inline-flex max-w-full items-center gap-2 text-white">
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={brandLabel}
                    className={cn(
                      "h-10 w-auto max-w-[220px] object-contain object-left sm:h-11 sm:max-w-[260px]",
                      footerLogoInvert && "brightness-0 invert",
                    )}
                    loading="lazy"
                  />
                ) : (
                  <>
                    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0 text-white sm:h-9 sm:w-9" aria-hidden>
                      <path d="M28 4L4 14l9 4 2 9 4-7 9-16z" opacity="0.95" fill="currentColor" />
                      <path d="M13 18l4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                    <span className="truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">{brandLabel}</span>
                  </>
                )}
              </Link>
              <p className="mt-5 text-sm font-medium text-white/90">Connect with us</p>
              <div className="mt-3 flex flex-wrap gap-4">
                <a href="https://www.facebook.com" className="text-white transition hover:text-white/80" aria-label="Facebook">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="https://twitter.com" className="text-white transition hover:text-white/80" aria-label="X">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="https://www.instagram.com" className="text-white transition hover:text-white/80" aria-label="Instagram">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="https://www.youtube.com" className="text-white transition hover:text-white/80" aria-label="YouTube">
                  <Youtube className="h-5 w-5" />
                </a>
                <a href="https://www.linkedin.com" className="text-white transition hover:text-white/80" aria-label="LinkedIn">
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 lg:col-span-6">
              <div>
                <div className="text-sm font-bold text-white">Products</div>
                <ul className="mt-4 space-y-2.5">
                  {["View all", "CRM", "Instant Estimator", "Measurement Reports", "Proposals", "Payments & Invoicing"].map((label) => (
                    <li key={label}>
                      <span className={cn(footLink, "cursor-default inline-block")}>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-bold text-white">Help</div>
                <ul className="mt-4 space-y-2.5">
                  {["Help center", "Help articles", "Implementation", "FAQs", "Reviews", "Case studies"].map((label) => (
                    <li key={label}>
                      <span className={cn(footLink, "cursor-default inline-block")}>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-bold text-white">Grow</div>
                <ul className="mt-4 space-y-2.5">
                  {["Masterclasses", "Podcast", "Blog & press", "Product updates", "Events", "Roofr of the Month"].map((label) => (
                    <li key={label}>
                      <span className={cn(footLink, "cursor-default inline-block")}>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-bold text-white">Company</div>
                <ul className="mt-4 space-y-2.5">
                  {["About", "Partners", "Careers", "Reviews", "Case studies", "Press", "Brand kit"].map((label) => (
                    <li key={label}>
                      <span className={cn(footLink, "cursor-default inline-block")}>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-white/20 bg-[#0052c4]/80 p-6 shadow-lg backdrop-blur-sm">
                <div className="text-lg font-bold text-white">Talk to a human</div>
                <p className="mt-4 text-sm text-white/90">1 (844) 995-4087</p>
                <p className="mt-1 text-sm text-white/90">support@roofr.com</p>
                <p className="mt-3 text-xs text-white/70">Monday - Friday, 8am-8pm EST</p>
                <Link href="/signup" className="mt-4 inline-block text-sm font-semibold text-white underline-offset-4 hover:underline">
                  Connect with sales
                </Link>
                <button
                  type="button"
                  className="mt-4 w-full rounded-full bg-white px-4 py-3 text-sm font-bold shadow-md transition hover:bg-white/95"
                  style={{ color: LP.footerBlue }}
                >
                  Book a call
                </button>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-white/25 pt-8">
            <div className="flex flex-col flex-wrap items-center justify-center gap-3 text-center text-xs text-white/75 sm:flex-row sm:gap-2">
              <span className="cursor-pointer px-1 hover:text-white">Privacy</span>
              <span className="hidden text-white/40 sm:inline">|</span>
              <span className="cursor-pointer px-1 hover:text-white">Cookie management</span>
              <span className="hidden text-white/40 sm:inline">|</span>
              <span className="cursor-pointer px-1 hover:text-white">Terms & conditions</span>
              <span className="hidden text-white/40 sm:inline">|</span>
              <span className="cursor-pointer px-1 hover:text-white">Guaranteed delivery</span>
              <span className="hidden text-white/40 sm:inline">|</span>
              <span className="cursor-pointer px-1 hover:text-white">Contact sales</span>
            </div>
            <p className="mt-6 text-center text-xs text-white/55">
              © {new Date().getFullYear()} {brandLabel}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={cn("border-t", blue ? "border-white/10 bg-gradient-to-b from-[#0A66C2] to-[#084a96] text-white" : "border-border bg-background")}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Link href="/" className={cn("inline-flex max-w-full items-center gap-2", blue && "text-white")}>
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={brandLabel}
                  className="h-8 w-auto max-w-[200px] object-contain object-left"
                  loading="lazy"
                />
              ) : (
                <>
                  <img
                    src="/images/landing/icons/paper-flight-icon.png"
                    alt=""
                    className={cn("h-8 w-8 shrink-0", blue && "brightness-0 invert")}
                  />
                  <span className={cn("truncate text-lg font-bold", blue ? "text-white" : "text-primary")}>{brandLabel}</span>
                </>
              )}
            </Link>
            <p className={cn("mt-4 text-sm leading-relaxed", body)}>
              AI-powered automation for service businesses. Run your business on autopilot.
            </p>
          </div>
          <div>
            <div className={cn("text-sm font-semibold", heading)}>Product</div>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link href="/features" className={footerLink} data-testid="link-footer-features">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className={footerLink} data-testid="link-footer-pricing">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/industries" className={footerLink} data-testid="link-footer-industries">
                  Industries
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className={cn("text-sm font-semibold", heading)}>Company</div>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <span className={cn("cursor-default", body)}>About</span>
              </li>
              <li>
                <span className={cn("cursor-default", body)}>Careers</span>
              </li>
              <li>
                <span className={cn("cursor-default", body)}>Contact</span>
              </li>
            </ul>
          </div>
          <div>
            <div className={cn("text-sm font-semibold", heading)}>Legal</div>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <span className={cn("cursor-default", body)}>Privacy Policy</span>
              </li>
              <li>
                <span className={cn("cursor-default", body)}>Terms of Service</span>
              </li>
            </ul>
          </div>
        </div>
        <div className={cn("mt-12 border-t pt-8", border)}>
          <p className={cn("text-center text-xs", body)}>{new Date().getFullYear()} {brandLabel}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export function FeedbackTab() {
  return (
    <a
      href="#stories"
      className="fixed right-0 top-1/2 z-[70] hidden -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl bg-[#14b8a6] px-2.5 py-6 text-[11px] font-bold tracking-wide text-white shadow-lg transition hover:bg-[#0d9488] md:flex"
      style={{ writingMode: "vertical-rl" }}
    >
      <span className="rotate-180">Feedback?</span>
    </a>
  );
}

export default function LandingPage({
  settings,
}: {
  settings: LandingPageSettings & { is_authenticated?: boolean; user_email?: string };
}) {
  const isAuthenticated = settings?.is_authenticated ?? false;
  const userEmail = settings?.user_email;

  return (
    <div className="min-h-screen" style={{ backgroundColor: LANDING_BRAND.softPageBg }}>
      <Navbar
        settings={settings}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        theme="bulkMarketing"
      />
      <main>
        <BulqitHero />
        <DisputeAutomationSection />
        <TabletMobileSection />
        <ServiceSalmonGrid />
        <SimpleStepsSection />
        <TestimonialsBulkSection />
      </main>
      <FooterSection settings={settings} footerLayout="bulk" />
      <FeedbackTab />
    </div>
  );
}
