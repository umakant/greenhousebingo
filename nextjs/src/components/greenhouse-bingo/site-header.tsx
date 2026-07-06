"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GH_BINGO_LOGO_SRC } from "@/lib/greenhouse-bingo/brand-assets";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Home" },
  { href: "/partners", label: "Partners" },
  { href: "/events", label: "Events" },
  { href: "/venues", label: "Venues" },
  { href: "/become-a-rep", label: "Plans" },
] as const;

function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center justify-self-start">
          <Image
            src={GH_BINGO_LOGO_SRC}
            alt="Greenhouse Bingo"
            width={160}
            height={44}
            className="h-10 w-auto md:h-11"
            priority
            unoptimized
          />
        </Link>

        <nav className="hidden items-center justify-center gap-1 md:flex">
          {nav.map((n) => {
            const active = isNavActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-foreground/75 hover:bg-secondary hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center justify-self-end gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/auth">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/events">Find events</Link>
          </Button>
        </div>

        <button
          type="button"
          className="justify-self-end rounded-md p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isNavActive(pathname, n.href)
                    ? "bg-secondary text-foreground"
                    : "text-foreground/75 hover:bg-secondary hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Button asChild variant="ghost" size="sm" className="flex-1">
                <Link href="/auth" onClick={() => setOpen(false)}>
                  Log in
                </Link>
              </Button>
              <Button asChild size="sm" className="flex-1">
                <Link href="/events" onClick={() => setOpen(false)}>
                  Find events
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
