import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Twitter, Youtube, Sprout } from "lucide-react";
import logoAsset from "@/assets/greenhouse-bingo-light.png.asset.json";
import poweredByLogoAsset from "@/assets/PB_GreenhouseBingo_light.png.asset.json";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-10 sm:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <img src={logoAsset.url} alt="The Social Greenhouse" className="h-24 w-auto" />
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

          {/* Explore */}
          <div>
            <h4 className="font-serif text-2xl text-foreground">Explore</h4>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              <li><Link to="/events" className="transition hover:text-foreground">Upcoming Events</Link></li>
              <li><Link to="/how-it-works" className="transition hover:text-foreground">How It Works</Link></li>
              <li><Link to="/about" className="transition hover:text-foreground">About</Link></li>
              <li><Link to="/contact" className="transition hover:text-foreground">Contact</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-serif text-2xl text-foreground">Company</h4>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              <li><Link to="/venues" className="transition hover:text-foreground">Host an Event</Link></li>
              <li><Link to="/become-a-rep" className="transition hover:text-foreground">Start a BINGO Business</Link></li>
              <li><Link to="/privacy" className="transition hover:text-foreground">Privacy Policy</Link></li>
              <li><Link to="/terms" className="transition hover:text-foreground">Terms of Service</Link></li>
              <li><Link to="/refund" className="transition hover:text-foreground">Refund Policy</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-serif text-2xl text-foreground">Get plant updates</h4>
            <p className="mt-5 text-sm text-muted-foreground">
              New events, new venues, new plants.
            </p>
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
              <img
                src={poweredByLogoAsset.url}
                alt="Powered by Greenhouse BINGO!"
                className="h-18 w-auto"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
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
