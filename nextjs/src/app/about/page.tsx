import type { Metadata } from "next";
import Link from "next/link";
import { Phone, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/waterice/site-header";
import { WaterIceShell } from "@/components/waterice/waterice-shell";

const aboutHero = "/waterice/about-hero.jpg";
const aboutHero2 = "/waterice/about-hero-2.jpg";

export const metadata: Metadata = {
  title: "About Us — Water Ice Express",
  description:
    "Water Ice Express empowers motivated entrepreneurs to launch and grow successful water ice businesses with low startup costs and unlimited potential.",
  openGraph: {
    title: "About Us — Water Ice Express",
    description:
      "Discover how Water Ice Express helps entrepreneurs build successful water ice businesses.",
  },
};

export default function AboutPage() {
  return (
    <WaterIceShell>
      <SiteHeader active="about" />

      {/* Hero band */}
      <section className="relative w-full bg-primary/5 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.08) 0, transparent 40%), radial-gradient(circle at 80% 80%, hsl(var(--primary) / 0.06) 0, transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* Image collage */}
          <div className="relative">
            <div className="relative">
              <img
                src={aboutHero}
                alt="Colorful Philly Water Ice cups"
                width={1024}
                height={1024}
                className="w-full h-auto rounded-[2rem] shadow-2xl object-cover aspect-square"
              />
              <img
                src={aboutHero2}
                alt="Entrepreneur serving water ice"
                width={768}
                height={1024}
                loading="lazy"
                className="hidden md:block absolute -right-6 bottom-8 w-[42%] rounded-t-[10rem] rounded-b-[2rem] border-8 border-background shadow-2xl object-cover aspect-[3/4]"
              />
              <div className="absolute -left-4 bottom-6 md:-left-8 md:bottom-10 bg-card border border-border rounded-2xl shadow-xl px-6 py-4 text-center">
                <p className="text-sm font-semibold text-foreground">Established In</p>
                <p className="font-display text-3xl font-extrabold text-primary">2024</p>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div>
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-primary mb-4">
              About Our Company
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-foreground">
              Empowering Entrepreneurs in the <span className="text-primary">Water Ice</span> Industry
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Water Ice Express guides, educates, and supports individuals and businesses entering and expanding in the water ice industry — a fast-growing, low-cost opportunity built for motivated dreamers.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-semibold pl-6 pr-2 py-2 hover:opacity-95 transition"
              >
                <span>Explore Services</span>
                <span className="grid place-items-center w-9 h-9 rounded-full bg-primary-foreground/15">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-12 h-12 rounded-full bg-card border border-border shadow">
                  <Phone className="w-5 h-5 text-primary" />
                </span>
                <span className="font-semibold text-foreground">Call us today</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Long-form content */}
      <main className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="font-display text-3xl md:text-4xl font-extrabold text-foreground">
          About Water Ice Express
        </h2>
        <p className="mt-4 text-xl font-semibold text-primary">
          Welcome Motivated Entrepreneurs!
        </p>

        <div className="mt-8 space-y-6 text-lg text-muted-foreground leading-relaxed">
          <p>
            At Water Ice Express, we believe big dreams can start with something simple. Our company was created to inspire individuals and families to build their own future, create opportunities in their local communities, and take control of their financial success through the exciting world of water ice entrepreneurship.
          </p>
          <p>
            Water Ice Express was founded with one mission in mind — to provide aspiring entrepreneurs with the tools, education, guidance, and support needed to launch and grow a successful business with low startup costs and unlimited potential. Whether you are looking to start a side hustle, build a family business, or create a full-time operation, our team is committed to helping you every step of the way.
          </p>
          <p>
            The water ice industry continues to emerge as one of today&apos;s most promising and profitable mobile and event-based business opportunities. Through our experience, training, and proven systems, we help entrepreneurs confidently enter the industry with the knowledge and resources needed to succeed.
          </p>
          <p>
            From equipment guidance and branding support to operational training and business education, Water Ice Express is more than a company — it is a movement built to empower motivated individuals to chase their dreams and create something meaningful within their own communities.
          </p>

          <div className="rounded-2xl border-l-4 border-primary bg-primary/5 px-6 py-5">
            <p className="font-semibold text-foreground">Our goal is simple:</p>
            <p className="mt-2 text-foreground/80">
              To inspire entrepreneurs, support their journey, and help build businesses that can change lives for generations to come.
            </p>
          </div>

          <p>
            With the right mindset, the right support system, and the right opportunity, anything is possible. At Water Ice Express, we are proud to be part of that journey with you.
          </p>
        </div>
      </main>
    </WaterIceShell>
  );
}
