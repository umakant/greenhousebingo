"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, Truck, Star, Tag, Mail, ShoppingCart, Check } from "lucide-react";
import { SiteHeader, openCartDrawer } from "@/components/waterice/site-header";
import { flavorSlug, type Flavor, type FlavorCategory } from "@/data/waterice/flavors";

type Tab = "wholesale" | "distributor";
type CatTab = "All Flavors" | FlavorCategory;

const CATEGORIES: CatTab[] = ["All Flavors", "Classic", "Fruit", "Cream-Based", "Candy", "Tropical"];

export function FlavorsClient({ flavors }: { flavors: Flavor[] }) {
  const [tab, setTab] = useState<Tab>("wholesale");
  const [active, setActive] = useState<CatTab>("All Flavors");
  const [cartTitles, setCartTitles] = useState<Set<string>>(new Set());

  useEffect(() => {
    const read = () => {
      try {
        const raw = sessionStorage.getItem("ebooks:state");
        if (!raw) return setCartTitles(new Set());
        const parsed = JSON.parse(raw);
        const titles: string[] = Array.isArray(parsed.items)
          ? parsed.items.map((i: { title?: string }) => i?.title).filter(Boolean)
          : Array.isArray(parsed.cart)
            ? parsed.cart
            : [];
        setCartTitles(new Set(titles));
      } catch {
        /* noop */
      }
    };
    read();
    window.addEventListener("cart:update", read);
    return () => window.removeEventListener("cart:update", read);
  }, []);

  const visible = useMemo(
    () => (active === "All Flavors" ? flavors : flavors.filter((f) => f.category === active)),
    [active, flavors],
  );

  const tabs: { key: Tab; label: string; icon: typeof Building2 }[] = [
    { key: "wholesale", label: "Wholesale", icon: Building2 },
    { key: "distributor", label: "Distributor", icon: Truck },
  ];

  const discount = (price: number, old: number) => Math.round(((old - price) / old) * 100);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <h1 className="font-display text-5xl font-extrabold text-foreground">Flavors</h1>
        <p className="mt-3 text-muted-foreground max-w-prose">
          All {flavors.length} delicious water ice flavors — pricing available based on selection and quantity.
        </p>

        <div
          role="tablist"
          aria-label="Buyer type"
          className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm"
        >
          {tabs.map(({ key, label, icon: Icon }) => {
            const isActive = tab === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold tracking-wide uppercase transition-colors ${
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {tab === "wholesale" && (
          <section className="mt-8">
            <div className="rounded-2xl border border-border bg-card p-8">
              <h2 className="font-display text-2xl font-bold text-foreground">
                Wholesale Pricing
              </h2>
              <p className="mt-2 text-muted-foreground">
                Competitive wholesale rates for shops, restaurants, and event operators serving
                Water Ice Express products. Browse all {flavors.length} flavors below — click any flavor for
                tub pricing &amp; details.
              </p>
              <div className="mt-6 space-y-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-6">
                <p>
                  A minimum order of <strong className="text-foreground">six (6) buckets</strong> is
                  required for all local delivery requests within designated service areas. Please
                  ensure your order meets the minimum quantity requirement prior to scheduling
                  delivery.
                </p>
                <p>
                  A <strong className="text-foreground">Delivery Inspection Form</strong> must be
                  completed and signed at the time of delivery to confirm receipt, product
                  condition, and order accuracy.
                </p>
                <p>
                  For shipment orders, a minimum purchase of{" "}
                  <strong className="text-foreground">fifty (50) buckets</strong> is required. Full
                  payment must be received at the time the order is confirmed. All shipment orders
                  must be delivered to a valid non-residential address, and a complete delivery zip
                  code is required for processing.
                </p>
                <p>
                  For distribution and shipment orders, the{" "}
                  <strong className="text-foreground">
                    Distribution Delivery Inspection Form
                  </strong>{" "}
                  must be completed and returned within{" "}
                  <strong className="text-foreground">forty-eight (48) hours</strong> of delivery.
                  Failure to submit the completed inspection form within the required timeframe may
                  result in denial of product exchanges, claims, or adjustments.
                </p>
              </div>
            </div>
          </section>
        )}

        {tab === "distributor" && (
          <section className="mt-8">
            <div className="rounded-2xl border border-border bg-card p-8">
              <h2 className="font-display text-2xl font-bold text-foreground">
                Distributor Pricing
              </h2>
              <p className="mt-2 text-muted-foreground">
                Volume pricing and logistics support for distributors moving Water Ice Express
                products across multiple markets. Browse all {flavors.length} flavors below — click any
                flavor for case &amp; pallet pricing.
              </p>
            </div>
          </section>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {CATEGORIES.map((c) => {
            const isActive = c === active;
            return (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold border transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((f) => (
            <article
              key={f.name}
              className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col shadow-sm hover:shadow-lg transition-shadow"
            >
              <Link
                href={`/shop/flavors/${f.slug ?? flavorSlug(f.name)}`}
                className="relative aspect-square overflow-hidden bg-white flex items-center justify-center group"
              >
                <img
                  src={f.image}
                  alt={f.name}
                  loading="lazy"
                  className="w-full h-full object-contain p-4 transition-transform group-hover:scale-[1.03]"
                />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow">
                  {discount(f.price, f.oldPrice)}% Off
                </span>
              </Link>

              <div className="p-5 flex flex-col gap-4 flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex" aria-label={`${f.rating} out of 5 stars`}>
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
                    {f.rating.toFixed(1)} ({f.reviews})
                  </span>
                </div>

                <div>
                  <Link
                    href={`/shop/flavors/${f.slug ?? flavorSlug(f.name)}`}
                    className="block font-display text-xl font-bold text-foreground leading-tight hover:text-primary transition-colors"
                  >
                    {f.name}
                  </Link>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Tag className="w-4 h-4" />
                    {f.category}
                  </p>
                </div>

                <div className="border-t border-border pt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {tab === "wholesale" ? "Wholesale / Tub" : "Distributor / Tub"}
                    </p>
                    <p className="font-display text-3xl font-extrabold text-primary leading-none">
                      {tab === "distributor" ? "$?" : `$${f.price.toFixed(2)}`}{" "}
                      <span className="text-base font-semibold text-muted-foreground line-through align-middle">
                        ${(tab === "distributor" ? 52 : f.oldPrice).toFixed(2)}
                      </span>
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {tab === "distributor" ? "Pallet (48 tubs)" : "2.5 Gal"}
                  </span>
                </div>

                <div className="mt-auto">
                  {tab === "wholesale" ? (() => {
                    const title = `${f.name} (Wholesale Tub)`;
                    const inCart = cartTitles.has(title);
                    return (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const raw = sessionStorage.getItem("ebooks:state");
                          const parsed = raw
                            ? JSON.parse(raw)
                            : { cart: [], formats: {}, items: [] };
                          const existing = (parsed.items ?? []).find(
                            (i: { title: string }) => i.title === title,
                          );
                          let nextItems;
                          if (existing) {
                            nextItems = parsed.items.map((i: { title: string; qty?: number }) =>
                              i.title === title ? { ...i, qty: (i.qty ?? 1) + 1 } : i,
                            );
                          } else {
                            nextItems = [
                              ...(parsed.items ?? []),
                              {
                                title,
                                price: f.price,
                                qty: 1,
                                format: "2.5 Gallon Tub",
                                cover: f.image,
                              },
                            ];
                          }
                          const nextCart = nextItems.map((i: { title: string }) => i.title);
                          sessionStorage.setItem(
                            "ebooks:state",
                            JSON.stringify({
                              cart: nextCart,
                              formats: parsed.formats ?? {},
                              items: nextItems,
                            }),
                          );
                          window.dispatchEvent(new CustomEvent("cart:update"));
                          setCartTitles((prev) => new Set(prev).add(title));
                          openCartDrawer();
                        } catch {
                          /* noop */
                        }
                      }}
                      className={`w-full inline-flex items-center justify-center gap-2 rounded-full font-semibold py-3 transition-colors ${
                        inCart
                          ? "bg-green-600 text-white hover:bg-green-600"
                          : "bg-primary text-primary-foreground hover:opacity-90"
                      }`}
                    >
                      {inCart ? (
                        <>
                          <Check className="w-4 h-4" />
                          Added to Cart
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          Add to Cart
                        </>
                      )}
                    </button>
                    );
                  })() : (
                    <a
                      href={`/contact?flavor=${encodeURIComponent(f.name)}&buyer=${tab}`}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-semibold py-3 hover:opacity-90 transition-opacity"
                    >
                      <Mail className="w-4 h-4" />
                      Request Quote
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
