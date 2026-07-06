import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  Users,
  Heart,
  ArrowRight,
  MapPin,
} from "lucide-react";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community · Greenhouse Bingo" },
      {
        name: "description",
        content:
          "Join the Greenhouse Bingo community. Share plant photos, swap cuttings, find local plant people, and stay in the loop on upcoming bingo nights.",
      },
      { property: "og:title", content: "Community · Greenhouse Bingo" },
      {
        property: "og:description",
        content:
          "Connect with fellow plant lovers, swap cuttings, share wins, and find your local bingo crew.",
      },
    ],
  }),
  component: CommunityPage,
});

type WallTag = "Winner" | "Event" | "Swap";
type WallItem = { src: string; alt: string; title: string; city: string; likes: string; tag: WallTag };

const wallItems: WallItem[] = [
  { src: "https://images.unsplash.com/photo-1509937528035-ad76254b0356?w=600&q=75", alt: "Winner with monstera", title: "Maya took home a Monstera Deliciosa", city: "Portland", likes: "342", tag: "Winner" },
  { src: "https://images.unsplash.com/photo-1567748157439-651aca2ff064?w=600&q=75", alt: "Bingo night crowd", title: "Sold-out Friday at The Greenroom", city: "Austin", likes: "128", tag: "Event" },
  { src: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600&q=75", alt: "Fiddle leaf fig", title: "First-ever plant — a Fiddle Leaf Fig!", city: "Brooklyn", likes: "512", tag: "Winner" },
  { src: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=75", alt: "Greenhouse interior", title: "Bingo Under the Glass Roof", city: "Seattle", likes: "204", tag: "Event" },
  { src: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=75", alt: "Snake plant winner", title: "Jordan's third win this season 🎉", city: "Austin", likes: "289", tag: "Winner" },
  { src: "https://images.unsplash.com/photo-1512428813834-c702c7702b78?w=600&q=75", alt: "Plant collection", title: "Swap table overflowing with cuttings", city: "Denver", likes: "176", tag: "Swap" },
  { src: "https://images.unsplash.com/photo-1470137237906-d8a4f71e1966?w=600&q=75", alt: "Pothos vine", title: "Trailing Pothos, new roommate secured", city: "Chicago", likes: "421", tag: "Winner" },
  { src: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=600&q=75", alt: "Cactus display", title: "Desert night — cacti bingo edition", city: "Phoenix", likes: "198", tag: "Event" },
  { src: "https://images.unsplash.com/photo-1502740479091-635887520276?w=600&q=75", alt: "Succulent close-up", title: "Baby succulents from the swap", city: "Los Angeles", likes: "267", tag: "Swap" },
  { src: "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=600&q=75", alt: "Winner smiling", title: "Priya's ZZ plant, undefeated", city: "Denver", likes: "356", tag: "Winner" },
  { src: "https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=600&q=75", alt: "Fern winner", title: "A Boston Fern found a forever home", city: "Boston", likes: "184", tag: "Winner" },
  { src: "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?w=600&q=75", alt: "Bingo cards on table", title: "Full house at Fern & Fable Cafe", city: "Nashville", likes: "142", tag: "Event" },
  { src: "https://images.unsplash.com/photo-1463320898484-cdee8141c787?w=600&q=75", alt: "Rubber plant", title: "Sam's Rubber Plant, glow-up in progress", city: "Chicago", likes: "231", tag: "Winner" },
  { src: "https://images.unsplash.com/photo-1591958911259-bee2173bdccc?w=600&q=75", alt: "Community plant swap", title: "Sunday swap in the park", city: "Portland", likes: "312", tag: "Swap" },
  { src: "https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=600&q=75", alt: "Hanging plants", title: "Hanging garden reveal at bingo night", city: "Miami", likes: "278", tag: "Event" },
  { src: "https://images.unsplash.com/photo-1459156212016-c812468e2115?w=600&q=75", alt: "Philodendron winner", title: "Philodendron Pink Princess 💗", city: "Brooklyn", likes: "489", tag: "Winner" },
  { src: "https://images.unsplash.com/photo-1487730116645-74489c95b41b?w=600&q=75", alt: "Aloe plant", title: "Aloe you vera much — my first win!", city: "Denver", likes: "203", tag: "Winner" },
  { src: "https://images.unsplash.com/photo-1444392061186-9fc38f84f726?w=600&q=75", alt: "Greenhouse rows", title: "Behind the scenes at the greenhouse", city: "Seattle", likes: "167", tag: "Event" },
];


function CommunityPage() {
  const [selected, setSelected] = useState<WallItem | null>(null);
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-b from-secondary/40 to-background">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-forest/10 px-4 py-1.5 text-sm font-bold text-forest">
            <Users className="h-4 w-4" />
            <span>Join the Greenhouse</span>
          </div>
          <h1 className="mt-4 font-display text-5xl font-bold text-forest-deep sm:text-6xl">
            A community built around plants — and the people who love them.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you won your first succulent last week or your apartment is already a rainforest, you're one of us. Connect, share, swap, and grow together.
          </p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <Link
              to="/events"
              className="rounded-full bg-forest px-6 py-3 font-bold text-cream hover:bg-forest-deep transition"
            >
              Find a Bingo Night
            </Link>
            <a
              href="#highlights"
              className="rounded-full border border-border bg-white px-6 py-3 font-bold text-forest-deep hover:bg-secondary transition"
            >
              Explore the Community
            </a>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-12 border-y border-border bg-white">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-center">
            {[
              { value: "12,000+", label: "Community Members" },
              { value: "40+", label: "Active City Crews" },
              { value: "8,500+", label: "Plants Won & Shared" },
              { value: "Weekly", label: "Plant Swaps & Meetups" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-3xl font-bold text-forest-deep">{s.value}</p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PINTEREST-STYLE WALL */}
      <section className="py-16 lg:py-20 bg-cream/40">
        <div className="w-full px-4 sm:px-6 lg:px-10">
          <div className="text-center mb-10 max-w-3xl mx-auto">
            <p className="text-sm font-bold uppercase tracking-widest text-forest">The Wall</p>
            <h2 className="mt-2 font-display text-4xl font-bold text-forest-deep sm:text-5xl">
              Winners, events & leafy trophies.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A living feed from bingo nights across the country — proud plant parents, packed rooms, and the greenery that started it all.
            </p>
          </div>

          <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4 [column-fill:_balance]">
            {wallItems.map((item, i) => (
              <figure
                key={i}
                onClick={() => setSelected(item)}
                className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-white shadow-soft hover:shadow-lifted transition-all duration-300 group cursor-pointer"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={item.src}
                    alt={item.alt}
                    loading="lazy"
                    className="w-full h-auto object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  <span
                    className={`absolute top-3 left-3 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                      item.tag === "Winner"
                        ? "bg-sunny text-forest-deep"
                        : item.tag === "Event"
                          ? "bg-forest text-cream"
                          : "bg-blossom text-white"
                    }`}
                  >
                    {item.tag}
                  </span>
                </div>
                <figcaption className="p-4">
                  <p className="font-display text-lg font-bold text-forest-deep leading-tight">
                    {item.title}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold">
                      <MapPin className="h-3 w-3" /> {item.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3 text-tomato" /> {item.likes}
                    </span>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 font-bold text-cream hover:bg-forest-deep transition"
            >
              See What's Coming Up <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {selected && (
            <>
              <div className="relative">
                <img src={selected.src} alt={selected.alt} className="w-full h-auto max-h-[70vh] object-cover" />
                <span
                  className={`absolute top-4 left-4 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                    selected.tag === "Winner"
                      ? "bg-sunny text-forest-deep"
                      : selected.tag === "Event"
                        ? "bg-forest text-cream"
                        : "bg-blossom text-white"
                  }`}
                >
                  {selected.tag}
                </span>
              </div>
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl text-forest-deep">{selected.title}</DialogTitle>
                  <DialogDescription className="flex items-center gap-4 pt-2 text-sm">
                    <span className="flex items-center gap-1 font-semibold">
                      <MapPin className="h-3.5 w-3.5" /> {selected.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-tomato" /> {selected.likes} likes
                    </span>
                  </DialogDescription>
                </DialogHeader>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
