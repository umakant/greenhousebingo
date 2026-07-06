"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  Box,
  ChevronDown,
  Facebook,
  Globe,
  Headphones,
  Instagram,
  Search,
  ShieldCheck,
  ShoppingCart,
  Twitter,
  UserRound,
  Users,
  Youtube,
} from "lucide-react";

import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as React from "react";

type Props = {
  children: React.ReactNode;
  publicSettings: PublicStorefrontBrandSettings;
  /** Public website id — customer account + cart badge wiring. */
  websiteId?: string;
  /** Accessible page title (mirrors prior `PublishedPageChrome` behavior). */
  title: string;
  style?: CSSProperties;
  className?: string;
};

function SocialLinks({ className }: { className?: string }) {
  const icon = "inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-white/90 transition hover:bg-white/10";
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <a href="#" className={icon} aria-label="Facebook">
        <Facebook className="h-4 w-4" />
      </a>
      <a href="#" className={icon} aria-label="X">
        <Twitter className="h-4 w-4" />
      </a>
      <a href="#" className={icon} aria-label="Instagram">
        <Instagram className="h-4 w-4" />
      </a>
      <a href="#" className={icon} aria-label="YouTube">
        <Youtube className="h-4 w-4" />
      </a>
    </div>
  );
}

function ConceptAnnouncementBar({ message }: { message: string }) {
  return (
    <div className="bg-black text-[13px] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
        <SocialLinks className="hidden sm:flex" />
        <p className="flex flex-1 items-center justify-center gap-2 text-center font-medium sm:flex-none">
          <span aria-hidden className="hidden text-white/50 md:inline">
            ‹
          </span>
          <span>{message}</span>
          <span aria-hidden className="hidden text-white/50 md:inline">
            ›
          </span>
        </p>
        <div className="hidden items-center gap-3 md:flex">
          <Select defaultValue="en">
            <SelectTrigger className="h-8 min-w-[120px] border-white/20 bg-transparent text-xs text-white hover:bg-white/10">
              <Globe className="mr-1 h-3.5 w-3.5 shrink-0 opacity-80" />
              <SelectValue placeholder="English" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="usd">
            <SelectTrigger className="h-8 min-w-[140px] border-white/20 bg-transparent text-xs text-white hover:bg-white/10">
              <SelectValue placeholder="USD ($)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usd">USD ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function ConceptMainHeader({
  publicSettings,
  websiteId,
  brandPrimary,
}: {
  publicSettings: PublicStorefrontBrandSettings;
  websiteId?: string;
  brandPrimary: string;
}) {
  const [cartQty, setCartQty] = React.useState(0);
  const [accountHref, setAccountHref] = React.useState<string | null>(null);
  const [accountAria, setAccountAria] = React.useState("Account");

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/storefront/public/cart", { credentials: "include" });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          cart?: { lines?: { quantity: number }[] };
        };
        if (cancelled || !data?.ok || !data.cart?.lines) return;
        const n = data.cart.lines.reduce((s, l) => s + (l.quantity ?? 0), 0);
        setCartQty(n);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!websiteId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/storefront/public/account-nav", { credentials: "include" });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          href?: string | null;
          ariaLabel?: string | null;
        };
        if (cancelled || !data?.ok || !data.href?.trim()) return;
        setAccountHref(data.href.trim());
        if (data.ariaLabel?.trim()) setAccountAria(data.ariaLabel.trim());
      } catch {
        /* ignore */
      }
    };
    void load();
    const onSync = () => void load();
    window.addEventListener("pf:account:sync", onSync);
    return () => {
      cancelled = true;
      window.removeEventListener("pf:account:sync", onSync);
    };
  }, [websiteId]);

  const label = publicSettings.storeName?.trim() || "Store";
  const showTitleBlock = publicSettings.displaySiteTitleTagline !== false;
  const tagline = showTitleBlock ? publicSettings.siteTagline?.trim() ?? "" : "";
  const accountBase = websiteId ? true : null;

  const navLink = "text-[15px] font-medium text-neutral-800 transition hover:opacity-70";
  const iconBtn =
    "inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-900 transition hover:bg-neutral-100";

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 lg:gap-10">
        <Link href="/shop" className="flex min-w-0 shrink-0 items-center gap-2" aria-label={label}>
          {publicSettings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={publicSettings.logoUrl} alt="" className="h-10 w-auto max-w-[160px] object-contain" />
          ) : null}
          {(showTitleBlock || !publicSettings.logoUrl?.trim()) && (
            <span className="hidden min-w-0 flex-col leading-tight sm:flex">
              <span className="truncate font-semibold tracking-tight text-neutral-900">{label}</span>
              {tagline ? <span className="truncate text-xs font-normal text-neutral-500">{tagline}</span> : null}
            </span>
          )}
        </Link>

        <nav className="hidden flex-1 flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:flex xl:gap-x-8">
          <Link href="/shop" className={navLink}>
            Shop
          </Link>
          <Link href="/shop" className={navLink}>
            Collections
          </Link>
          <Link href="/shop/blog" className={navLink}>
            Explore
          </Link>
          <Link href="/shop/help" className={navLink}>
            Contact
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Link href="/shop" className={iconBtn} aria-label="Search">
            <Search className="h-5 w-5" />
          </Link>
          {accountBase ? (
            <Link
              href={accountHref ?? "/shop/account/login"}
              className={iconBtn}
              aria-label={accountAria}
              title={accountAria === "Log in" ? "Log in" : undefined}
            >
              <UserRound className="h-5 w-5" />
            </Link>
          ) : null}
          <Link href="/shop/cart" className={`relative ${iconBtn}`} aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
            {cartQty > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white" style={{ backgroundColor: brandPrimary }}>
                {cartQty > 99 ? "99+" : cartQty}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}

