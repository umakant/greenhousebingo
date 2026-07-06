import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import heroImg from "@/assets/hero-brewery-bingo.jpg";
import plantMonstera from "@/assets/plant-monstera.jpg";
import plantSnake from "@/assets/plant-snake.jpg";
import plantPothos from "@/assets/plant-pothos.jpg";
import plantLily from "@/assets/plant-lily.jpg";
import plantSuccs from "@/assets/plant-succulents.jpg";
import plantOrchid from "@/assets/plant-orchid.jpg";
import plantFiddle from "@/assets/plant-fiddle.jpg";
import plantZZ from "@/assets/plant-zz.jpg";
import plantRubber from "@/assets/plant-rubber.jpg";
import plantAloe from "@/assets/plant-aloe.jpg";
import plantFern from "@/assets/plant-fern.jpg";
import plantPhilodendron from "@/assets/plant-philodendron.jpg";
import { US_NATION_PATH, US_STATES_PATH } from "@/lib/us-map-paths";
import { events } from "@/lib/events-data";
import {
  Ticket,
  QrCode,
  ScanLine,
  Sprout,
  Users,
  Sun,
  Leaf,
  Heart,
  Sparkles,
  CloudRain,
  MapPin,
  Clock,
  Search,
  ChevronRight,
  Star,
  Plus,
  Minus,
  ShieldCheck,
  Building2,
  Send,
  CalendarDays,
  User,
  Mail,
  Phone,
  MapPinned,
  MessageSquare,
  CheckCircle2,
  Dices,
  Trophy,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import hostBingoImg from "@/assets/host-bingo-section.jpg";
import { submitHostInquiry } from "@/lib/host-inquiry.functions";

const SITE_URL = "https://plant-play-win.lovable.app";

const HOMEPAGE_FAQS = [
  { q: "What is Plant Bingo?", a: "Plant Bingo is a social event where guests play bingo games and win plants instead of traditional prizes." },
  { q: "Do I need to know about plants?", a: "No. Plant Bingo is for everyone from beginners to experienced plant collectors." },
  { q: "What can I win?", a: "Guests can win houseplants, specialty plants, gardening items, and other plant-themed prizes." },
  { q: "Is Plant Bingo family friendly?", a: "Many Plant Bingo events welcome all ages depending on the hosting venue." },
  { q: "Where can I find Plant Bingo near me?", a: "Visit The Social Greenhouse event calendar to discover upcoming Plant Bingo locations across the country." },
];

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Plant Bingo Events | The Social Greenhouse | Win Plants & Connect" },
      { name: "description", content: "Join The Social Greenhouse for Plant Bingo events. Play bingo, meet new people, win plants, and experience a unique social event for plant lovers." },
      { property: "og:title", content: "Plant Bingo Events | The Social Greenhouse" },
      { property: "og:description", content: "Play Plant Bingo, meet plant lovers, and win beautiful houseplants at community bingo nights hosted at breweries, wineries, and local venues." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Plant Bingo Events | The Social Greenhouse" },
      { name: "twitter:description", content: "Play Plant Bingo, meet plant lovers, and win beautiful houseplants at unique community bingo nights." },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "The Social Greenhouse",
          alternateName: "Greenhouse Bingo",
          url: SITE_URL,
          description: "The Social Greenhouse hosts Plant Bingo events — community bingo nights where guests win houseplants at breweries, wineries, restaurants, and local venues.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: HOMEPAGE_FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
});


const plants = [
  { name: "Monstera", img: plantMonstera, tag: "Statement Piece" },
  { name: "Snake Plant", img: plantSnake, tag: "Easy Care" },
  { name: "Golden Pothos", img: plantPothos, tag: "Trailing Beauty" },
  { name: "Peace Lily", img: plantLily, tag: "Blooming" },
  { name: "Succulents", img: plantSuccs, tag: "Little Cuties" },
  { name: "Orchid", img: plantOrchid, tag: "Elegant" },
  { name: "Fiddle Leaf Fig", img: plantFiddle, tag: "Showstopper" },
  { name: "ZZ Plant", img: plantZZ, tag: "Nearly Unkillable" },
  { name: "Rubber Plant", img: plantRubber, tag: "Bold Foliage" },
  { name: "Aloe Vera", img: plantAloe, tag: "Sun Lover" },
  { name: "Boston Fern", img: plantFern, tag: "Feathery Green" },
  { name: "Philodendron", img: plantPhilodendron, tag: "Heartleaf Vines" },
];

const games = [
  { n: 1, name: "Traditional Bingo", pattern: "Any line — horizontal, vertical, or diagonal", difficulty: "Easy", prize: "Pothos", color: "bg-lime/30" },
  { n: 2, name: "Four Corners", pattern: "Mark all four corner squares", difficulty: "Easy", prize: "Succulent", color: "bg-sunny/30" },
  { n: 3, name: "Blackout", pattern: "Cover the entire card", difficulty: "Hard", prize: "Monstera", color: "bg-blossom/25" },
  { n: 4, name: "Letter X", pattern: "Both diagonals form an X", difficulty: "Medium", prize: "Snake Plant", color: "bg-sky-blue/30" },
  { n: 5, name: "Picture Frame", pattern: "Complete the outer border", difficulty: "Medium", prize: "Peace Lily", color: "bg-lime/30" },
  { n: 6, name: "Postage Stamp", pattern: "2x2 block in any corner", difficulty: "Easy", prize: "Succulent", color: "bg-sunny/30" },
  { n: 7, name: "Double Bingo", pattern: "Two winning lines", difficulty: "Medium", prize: "Rubber Plant", color: "bg-blossom/25" },
  { n: 8, name: "Lucky Leaf Pattern", pattern: "Leaf-shaped pattern on card", difficulty: "Hard", prize: "Fern", color: "bg-sky-blue/30" },
  { n: 9, name: "Crazy Garden Pattern", pattern: "Surprise pattern revealed live", difficulty: "Hard", prize: "Orchid", color: "bg-lime/30" },
  { n: 10, name: "Wild Card Finale", pattern: "Winner picks any plant on the floor", difficulty: "Epic", prize: "Your Choice", color: "bg-sunny/30" },
];

