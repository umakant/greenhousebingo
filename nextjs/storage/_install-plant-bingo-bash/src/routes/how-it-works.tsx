import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  Ticket,
  QrCode,
  ScanLine,
  Sprout,
  Users,
  Leaf,
  Sparkles,
  CheckCircle2,
  Clock,
  MapPin,
  Trophy,
  Hand,
  Volume2,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works · Greenhouse Bingo" },
      {
        name: "description",
        content:
          "A step-by-step guide to Plant BINGO nights — from buying your ticket to walking out with your new houseplant. Full official rules included.",
      },
      { property: "og:title", content: "How It Works · Greenhouse Bingo" },
      {
        property: "og:description",
        content:
          "Everything you need to know about attending a Plant BINGO night, plus the full official rules of the game.",
      },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  {
    icon: Ticket,
    title: "1. Grab your ticket",
    body:
      "Pick a night at a greenhouse near you and reserve your seat online. Tickets include your entry, all 10 bingo cards for the night, a dauber, and a shot at 10 plants.",
  },
  {
    icon: MapPin,
    title: "2. Show up early",
    body:
      "Doors open 30 minutes before the first game. Grab a drink, wander the greenhouse, and scope out the plants on the prize table — one of them is going home with somebody.",
  },
  {
    icon: QrCode,
    title: "3. Check in at the door",
    body:
      "Show the QR code from your confirmation email. Our host will hand you your card pack and dauber and point you to your table.",
  },
  {
    icon: Volume2,
    title: "4. Play 10 rounds",
    body:
      "Our caller runs 10 different games throughout the night — Traditional, Four Corners, Blackout and more. Each game has its own winning pattern and its own plant prize.",
  },
  {
    icon: Hand,
    title: "5. Yell BINGO!",
    body:
      "When you complete the pattern, shout BINGO loud enough for the caller to hear. A staff member will verify your card at your seat.",
  },
  {
    icon: Sprout,
    title: "6. Pick your plant & go home happy",
    body:
      "Winners walk to the prize table, choose from the plants for that round, and take one home. Even non-winners leave with a starter cutting on the way out.",
  },
];

const gameRules = [
  {
    n: 1,
    name: "Traditional Bingo",
    pattern: "Any 5-in-a-row — horizontal, vertical, or diagonal.",
  },
  { n: 2, name: "Four Corners", pattern: "Mark all four corner squares of your card." },
  { n: 3, name: "Postage Stamp", pattern: "Any 2×2 block of four squares in any corner." },
  { n: 4, name: "Letter X", pattern: "Complete both diagonals so they form an X." },
  { n: 5, name: "Picture Frame", pattern: "Complete the entire outer border of the card." },
  { n: 6, name: "Double Bingo", pattern: "Two separate complete lines on the same card." },
  { n: 7, name: "Lucky Leaf", pattern: "A leaf-shaped pattern shown on screen before the round." },
  { n: 8, name: "Crazy Garden", pattern: "A surprise pattern the caller reveals live." },
  { n: 9, name: "Blackout", pattern: "Cover every square on your card. Longest game of the night." },
  {
    n: 10,
    name: "Wild Card Finale",
    pattern: "First blackout wins — and picks ANY plant on the floor, prize table or not.",
  },
];

const faqs = [
  {
    q: "Do I need to know how to play bingo?",
    a: "Nope. If you can find a number on a grid and stamp it, you can play. Our host walks through every pattern before each round.",
  },
  {
    q: "What if two people yell BINGO at the same time?",
    a: "Both cards get verified. If both are valid on the same called number, both players win and each pick a plant from the round's prize selection.",
  },
  {
    q: "Can I bring kids?",
    a: "Most venues are all-ages until 8pm, then 21+. Check the specific event page for your city — the rules are listed there.",
  },
  {
    q: "What if I don't win anything?",
    a: "Every single ticket holder leaves with a plant. Non-winners pick up a starter cutting or small succulent at the door on the way out.",
  },
  {
    q: "How long is a night?",
    a: "About 2 to 2.5 hours from first ball to Wild Card Finale, including a short break in the middle.",
  },
  {
    q: "Can I trade or return my plant?",
    a: "Plants are yours the moment you win them. We can't swap them mid-event, but our staff will happily give you care tips before you head out.",
  },
];

