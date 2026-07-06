import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import hostImg from "@/assets/host-bingo-section.jpg";
import {
  Check,
  Sparkles,
  ArrowRight,
  Eye,
  Heart,
  Utensils,
  Smartphone,
  Store,
  Handshake,
  BarChart3,
  CalendarDays,
  Ticket,
  Mail,
  TrendingUp,
  Users,
  Clock,
  MapPin,
  Star,
  Phone,
  ClipboardList,
  Receipt,
  ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/host-event")({
  component: HostEventPage,
  head: () => ({
    meta: [
      { title: "Host a Plant Bingo Event at Your Venue — Greenhouse Bingo" },
      {
        name: "description",
        content:
          "Bring Plant Bingo to your restaurant, venue, or event space. Free to host, new customers guaranteed, and your slowest nights become your busiest.",
      },
      { property: "og:title", content: "Host a Plant Bingo Event at Your Venue" },
      {
        property: "og:description",
        content:
          "Turn empty seats into revenue. Zero cost to host. New customers, repeat visits, and a packed house on your slowest night.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/host-event" },
    ],
    links: [{ rel: "canonical", href: "/host-event" }],
  }),
});

function HostEventPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <Hero />
      <StatsSection />
      <BenefitsSection />
      <HowItWorksSection />
      <ToolsSection />
      <SocialProofSection />
      <FaqSection />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={hostImg}
          alt="Plant Bingo event in a lively venue"
          className="h-full w-full object-cover"
          width={1600}
          height={1024}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-forest-deep/85 via-forest/70 to-forest-deep/85" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-24 lg:px-8 lg:pt-24 lg:pb-32">
        <div className="mx-auto max-w-3xl text-center text-cream animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-lime/20 border border-lime/40 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-lime">
            <Sparkles className="h-3.5 w-3.5" /> Zero Cost to Host
          </span>
          <h1 className="mt-6 text-5xl font-black leading-[1.02] md:text-6xl lg:text-7xl">
            Turn Empty Seats Into <span className="text-gradient-forest">Revenue</span>
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg text-cream/85 md:text-xl">
            Plant Bingo fills your slowest nights with excited guests who have never been to your venue before — then they come back again and again.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full bg-lime px-7 py-4 text-base font-bold text-forest-deep shadow-glow transition hover:-translate-y-0.5"
            >
              Host at My Venue <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full glass px-7 py-4 text-base font-bold text-cream border border-white/40 hover:bg-white/10"
            >
              See How It Works
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-cream/90">
            {["No Setup Cost", "No Minimum Guarantee", "New Customers Guaranteed", "You Keep 100% of F&B Sales"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-lime" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* --------------- SECTION HEADER --------------- */
function SectionHeader({
  eyebrow,
  title,
  subtitle,
  center = true,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-forest-deep">
        <Sparkles className="h-3.5 w-3.5 text-forest" /> {eyebrow}
      </span>
      <h2 className="mt-4 text-4xl font-black text-forest-deep md:text-5xl">{title}</h2>
      {subtitle && <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/* --------------- STATS --------------- */
function StatsSection() {
  const stats = [
    { value: "3–5x", label: "Normal F&B revenue per guest on Bingo night" },
    { value: "60–70%", label: "Of Bingo guests return within 30 days" },
    { value: "50+", label: "Organic social tags per event" },
    { value: "$0", label: "Upfront cost to the venue" },
  ];
  return (
    <section className="bg-cream py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl font-black text-forest">{s.value}</div>
              <p className="mt-2 text-sm font-semibold text-muted-foreground leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------- BENEFITS --------------- */
function BenefitsSection() {
  const benefits = [
    {
      icon: Eye,
      title: "First-Time Visitors",
      body: "Plant Bingo draws crowds who have never stepped foot in your establishment. These are new faces walking through your door — people who found you through our marketing, social buzz, and word-of-mouth, not your usual channels.",
      stat: "We had guests who drove 40 minutes and told us they did not know this place existed until they saw the Bingo event.",
      statLabel: "Venue Partner, Michigan",
      accent: "forest",
    },
    {
      icon: Heart,
      title: "Customers Who Come Back",
      body: "Bingo night is not a one-and-done. Guests fall in love with the experience and return week after week — often bringing friends, family, and coworkers. What starts as a Bingo night becomes a standing tradition that fills your slowest nights reliably.",
      stat: "Average venue sees 60–70% of Bingo guests return for a second event within 30 days.",
      statLabel: "Retention Metric",
      accent: "lime",
    },
    {
      icon: Utensils,
      title: "Food & Drink Sales Surge",
      body: "Every Bingo guest is a captive audience for 2–3 hours. They order appetizers, drinks, desserts, and coffee while they play. Venues routinely report that Bingo nights generate 3–5x their normal per-head food and beverage revenue compared to a standard weeknight.",
      stat: "Bingo night is now our highest-margin night of the week. The bar revenue alone covers our slow Monday staff costs.",
      statLabel: "Venue Manager, Ohio",
      accent: "forest",
    },
    {
      icon: Smartphone,
      title: "Free Social Media Marketing",
      body: "Bingo nights are inherently Instagram-worthy. Guests post photos of their plants, their cards, and your venue — tagging your location and driving organic reach you cannot buy. Every event becomes a mini marketing campaign that lives on social feeds for days.",
      stat: "Partner venues average 50+ organic Instagram tags per event — reaching thousands of local followers at zero ad spend.",
      statLabel: "Social Reach Data",
      accent: "forest",
    },
    {
      icon: Store,
      title: "Zero Cost. Zero Risk.",
      body: "The venue pays absolutely nothing to host Plant Bingo. We handle the ticketing, marketing, plant sourcing, event setup, and customer communication. You simply unlock your doors and watch new customers fill your seats — then ring up food and drink sales you would never have seen otherwise.",
      stat: "There is no upfront fee, no minimum guarantee, and no contract. If a night does not work for your schedule, we simply move the date.",
      statLabel: "Flexible Terms",
      accent: "forest",
    },
    {
      icon: Handshake,
      title: "Free Venue Dashboard",
      body: "Every partner venue gets a free account to track seats sold, log in-house sales revenue, and see historical performance by event — so everyone sees the ROI of hosting Plant Bingo. Venues can also request future dates with one click.",
      list: [
        "Live seat-sold tracking per event",
        "Venue enters their own sales revenue",
        "Historical performance by location",
        "One-click request for future dates",
      ],
      accent: "dashed",
    },
  ];

  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeader
          eyebrow="Why Host Plant Bingo"
          title={<>Why every venue <span className="text-gradient-forest">wants this</span></>}
          subtitle="This is not just an event — it is a proven customer-acquisition and retention engine that costs you nothing and pays you back immediately."
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => {
            const isLime = b.accent === "lime";
            const isDashed = b.accent === "dashed";
            const borderClass = isLime
              ? "border-2 border-lime/40 bg-gradient-to-br from-lime/10 to-cream"
              : isDashed
              ? "border-2 border-dashed border-forest/30 bg-cream/60"
              : "border-2 border-forest/20 bg-gradient-to-br from-forest/5 to-cream";
            const iconBg = isLime ? "bg-lime text-forest-deep" : "bg-forest text-cream";

            return (
              <div
                key={b.title}
                className={`rounded-[2rem] p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-lifted ${borderClass}`}
              >
                <div className={`grid h-14 w-14 place-items-center rounded-2xl ${iconBg}`}>
                  <b.icon className="h-6 w-6" />
                </div>
                <h4 className="mt-5 text-xl font-black text-forest-deep">{b.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
                {b.stat && (
                  <div className="mt-4 rounded-2xl bg-white/80 p-4 text-xs font-semibold text-forest-deep">
                    "{b.stat}" — <span className="text-muted-foreground">{b.statLabel}</span>
                  </div>
                )}
                {b.list && (
                  <ul className="mt-4 space-y-2">
                    {b.list.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm font-semibold text-forest-deep">
                        <Check className="h-4 w-4 text-forest" /> {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-forest/10 px-6 py-3 text-sm font-bold text-forest-deep">
            <Check className="h-4 w-4 text-forest" />
            All venue tools are included at no cost — you never pay a dime.
          </p>
        </div>
      </div>
    </section>
  );
}

/* --------------- HOW IT WORKS --------------- */
function HowItWorksSection() {
  const steps = [
    {
      icon: Phone,
      title: "Reach Out",
      desc: "Fill out a quick form or give us a call. We will learn about your space, your slow nights, and what makes your venue special.",
    },
    {
      icon: CalendarDays,
      title: "Pick a Date",
      desc: "We look at your calendar and find a night that works — usually a slow weekday that could use a boost. You approve the date and time.",
    },
    {
      icon: Ticket,
      title: "We Sell the Tickets",
      desc: "We handle 100% of the marketing, ticketing, and customer communication. Guests buy tickets through our platform and show up ready to play.",
    },
    {
      icon: Store,
      title: "You Open the Doors",
      desc: "On event night, you simply welcome guests in. We bring the plants, cards, and host. You keep 100% of every food and drink sale.",
    },
  ];
  return (
    <section id="how-it-works" className="bg-cream py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <SectionHeader
          eyebrow="Simple Process"
          title={<>Four easy steps to <span className="text-gradient-forest">your busiest night</span></>}
          subtitle="We do the heavy lifting. You reap the rewards."
        />

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-3xl bg-white p-6 shadow-soft border border-border">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-forest text-cream font-black text-lg">
                {i + 1}
              </div>
              <h4 className="mt-4 text-lg font-black text-forest-deep">{s.title}</h4>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------- FREE TOOLS --------------- */
function ToolsSection() {
  const tools = [
    { icon: BarChart3, title: "Seat Tracking", desc: "See exactly how many seats are sold for each event in real time." },
    { icon: Receipt, title: "Revenue Logging", desc: "Enter your own F&B sales to compare event nights and measure true ROI." },
    { icon: TrendingUp, title: "Performance History", desc: "Compare month-over-month results and spot your best-performing nights." },
    { icon: CalendarDays, title: "Date Requests", desc: "Loved the event? Request your next date with a single click." },
    { icon: Mail, title: "Direct Communication", desc: "Message your event coordinator anytime through your venue portal." },
    { icon: ClipboardList, title: "Event Details", desc: "View headcount, timing, and setup notes for every booked night." },
  ];
  return (
    <section className="bg-forest-deep py-24 text-cream md:py-32 overflow-hidden relative">
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-lime/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blossom/20 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-lime/20 border border-lime/40 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-lime">
            <Sparkles className="h-3.5 w-3.5" /> Free Venue Portal
          </span>
          <h2 className="mt-4 text-4xl font-black md:text-5xl">Tools That Prove the Value</h2>
          <p className="mt-4 text-lg text-cream/80">
            Every partner venue gets a free dashboard so you can see — in real numbers — exactly what Plant Bingo is doing for your bottom line.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <div key={t.title} className="rounded-2xl glass-dark p-6 transition hover:-translate-y-1">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime/20 text-lime">
                <t.icon className="h-5 w-5" />
              </div>
              <div className="mt-3 font-bold">{t.title}</div>
              <div className="mt-1 text-sm text-cream/70">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------- SOCIAL PROOF --------------- */
function SocialProofSection() {
  const quotes = [
    {
      name: "Derek & Lisa",
      venue: "The Rusty Tap, Wisconsin",
      quote:
        "We were skeptical. Now Monday Bingo is our biggest night. We have regulars who come every single week and order full dinners.",
    },
    {
      name: "Maya Torres",
      venue: "Bloom & Brew, Texas",
      quote:
        "Plant Bingo introduced us to an entirely new demographic. Younger guests, plant lovers, people who had never heard of our coffee shop before.",
    },
    {
      name: "Sam Patel",
      venue: "Garden Gate Pub, Oregon",
      quote:
        "The dashboard makes it easy. I can see tickets sold, log my bar revenue, and request the next date all in one place. Zero hassle.",
    },
  ];
  return (
    <section className="bg-gradient-to-b from-cream to-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeader
          eyebrow="Venue Stories"
          title={<>Venues that took the leap <span className="text-gradient-forest">never looked back</span></>}
        />
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {quotes.map((q) => (
            <div key={q.name} className="rounded-3xl border border-border bg-white p-8 shadow-soft">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-4 w-4 text-sunny fill-sunny" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-forest-deep font-medium">"{q.quote}"</p>
              <div className="mt-6">
                <div className="font-bold text-forest-deep">{q.name}</div>
                <div className="text-xs text-muted-foreground font-semibold">{q.venue}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------- FAQ --------------- */
function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  const items = [
    {
      q: "What does it cost the venue to host?",
      a: "Absolutely nothing. There is no setup fee, no rental fee, and no minimum guarantee. We handle ticketing, marketing, plants, and hosting. You simply provide the space and keep 100% of your food and beverage sales.",
    },
    {
      q: "What nights work best for Plant Bingo?",
      a: "Slow weeknights are ideal — Mondays, Tuesdays, and Wednesdays. These are the nights you are already staffing but struggling to fill seats. We turn them into your highest-revenue evenings.",
    },
    {
      q: "How many guests should we expect?",
      a: "It varies by market and venue size, but most events sell 40–120 tickets. We work with you to set a capacity that feels right for your space and your kitchen.",
    },
    {
      q: "Do we need to change our menu or staffing?",
      a: "Not at all. Your regular kitchen and bar staff handle the rush just like any busy night. Some venues create a Bingo-night drink special, but it is entirely optional.",
    },
    {
      q: "How far in advance do we need to book?",
      a: "Two to four weeks is ideal. That gives us time to market the event, sell tickets, and coordinate plant delivery. Rush dates are sometimes possible — just ask.",
    },
    {
      q: "What if we want to stop hosting?",
      a: "There is no contract. If you need to pause or stop, just let us know. We can always pick back up when the timing is right. Our goal is a win-win partnership, not a lock-in.",
    },
  ];

  return (
    <section className="bg-cream py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <SectionHeader
          eyebrow="Common Questions"
          title={<>Everything venues <span className="text-gradient-forest">want to know</span></>}
        />
        <div className="mt-12 space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className={`rounded-2xl border bg-white transition ${open === i ? "border-forest shadow-soft" : "border-border shadow-soft"}`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="text-sm font-bold text-forest-deep">{item.q}</span>
                <ChevronDown className={`h-4 w-4 text-forest transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------- FINAL CTA --------------- */
function FinalCta() {
  return (
    <section id="contact" className="relative overflow-hidden bg-gradient-to-b from-forest-deep to-forest py-24 text-cream md:py-32">
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-lime/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blossom/20 blur-3xl" />
      <div className="relative mx-auto max-w-3xl px-4 text-center lg:px-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-lime/20 border border-lime/40 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-lime">
          <Sparkles className="h-3.5 w-3.5" /> Ready to Fill Your Seats?
        </span>
        <h2 className="mt-6 text-4xl font-black md:text-5xl">
          Turn Your Slowest Night Into Your <span className="text-lime">Busiest</span>
        </h2>
        <p className="mt-4 text-lg text-cream/80">
          Join the hundreds of restaurants, venues, and event spaces already growing their revenue with Plant Bingo. No cost. No risk. Just new customers and bigger nights.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-full bg-lime px-7 py-4 text-base font-bold text-forest-deep shadow-glow transition hover:-translate-y-0.5"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="tel:+15551234567"
            className="inline-flex items-center gap-2 rounded-full glass px-7 py-4 text-base font-bold text-cream border border-white/40 hover:bg-white/10"
          >
            <Phone className="h-4 w-4" /> Call Us
          </a>
        </div>
        <p className="mt-6 text-sm text-cream/60">
          Prefer email? Reach us at{" "}
          <a href="mailto:venues@greenhousebingo.com" className="underline hover:text-lime">
            venues@greenhousebingo.com
          </a>
        </p>
      </div>
    </section>
  );
}
