import Link from "next/link";
import { ChevronDown, LogIn, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
const logo = "/assets/paper-flight-logo.png";
import { FeaturesMegaMenu } from "./nav/FeaturesMegaMenu";
import { ResourcesMegaMenu } from "./nav/ResourcesMegaMenu";
import { MegaMenu } from "./nav/MegaMenu";
import { featureColumns } from "./nav/featuresData";
import { resourceColumns } from "./nav/resourcesData";
import { industryColumns } from "./nav/industriesData";
import { NavUser } from "./nav-user";

const navItems = [
  { label: "Features", hasMenu: true },
  { label: "Pricing", hasMenu: false },
  { label: "Resources", hasMenu: true },
  { label: "Industries", hasMenu: true },
];

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | {
      status: "authenticated";
      name: string;
      email: string;
      role: string;
      avatarUrl: string | null;
      canManageProfile: boolean;
      canSwitchCompany: boolean;
      marketplaceHref: string;
    };

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  const openMenu = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveMenu(label);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActiveMenu(null), 120);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActiveMenu(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j: {
        isAuthenticated?: boolean;
        name?: string;
        email?: string;
        role?: string;
        avatar?: string | null;
        canManageProfile?: boolean;
        canSwitchCompany?: boolean;
        marketplaceHref?: string;
      }) => {
        if (cancelled) return;
        if (j?.isAuthenticated && j.email) {
          setAuth({
            status: "authenticated",
            name: j.name?.trim() || j.email,
            email: j.email,
            role: j.role ?? "",
            avatarUrl: j.avatar ?? null,
            canManageProfile: Boolean(j.canManageProfile),
            canSwitchCompany: Boolean(j.canSwitchCompany),
            marketplaceHref: j.marketplaceHref || "/marketplace",
          });
        } else {
          setAuth({ status: "anonymous" });
        }
      })
      .catch(() => {
        if (!cancelled) setAuth({ status: "anonymous" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const renderAuthDesktop = () => {
    if (auth.status === "loading") {
      return <div aria-hidden className="h-9 w-32 rounded-full bg-muted/40 animate-pulse" />;
    }
    if (auth.status === "authenticated") {
      return (
        <NavUser
          user={{ name: auth.name, email: auth.email, role: auth.role, avatarUrl: auth.avatarUrl }}
          canManageProfile={auth.canManageProfile}
          canSwitchCompany={auth.canSwitchCompany}
          marketplaceHref={auth.marketplaceHref}
        />
      );
    }
    return (
      <>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
        >
          Login
          <LogIn className="h-4 w-4" aria-hidden />
        </Link>
        <button className="rounded-xl bg-cta px-5 py-2.5 text-sm font-semibold text-cta-foreground shadow-sm transition-all hover:brightness-105 hover:shadow-md">
          Start Free Trial
        </button>
      </>
    );
  };

  const renderAuthMobile = () => {
    if (auth.status === "loading") {
      return <div aria-hidden className="h-10 w-full rounded-xl bg-muted/40 animate-pulse" />;
    }
    if (auth.status === "authenticated") {
      return (
        <div className="flex items-center justify-center py-1">
          <NavUser
            user={{ name: auth.name, email: auth.email, role: auth.role, avatarUrl: auth.avatarUrl }}
            canManageProfile={auth.canManageProfile}
            canSwitchCompany={auth.canSwitchCompany}
            marketplaceHref={auth.marketplaceHref}
          />
        </div>
      );
    }
    return (
      <>
        <Link
          href="/login"
          className="flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-medium"
          onClick={() => setOpen(false)}
        >
          Login
        </Link>
        <button className="w-full rounded-xl bg-cta px-4 py-2.5 text-sm font-semibold text-cta-foreground">Start Free Trial</button>
      </>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Paper Flight home">
          <img src={logo} alt="Paper Flight" className="h-8 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = activeMenu === item.label;
            const className = `flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive ? "text-foreground" : "text-foreground/80 hover:bg-muted hover:text-foreground"
            }`;
            const inner = (
              <>
                <span className={isActive ? "border-b-2 border-cta pb-0.5" : ""}>{item.label}</span>
                {item.hasMenu && (
                  <ChevronDown className={`h-4 w-4 opacity-60 transition-transform ${isActive ? "rotate-180" : ""}`} />
                )}
              </>
            );
            if (!item.hasMenu && item.label === "Pricing") {
              return (
                <Link key={item.label} href="/pricing" className={className}>
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                onMouseEnter={() => item.hasMenu && openMenu(item.label)}
                onMouseLeave={scheduleClose}
                onClick={() => item.hasMenu && setActiveMenu(isActive ? null : item.label)}
                aria-expanded={isActive}
                className={className}
              >
                {inner}
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {renderAuthDesktop()}
          <button className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground shadow-sm transition-all hover:brightness-110">
            Demo / Support
          </button>
        </div>

        <button
          className="lg:hidden rounded-lg p-2 text-foreground hover:bg-muted"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Desktop mega menus */}
      {activeMenu === "Features" && (
        <div
          className="hidden lg:block absolute inset-x-0 top-full"
          onMouseEnter={() => openMenu("Features")}
          onMouseLeave={scheduleClose}
        >
          <FeaturesMegaMenu onClose={() => setActiveMenu(null)} />
        </div>
      )}
      {activeMenu === "Resources" && (
        <div
          className="hidden lg:block absolute inset-x-0 top-full"
          onMouseEnter={() => openMenu("Resources")}
          onMouseLeave={scheduleClose}
        >
          <ResourcesMegaMenu onClose={() => setActiveMenu(null)} />
        </div>
      )}
      {activeMenu === "Industries" && (
        <div
          className="hidden lg:block absolute inset-x-0 top-full"
          onMouseEnter={() => openMenu("Industries")}
          onMouseLeave={scheduleClose}
        >
          <MegaMenu
            columns={industryColumns}
            footerLabel="See All Industries"
            onClose={() => setActiveMenu(null)}
          />
        </div>
      )}

      {open && (
        <div className="lg:hidden border-t border-border bg-background px-6 py-4 space-y-1 max-h-[calc(100vh-5rem)] overflow-y-auto">
          {navItems.map((item) => (
            <details key={item.label} className="group">
              <summary className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted list-none">
                {item.label}
                {item.hasMenu && <ChevronDown className="h-4 w-4 opacity-60 transition-transform group-open:rotate-180" />}
              </summary>
              {(item.label === "Features" || item.label === "Resources" || item.label === "Industries") && (
                <div className="mt-2 space-y-5 pl-3">
                  {(item.label === "Features"
                    ? featureColumns
                    : item.label === "Resources"
                    ? resourceColumns
                    : industryColumns
                  ).map((col) => (
                    <div key={col.heading}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{col.heading}</p>
                      <ul className="space-y-2">
                        {col.items.map((it) => {
                          const Icon = it.icon;
                          return (
                            <li key={it.title}>
                              <a href="#" className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                                <Icon className="mt-0.5 h-4 w-4 text-ink" />
                                <span>
                                  <span className="block text-sm font-semibold">{it.title}</span>
                                  <span className="block text-xs text-muted-foreground">{it.description}</span>
                                </span>
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </details>
          ))}
          <div className="pt-3 mt-3 border-t border-border space-y-2">
            {renderAuthMobile()}
            <button className="w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-ink-foreground">Demo / Support</button>
          </div>
        </div>
      )}
    </header>
  );
}