const testimonials = [
  { name: "Sarah M.", city: "Jacksonville, FL", stars: 5, text: "Best night out ever! I walked in stressed and left with a gorgeous monstera and a huge smile. My kids are already asking when we go again." },
  { name: "Marcus & Dani", city: "Austin, TX", stars: 5, text: "We came for the bingo, we stayed for the plant people. Made three new friends and won a snake plant on the last game." },
  { name: "Priya R.", city: "Portland, OR", stars: 5, text: "Bingo, cold beer, and I went home with a monstera. Best Saturday night in months — the venue was packed and everyone left with a plant." },
];

const faqs = [
  { q: "Can I buy tickets at the door?", a: "No — to guarantee every attendee receives a plant, tickets must be purchased online in advance." },
  { q: "How much are tickets?", a: "Standard admission is $30 and includes 10 Bingo cards, event entry, door prize entry, and your guaranteed take-home plant." },
  { q: "How many Bingo cards do I receive?", a: "10 cards come with every ticket. You can add more for $5 each at checkout." },
  { q: "Does everyone receive a plant?", a: "Yes! Every registered guest walks out with a plant. That's the whole point." },
  { q: "Is this gambling?", a: "Not at all. There are no cash prizes — only plants, laughs, and new friends." },
  { q: "Is it family friendly?", a: "Absolutely. Kids, grandparents, and everyone in between are welcome." },
];

function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <SiteNav />
      <Hero />
      <MarqueeStrip />
      <WhatIsPlantBingo />
      <UpcomingEvents />
      <USAMap />
      <HowItWorks />
      <WhyLove />
      <Pricing />
      <PlantsGallery />
      <BingoGames />
      <Testimonials />
      <HostYourEvent />
      <FAQ />
      <FinalCTA />
      <SiteFooter />
    </div>
  );
}

/* ---------- HERO ---------- */
function Hero() {
  const { totalTickets } = useCart();

  return (
    <section className="relative min-h-[92vh] w-full overflow-hidden">
      <img src={heroImg} alt="" width={1920} height={1280} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />

      {/* floating leaves */}
      <Leaf className="absolute left-[6%] top-24 h-14 w-14 text-lime/70 animate-float-leaf" style={{ animationDelay: "0s" }} />
      <Leaf className="absolute right-[10%] top-40 h-10 w-10 text-lime/60 animate-float-slow" style={{ animationDelay: "1s" }} />
      <Sprout className="absolute right-[16%] bottom-32 h-16 w-16 text-lime/70 animate-float-leaf" style={{ animationDelay: "2s" }} />
      <Leaf className="absolute left-[14%] bottom-24 h-12 w-12 text-lime/60 animate-float-slow" style={{ animationDelay: "0.5s" }} />

      <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-32 lg:px-8 lg:pt-32">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full glass-dark px-4 py-2 text-sm font-semibold text-cream animate-fade-up">
            <Sparkles className="h-4 w-4 text-sunny" /> Plant Bingo · Greenhouse Bingo · Community Events
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[0.95] text-cream sm:text-7xl lg:text-8xl animate-fade-up" style={{ animationDelay: "0.1s" }}>
            Plant Bingo Events<br /><em className="not-italic text-lime">That Bring People</em> Together. 🌿
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream/90 sm:text-xl animate-fade-up" style={{ animationDelay: "0.2s" }}>
            Welcome to The Social Greenhouse — a new way to experience bingo night. Play classic bingo, meet plant lovers, enjoy local venues, and <span className="font-semibold text-cream">win beautiful plants to take home.</span>
          </p>
          <div className="mt-10 flex flex-wrap gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <a
              href="#events"
              className="group inline-flex items-center gap-2 rounded-full bg-lime px-8 py-4 text-lg font-bold text-forest-deep shadow-glow hover:bg-cream transition hover:-translate-y-1"
            >
              <Ticket className="h-5 w-5" /> Find Plant Bingo Events
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition" />
            </a>
            <a
              href="#host"
              className="inline-flex items-center gap-2 rounded-full glass-dark px-8 py-4 text-lg font-bold text-cream hover:bg-white/20 transition"
            >
              Host Plant Bingo At Your Venue
            </a>
          </div>


          <div className="mt-14 grid max-w-lg grid-cols-3 gap-6 text-cream animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <Stat n="120+" label="Events / year" />
            <Stat n="48" label="States" />
            <Stat n="100%" label="Go home w/ plants" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-bold text-lime">{n}</div>
      <div className="text-xs uppercase tracking-widest text-cream/70">{label}</div>
    </div>
  );
}

