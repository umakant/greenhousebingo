import { Link } from "@tanstack/react-router";
import brandLogoUrl from "@/assets/social-greenhouse-dark.png";
import poweredByLogoUrl from "@/assets/greenhouse-bingo-powered-by.png";
import { Instagram, Facebook, Twitter, Youtube } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-forest-deep text-cream">
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-lime/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-blossom/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <img
              src={brandLogoUrl}
              alt="The Social Greenhouse"
              className="h-auto w-full max-w-[220px] object-contain"
            />
            <p className="mt-4 text-sm text-cream/70 max-w-xs">
              Play Bingo. Win Plants. Every registered guest goes home with something beautiful.
            </p>
            <div className="mt-6 flex gap-3">
              {[Instagram, Facebook, Twitter, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-lime hover:text-forest-deep transition">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display text-lg font-bold mb-4">Explore</h4>
            <ul className="space-y-2 text-sm text-cream/80">
              <li><Link to="/events">Upcoming Events</Link></li>
              <li><Link to="/how-it-works">How It Works</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-cream/80">
            <li><Link to="/host-event">Host an Event</Link></li>
            <li><Link to="/start-business">Start a BINGO Business</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/refund">Refund Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg font-bold mb-4">Get plant updates</h4>
            <p className="text-sm text-cream/70 mb-4">New events, new venues, new plants.</p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="you@garden.com"
                className="flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm placeholder:text-cream/50 border border-white/15 focus:outline-none focus:border-lime"
              />
              <button className="rounded-full bg-lime px-4 py-2.5 text-sm font-bold text-forest-deep hover:bg-cream transition">
                Join
              </button>
            </form>
            <div className="mt-6 flex items-center gap-3 border-l-2 border-white/20 pl-3">
              <img
                src={poweredByLogoUrl}
                alt="Powered by Greenhouse BINGO"
                className="h-auto w-full max-w-[220px] object-contain"
              />
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8">
          <p className="text-sm text-cream/70 leading-relaxed max-w-4xl">
            The Social Greenhouse creates unforgettable Plant Bingo experiences designed around plants, people, and community. Join us for greenhouse bingo nights, plant events, and unique social gatherings at breweries, wineries, restaurants, and community venues near you.
          </p>
          <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-cream/60">
            <p>© {new Date().getFullYear()} Greenhouse Bingo. Every guest goes home with a plant. 🌱</p>
            <p>Not a gambling site. A community plant event.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
