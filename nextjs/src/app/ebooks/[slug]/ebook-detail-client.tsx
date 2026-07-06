"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ShoppingCart,
  Star,
  Tag,
} from "lucide-react";
import { SiteHeader, openCartDrawer } from "@/components/waterice/site-header";
import { type Book, type Format } from "@/data/waterice/ebooks";

type StoredCartItem = { title: string; price: number; qty?: number; format?: string; cover?: string };

const isStoredCartItem = (item: unknown): item is StoredCartItem => {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<StoredCartItem>;
  return typeof candidate.title === "string" && typeof candidate.price === "number";
};

export function EbookDetailClient({
  book,
  related,
  books,
}: {
  book: Book;
  related: Book[];
  books: Book[];
}) {
  const isBookTitle = (title: string) => books.some((b) => b.title === title);
  const [format, setFormat] = useState<Format>("PDF");

  const [cart, setCart] = useState<string[]>([]);
  const [formats, setFormats] = useState<Record<string, Format>>({});
  const [externalItems, setExternalItems] = useState<StoredCartItem[]>([]);

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
        if (f && typeof f === "object") {
          setFormats(f);
          if (f[book.title]) setFormat(f[book.title]);
        }
      }
    } catch {}
  }, [book.title]);

  const unitPrice = format === "Print +$10" ? book.price + 10 : book.price;

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

  const persist = (nextCart: string[], nextFormats: Record<string, Format>) => {
    const items = nextCart.map((title) => {
      const b = books.find((x) => x.title === title);
      if (!b) {
        return externalItems.find((item) => item.title === title) ?? { title, price: 0 };
      }
      const fmt = nextFormats[title] ?? "PDF";
      const price = fmt === "Print +$10" ? b.price + 10 : b.price;
      return { title, price, format: fmt, cover: b.cover };
    });
    try {
      sessionStorage.setItem(
        "ebooks:state",
        JSON.stringify({ cart: nextCart, formats: nextFormats, items }),
      );
      window.dispatchEvent(new CustomEvent("cart:update"));
    } catch {}
  };

  const addToCart = () => {
    const nextFormats = { ...formats, [book.title]: format };
    const nextCart = cart.includes(book.title) ? cart : [...cart, book.title];
    setFormats(nextFormats);
    setCart(nextCart);
    persist(nextCart, nextFormats);
  };

  const discount = Math.round(
    ((book.oldPrice - book.price) / book.oldPrice) * 100,
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader
        cartItems={cartItems}
        onRemoveItem={(title) => {
          const nextCart = cart.filter((t) => t !== title);
          setCart(nextCart);
          persist(nextCart, formats);
        }}
      />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/ebooks"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to eBooks
        </Link>

        <div className="mt-8 grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Cover */}
          <div className="relative">
            <div className="aspect-square rounded-3xl bg-card border border-border overflow-hidden shadow-sm">
              <img
                src={book.cover}
                alt={book.title}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow">
              {discount}% Off
            </span>
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Tag className="w-4 h-4" /> {book.category}
            </p>
            <h1 className="mt-2 font-display text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
              {book.title}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">{book.tagline}</p>

            <div className="mt-4 flex items-center gap-2">
              <div className="flex" aria-label={`${book.rating} of 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < book.rating ? "fill-primary text-primary" : "text-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {book.rating.toFixed(1)} ({book.reviews} reviews) ·{" "}
                <BookOpen className="inline w-4 h-4 -mt-0.5" /> {book.pages} pages
              </span>
            </div>

            <div className="mt-6 flex items-end gap-3">
              <span className="font-display text-5xl font-extrabold text-primary leading-none">
                ${unitPrice.toFixed(2)}
              </span>
              <span className="text-xl font-semibold text-muted-foreground line-through pb-1">
                ${book.oldPrice.toFixed(2)}
              </span>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-foreground mb-2">Format</p>
              <div className="grid grid-cols-2 gap-0 rounded-full bg-muted p-1 max-w-sm">
                {(["PDF", "Print +$10"] as Format[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`text-sm font-semibold py-2.5 rounded-full transition-colors ${
                      format === f
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  addToCart();
                  openCartDrawer();
                }}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full font-semibold py-4 text-base transition-colors ${
                  cart.includes(book.title)
                    ? "bg-green-600 text-white hover:bg-green-600"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.includes(book.title) ? "Added to Cart" : "Add to Cart"}
              </button>
              <Link
                href="/checkout"
                onClick={addToCart}
                className="flex-1 inline-flex items-center justify-center rounded-full bg-foreground text-background font-semibold py-4 text-base hover:opacity-90 transition-opacity"
              >
                Buy Now
              </Link>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Instant download for PDF · Print orders ship within 3–5 business days
            </p>
          </div>
        </div>

        {/* About + What you'll learn */}
        <section className="mt-16 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl font-bold text-foreground">
              About this eBook
            </h2>
            <div className="mt-3 space-y-4 text-muted-foreground leading-relaxed">
              {book.description.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <h3 className="mt-10 font-display text-xl font-bold text-foreground">
              What&apos;s inside
            </h3>
            <ol className="mt-4 space-y-3">
              {book.chapters.map((c, i) => (
                <li
                  key={c}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm inline-flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-foreground font-medium">{c}</span>
                </li>
              ))}
            </ol>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-bold text-foreground">
                What you&apos;ll learn
              </h3>
              <ul className="mt-4 space-y-3">
                {book.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-bold text-foreground">
                About the author
              </h3>
              <p className="mt-2 font-semibold text-foreground">{book.author.name}</p>
              <p className="text-sm text-muted-foreground">{book.author.role}</p>
            </div>
          </aside>
        </section>

        {/* Related */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-foreground">
            You may also like
          </h2>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((b) => (
              <Link
                key={b.slug}
                href={`/ebooks/${b.slug}`}
                className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square bg-muted overflow-hidden">
                  <img
                    src={b.cover}
                    alt={b.title}
                    className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {b.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.category}</p>
                  <p className="mt-3 font-display text-xl font-extrabold text-primary">
                    ${b.price.toFixed(2)}{" "}
                    <span className="text-sm font-semibold text-muted-foreground line-through">
                      ${b.oldPrice.toFixed(2)}
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
