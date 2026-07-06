import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, TrendingUp, Sparkles } from "lucide-react";

export const Route = createFileRoute("/venues")({
  head: () => ({
    meta: [
      { title: "Host at Your Venue — Greenhouse Bingo" },
      {
        name: "description",
        content:
          "Bring 60–130 new guests to your brewery, cidery, greenhouse or nursery by hosting a plant bingo night.",
      },
      { property: "og:title", content: "Host at Your Venue — Greenhouse Bingo" },
      {
        property: "og:description",
        content: "Host plant bingo at your brewery, cidery, or nursery.",
      },
    ],
  }),
  component: VenuesPage,
});

function VenuesPage() {
  return (
    <>
      <PageHeader
        eyebrow="For venues"
        title="Host a Plant Bingo night at your venue"
        subtitle="Perfect for breweries, cideries, restaurants, greenhouses, and nurseries. We bring the bingo, the plants, and the crowd."
      />
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { icon: Users, title: "60–130 new guests", copy: "A full house on a weeknight." },
              { icon: TrendingUp, title: "Food & bev sales", copy: "Guests stay 2–3 hours and spend." },
              { icon: Sparkles, title: "No lift for you", copy: "Rep handles tickets, hosting, and prizes." },
              { icon: Users, title: "New regulars", copy: "Attendees discover your space." },
            ].map((b) => (
              <div key={b.title} className="rounded-2xl border border-border bg-card p-5">
                <b.icon className="h-5 w-5 text-primary" />
                <div className="mt-3 font-display text-lg">{b.title}</div>
                <div className="text-sm text-muted-foreground">{b.copy}</div>
              </div>
            ))}
          </div>
        </div>

        <form
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
          onSubmit={(e) => e.preventDefault()}
        >
          <h2 className="font-display text-2xl">Get in touch</h2>
          <p className="text-sm text-muted-foreground">
            Tell us about your venue and we'll connect you with a nearby rep.
          </p>
          <div className="mt-6 grid gap-4">
            <div>
              <Label htmlFor="v-name">Venue name</Label>
              <Input id="v-name" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="v-city">City</Label>
                <Input id="v-city" required />
              </div>
              <div>
                <Label htmlFor="v-state">State</Label>
                <Input id="v-state" required />
              </div>
            </div>
            <div>
              <Label htmlFor="v-email">Email</Label>
              <Input id="v-email" type="email" required />
            </div>
            <div>
              <Label htmlFor="v-msg">About your space</Label>
              <Textarea id="v-msg" rows={4} />
            </div>
            <Button type="submit">Request info</Button>
          </div>
        </form>
      </section>
    </>
  );
}