function ConceptFooterHighlights() {
  const items = [
    {
      icon: Headphones,
      title: "Customer service",
      body: "We are here to help — reach out any time with questions about your order.",
    },
    {
      icon: Box,
      title: "Fast shipping",
      body: "Reliable delivery so your favorites arrive fresh and on time.",
    },
    {
      icon: Users,
      title: "Refer a friend",
      body: "Share the love — invite friends and unlock rewards when they shop.",
    },
    {
      icon: ShieldCheck,
      title: "Secure payment",
      body: "Your payment details are processed securely at checkout.",
    },
  ];
  return (
    <section className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-neutral-200/80">
              <Icon className="h-6 w-6 text-[color:var(--sf-brand-primary)]" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-neutral-900">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConceptFooterMain({
  publicSettings,
  brandPrimary,
  brandAccent,
}: {
  publicSettings: PublicStorefrontBrandSettings;
  brandPrimary: string;
  brandAccent: string;
}) {
  const store = publicSettings.storeName?.trim() || "Store";
  const email = publicSettings.supportEmail?.trim();

  return (
    <section className="text-white" style={{ backgroundColor: brandPrimary }}>
      <div className="mx-auto max-w-7xl px-4 py-12 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            {publicSettings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicSettings.logoUrl} alt="" className="h-12 w-auto max-w-[200px] object-contain brightness-0 invert" />
            ) : (
              <p className="text-xl font-semibold">{store}</p>
            )}
            <div className="mt-8 space-y-2 text-sm text-white/85">
              {email ? (
                <p>
                  <a href={`mailto:${encodeURIComponent(email)}`} className="underline underline-offset-4 hover:text-white">
                    {email}
                  </a>
                </p>
              ) : (
                <p className="text-white/70">Questions? Visit our help center.</p>
              )}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:col-span-5">
            <div>
              <button type="button" className="flex w-full items-center justify-between text-left font-semibold lg:pointer-events-none lg:cursor-default">
                Collections
                <ChevronDown className="h-4 w-4 lg:hidden" />
              </button>
              <ul className="mt-4 space-y-2 text-sm text-white/85">
                <li>
                  <Link href="/shop" className="hover:text-white hover:underline">
                    All products
                  </Link>
                </li>
                <li>
                  <Link href="/shop/blog" className="hover:text-white hover:underline">
                    Stories &amp; flavors
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <button type="button" className="flex w-full items-center justify-between text-left font-semibold lg:pointer-events-none lg:cursor-default">
                Information
                <ChevronDown className="h-4 w-4 lg:hidden" />
              </button>
              <ul className="mt-4 space-y-2 text-sm text-white/85">
                <li>
                  <Link href="/shop/help" className="hover:text-white hover:underline">
                    Help center
                  </Link>
                </li>
                <li>
                  <Link href="/shop/cart" className="hover:text-white hover:underline">
                    Cart
                  </Link>
                </li>
                <li>
                  <Link href="/shop/checkout" className="hover:text-white hover:underline">
                    Checkout
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <p className="text-lg font-semibold leading-snug">Stay in the loop with our newsletter</p>
            <form
              className="relative mt-4"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <Input
                type="email"
                placeholder="Enter your email"
                className="h-12 border-white/25 bg-white/10 pr-14 text-white placeholder:text-white/50 focus-visible:ring-white/30"
                aria-label="Email for newsletter"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-10 w-10 rounded-full border-0 text-white shadow-md"
                style={{ backgroundColor: brandAccent }}
                aria-label="Subscribe"
              >
                <span aria-hidden className="text-lg leading-none">
                  →
                </span>
              </Button>
            </form>
            <SocialLinks className="mt-6" />
          </div>
        </div>
      </div>
      <ConceptFooterSubBar storeName={store} />
    </section>
  );
}

