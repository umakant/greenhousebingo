import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getEventBySlug, events } from "@/lib/events-data";
import { useCart } from "@/lib/cart-context";
import heroImg from "@/assets/hero-brewery-bingo.jpg";
import {
  MapPin, Phone, Clock, Calendar, Ticket, Utensils, ShieldCheck, User,
  Sprout, Plus, Minus, ChevronRight, Leaf, QrCode, ScanLine, Mail,
  Sparkles, CheckCircle2, CreditCard,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/events/$slug")({
  head: ({ params }) => {
    const e = getEventBySlug(params.slug);
    if (!e) return { meta: [{ title: "Event Not Found · Plant Bingo" }, { name: "robots", content: "noindex" }] };
    const title = `Plant Bingo — ${e.city}, ${e.state} · ${e.month} ${e.day}`;
    const description = `Plant Bingo at ${e.venue} on ${e.day_name} ${e.month} ${e.day}. Play bingo, win plants, everyone goes home a winner.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  loader: ({ params }) => {
    const e = getEventBySlug(params.slug);
    if (!e) throw notFound();
    return e;
  },
  notFoundComponent: EventNotFound,
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="font-display text-4xl font-bold text-forest-deep">Something went wrong.</h1>
        <button onClick={reset} className="mt-6 rounded-full bg-forest px-6 py-3 font-bold text-cream">Try Again</button>
      </div>
      <SiteFooter />
    </div>
  ),
  component: EventDetail,
});

const games = [
  { n: 1, name: "Traditional Bingo", pattern: "Any line — horizontal, vertical, or diagonal", difficulty: "Easy", prize: "Pothos" },
  { n: 2, name: "Four Corners", pattern: "Mark all four corner squares", difficulty: "Easy", prize: "Succulent" },
  { n: 3, name: "Blackout", pattern: "Cover the entire card", difficulty: "Hard", prize: "Monstera" },
  { n: 4, name: "Letter X", pattern: "Both diagonals form an X", difficulty: "Medium", prize: "Snake Plant" },
  { n: 5, name: "Picture Frame", pattern: "Complete the outer border", difficulty: "Medium", prize: "Peace Lily" },
  { n: 6, name: "Postage Stamp", pattern: "2x2 block in any corner", difficulty: "Easy", prize: "Succulent" },
  { n: 7, name: "Double Bingo", pattern: "Two winning lines", difficulty: "Medium", prize: "Rubber Plant" },
  { n: 8, name: "Lucky Leaf Pattern", pattern: "Leaf-shaped pattern on card", difficulty: "Hard", prize: "Fern" },
  { n: 9, name: "Crazy Garden Pattern", pattern: "Surprise pattern revealed live", difficulty: "Hard", prize: "Orchid" },
  { n: 10, name: "Wild Card Finale", pattern: "Winner picks any plant on the floor", difficulty: "Epic", prize: "Your Choice" },
];

const eventFaqs = [
  { q: "How do I get in?", a: "After purchase you'll receive an email with a unique QR code for each ticket. Show the QR code at the door and we'll scan you in." },
  { q: "How many plants do I take home?", a: "One plant per ticket purchased. Buy 2 tickets, take home 2 plants." },
  { q: "Can I buy tickets at the door?", a: "No. Tickets are online only so we can guarantee a plant for every guest." },
  { q: "What about extra Bingo cards?", a: "Your ticket includes 10 cards. You can add more for $5 each — during purchase or at the door if any are left." },
  { q: "Is there a fee?", a: "A 3.5% card processing fee is added at checkout. Everything else you see is the final price." },
  { q: "What if I can't make it?", a: "Tickets are transferable — forward your QR email to a friend. We do not offer refunds under 48 hours before the event." },
];

function EventNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-forest">404</p>
        <h1 className="mt-3 font-display text-5xl font-bold text-forest-deep">Event not found</h1>
        <p className="mt-4 text-muted-foreground">We couldn't find that event. Browse upcoming Plant Bingo nights instead.</p>
        <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 font-bold text-cream">Back Home <ChevronRight className="h-4 w-4" /></Link>
      </div>
      <SiteFooter />
    </div>
  );
}

const PRICE = 30;
const EXTRA_CARD = 5;
const FEE_RATE = 0.035;

function EventDetail() {
  const e = Route.useLoaderData();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [qty, setQty] = useState(2);
  const [extraCards, setExtraCards] = useState(2);
  const [extraCardsTouched, setExtraCardsTouched] = useState(false);

  const updateQty = (next: number) => {
    setQty(next);
    if (!extraCardsTouched) setExtraCards(next);
  };
  const updateExtraCards = (next: number) => {
    setExtraCards(next);
    setExtraCardsTouched(true);
  };
  const scarce = !e.soldOut && e.left < 25;
  const soldOut = e.soldOut ?? false;

  const ticketsSubtotal = qty * PRICE;
  const cardsSubtotal = extraCards * EXTRA_CARD;
  const subtotal = ticketsSubtotal + cardsSubtotal;
  const fee = Math.round(subtotal * FEE_RATE * 100) / 100;
  const total = Math.round((subtotal + fee) * 100) / 100;

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <SiteNav />

      {/* HERO with image */}
      <section className="relative h-[52vh] min-h-[420px] w-full overflow-hidden">
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/95 via-forest-deep/60 to-forest-deep/20" />
        <Leaf className="absolute right-[8%] top-24 h-20 w-20 text-lime/40" />
        <Sprout className="absolute left-[6%] bottom-16 h-16 w-16 text-lime/40" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 h-full flex flex-col justify-end pb-12">
          <Link to="/" className="text-sm font-semibold text-cream/90 hover:text-lime self-start">← Back to all events</Link>
          <div className="mt-6 flex flex-wrap items-end gap-6">
            <div className="rounded-2xl bg-white shadow-lifted px-6 py-4 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-tomato">{e.month}</div>
              <div className="font-display text-5xl font-bold text-forest-deep leading-none">{e.day}</div>
              <div className="text-xs font-semibold text-muted-foreground mt-1">{e.year}</div>
            </div>
            <div className="flex-1 min-w-[280px]">
              <p className="text-sm font-bold uppercase tracking-widest text-lime">{e.state}</p>
              <h1 className="mt-2 font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-cream drop-shadow">
                Plant Bingo · {e.city}
              </h1>
              <p className="mt-3 text-lg text-cream/90">{e.venue}</p>
              <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-cream">
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-lime" /> {e.day_name}</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-lime" /> Doors Open {e.doorsOpen}</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-lime" /> BINGO {e.time} – {e.endTime}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-lime" /> {e.city}, {e.state}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Everyone Leaves With a Plant callout */}
      <section className="bg-lime/25 border-b border-lime/40">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-6 flex flex-wrap items-center justify-center gap-4 text-center">
          <Sparkles className="h-6 w-6 text-forest-deep" />
          <p className="font-display text-xl sm:text-2xl font-bold text-forest-deep">
            Everyone Leaves With a Plant. 🌿 Guaranteed.
          </p>
          <Sparkles className="h-6 w-6 text-forest-deep" />
        </div>
      </section>

      {/* Content grid */}
      <section className="py-12 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 grid gap-10 lg:grid-cols-3">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-10">
            {/* Description */}
            <div>
              <h2 className="font-display text-3xl font-bold text-forest-deep">You're Invited to Plant Bingo at {e.venue}!</h2>
              <div className="mt-4 space-y-4 text-forest-deep/85 leading-relaxed">
                <p>Join us for a fun-filled evening at Plant Bingo, where great company, complimentary adult beverages, light refreshments, and exciting rounds of bingo come together for a one-of-a-kind experience. Instead of playing for cash, you'll be competing for beautiful plants, making every game a chance to take home something fresh and green.</p>
                <p>Whether you're a passionate plant enthusiast, a longtime bingo fan, or simply looking for a unique night out with friends, Plant Bingo offers the perfect mix of laughter, relaxation, and community. Best of all, every attendee is guaranteed to go home with a plant, making everyone a winner.</p>
                <p>Tickets are available online only to ensure we have enough plants for every guest. Seating is limited, so reserve your spot today and get ready for an evening that's equal parts happy hour, plant party, and unforgettable fun!</p>
              </div>
            </div>

            {/* What's included */}
            <div className="rounded-3xl bg-card border border-border p-8 shadow-soft">
              <h3 className="font-display text-2xl font-bold text-forest-deep">What's Included with Every $30 Ticket</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  "10 Bingo cards",
                  "One guaranteed take-home plant",
                  "Complimentary adult beverages",
                  "Light refreshments",
                  "10 rounds of Plant Bingo",
                  "Sponsor discount card",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-forest flex-shrink-0 mt-0.5" />
                    <span className="text-forest-deep font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-secondary/50 p-4 text-sm text-forest-deep">
                <span className="font-semibold">Want more chances to win?</span> Add extra Bingo cards for <span className="font-bold">$5 each</span> during checkout — or at the door if any remain.
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Online tickets only · 3.5% card processing fee added at checkout
              </p>
            </div>

            {/* Check-in / QR */}
            <div className="rounded-3xl bg-forest-deep text-cream p-8 shadow-lifted">
              <div className="flex flex-wrap items-start gap-6">
                <div className="rounded-2xl bg-cream text-forest-deep p-4">
                  <QrCode className="h-16 w-16" />
                </div>
                <div className="flex-1 min-w-[240px]">
                  <h3 className="font-display text-2xl font-bold">Check-in is a breeze</h3>
                  <ol className="mt-4 space-y-3 text-cream/90">
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-lime text-forest-deep text-xs font-bold flex-shrink-0">1</span>
                      <span><span className="font-semibold text-cream">Buy online.</span> Your unique QR code is generated the moment your purchase is complete.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-lime text-forest-deep text-xs font-bold flex-shrink-0">2</span>
                      <span className="inline-flex items-start gap-1.5"><Mail className="h-4 w-4 mt-0.5 flex-shrink-0 text-lime" /><span><span className="font-semibold text-cream">Check your email.</span> One QR code per ticket, delivered instantly.</span></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-lime text-forest-deep text-xs font-bold flex-shrink-0">3</span>
                      <span className="inline-flex items-start gap-1.5"><ScanLine className="h-4 w-4 mt-0.5 flex-shrink-0 text-lime" /><span><span className="font-semibold text-cream">Scan at the door.</span> Our host scans your QR code and hands you your cards.</span></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-lime text-forest-deep text-xs font-bold flex-shrink-0">4</span>
                      <span><span className="font-semibold text-cream">Pick up your plants at the end.</span> Plant pickup quantity matches your ticket count — 2 tickets, 2 plants.</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Venue */}
            <div className="rounded-3xl bg-card border border-border p-8 shadow-soft">
              <h3 className="font-display text-2xl font-bold text-forest-deep flex items-center gap-2"><MapPin className="h-6 w-6 text-forest" /> Venue</h3>
              <p className="mt-4 font-semibold text-forest-deep text-lg">{e.venue}</p>
              <p className="text-muted-foreground">{e.address}</p>
              <a href={`tel:${e.venuePhone.replace(/[^0-9+]/g, "")}`} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline">
                <Phone className="h-4 w-4" /> {e.venuePhone}
              </a>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-secondary/50 p-5">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-forest">
                    <ShieldCheck className="h-4 w-4" /> Age Policy
                  </div>
                  <p className="mt-2 font-semibold text-forest-deep">
                    {e.under21 ? "All ages welcome. Under 21 must be accompanied by an adult." : "21+ only. Valid ID required at entry."}
                  </p>
                </div>
                <div className="rounded-2xl bg-secondary/50 p-5">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-forest">
                    <Utensils className="h-4 w-4" /> Food & Drinks
                  </div>
                  <p className="mt-2 font-semibold text-forest-deep">{e.foodAndDrinks}</p>
                </div>
              </div>
            </div>

            {/* Host */}
            <div className="rounded-3xl bg-card border border-border p-8 shadow-soft">
              <h3 className="font-display text-2xl font-bold text-forest-deep flex items-center gap-2"><User className="h-6 w-6 text-forest" /> Meet Your Host</h3>
              <div className="mt-4 flex items-start gap-4">
                <img
                  src={e.host.image}
                  alt={e.host.name}
                  className="h-16 w-16 rounded-full object-cover flex-shrink-0 border-2 border-lime/50"
                  loading="lazy"
                  width={64}
                  height={64}
                />
                <div>
                  <p className="font-display text-xl font-bold text-forest-deep">{e.host.name}</p>
                  <p className="mt-2 text-forest-deep/80 leading-relaxed">{e.host.bio}</p>
                </div>
              </div>
            </div>

            {/* Sponsor */}
            <div className="rounded-3xl bg-forest-deep text-cream p-8 shadow-lifted">
              <p className="text-xs font-bold uppercase tracking-widest text-lime">Sponsored by</p>
              <h3 className="mt-2 font-display text-3xl font-bold">{e.sponsor.name}</h3>
              <div className="mt-4 flex flex-wrap gap-6 text-sm">
                <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-lime" /> {e.sponsor.address}</span>
                <a href={`tel:${e.sponsor.phone.replace(/[^0-9+]/g, "")}`} className="inline-flex items-center gap-2 hover:text-lime">
                  <Phone className="h-4 w-4 text-lime" /> {e.sponsor.phone}
                </a>
              </div>
              <div className="mt-5 rounded-2xl bg-lime/20 border border-lime/30 p-4 text-cream">
                <p className="font-semibold">🎁 {e.sponsor.perk}</p>
              </div>
            </div>

            {/* 10 Bingo Games */}
            <div>
              <h3 className="font-display text-3xl font-bold text-forest-deep">10 Rounds. 10 Chances to Win.</h3>
              <p className="mt-2 text-muted-foreground">Every event runs the same ten games, from classic to unpredictable.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {games.map((g) => (
                  <div key={g.n} className="rounded-2xl bg-card border border-border p-4 shadow-soft">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-cream text-sm font-bold">{g.n}</span>
                        <span className="font-display text-lg font-bold text-forest-deep">{g.name}</span>
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                        g.difficulty === "Easy" ? "bg-lime/30 text-forest-deep" :
                        g.difficulty === "Medium" ? "bg-sunny/40 text-forest-deep" :
                        g.difficulty === "Hard" ? "bg-blossom/40 text-forest-deep" :
                        "bg-tomato text-cream"
                      }`}>{g.difficulty}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{g.pattern}</p>
                    <p className="mt-1 text-xs font-semibold text-forest">Prize: {g.prize}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h3 className="font-display text-3xl font-bold text-forest-deep">Frequently Asked Questions</h3>
              <div className="mt-6 space-y-3">
                {eventFaqs.map((f) => (
                  <details key={f.q} className="group rounded-2xl bg-card border border-border p-5 shadow-soft [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer items-center justify-between gap-4">
                      <span className="font-semibold text-forest-deep">{f.q}</span>
                      <Plus className="h-5 w-5 text-forest transition group-open:rotate-45" />
                    </summary>
                    <p className="mt-3 text-forest-deep/80 leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar — Buy Tickets */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-3xl bg-card border border-border p-6 shadow-lifted">
              <p className="text-xs font-bold uppercase tracking-widest text-forest">Reserve your seat</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold text-forest-deep">${PRICE}</span>
                <span className="text-sm text-muted-foreground">per ticket · includes 10 cards</span>
              </div>

              {/* Event summary */}
              <div className="mt-5 space-y-2 rounded-2xl bg-secondary/40 p-4 text-sm">
                <div className="flex items-center gap-2 text-forest-deep">
                  <Calendar className="h-4 w-4 text-forest flex-shrink-0" />
                  <span className="font-semibold">{e.day_name}, {e.month} {e.day}, {e.year}</span>
                </div>
                <div className="flex items-center gap-2 text-forest-deep">
                  <Clock className="h-4 w-4 text-forest flex-shrink-0" />
                  <span>Doors Open {e.doorsOpen} · BINGO {e.time} – {e.endTime}</span>
                </div>
                <div className="flex items-start gap-2 text-forest-deep">
                  <MapPin className="h-4 w-4 text-forest flex-shrink-0 mt-0.5" />
                  <span>{e.venue}<br /><span className="text-xs text-muted-foreground">{e.address}</span></span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Ticket className="h-4 w-4 text-forest flex-shrink-0" />
                  {soldOut ? (
                    <span className="font-bold text-forest-deep">Sold out</span>
                  ) : (
                    <span className={`font-bold ${scarce ? "text-tomato" : "text-forest-deep"}`}>
                      {e.left} tickets remaining
                    </span>
                  )}
                </div>
              </div>

              {/* Ticket qty */}
              <div className="mt-6">
                <label className="text-sm font-semibold text-forest-deep">Tickets</label>
                <div className="mt-2 flex items-center gap-3">
                  <button onClick={() => updateQty(Math.max(1, qty - 1))} disabled={soldOut} className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Decrease tickets">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-display text-2xl font-bold text-forest-deep w-10 text-center">{qty}</span>
                  <button onClick={() => updateQty(soldOut ? qty : Math.min(e.left, qty + 1))} disabled={soldOut} className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Increase tickets">
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="ml-auto text-sm text-muted-foreground">× ${PRICE}</span>
                </div>
              </div>

              {/* Extra cards */}
              <div className="mt-5">
                <label className="text-sm font-semibold text-forest-deep">Extra Bingo cards</label>
                <p className="text-xs text-muted-foreground">Add more chances to win — $5 each</p>
                <div className="mt-2 flex items-center gap-3">
                  <button onClick={() => updateExtraCards(Math.max(0, extraCards - 1))} disabled={soldOut} className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Decrease extra cards">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-display text-2xl font-bold text-forest-deep w-10 text-center">{extraCards}</span>
                  <button onClick={() => updateExtraCards(soldOut ? extraCards : extraCards + 1)} disabled={soldOut} className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Increase extra cards">
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="ml-auto text-sm text-muted-foreground">× ${EXTRA_CARD}</span>
                </div>
              </div>

              {/* Fee breakdown */}
              <div className="mt-6 space-y-2 text-sm border-t border-border pt-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>{qty} ticket{qty > 1 ? "s" : ""}</span>
                  <span>${ticketsSubtotal.toFixed(2)}</span>
                </div>
                {extraCards > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{extraCards} extra card{extraCards > 1 ? "s" : ""}</span>
                    <span>${cardsSubtotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Card fee (3.5%)</span>
                  <span>${fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-forest-deep pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="font-display text-2xl">${total.toFixed(2)}</span>
                </div>
              </div>

              {soldOut ? (
                <button disabled className="mt-6 flex items-center justify-center gap-2 rounded-full bg-muted px-6 py-4 font-bold text-muted-foreground w-full cursor-not-allowed">
                  <Ticket className="h-5 w-5" /> Sold Out
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Live Next.js plant-bingo checkout (free + winning plant selection).
                    window.location.href = `/events/${encodeURIComponent(e.slug)}/checkout?tickets=${qty}&extras=${extraCards}`;
                  }}
                  className="mt-6 flex items-center justify-center gap-2 rounded-full bg-forest px-6 py-4 font-bold text-cream hover:bg-forest-deep transition w-full shadow-glow cursor-pointer"
                >
                  <Ticket className="h-5 w-5" /> Checkout · ${total.toFixed(2)}
                </button>
              )}

              <p className="mt-3 text-xs text-muted-foreground text-center">
                Online only · QR code emailed instantly · Everyone leaves with a plant
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* MOBILE STICKY BUY BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border bg-white/95 backdrop-blur shadow-lifted">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground truncate">{qty} ticket{qty > 1 ? "s" : ""}{extraCards > 0 ? ` + ${extraCards} card${extraCards > 1 ? "s" : ""}` : ""}</div>
            <div className="font-display text-xl font-bold text-forest-deep">${total.toFixed(2)}</div>
          </div>
          {soldOut ? (
            <button disabled className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-3 font-bold text-muted-foreground cursor-not-allowed">
              <Ticket className="h-4 w-4" /> Sold Out
            </button>
          ) : (
            <button
              onClick={() => {
                addItem({
                  slug: e.slug,
                  city: e.city,
                  state: e.state,
                  venue: e.venue,
                  qty,
                  extraCards,
                  price: PRICE,
                  extraCardPrice: EXTRA_CARD,
                });
                toast.success(`${qty} ticket${qty > 1 ? "s" : ""} added to cart`);
                navigate({ to: "/buy-tickets" });
              }}
              className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 font-bold text-cream hover:bg-forest-deep transition shadow-glow cursor-pointer"
            >
              <Ticket className="h-4 w-4" /> Buy Tickets
            </button>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

// Keep reference so tree-shaker retains the events data used by the loader
void events;
