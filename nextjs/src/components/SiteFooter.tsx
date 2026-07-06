import Link from "next/link";

import { MARKETING_PAGE_HREFS } from "@/lib/public-info-pages-data";

/** Same mark as `SiteHeader` — single brand asset on marketing pages. */
const logo = "/assets/paper-flight-logo.png";

const cols = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Integrations", "Changelog", "Roadmap"],
  },
  {
    title: "Compare",
    links: ["vs HighLevel", "vs HubSpot", "vs Jobber", "vs ServiceTitan"],
  },
  {
    title: "Company",
    links: ["About", "Contact", "Careers", "Press", "Partners"],
  },
  {
    title: "Legal",
    links: ["Terms", "Privacy", "Security", "DPA", "Cookies"],
  },
];

function footerHref(label: string): string {
  return MARKETING_PAGE_HREFS[label] ?? "#";
}

export function SiteFooter() {
  return (
    <footer className="bg-[oklch(0.18_0.04_250)] px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link href="/" className="inline-flex items-center" aria-label="Paper Flight home">
              <img src={logo} alt="Paper Flight" className="h-8 w-auto" />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
              The all-in-one platform that doesn't punish you for growing. Built for
              service pros, by service pros.
            </p>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-sm font-bold text-white">{c.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => {
                  const href = footerHref(l);
                  const isRoute = href.startsWith("/");
                  return (
                    <li key={l}>
                      {isRoute ? (
                        <Link
                          href={href}
                          className="text-sm text-white/60 transition-colors hover:text-brand"
                        >
                          {l}
                        </Link>
                      ) : (
                        <a
                          href={href}
                          className="text-sm text-white/60 transition-colors hover:text-brand"
                        >
                          {l}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Paper Flight. All rights reserved.</p>
          <p>Made for service businesses that want to fly.</p>
        </div>
      </div>
    </footer>
  );
}