function ConceptFooterSubBar({ storeName }: { storeName: string }) {
  const year = new Date().getFullYear();
  return (
    <div className="border-t border-white/10 bg-black/20 text-white/90">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 text-xs text-white/80 md:flex-row md:items-center md:justify-between">
        <p>
          © {year} {storeName}. Powered by PaperFlight
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Select defaultValue="en">
            <SelectTrigger className="h-8 min-w-[110px] border-white/25 bg-white/10 text-xs text-white">
              <Globe className="mr-1 h-3.5 w-3.5" />
              <SelectValue placeholder="English" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="usd">
            <SelectTrigger className="h-8 min-w-[130px] border-white/25 bg-white/10 text-xs text-white">
              <SelectValue placeholder="USD ($)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usd">USD ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-[11px] tracking-wide text-white/70">Visa · Mastercard · Amex · PayPal · Apple Pay · Google Pay</p>
      </div>
    </div>
  );
}

/**
 * Concept-theme-style chrome for React storefront routes (product PDP, cart, checkout, CMS pages, customer account).
 */
export function ConceptStorefrontChrome({
  children,
  publicSettings,
  websiteId,
  title,
  style,
  className,
}: Props) {
  const brandPrimary = publicSettings.checkoutBrandPrimary?.trim() || "#1a46be";
  const brandAccent = publicSettings.checkoutBrandAccent?.trim() || "#f37021";
  const announcement =
    publicSettings.siteTagline?.trim() ||
    publicSettings.seoDefaultDescription?.trim()?.slice(0, 120) ||
    "Free shipping on qualifying orders — shop your favorites today.";
  return (
    <div
      className={`flex min-h-screen flex-col bg-background text-foreground ${className ?? ""}`}
      style={
        {
          ...style,
          ["--sf-brand-primary" as string]: brandPrimary,
          ["--sf-brand-accent" as string]: brandAccent,
        } as CSSProperties
      }
    >
      <ConceptAnnouncementBar message={announcement} />
      <ConceptMainHeader publicSettings={publicSettings} websiteId={websiteId} brandPrimary={brandPrimary} />
      <div className="sr-only">
        <h1>{title}</h1>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="mt-auto">
        <ConceptFooterHighlights />
        <ConceptFooterMain publicSettings={publicSettings} brandPrimary={brandPrimary} brandAccent={brandAccent} />
      </footer>
    </div>
  );
}
