"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  Package,
  Snowflake,
  Star,
  Tag,
  Truck,
} from "lucide-react";
import { SiteHeader } from "@/components/waterice/site-header";
import { DEFAULT_PACK_SIZES, flavorSlug, type Flavor, type PackSize } from "@/data/waterice/flavors";

export function FlavorDetailClient({ flavor: f, related }: { flavor: Flavor; related: Flavor[] }) {
  const packSizes: PackSize[] = f.packSizes && f.packSizes.length > 0 ? f.packSizes : DEFAULT_PACK_SIZES;
  const [sizeIndex, setSizeIndex] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setSizeIndex(0);
    setQty(1);
  }, [f.name]);

  const cfg = packSizes[sizeIndex] ?? packSizes[0];
  const unitPrice = f.price * cfg.perTub;
  const total = unitPrice * cfg.qty * qty;
  const oldTotal = f.oldPrice * cfg.qty * qty;
  const discount = Math.round(((f.oldPrice - f.price) / f.oldPrice) * 100);

  const relatedFinal = related;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/shop/flavors"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Flavors
        </Link>

        <div className="mt-8 grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Image */}
          <div className="relative">
            <div className="aspect-square rounded-3xl bg-white border border-border overflow-hidden shadow-sm flex items-center justify-center">
              <img
                src={f.image}
                alt={`${f.name} water ice tub`}
                className="w-full h-full object-contain p-6"
              />
            </div>
            <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow">
              {discount}% Off
            </span>
            <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-semibold text-foreground shadow-sm">
              <Snowflake className="w-3.5 h-3.5 text-primary" /> Keep Frozen
            </span>
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Tag className="w-4 h-4" /> {f.category} · Wholesale
            </p>
            <h1 className="mt-2 font-display text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
              {f.name}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">{f.description}</p>

            <div className="mt-4 flex items-center gap-2">
              <div className="flex" aria-label={`${f.rating} of 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < f.rating ? "fill-primary text-primary" : "text-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {f.rating.toFixed(1)} ({f.reviews} reviews)
              </span>
            </div>

            <div className="mt-6 flex items-end gap-3">
              <span className="font-display text-5xl font-extrabold text-primary leading-none">
                ${total.toFixed(2)}
              </span>
              <span className="text-xl font-semibold text-muted-foreground line-through pb-1">
                ${oldTotal.toFixed(2)}
              </span>
              <span className="pb-1 text-sm text-muted-foreground">
                · ${unitPrice.toFixed(2)} / tub
              </span>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-foreground mb-2">Pack Size</p>
              <div className="grid sm:grid-cols-3 gap-2">
                {packSizes.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => setSizeIndex(i)}
                    className={`text-sm font-semibold px-4 py-3 rounded-xl border transition-colors text-left ${
                      sizeIndex === i
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card text-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {s.label}
                    {s.perTub < 1 && (
                      <span className="block text-xs font-normal opacity-80 mt-0.5">
                        Save {Math.round((1 - s.perTub) * 100)}% / tub
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-foreground mb-2">Quantity</p>
              <div className="inline-flex items-center rounded-full border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 text-lg font-semibold hover:bg-muted transition-colors"
                >
                  −
                </button>
                <span className="w-12 text-center font-semibold">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-10 h-10 text-lg font-semibold hover:bg-muted transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <a
                href={`/contact?flavor=${encodeURIComponent(f.name)}&size=${encodeURIComponent(cfg.label)}&qty=${qty}`}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-semibold py-4 text-base hover:opacity-90 transition-opacity"
              >
                <Mail className="w-5 h-5" />
                Request Quote
              </a>
              <a
                href="tel:+18005550199"
                className="flex-1 inline-flex items-center justify-center rounded-full bg-foreground text-background font-semibold py-4 text-base hover:opacity-90 transition-opacity"
              >
                Call Wholesale
              </a>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Minimum order: 1 tub (2.5 gal) · Freight shipping nationwide · Local delivery available
            </p>
          </div>
        </div>

        {/* Details */}
        <section className="mt-16 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl font-bold text-foreground">
              About {f.name}
            </h2>
            <div className="mt-3 space-y-4 text-muted-foreground leading-relaxed">
              <p>{f.description}</p>
              <p>
                <span className="font-semibold text-foreground">Tasting notes: </span>
                {f.tastingNotes}
              </p>
              <p>
                Each 2.5-gallon tub yields roughly <span className="font-semibold text-foreground">80 generous 4 oz scoops</span> — a workhorse for shops, food trucks, vendors, and catered events. Stored at 0°F sealed tubs hold peak quality for up to 12 months. Once opened, serve at 8–12°F for the signature smooth scoop that keeps customers coming back.
              </p>
            </div>

            <h3 className="mt-10 font-display text-xl font-bold text-foreground">
              Ingredients
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Real ingredients, no artificial fillers. Listed in order of predominance.
            </p>
            <ul className="mt-4 grid sm:grid-cols-2 gap-2">
              {f.ingredients.map((ing) => (
                <li
                  key={ing}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">{ing}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-10 font-display text-xl font-bold text-foreground">
              Specs
            </h3>
            <dl className="mt-4 grid sm:grid-cols-2 gap-3">
              {[
                ["Pack Size", "2.5 Gallon Tub"],
                ["Yield", "~80 × 4 oz scoops"],
                ["Storage", "Keep frozen at 0°F"],
                ["Serve Temp", "8–12°F"],
                ["Shelf Life", "12 months sealed"],
                ["Category", f.category],
                ["Allergens", f.category === "Cream-Based" || f.name === "Pistachio" ? "Contains dairy/nuts" : "Made in a facility with dairy & nuts"],
                ["Gluten", "Gluten-free recipe"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <dt className="text-sm text-muted-foreground">{k}</dt>
                  <dd className="text-sm font-semibold text-foreground text-right">{v}</dd>
                </div>
              ))}
            </dl>

            <h3 className="mt-10 font-display text-xl font-bold text-foreground">
              Pairs well with
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {f.pairsWith.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center px-4 py-2 rounded-full bg-card border border-border text-sm font-semibold text-foreground"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-bold text-foreground">
                Why this flavor sells
              </h3>
              <ul className="mt-4 space-y-3">
                {f.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-bold text-foreground">
                Shipping & delivery
              </h3>
              <div className="mt-4 space-y-3 text-sm text-foreground">
                <p className="flex items-start gap-2">
                  <Truck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Refrigerated freight nationwide on pallet orders.</span>
                </p>
                <p className="flex items-start gap-2">
                  <Package className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Local same-week delivery within the tri-state area.</span>
                </p>
              </div>
            </div>
          </aside>
        </section>

        {/* Related */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-foreground">
            You may also like
          </h2>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedFinal.map((r) => (
              <Link
                key={r.name}
                href={`/shop/flavors/${r.slug ?? flavorSlug(r.name)}`}
                className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square bg-white overflow-hidden flex items-center justify-center">
                  <img
                    src={r.image}
                    alt={r.name}
                    className="w-full h-full object-contain p-4 group-hover:scale-[1.03] transition-transform"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {r.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{r.category}</p>
                  <p className="mt-3 font-display text-xl font-extrabold text-primary">
                    ${r.price.toFixed(2)}{" "}
                    <span className="text-sm font-semibold text-muted-foreground line-through">
                      ${r.oldPrice.toFixed(2)}
                    </span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
