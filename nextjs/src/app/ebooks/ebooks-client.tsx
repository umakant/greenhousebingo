"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, Star, Tag } from "lucide-react";
import { SiteHeader, openCartDrawer } from "@/components/waterice/site-header";
import { type Book, type Category, type Format } from "@/data/waterice/ebooks";

type Tab = "All eBooks" | Category;
type StoredCartItem = { title: string; price: number; qty?: number; format?: string; cover?: string };

const CATEGORIES: Tab[] = [
  "All eBooks",
  "Starter Guides",
  "Operations",
  "Marketing",
  "Business Growth",
];

const isStoredCartItem = (item: unknown): item is StoredCartItem => {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<StoredCartItem>;
  return typeof candidate.title === "string" && typeof candidate.price === "number";
};

export function EbooksClient({ books }: { books: Book[] }) {
  const isBookTitle = (title: string) => books.some((book) => book.title === title);
  const [active, setActive] = useState<Tab>("All eBooks");
  const [formats, setFormats] = useState<Record<string, Format>>({});
  const [cart, setCart] = useState<string[]>([]);
  const [externalItems, setExternalItems] = useState<StoredCartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ebooks:state");
      if (raw) {
        const { cart: c, formats: f, items } = JSON.parse(raw);
        if (Array.isArray(items)) {
          const safeItems = items.filter(isStoredCartItem);
          setCart(safeItems.filter((item) => isBookTitle(item.title)).map((item) => item.title));
          setExternalItems(safeItems.filter((item) => !isBookTitle(item.title)));
        } else if (Array.isArray(c)) {
          setCart(c.filter((title): title is string => typeof title === "string" && isBookTitle(title)));
        }
        if (f && typeof f === "object") setFormats(f);
      }
    } catch {}
    setHydrated(true);
  }, []);

  const cartItems = useMemo<StoredCartItem[]>(
    () =>
      [
        ...externalItems,
        ...cart
          .map((title) => {
            const b = books.find((x) => x.title === title);
            if (!b) return null;
            const fmt = formats[title] ?? "PDF";
            const price = fmt === "Print +$10" ? b.price + 10 : b.price;
            return { title, price, format: fmt, cover: b.cover };
          })
          .filter(
            (item): item is { title: string; price: number; format: Format; cover: string } =>
              item !== null,
          ),
      ],
    [cart, formats, externalItems, books],
  );

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem("ebooks:state", JSON.stringify({ cart, formats, items: cartItems }));
      window.dispatchEvent(new CustomEvent("cart:update"));
    } catch {}
  }, [hydrated, cart, formats, cartItems]);

  const visible = useMemo(
    () => (active === "All eBooks" ? books : books.filter((b) => b.category === active)),
    [active, books],
  );

  const discount = (b: Book) =>
    Math.round(((b.oldPrice - b.price) / b.oldPrice) * 100);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader
        cartItems={cartItems}
        onRemoveItem={(title) => {
          setCart((c) => c.filter((t) => t !== title));
          setExternalItems((items) => items.filter((item) => item.title !== title));
        }}
      />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <h1 className="font-display text-5xl font-extrabold text-foreground">eBooks</h1>
        <p className="mt-3 text-muted-foreground max-w-prose">
          Practical guides to launch, run, and grow your water ice business.
        </p>

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
          {visible.map((b) => {
            const fmt = formats[b.title] ?? "PDF";
            const inCart = cart.includes(b.title);
            return (
              <article
                key={b.title}
                className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col shadow-sm hover:shadow-lg transition-shadow"
              >
                <Link
                  href={`/ebooks/${b.slug}`}
                  className="relative aspect-square overflow-hidden bg-muted block"
                >
                  <img
                    src={b.cover}
                    alt={b.title}
                    loading="lazy"
                    className="w-full h-full object-contain transition-transform hover:scale-[1.02]"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow">
                    {discount(b)}% Off
                  </span>
                </Link>

                <div className="p-5 flex flex-col gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex" aria-label={`${b.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < b.rating ? "fill-primary text-primary" : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {b.rating.toFixed(1)} ({b.reviews})
                    </span>
                  </div>

                  <div>
                    <Link
                      href={`/ebooks/${b.slug}`}
                      className="block font-display text-xl font-bold text-foreground leading-tight hover:text-primary transition-colors"
                    >
                      {b.title}
                    </Link>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Tag className="w-4 h-4" />
                      {b.category}
                    </p>
                  </div>

                  <div className="border-t border-border pt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Starting At
                      </p>
                      <p className="font-display text-3xl font-extrabold text-primary leading-none">
                        ${b.price.toFixed(2)}{" "}
                        <span className="text-base font-semibold text-muted-foreground line-through align-middle">
                          ${b.oldPrice.toFixed(2)}
                        </span>
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{b.pages} pgs</span>
                  </div>

                  <div className="grid grid-cols-2 gap-0 rounded-full bg-muted p-1">
                    {(["PDF", "Print +$10"] as Format[]).map((f) => {
                      const sel = fmt === f;
                      return (
                        <button
                          key={f}
                          onClick={() => setFormats((s) => ({ ...s, [b.title]: f }))}
                          className={`text-xs font-semibold py-2 rounded-full transition-colors ${
                            sel
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {f}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-auto flex gap-2">
                    <Link
                      href={`/ebooks/${b.slug}`}
                      className="flex-1 inline-flex items-center justify-center rounded-full border border-border bg-background text-foreground font-semibold py-3 hover:border-primary/60 transition-colors"
                    >
                      Details
                    </Link>
                    <button
                      onClick={() => {
                        if (cart.includes(b.title)) return;
                        setCart((c) => (c.includes(b.title) ? c : [...c, b.title]));
                        openCartDrawer();
                      }}
                      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full font-semibold py-3 transition-colors ${
                        inCart
                          ? "bg-green-600 text-white hover:bg-green-600"
                          : "bg-primary text-primary-foreground hover:opacity-90"
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {inCart ? "Added" : "Add"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
