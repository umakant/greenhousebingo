import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Search,
  Sparkles,
  Ticket,
  Store,
  Users,
  Leaf,
  Wrench,
  Gamepad2,
  Megaphone,
} from "lucide-react";
import { companies, events } from "@/data/mock";
import { EventCard } from "@/components/site/EventCard";
import { CompanyCard } from "@/components/site/CompanyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const featured = events.filter((e) => e.featured).slice(0, 3);
  const featuredCos = companies.filter((c) => c.featured).slice(0, 3);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-secondary/70 via-background to-background">
        <div className="pointer-events-none absolute -top-40 right-[-10%] h-[500px] w-[500px] rounded-full bg-leaf/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-[-10%] h-[500px] w-[500px] rounded-full bg-clay/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Everyone's a winner
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              Find plant bingo <span className="text-primary">events near you</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Plant bingo at breweries, cideries, and greenhouses across the country.
              Bring friends, take home a houseplant.
            </p>

            <form
              className="mt-8 flex max-w-lg overflow-hidden rounded-full border border-border bg-card shadow-soft"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="flex flex-1 items-center gap-2 pl-5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by city, state, venue, or date"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
              </div>
              <Button asChild size="lg" className="m-1 rounded-full">
                <Link to="/events">Search</Link>
              </Button>
            </form>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/events">
                  Find events <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/become-a-rep">Become a rep</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="mt-10 rounded-3xl bg-gradient-to-br from-primary to-moss p-6 text-primary-foreground shadow-lift">
                <div className="text-xs uppercase tracking-widest opacity-70">Tonight</div>
                <div className="mt-2 font-display text-2xl leading-tight">
                  Bingo at Sidelake Brewing
                </div>
                <div className="mt-6 text-sm opacity-80">Minneapolis, MN · 21+</div>
                <div className="mt-8 flex items-end justify-between">
                  <div className="font-display text-4xl">$30</div>
                  <Ticket className="h-6 w-6" />
                </div>
              </div>
              <div className="rounded-3xl bg-gradient-to-br from-clay to-accent p-6 text-clay-foreground shadow-lift">
                <div className="text-xs uppercase tracking-widest opacity-70">Weekend</div>
                <div className="mt-2 font-display text-2xl leading-tight">
                  Hudson Valley Plant Bingo
                </div>
                <div className="mt-6 text-sm opacity-80">Kingston, NY · 21+</div>
                <div className="mt-8 flex items-end justify-between">
                  <div className="font-display text-4xl">$30</div>
                  <Ticket className="h-6 w-6" />
                </div>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Family
                </div>
                <div className="mt-2 font-display text-xl">Bachman's Greenhouse</div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Saturday afternoon plant bingo — everyone leaves with a plant.
                </div>
              </div>
              <div className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-soft">
                <div className="font-display text-2xl">120+</div>
                <div className="text-sm text-muted-foreground">
                  Events hosted this season across the platform
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured events */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              Upcoming
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
              Featured events this week
            </h2>
          </div>
          <Button asChild variant="ghost">
            <Link to="/events">
              All events <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {featured.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              How it works
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
              Bingo, plants, drinks, prizes
            </h2>
            <p className="mt-3 text-muted-foreground">
              Buy a ticket, show up, play five rounds of plant bingo. Every winner takes
              home a houseplant.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Search,
                title: "Find an event",
                copy: "Browse events by city, venue, or company. Every event card shows price, age rules, and what's included.",
              },
              {
                icon: Ticket,
                title: "Grab your ticket",
                copy: "Reserve your seat online. Your ticket comes with 2 bingo cards. Extra cards available at the door.",
              },
              {
                icon: Sparkles,
                title: "Everyone wins a plant",
                copy: "Five rounds of bingo, five plant prizes per round. Nobody leaves empty-handed.",
              },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-xl">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured companies */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              Companies
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
              Reps hosting near you
            </h2>
          </div>
          <Button asChild variant="ghost">
            <Link to="/companies">
              All companies <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {featuredCos.map((c) => (
            <CompanyCard key={c.slug} company={c} />
          ))}
        </div>
      </section>

      {/* Dual CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-primary p-10 text-primary-foreground">
            <Store className="h-8 w-8" />
            <h3 className="mt-4 font-display text-3xl">Host at your venue</h3>
            <p className="mt-3 max-w-md opacity-85">
              Bring 60–130 new guests to your brewery, cidery, or nursery. We handle
              tickets, hosts, and prizes.
            </p>
            <Button asChild variant="secondary" className="mt-6">
              <Link to="/venues">Partner with us</Link>
            </Button>
          </div>
          <div className="rounded-3xl bg-accent p-10 text-accent-foreground">
            <Users className="h-8 w-8" />
            <h3 className="mt-4 font-display text-3xl">Become a rep</h3>
            <p className="mt-3 max-w-md opacity-90">
              Launch your own Greenhouse Bingo platform in your area. Sell tickets,
              manage venues, grow your business.
            </p>
            <Button asChild variant="secondary" className="mt-6">
              <Link to="/become-a-rep">Start a platform</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* HOST — Start a Bingo Business / Host your next Greenhouse Bingo */}
      <section id="host" className="border-t border-border/60 bg-gradient-to-b from-background to-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              Bring the party to you
            </div>
            <h2 className="mt-2 font-display text-4xl font-semibold leading-tight md:text-5xl">
              Host your next <span className="text-primary">Greenhouse Bingo</span>.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Want to bring the plant party to your venue, garden center, or event
              space? We'll bring the games, the plants, and the energy. You bring the
              crowd.
            </p>
          </div>

          <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:items-start">
            {/* Perks */}
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Leaf,
                  title: "Plants included",
                  copy: "Every guest goes home with a plant.",
                },
                {
                  icon: Wrench,
                  title: "Full service",
                  copy: "We handle setup, hosting, and cleanup.",
                },
                {
                  icon: Gamepad2,
                  title: "10 games",
                  copy: "Custom bingo cards and prizes.",
                },
                {
                  icon: Megaphone,
                  title: "Marketing boost",
                  copy: "Promoted to our growing community.",
                },
              ].map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-border bg-card p-6 shadow-soft"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-xl">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.copy}</p>
                </div>
              ))}
            </div>

            {/* Request a Host Kit form */}
            <form
              className="rounded-3xl border border-border bg-card p-6 shadow-lift sm:p-8"
              onSubmit={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLFormElement).reset();
                toast.success(
                  "Inquiry received — we'll be in touch within 2 business days.",
                );
              }}
            >
              <h3 className="font-display text-2xl">Request a host kit</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tell us about your venue and we'll get back to you fast.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="host-name">Full name</Label>
                  <Input id="host-name" required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="host-email">Email</Label>
                  <Input id="host-email" type="email" required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="host-phone">Phone (optional)</Label>
                  <Input id="host-phone" type="tel" className="mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="host-facility">Facility name</Label>
                  <Input id="host-facility" required className="mt-1.5" />
                </div>
                <div>
                  <Label>Facility type</Label>
                  <Select>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venue">Venue / Taproom</SelectItem>
                      <SelectItem value="garden">Garden Center / Nursery</SelectItem>
                      <SelectItem value="restaurant">Restaurant / Bar</SelectItem>
                      <SelectItem value="event">Event Venue</SelectItem>
                      <SelectItem value="community">Community Space</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estimated guests</Label>
                  <Select>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25-50">25 – 50</SelectItem>
                      <SelectItem value="50-100">50 – 100</SelectItem>
                      <SelectItem value="100-200">100 – 200</SelectItem>
                      <SelectItem value="200+">200+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="host-city">City</Label>
                  <Input id="host-city" required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="host-state">State</Label>
                  <Input id="host-state" required className="mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="host-date">Preferred date (optional)</Label>
                  <Input id="host-date" type="date" className="mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="host-message">Message (optional)</Label>
                  <Textarea id="host-message" rows={4} className="mt-1.5" />
                </div>
              </div>

              <Button type="submit" size="lg" className="mt-6 w-full">
                Submit inquiry
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                No commitment required. We'll review your request and reach out to
                discuss next steps.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              FAQ
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
              Questions? We've got answers.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Everything you need to know before your first Greenhouse Bingo night.
            </p>
          </div>

          <Accordion type="single" collapsible className="mt-10">
            {[
              {
                q: "Can I buy tickets at the door?",
                a: "No — to guarantee every attendee receives a plant, tickets must be purchased online in advance.",
              },
              {
                q: "How much are tickets?",
                a: "Standard admission is $30 per ticket and includes 10 bingo cards, a guaranteed plant, and door prize entry. Extra bingo cards are $5 each.",
              },
              {
                q: "How many bingo cards do I receive?",
                a: "Every ticket includes 10 bingo cards — one for each game of the night. You can add extras at checkout to boost your chances.",
              },
              {
                q: "Does everyone receive a plant?",
                a: "Yes. Every guest leaves with a plant, guaranteed. Winners also take home larger plant prizes.",
              },
              {
                q: "Is this gambling?",
                a: "Nope — it's classic bingo for fun and plant prizes. No cash payouts, no wagering.",
              },
              {
                q: "Is it family friendly?",
                a: "Many of our events are family friendly. Each event card notes whether it's 21+ or all-ages so you can pick the right night.",
              },
            ].map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-display text-lg">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
            <div className="font-display text-lg">Can't find your answer?</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Shoot us a message and we'll get back within 24 hours.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-display text-4xl font-semibold md:text-5xl">
            Ready to win a plant?
          </h2>
          <p className="mt-4 text-lg opacity-85">
            Join thousands of plant people. Tickets sell out — sometimes in days. Grab
            yours before your local venue fills up.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/events">Buy tickets</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/events">See all events</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6">
          <h3 className="font-display text-3xl">Get new events in your inbox</h3>
          <p className="mt-2 text-muted-foreground">
            One email a week with new plant bingo events near you.
          </p>
          <form
            className="mt-6 flex w-full max-w-md gap-2"
            onSubmit={(e) => e.preventDefault()}
          >
            <Input type="email" placeholder="you@example.com" required />
            <Button type="submit">Subscribe</Button>
          </form>
        </div>
      </section>
    </>
  );
}
