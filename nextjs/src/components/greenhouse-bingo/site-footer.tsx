"use client";

import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Sprout, Twitter, Youtube } from "lucide-react";
import {
  GH_BINGO_LOGO_SRC,
  GH_BINGO_POWERED_BY_SRC,
} from "@/lib/greenhouse-bingo/brand-assets";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-10 sm:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image
              src={GH_BINGO_LOGO_SRC}
              alt="Greenhouse Bingo"
              width={170}
              height={56}
              className="h-auto w-[170px] max-w-full"
              unoptimized
            />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Play Bingo. Win Plants. Every registered guest goes home with something beautiful.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[
                { Icon: Instagram, label: "Instagram" },
                { Icon: Facebook, label: "Facebook" },
                { Icon: Twitter, label: "Twitter" },
                { Icon: Youtube, label: "YouTube" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:border-foreground/30 hover:bg-foreground/5 hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-serif text-2xl text-foreground">Explore</h4>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link
                  href="/events"
                  className="text-foreground/70 transition hover:text-foreground"
                >
                  Upcoming Events
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="text-foreground/70 transition hover:text-foreground"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-foreground/70 transition hover:text-foreground">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-foreground/70 transition hover:text-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-2xl text-foreground">Company</h4>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link href="/venues" className="text-foreground/70 transition hover:text-foreground">
                  Host an Event
                </Link>
              </li>
              <li>
                <Link href="/become-a-rep" className="text-foreground/70 transition hover:text-foreground">
                  Start a BINGO Business
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-foreground/70 transition hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-foreground/70 transition hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-foreground/70 transition hover:text-foreground">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-2xl text-foreground">Get plant updates</h4>
            <p className="mt-5 text-sm text-muted-foreground">New events, new venues, new plants.</p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-4 flex items-center gap-2 rounded-full border border-border/60 bg-background/60 p-1.5 pl-4"
            >
              <input
                type="email"
                required
                placeholder="you@garden.com"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background transition hover:bg-foreground/90"
              >
                Join
              </button>
            </form>
            <div className="mt-4">
              <Image
                src={GH_BINGO_POWERED_BY_SRC}
                alt="Powered by Greenhouse BINGO!"
                width={150}
                height={36}
                className="h-auto w-[150px] max-w-full"
                unoptimized
              />
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-border/40 pt-6">
          <div className="flex flex-col items-start justify-between gap-3 text-xs text-muted-foreground/70 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span>2026 Greenhouse BINGO. Every guest goes home with a plant.</span>
              <Sprout className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <span>Not a gambling site. A community plant event.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