function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-b from-secondary/40 to-background">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-forest">How It Works</p>
          <h1 className="mt-3 font-display text-5xl font-bold text-forest-deep sm:text-6xl">
            Bingo. Plants. New friends.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Here's exactly what a Plant BINGO night looks like — from the second you buy a ticket to the moment you walk out with a new houseplant.
          </p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <Link to="/events" className="rounded-full bg-forest px-6 py-3 font-bold text-cream hover:bg-forest-deep transition">
              Find a night near you
            </Link>
            <a href="#rules" className="rounded-full border border-border bg-white px-6 py-3 font-bold text-forest-deep hover:bg-secondary transition">
              Read the full rules
            </a>
          </div>
        </div>
      </section>

      {/* STEP BY STEP */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest text-forest">The Night, Step by Step</p>
            <h2 className="mt-2 font-display text-4xl font-bold text-forest-deep sm:text-5xl">
              Six steps to a new plant.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {steps.map((s) => (
              <div key={s.title} className="rounded-2xl border border-border bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-forest/10 text-forest">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-2xl font-bold text-forest-deep">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="py-16 bg-secondary/40">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-sm font-bold uppercase tracking-widest text-forest">What's Included</p>
            <h2 className="mt-2 font-display text-4xl font-bold text-forest-deep">
              Everything you need is in your ticket.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Entry to the greenhouse for the full 2-hour event",
              "A pack of 10 bingo cards — one for each round",
              "A dauber (bingo marker) — yours to keep",
              "10 chances to win a houseplant",
              "A guaranteed starter plant or cutting on the way out",
              "Full plant care card for whatever you take home",
            ].map((t) => (
              <div key={t} className="flex items-start gap-3 rounded-xl bg-white p-4 border border-border">
                <CheckCircle2 className="h-5 w-5 text-forest shrink-0 mt-0.5" />
                <p className="text-forest-deep">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FULL RULES */}
      <section id="rules" className="py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest text-forest">Official Rules</p>
            <h2 className="mt-2 font-display text-4xl font-bold text-forest-deep sm:text-5xl">
              How to play Plant BINGO.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              The complete, no-surprises rundown. Same rules at every Greenhouse Bingo venue across the country.
            </p>
          </div>

          {/* Card anatomy */}
          <div className="rounded-2xl border border-border bg-white p-6 lg:p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <ScanLine className="h-6 w-6 text-forest" />
              <h3 className="font-display text-2xl font-bold text-forest-deep">The Bingo Card</h3>
            </div>
            <div className="mt-4 grid gap-6 lg:grid-cols-2 items-start">
              <div className="space-y-3 text-muted-foreground">
                <p>Each card is a 5×5 grid with the letters <strong className="text-forest-deep">B–I–N–G–O</strong> across the top.</p>
                <ul className="space-y-2 list-disc pl-5">
                  <li><strong className="text-forest-deep">B</strong> column: numbers 1–15</li>
                  <li><strong className="text-forest-deep">I</strong> column: numbers 16–30</li>
                  <li><strong className="text-forest-deep">N</strong> column: numbers 31–45 (center is a FREE space)</li>
                  <li><strong className="text-forest-deep">G</strong> column: numbers 46–60</li>
                  <li><strong className="text-forest-deep">O</strong> column: numbers 61–75</li>
                </ul>
                <p>The FREE center square counts as automatically marked in every game.</p>
              </div>

              {/* Sample card */}
              <div className="rounded-xl border-2 border-forest/20 bg-cream p-3">
                <div className="grid grid-cols-5 gap-1 text-center font-bold">
                  {["B", "I", "N", "G", "O"].map((l) => (
                    <div key={l} className="rounded-md bg-forest text-cream py-2 font-display text-lg">{l}</div>
                  ))}
                  {[
                    [7, 22, 34, 51, 68],
                    [3, 19, 41, 58, 72],
                    [12, 27, "FREE", 47, 65],
                    [9, 24, 38, 53, 74],
                    [14, 30, 45, 60, 61],
                  ].flat().map((n, i) => (
                    <div
                      key={i}
                      className={`aspect-square flex items-center justify-center rounded-md border border-forest/20 text-sm ${n === "FREE" ? "bg-sunny/60 text-forest-deep text-xs" : "bg-white text-forest-deep"}`}
                    >
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Calling numbers */}
          <div className="mt-6 rounded-2xl border border-border bg-white p-6 lg:p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <Volume2 className="h-6 w-6 text-forest" />
              <h3 className="font-display text-2xl font-bold text-forest-deep">How Numbers Are Called</h3>
            </div>
            <ol className="mt-4 space-y-3 text-muted-foreground list-decimal pl-5">
              <li>The caller draws a numbered ball from an air-mix machine at the front of the greenhouse.</li>
              <li>They announce the letter and number ("B-7", "O-72") and display it on the big screen behind them.</li>
              <li>If that number appears anywhere on your card, stamp it with your dauber.</li>
              <li>Numbers are called roughly every 8–10 seconds. If you miss one, the last 5 calls stay on the screen.</li>
              <li>The round ends the moment someone completes the game's winning pattern.</li>
            </ol>
          </div>

          {/* The 10 games */}
          <div className="mt-6 rounded-2xl border border-border bg-white p-6 lg:p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-forest" />
              <h3 className="font-display text-2xl font-bold text-forest-deep">The 10 Games of the Night</h3>
            </div>
            <p className="mt-2 text-muted-foreground">
              Every night runs these same 10 rounds, in this order. Each round has its own pattern and its own plant prize table.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {gameRules.map((g) => (
                <div key={g.n} className="flex gap-4 rounded-xl border border-border bg-secondary/30 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-cream font-display font-bold">
                    {g.n}
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold text-forest-deep">{g.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{g.pattern}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Winning */}
          <div className="mt-6 rounded-2xl border border-border bg-white p-6 lg:p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <Hand className="h-6 w-6 text-forest" />
              <h3 className="font-display text-2xl font-bold text-forest-deep">Calling BINGO & Winning</h3>
            </div>
            <ol className="mt-4 space-y-3 text-muted-foreground list-decimal pl-5">
              <li>The instant you complete the round's pattern, yell <strong className="text-forest-deep">"BINGO!"</strong> loud enough for the caller to hear you.</li>
              <li>The caller stops the draw. A staff verifier walks to your seat and reads your marked numbers against the called list on screen.</li>
              <li>If verified, you win. Head to the prize table and pick your plant from that round's selection.</li>
              <li>If two or more players call BINGO on the same number, all valid cards win — each player picks a plant.</li>
              <li>If your card isn't valid (missed number, wrong pattern), play resumes with the next call. No penalty, keep playing.</li>
            </ol>
          </div>

          {/* Prize table */}
          <div className="mt-6 rounded-2xl border border-border bg-white p-6 lg:p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <Sprout className="h-6 w-6 text-forest" />
              <h3 className="font-display text-2xl font-bold text-forest-deep">The Prize Table</h3>
            </div>
            <ul className="mt-4 space-y-3 text-muted-foreground list-disc pl-5">
              <li>Each of the 10 rounds has its own dedicated selection of plants on the prize table — from easy-care succulents to statement monsteras.</li>
              <li>Prizes get bigger as the night goes on. The Blackout and Wild Card Finale rounds are the highest-value plants of the evening.</li>
              <li>Winners choose from what's on their round's table — no dibs called before winning.</li>
              <li>The Wild Card Finale winner may pick <strong className="text-forest-deep">any plant on the greenhouse floor</strong>, prize table or not, up to the venue's posted limit.</li>
            </ul>
          </div>

          {/* Etiquette */}
          <div className="mt-6 rounded-2xl border border-border bg-white p-6 lg:p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-forest" />
              <h3 className="font-display text-2xl font-bold text-forest-deep">House Rules & Etiquette</h3>
            </div>
            <ul className="mt-4 space-y-3 text-muted-foreground list-disc pl-5">
              <li>One card pack per ticket. You can play all 10 cards yourself, or split them with friends at your table.</li>
              <li>No phones on the caller — recording the ball draw is a no-go. Selfies with your plant are absolutely encouraged.</li>
              <li>Please don't touch the prize table plants until you've won. Look, admire, plot, but don't grab.</li>
              <li>Be kind to the greenhouse. Watch your dauber around leaves — ink and living plants don't mix.</li>
              <li>The caller's decision on any disputed card is final.</li>
            </ul>
          </div>

          {/* Disqualification */}
          <div className="mt-6 rounded-2xl border-2 border-blossom/40 bg-blossom/10 p-6 lg:p-8">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-blossom" />
              <h3 className="font-display text-2xl font-bold text-forest-deep">Fair Play</h3>
            </div>
            <p className="mt-3 text-muted-foreground">
              Marking a number that wasn't called, sharing card packs across tickets, or calling a fake BINGO more than once in a night will get your card retired for the evening. We keep it light — but the game is the game.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-24 bg-secondary/40">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-sm font-bold uppercase tracking-widest text-forest">Common Questions</p>
            <h2 className="mt-2 font-display text-4xl font-bold text-forest-deep sm:text-5xl">
              Still curious?
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-forest shrink-0 mt-1" />
                  <div>
                    <h3 className="font-display text-lg font-bold text-forest-deep">{f.q}</h3>
                    <p className="mt-2 text-muted-foreground">{f.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-forest text-cream">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <Leaf className="h-10 w-10 mx-auto opacity-90" />
          <h2 className="mt-4 font-display text-4xl font-bold sm:text-5xl">
            Ready to yell BINGO in a greenhouse?
          </h2>
          <p className="mt-4 text-lg text-cream/80 max-w-2xl mx-auto">
            Pick a night, grab your seat, and we'll see you under the plants.
          </p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <Link to="/events" className="rounded-full bg-sunny px-6 py-3 font-bold text-forest-deep hover:opacity-90 transition inline-flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Browse upcoming events
            </Link>
            <Link to="/host-event" className="rounded-full border border-cream/40 bg-transparent px-6 py-3 font-bold text-cream hover:bg-cream/10 transition inline-flex items-center gap-2">
              <Clock className="h-5 w-5" /> Host a night at your venue
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