/* ---------- MARQUEE ---------- */
function MarqueeStrip() {
  const items = ["🌿 Everyone wins a plant", "🍺 Hosted at local venues", "🎟️ Online tickets only", "🎉 10 games per event", "🌱 New venues monthly", "☔ Rain or shine"];
  return (
    <div className="border-y border-border bg-forest-deep py-4 text-cream overflow-hidden">
      <div className="flex w-max animate-marquee">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="mx-8 font-display text-lg font-semibold tracking-wide whitespace-nowrap flex items-center">
            {t}
            <span className="ml-8 text-lime/60">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- WHAT IS PLANT BINGO ---------- */
function WhatIsPlantBingo() {
  const pillars = [
    { icon: Sprout, title: "Plants", desc: "Take-home houseplants for every guest.", tint: "text-lime bg-lime/15" },
    { icon: Dices, title: "Bingo", desc: "Ten classic bingo rounds every night.", tint: "text-sky-blue bg-sky-blue/15" },
    { icon: Trophy, title: "Prizes", desc: "Win rare plants and greenery gifts.", tint: "text-sunny bg-sunny/25" },
    { icon: Users, title: "Community", desc: "Meet local plant lovers near you.", tint: "text-blossom bg-blossom/15" },
  ];
  return (
    <section id="what-is-plant-bingo" className="py-24 lg:py-32 bg-gradient-to-b from-background to-secondary/40">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-forest">What Is Plant Bingo?</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-forest-deep sm:text-6xl">
              Bingo night, <span className="text-gradient-forest">reimagined for plant lovers.</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Plant Bingo combines the excitement of classic bingo with the love of houseplants. Instead of traditional prizes, winners take home beautiful plants, gardening gifts, and greenery.
            </p>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Whether you are a plant collector, a beginner plant parent, or just looking for a fun night out, The Social Greenhouse creates unforgettable plant bingo experiences where everyone can relax, laugh, and grow together.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {pillars.map((p) => (
              <div key={p.title} className="group rounded-3xl bg-card border border-border p-6 shadow-soft hover:shadow-lifted transition-all hover:-translate-y-1">
                <div className={`grid h-14 w-14 place-items-center rounded-2xl ${p.tint}`}>
                  <p.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-forest-deep">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}

/* ---------- EVENTS ---------- */
function UpcomingEvents() {
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");

  const allStates = Array.from(new Set(events.map((e) => e.state))).sort();
  const monthMap: Record<string, string> = {
    January: "JAN", February: "FEB", March: "MAR", April: "APR",
    May: "MAY", June: "JUN", July: "JUL", August: "AUG",
    September: "SEP", October: "OCT", November: "NOV", December: "DEC",
  };
  const presentMonthCodes = new Set(events.map((e) => e.month));
  const monthOptions = Object.keys(monthMap).filter((m) => presentMonthCodes.has(monthMap[m]));

  const filtered = events.filter((e) => {
    const matchesQ = (e.city + e.state + e.venue).toLowerCase().includes(q.toLowerCase());
    const matchesState = stateFilter === "All" || e.state === stateFilter;
    const matchesMonth = monthFilter === "All" || e.month === monthMap[monthFilter];
    return matchesQ && matchesState && matchesMonth;
  });

  return (
    <section id="events" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-forest">Upcoming Events</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-forest-deep sm:text-6xl">
              Find a Venue<br /><span className="text-gradient-forest">near you.</span>
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search city, state, venue..."
                className="w-full sm:w-80 rounded-full border border-border bg-white pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-forest"
              />
            </div>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="rounded-full border border-border bg-white px-4 py-3 text-sm font-semibold text-forest-deep"
            >
              <option value="All">All States</option>
              {allStates.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="rounded-full border border-border bg-white px-4 py-3 text-sm font-semibold text-forest-deep"
            >
              <option value="All">All Months</option>
              {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              No events match your filters. Try a different state or month.
            </div>
          ) : (
            filtered.slice(0, 6).map((e, i) => <EventCard key={i} {...e} />)
          )}
        </div>

        {filtered.length > 0 && (
          <div className="mt-10 text-center">
            <Link to="/events" className="inline-flex items-center gap-2 rounded-full bg-forest px-8 py-3 font-bold text-cream hover:bg-forest-deep transition">
              View more dates and venues <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}

function EventCard(e: typeof events[0]) {
  const scarce = !e.soldOut && e.left < 25;
  return (
    <article className={`group relative overflow-hidden rounded-3xl bg-card border border-border shadow-soft transition-all hover:-translate-y-1 ${e.soldOut ? "opacity-70" : "hover:shadow-lifted"}`}>
      <div className={`relative h-40 ${e.tint} overflow-hidden`}>
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, oklch(0.82 0.19 130 / 0.6), transparent 60%)" }} />
        <div className="absolute left-6 top-6 rounded-2xl bg-white shadow-soft px-4 py-3 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-tomato">{e.month}</div>
          <div className="font-display text-3xl font-bold text-forest-deep leading-none">{e.day}</div>
        </div>
        <div className="absolute left-6 bottom-4 rounded-xl bg-white/90 shadow-soft px-3 py-1.5">
          <div className="text-xs font-bold text-forest-deep">{e.day_name}</div>
        </div>
        {e.soldOut && (
          <span className="absolute right-4 top-4 rounded-full bg-forest-deep text-white text-xs font-bold px-3 py-1.5 shadow-soft">
            SOLD OUT
          </span>
        )}
        {scarce && (
          <span className="absolute right-4 top-4 rounded-full bg-tomato text-white text-xs font-bold px-3 py-1.5 shadow-soft animate-pulse">
            Only {e.left} left
          </span>
        )}
        <Leaf className="absolute right-6 bottom-4 h-16 w-16 text-forest/30" />
      </div>
      <div className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-forest">{e.state}</p>
        <h3 className="mt-1 font-display text-2xl font-bold text-forest-deep">{e.city}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{e.venue}</p>
        <div className="mt-4 flex flex-col gap-1 text-sm text-forest-deep">
          <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> Doors {e.doorsOpen}</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4" /> BINGO {e.time} – {e.endTime}</span>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          {e.soldOut ? (
            <span className="inline-flex items-center gap-1.5 font-bold text-forest-deep"><Ticket className="h-4 w-4 text-forest" /> Sold out</span>
          ) : (
            <span className="inline-flex items-center gap-1.5"><Ticket className="h-4 w-4 text-forest" /> {e.left} tickets left</span>
          )}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Starting at</div>
            <div className="font-display text-2xl font-bold text-forest-deep">${e.price}</div>
          </div>
          <div className="flex gap-2">
            <Link to="/events/$slug" params={{ slug: e.slug }} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-forest-deep hover:bg-secondary">Learn More</Link>
            {e.soldOut ? (
              <span className="rounded-full bg-muted px-4 py-2 text-sm font-bold text-muted-foreground cursor-not-allowed">Sold Out</span>
            ) : (
              <Link to="/events/$slug" params={{ slug: e.slug }} className="rounded-full bg-forest px-4 py-2 text-sm font-bold text-cream hover:bg-forest-deep transition">Buy Tickets</Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---------- USA MAP ---------- */
const STATE_NAME_BY_CODE: Record<string, string> = {
  WA: "Washington", OR: "Oregon", CA: "California", AZ: "Arizona",
  CO: "Colorado", TX: "Texas", IL: "Illinois", TN: "Tennessee",
  NC: "North Carolina", GA: "Georgia", FL: "Florida", NY: "New York",
};

const MONTH_IDX: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

function USAMap() {
  const [hover, setHover] = useState<string | null>(null);
  // id is unique per dot; city (optional) narrows filter within a state
  const dots: { id: string; code: string; city?: string; label?: string; x: number; y: number }[] = [
    { id: "WA", code: "WA", x: 110, y: 47 },
    { id: "OR", code: "OR", x: 92, y: 90 },
    { id: "CA", code: "CA", x: 47, y: 262 },
    { id: "AZ", code: "AZ", x: 210, y: 400 },
    { id: "CO", code: "CO", x: 355, y: 274 },
    { id: "TX-AUS", code: "TX", city: "Austin", label: "AUS", x: 477, y: 510 },
    { id: "TX-DFW", code: "TX", city: "Dallas / Fort Worth", label: "DFW", x: 505, y: 460 },
    { id: "IL", code: "IL", x: 651, y: 226 },
    { id: "TN", code: "TN", x: 678, y: 355 },
    { id: "NC", code: "NC", x: 756, y: 359 },
    { id: "GA", code: "GA", x: 727, y: 405 },
    { id: "FL", code: "FL", x: 790, y: 475 },
    { id: "NY", code: "NY", x: 882, y: 216 },
  ];

  const activeStates = Array.from(new Set(dots.map((d) => d.code)));
  const totalEvents = events.length;

  const activeDot = hover ? dots.find((d) => d.id === hover) : null;
  const active = activeDot
    ? (() => {
        const stateName = STATE_NAME_BY_CODE[activeDot.code];
        const stateEvents = events
          .filter((e) => e.state === stateName && (!activeDot.city || e.city === activeDot.city))
          .sort(
            (a, b) =>
              new Date(a.year, MONTH_IDX[a.month], parseInt(a.day)).getTime() -
              new Date(b.year, MONTH_IDX[b.month], parseInt(b.day)).getTime(),
          );
        const cities = Array.from(new Set(stateEvents.map((e) => e.city)));
        const venues = Array.from(new Set(stateEvents.map((e) => e.venue)));
        return {
          code: activeDot.code,
          stateName,
          cities,
          venues,
          eventsCount: stateEvents.length,
          next: stateEvents[0],
        };
      })()
    : null;

  return (
    <section className="py-24 lg:py-32 bg-gradient-to-b from-secondary/40 to-background">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-widest text-forest">Nationwide</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-forest-deep sm:text-6xl">
            Growing across <span className="text-gradient-forest">America.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">Tap a state to see nearby venues and dates.</p>
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 relative rounded-4xl bg-white shadow-lifted border border-border p-6 md:p-8">
            <svg viewBox="0 0 975 610" className="w-full h-auto">
              <path d={US_NATION_PATH} fill="var(--forest)" opacity="0.08" />
              <path d={US_STATES_PATH} fill="none" stroke="var(--forest)" strokeOpacity="0.35" strokeWidth="1" strokeLinejoin="round" />
              {dots.map((d) => {
                const isActive = hover === d.id;
                return (
                  <g key={d.id} onMouseEnter={() => setHover(d.id)} onClick={() => setHover(d.id)} className="cursor-pointer">
                    <circle cx={d.x} cy={d.y} r={isActive ? 22 : 15} fill="var(--lime)" opacity="0.35" className="transition-all" />
                    <circle cx={d.x} cy={d.y} r={isActive ? 10 : 7} fill="var(--forest)" className="transition-all" />
                    <text x={d.x} y={d.y - 14} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--forest-deep)" className="pointer-events-none">{d.label ?? d.code}</text>
                  </g>
                );
              })}
            </svg>
            <div className="absolute bottom-6 left-6 text-xs text-muted-foreground">
              {activeStates.length} active states · {totalEvents}+ events booked
            </div>
          </div>

          <div className="rounded-4xl bg-forest-deep text-cream p-8 shadow-lifted flex flex-col">
            {active ? (
              <div key={activeDot!.id} className="animate-bloom">
                <div className="inline-flex items-center gap-2 rounded-full bg-lime/20 px-3 py-1 text-xs font-bold text-lime uppercase tracking-widest">
                  <MapPin className="h-3 w-3" /> {active.code}
                </div>
                <h3 className="mt-4 font-display text-4xl font-bold">
                  {active.cities.length > 0 ? active.cities.join(" · ") : active.stateName}
                </h3>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <StatBox n={active.eventsCount.toString()} label="Upcoming events" />
                  <StatBox n={active.venues.length.toString()} label="Venues" />
                </div>
                <ul className="mt-6 space-y-3 text-sm">
                  <li className="flex justify-between border-b border-white/10 pb-2">
                    <span>Next event</span>
                    <span className="text-lime font-bold">
                      {active.next ? `${active.next.month} ${active.next.day} · ${active.next.time}` : "TBA"}
                    </span>
                  </li>
                  <li className="flex justify-between border-b border-white/10 pb-2">
                    <span>Next venue</span>
                    <span className="text-right">{active.next?.venue ?? "—"}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Cities</span>
                    <span>{active.cities.length}</span>
                  </li>
                </ul>
                <Link
                  to="/events"
                  hash={active.code}
                  className="mt-auto pt-6 inline-flex items-center gap-2 text-lime font-bold hover:text-cream transition"
                >
                  Explore {active.code} <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="my-auto text-center">
                <Sprout className="mx-auto h-14 w-14 text-lime" />
                <p className="mt-4 font-display text-2xl">Hover a state</p>
                <p className="mt-2 text-cream/70 text-sm">See events, cities, and venues in that region.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}



function StatBox({ n, label }: { n: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <div className="font-display text-3xl font-bold text-lime">{n}</div>
      <div className="mt-1 text-xs text-cream/70 uppercase tracking-wider">{label}</div>
    </div>
  );
}

/* ---------- HOW IT WORKS ---------- */
function HowItWorks() {
  const steps = [
    { icon: Ticket, title: "Purchase Tickets Online", desc: "Grab your spot. Every ticket includes 10 Bingo cards.", color: "bg-lime/30" },
    { icon: QrCode, title: "Receive QR Code", desc: "Instant email, Apple/Google Wallet, and account access.", color: "bg-sunny/30" },
    { icon: ScanLine, title: "Check In", desc: "One quick scan at the venue door. You're in.", color: "bg-blossom/25" },
    { icon: Sprout, title: "Play & Take Home Plants", desc: "10 games. Endless laughs. Everyone leaves with a plant.", color: "bg-sky-blue/30" },
  ];
  return (
    <section id="how" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-widest text-forest">How It Works</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-forest-deep sm:text-6xl">
            From ticket to <span className="text-gradient-forest">take-home plant.</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4 relative">
          {steps.map((s, i) => (
            <div key={i} className="relative rounded-3xl bg-card border border-border p-8 shadow-soft hover:shadow-lifted hover:-translate-y-2 transition-all">
              <div className={`grid h-16 w-16 place-items-center rounded-2xl ${s.color}`}>
                <s.icon className="h-8 w-8 text-forest-deep" />
              </div>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-5xl font-bold text-lime">{i + 1}</span>
              </div>
              <h3 className="mt-2 font-display text-xl font-bold text-forest-deep">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- WHY LOVE ---------- */
function WhyLove() {
  const features = [
    { icon: Sprout, title: "Everyone Wins", desc: "Every guest walks out with a plant. Guaranteed.", tint: "text-lime bg-lime/15" },
    { icon: Users, title: "Family Friendly", desc: "Perfect for kids, grandparents, and everyone in between.", tint: "text-blossom bg-blossom/15" },
    { icon: CloudRain, title: "Rain or Shine", desc: "Indoor venue setting means the party never stops.", tint: "text-sky-blue bg-sky-blue/15" },
    { icon: Leaf, title: "Beautiful Plants", desc: "Healthy, well-loved plants — no scraggly leftovers.", tint: "text-forest bg-forest/10" },
    { icon: Heart, title: "Meet Plant Lovers", desc: "Build friendships with your local plant community.", tint: "text-tomato bg-tomato/15" },
    { icon: Sparkles, title: "Fun Bingo Games", desc: "10 unique games every event. Never a dull moment.", tint: "text-sunny bg-sunny/25" },
  ];
  return (
    <section className="py-24 lg:py-32 bg-gradient-to-b from-background to-secondary/50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-widest text-forest">Why People Love It</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-forest-deep sm:text-6xl">
            The best night out<br />you didn't know <span className="text-gradient-forest">you needed.</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} className="group rounded-3xl bg-card border border-border p-8 shadow-soft hover:shadow-lifted transition-all hover:-translate-y-1">
              <div className={`grid h-14 w-14 place-items-center rounded-2xl ${f.tint}`}>
                <f.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-bold text-forest-deep">{f.title}</h3>
              <p className="mt-2 text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- PRICING ---------- */
function Pricing() {
  const [extra, setExtra] = useState(0);
  const base = 30;
  const extraCost = extra * 5;
  const subtotal = base + extraCost;
  const fee = +(subtotal * 0.035).toFixed(2);
  const total = +(subtotal + fee).toFixed(2);
  return (
    <section id="pricing" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-widest text-forest">Ticket Pricing</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-forest-deep sm:text-6xl">
            One price. <span className="text-gradient-forest">Every game. A plant.</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-5">
          {/* Main pricing card */}
          <div className="lg:col-span-3 relative overflow-hidden rounded-4xl bg-forest-deep text-cream p-10 lg:p-14 shadow-lifted">
            <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-lime/20 blur-3xl" />
            <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-blossom/15 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-lime px-3 py-1 text-xs font-bold text-forest-deep uppercase tracking-widest">
                <Sprout className="h-3 w-3" /> Standard Admission
              </span>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-8xl font-black text-lime">$30</span>
                <span className="text-cream/70">/ ticket</span>
              </div>

              <ul className="mt-10 grid gap-3 sm:grid-cols-2">
                {[
                  "10 Bingo Cards",
                  "Guaranteed Plant",
                  "Door Prize Entry",
                  "Event Admission",
                  "Personal QR Code",
                  "Online Account",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-forest-deep font-bold">✓</span>
                    <span className="text-cream/90">{f}</span>
                  </li>
                ))}
              </ul>

              <a href="#events" className="mt-10 inline-flex items-center gap-2 rounded-full bg-lime px-8 py-4 text-lg font-bold text-forest-deep hover:bg-cream transition">
                <Ticket className="h-5 w-5" /> Buy Tickets
              </a>
            </div>
          </div>

          {/* Add cards + checkout summary */}
          <div className="lg:col-span-2 rounded-4xl bg-card border border-border p-8 shadow-lifted">
            <h3 className="font-display text-2xl font-bold text-forest-deep">Extra Bingo Cards</h3>
            <p className="text-sm text-muted-foreground mt-1">$5 each · Boost your chances</p>

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-secondary p-4">
              <span className="font-semibold text-forest-deep">Additional Cards</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setExtra(Math.max(0, extra - 1))} className="grid h-9 w-9 place-items-center rounded-full bg-white border border-border hover:bg-forest hover:text-cream transition">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-display text-2xl font-bold text-forest-deep">{extra}</span>
                <button onClick={() => setExtra(extra + 1)} className="grid h-9 w-9 place-items-center rounded-full bg-white border border-border hover:bg-forest hover:text-cream transition">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <Row label="Standard Admission" value={`$${base.toFixed(2)}`} />
              <Row label={`Additional Cards (${extra})`} value={`$${extraCost.toFixed(2)}`} />
              <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} bold />
              <Row label="Processing Fee (3.5%)" value={`$${fee.toFixed(2)}`} muted />
              <div className="my-2 border-t border-border" />
              <div className="flex justify-between items-baseline">
                <span className="font-display text-xl font-bold text-forest-deep">Grand Total</span>
                <span className="font-display text-3xl font-bold text-forest">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-forest" /> Secure checkout · Online tickets only
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : "text-forest-deep"} ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/* ---------- PLANTS GALLERY ---------- */
function PlantsGallery() {
  return (
    <section className="py-24 lg:py-32 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-forest">Everyone Takes One Home</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-forest-deep sm:text-6xl">
              Meet a few of your<br /><span className="text-gradient-forest">future roommates.</span>
            </h2>
          </div>
          <p className="text-lg text-muted-foreground">
            Monstera, snake plants, pothos, peace lilies, succulents, orchids, ferns, philodendrons — the venue event decides, and you take one home. Every time.
          </p>
        </div>

        <div className="mt-14 grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {plants.map((p, i) => (
            <div key={i} className="group relative overflow-hidden rounded-3xl bg-card border border-border shadow-soft hover:shadow-lifted transition-all hover:-translate-y-2">
              <div className="aspect-square overflow-hidden">
                <img loading="lazy" src={p.img} alt={p.name} width={800} height={800} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-forest">{p.tag}</p>
                <h3 className="mt-1 font-display text-lg font-bold text-forest-deep">{p.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- BINGO GAMES ---------- */
function BingoGames() {
  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-widest text-forest">10 Bingo Games</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-forest-deep sm:text-6xl">
            Ten shots at <span className="text-gradient-forest">glory.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">Every event plays all ten. Every game has a plant prize.</p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => (
            <div key={g.n} className={`relative overflow-hidden rounded-3xl border border-border p-6 shadow-soft hover:shadow-lifted transition-all hover:-translate-y-1 ${g.color}`}>
              <div className="flex items-start justify-between">
                <span className="font-display text-6xl font-black text-forest-deep/25">{g.n.toString().padStart(2, "0")}</span>
                <BingoPattern n={g.n} />
              </div>
              <h3 className="mt-2 font-display text-2xl font-bold text-forest-deep">{g.name}</h3>
              <p className="mt-2 text-sm text-forest-deep/80">{g.pattern}</p>
              <div className="mt-4 flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                <span className="rounded-full bg-white/70 px-3 py-1 text-forest-deep">{g.difficulty}</span>
                <span className="text-forest-deep/70">🎁 {g.prize}</span>
              </div>
            </div>
          ))}
          <div className="relative overflow-hidden rounded-3xl border border-border bg-forest-deep p-6 shadow-soft text-cream flex flex-col justify-center">
            <p className="text-xs font-bold uppercase tracking-widest text-lime mb-4">Game Breakdown</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Easy</span>
                <span className="font-display text-2xl font-bold text-lime">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Medium</span>
                <span className="font-display text-2xl font-bold text-sunny">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Hard</span>
                <span className="font-display text-2xl font-bold text-blossom">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Epic</span>
                <span className="font-display text-2xl font-bold text-sky-blue">1</span>
              </div>
              <div className="border-t border-cream/20 pt-3 mt-2 flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-widest">Total Games</span>
                <span className="font-display text-3xl font-black text-lime">10</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BingoPattern({ n }: { n: number }) {
  // small 5x5 pattern preview per game
  const patterns: Record<number, number[]> = {
    1: [0, 6, 12, 18, 24], // diagonal
    2: [0, 4, 20, 24],
    3: Array.from({ length: 25 }, (_, i) => i),
    4: [0, 6, 12, 18, 24, 4, 8, 16, 20],
    5: [0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24],
    6: [0, 1, 5, 6],
    7: [10, 11, 12, 13, 14, 5, 6, 7, 8, 9],
    8: [7, 11, 13, 12, 17],
    9: [0, 2, 4, 12, 20, 22, 24],
    10: [12, 6, 8, 16, 18, 2, 22, 10, 14],
  };
  const active = new Set(patterns[n] || []);
  return (
    <div className="grid grid-cols-5 gap-0.5">
      {Array.from({ length: 25 }, (_, i) => (
        <div key={i} className={`h-2 w-2 rounded-sm ${active.has(i) ? "bg-forest-deep" : "bg-white/60"}`} />
      ))}
    </div>
  );
}

/* ---------- TESTIMONIALS ---------- */
function Testimonials() {
  return (
    <section className="py-24 lg:py-32 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-widest text-forest">Happy Guests</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-forest-deep sm:text-6xl">
            Loved by <span className="text-gradient-forest">plant people.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <figure key={i} className="rounded-3xl bg-card border border-border p-8 shadow-soft flex flex-col">
              <div className="flex gap-0.5 text-sunny">
                {Array.from({ length: t.stars }).map((_, i) => <Star key={i} className="h-5 w-5 fill-sunny" />)}
              </div>
              <blockquote className="mt-4 text-forest-deep leading-relaxed">"{t.text}"</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 pt-6 border-t border-border">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-forest text-cream font-display font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-bold text-forest-deep">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.city}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- HOST YOUR EVENT ---------- */
function HostYourEvent() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    facilityName: "",
    facilityType: "",
    city: "",
    state: "",
    estimatedGuests: "",
    preferredDate: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const send = useServerFn(submitHostInquiry);

  const update = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await send({ data: form });
      setSubmitted(true);
      toast.success("Inquiry submitted! We'll be in touch soon.");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.startsWith("{")) {
        try {
          const parsed = JSON.parse(msg);
          setErrors(parsed);
        } catch {
          toast.error(msg || "Something went wrong. Please try again.");
        }
      } else {
        toast.error(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="host" className="py-24 lg:py-32 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: image + copy */}
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-forest">Bring the Party to You</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-forest-deep sm:text-5xl lg:text-6xl">
              Host your next<br /><span className="text-gradient-forest">Greenhouse Bingo.</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              Want to bring the plant party to your venue, garden center, or event space? We'll bring the games, the plants, and the energy. You bring the crowd.
            </p>
            <div className="mt-8 rounded-3xl overflow-hidden shadow-lifted border border-border">
              <img loading="lazy" src={hostBingoImg} alt="Lush plant-filled event space" width={1200} height={800} className="w-full h-auto object-cover" />
            </div>
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
                <Sprout className="h-6 w-6 text-lime" />
                <p className="mt-2 font-display text-lg font-bold text-forest-deep">Plants Included</p>
                <p className="text-sm text-muted-foreground">Every guest goes home with a plant.</p>
              </div>
              <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
                <Users className="h-6 w-6 text-blossom" />
                <p className="mt-2 font-display text-lg font-bold text-forest-deep">Full Service</p>
                <p className="text-sm text-muted-foreground">We handle setup, hosting, and cleanup.</p>
              </div>
              <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
                <Ticket className="h-6 w-6 text-sunny" />
                <p className="mt-2 font-display text-lg font-bold text-forest-deep">10 Games</p>
                <p className="text-sm text-muted-foreground">Custom Bingo cards and prizes.</p>
              </div>
              <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
                <Sparkles className="h-6 w-6 text-sky-blue" />
                <p className="mt-2 font-display text-lg font-bold text-forest-deep">Marketing Boost</p>
                <p className="text-sm text-muted-foreground">Promoted to our growing community.</p>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="rounded-4xl bg-card border border-border shadow-lifted p-8 lg:p-10">
            {submitted ? (
              <div className="text-center py-12">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-lime/20">
                  <CheckCircle2 className="h-10 w-10 text-forest" />
                </div>
                <h3 className="mt-6 font-display text-3xl font-bold text-forest-deep">You're on the list!</h3>
                <p className="mt-3 text-muted-foreground max-w-sm mx-auto">
                  Thanks for your interest in hosting Greenhouse Bingo. Our team will reach out within 2 business days to chat details.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", facilityName: "", facilityType: "", city: "", state: "", estimatedGuests: "", preferredDate: "", message: "" }); }}
                  className="mt-8 rounded-full border border-border px-6 py-3 text-sm font-semibold text-forest-deep hover:bg-secondary transition"
                >
                  Submit another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h3 className="font-display text-2xl font-bold text-forest-deep">Request a Host Kit</h3>
                  <p className="text-sm text-muted-foreground mt-1">Tell us about your venue and we'll get back to you fast.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-forest-deep mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Jane Doe" className="w-full rounded-2xl border border-border bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-forest" />
                    </div>
                    {errors.name && <p className="mt-1 text-xs text-tomato">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-forest-deep mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="jane@venue.com" className="w-full rounded-2xl border border-border bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-forest" />
                    </div>
                    {errors.email && <p className="mt-1 text-xs text-tomato">{errors.email}</p>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-forest-deep mb-1.5">Phone <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" className="w-full rounded-2xl border border-border bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-forest" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-forest-deep mb-1.5">Facility Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input value={form.facilityName} onChange={(e) => update("facilityName", e.target.value)} placeholder="The Garden Tap" className="w-full rounded-2xl border border-border bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-forest" />
                    </div>
                    {errors.facilityName && <p className="mt-1 text-xs text-tomato">{errors.facilityName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-forest-deep mb-1.5">Facility Type</label>
                  <select value={form.facilityType} onChange={(e) => update("facilityType", e.target.value)} className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm focus:outline-none focus:border-forest text-forest-deep">
                    <option value="">Select a type</option>
                    <option value="Brewery / Taproom">Venue / Taproom</option>
                    <option value="Garden Center / Nursery">Garden Center / Nursery</option>
                    <option value="Restaurant / Bar">Restaurant / Bar</option>
                    <option value="Event Venue">Event Venue</option>
                    <option value="Community Space">Community Space</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.facilityType && <p className="mt-1 text-xs text-tomato">{errors.facilityType}</p>}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-forest-deep mb-1.5">City</label>
                    <div className="relative">
                      <MapPinned className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Jacksonville" className="w-full rounded-2xl border border-border bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-forest" />
                    </div>
                    {errors.city && <p className="mt-1 text-xs text-tomato">{errors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-forest-deep mb-1.5">State</label>
                    <input value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="FL" className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm focus:outline-none focus:border-forest" />
                    {errors.state && <p className="mt-1 text-xs text-tomato">{errors.state}</p>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-forest-deep mb-1.5">Estimated Guests</label>
                    <select value={form.estimatedGuests} onChange={(e) => update("estimatedGuests", e.target.value)} className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm focus:outline-none focus:border-forest text-forest-deep">
                      <option value="">Select range</option>
                      <option value="25-50">25 – 50</option>
                      <option value="50-100">50 – 100</option>
                      <option value="100-200">100 – 200</option>
                      <option value="200+">200+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-forest-deep mb-1.5">Preferred Date <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="date" value={form.preferredDate} onChange={(e) => update("preferredDate", e.target.value)} className="w-full rounded-2xl border border-border bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-forest text-forest-deep" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-forest-deep mb-1.5">Message <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <textarea value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Tell us a bit more about your space, audience, or anything special you have in mind..." rows={4} className="w-full rounded-2xl border border-border bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-forest resize-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-forest px-8 py-4 text-lg font-bold text-cream hover:bg-forest-deep transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-5 w-5 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <>
                      <Send className="h-5 w-5" /> Submit Inquiry
                    </>
                  )}
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  No commitment required. We'll review your request and reach out to discuss next steps.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-12 lg:gap-20 items-start">
          {/* Left content */}
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-forest">FAQ</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-forest-deep sm:text-5xl">
              Questions? <span className="text-gradient-forest">We've got answers.</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              Still curious? Here's everything you need to know before your first Greenhouse Bingo night. If you don't see your question, just reach out — we love talking plants.
            </p>

            <div className="mt-8 rounded-3xl bg-card border border-border shadow-soft p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime/20 text-forest">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-forest-deep">Can't find your answer?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Shoot us a message and we'll get back within 24 hours.
                  </p>
                  <a
                    href="mailto:hello@greenhousebingo.com"
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-cream hover:bg-forest-deep transition"
                  >
                    <Mail className="h-4 w-4" /> Contact Us
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right: accordion */}
          <div className="divide-y divide-border rounded-3xl bg-card border border-border shadow-soft overflow-hidden">
            {faqs.map((f, i) => (
              <div key={i}>
                <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-6 text-left hover:bg-secondary/50 transition">
                  <span className="font-display text-lg font-bold text-forest-deep">{f.q}</span>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-cream transition-transform ${open === i ? "rotate-45" : ""}`}>
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
                {open === i && (
                  <div className="px-6 pb-6 text-muted-foreground leading-relaxed animate-fade-up">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- FINAL CTA ---------- */
function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-forest to-forest-deep p-12 lg:p-20 text-center text-cream shadow-lifted">
          <Leaf className="absolute left-10 top-10 h-16 w-16 text-lime/40 animate-float-leaf" />
          <Sprout className="absolute right-10 top-14 h-20 w-20 text-lime/40 animate-float-slow" />
          <Leaf className="absolute right-16 bottom-10 h-14 w-14 text-lime/30 animate-float-leaf" style={{ animationDelay: "1.5s" }} />

          <div className="relative">
            <Sun className="mx-auto h-10 w-10 text-sunny" />
            <h2 className="mt-6 font-display text-5xl font-bold sm:text-7xl">
              Ready to win<br /><span className="text-lime italic">a plant?</span>
            </h2>
            <p className="mt-6 max-w-xl mx-auto text-lg text-cream/85">
              Join thousands of plant people. Tickets sell out — sometimes in days. Grab yours before your local venue fills up.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <CTACartButton />
              <a href="#events" className="rounded-full glass-dark px-8 py-4 text-lg font-bold text-cream hover:bg-white/20 transition">
                See All Events
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTACartButton() {
  const { totalTickets } = useCart();
  return (
    <a
      href="#events"
      aria-label={totalTickets > 0 ? `Buy Tickets, ${totalTickets} tickets in cart` : "Buy Tickets"}
      className="inline-flex flex-wrap items-center justify-center gap-3 rounded-full bg-lime px-8 py-4 text-lg font-bold text-forest-deep hover:bg-cream transition shadow-glow"
    >
      <span>Buy Tickets{totalTickets > 0 ? ` (${totalTickets})` : ""}</span>
      {totalTickets > 0 && (
        <span className="inline-flex items-center rounded-full border-2 border-forest-deep bg-cream px-3 py-1 text-base font-black leading-none text-forest-deep shadow-md">
          {totalTickets} ticket{totalTickets === 1 ? "" : "s"}
        </span>
      )}
    </a>
  );
}
