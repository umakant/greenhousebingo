"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { Filter, Home, SlidersHorizontal } from "lucide-react";

import type { PublicCatalogCollection } from "@/lib/storefront/public-catalog";
import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";

import { PublishedPageChrome } from "@/components/storefront/public/published-page-view";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Props = {
  collection: PublicCatalogCollection;
  publicSettings: PublicStorefrontBrandSettings;
  websiteId: string;
  style?: CSSProperties;
  /** When true, skip `PublishedPageChrome` — content mounts inside Liquid theme `#pf-react-main-slot`. */
  themeChrome?: boolean;
};

type Row = PublicCatalogCollection["products"][number];

const NEW_PRODUCT_MS = 30 * 24 * 60 * 60 * 1000;

type CategoryTab = { key: string; label: string; count: number; categoryParam: string | null };

function buildCategoryTabs(products: Row[], collectionTitle: string): CategoryTab[] {
  const total = products.length;
  const tabs: CategoryTab[] = [
    { key: "all", label: `All ${collectionTitle}`, count: total, categoryParam: null },
  ];
  const uncatCount = products.filter((p) => !p.categoryId).length;
  if (uncatCount > 0) {
    tabs.push({ key: "none", label: "Uncategorized", count: uncatCount, categoryParam: "none" });
  }
  const byId = new Map<string, { name: string; count: number }>();
  for (const p of products) {
    if (!p.categoryId) continue;
    const cur = byId.get(p.categoryId);
    const name = p.categoryName?.trim() || "Category";
    if (cur) cur.count += 1;
    else byId.set(p.categoryId, { name, count: 1 });
  }
  const sorted = [...byId.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
  for (const [id, { name, count }] of sorted) {
    tabs.push({ key: id, label: name, count, categoryParam: id });
  }
  return tabs;
}

function isNewProduct(createdAtIso: string): boolean {
  const t = new Date(createdAtIso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < NEW_PRODUCT_MS;
}

/** Collection PLP — hero, category tabs, filter sheet, sort, 4-up grid (Concept-style reference). */
export function PublicCollectionView({ collection, publicSettings, websiteId, style, themeChrome }: Props) {
  const [products, setProducts] = React.useState<Row[]>(collection.products);
  const [loading, setLoading] = React.useState(false);
  const [sort, setSort] = React.useState("best_selling");
  const [activeTabKey, setActiveTabKey] = React.useState("all");
  const [showOnModel, setShowOnModel] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const [appliedQ, setAppliedQ] = React.useState("");
  const [appliedMinPrice, setAppliedMinPrice] = React.useState("");
  const [appliedMaxPrice, setAppliedMaxPrice] = React.useState("");
  const [appliedInStockOnly, setAppliedInStockOnly] = React.useState(false);

  const [draftQ, setDraftQ] = React.useState("");
  const [draftMinPrice, setDraftMinPrice] = React.useState("");
  const [draftMaxPrice, setDraftMaxPrice] = React.useState("");
  const [draftInStockOnly, setDraftInStockOnly] = React.useState(false);

  const categoryTabs = React.useMemo(
    () => buildCategoryTabs(collection.products, collection.title),
    [collection.products, collection.title],
  );

  const activeCategoryParam = React.useMemo(() => {
    const tab = categoryTabs.find((t) => t.key === activeTabKey);
    return tab?.categoryParam ?? null;
  }, [categoryTabs, activeTabKey]);

  const heroImage = React.useMemo(() => {
    for (const p of collection.products) {
      if (p.image?.trim()) return p.image.trim();
    }
    return null;
  }, [collection.products]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("collection", collection.slug);
      if (appliedQ.trim()) params.set("q", appliedQ.trim());
      params.set("sort", sort);
      if (activeCategoryParam) params.set("categoryId", activeCategoryParam);
      const mn = appliedMinPrice.trim() ? Number(appliedMinPrice) : NaN;
      const mx = appliedMaxPrice.trim() ? Number(appliedMaxPrice) : NaN;
      if (!Number.isNaN(mn)) params.set("minPrice", String(mn));
      if (!Number.isNaN(mx)) params.set("maxPrice", String(mx));
      if (appliedInStockOnly) params.set("inStock", "1");
      params.set("limit", "60");

      const res = await fetch(`/api/storefront/public/catalog/search?${params.toString()}`, {
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        products?: Row[];
      };
      if (res.ok && data?.ok && Array.isArray(data.products)) {
        setProducts(data.products);
      }
    } finally {
      setLoading(false);
    }
  }, [
    collection.slug,
    appliedQ,
    sort,
    activeCategoryParam,
    appliedMinPrice,
    appliedMaxPrice,
    appliedInStockOnly,
  ]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const onFiltersOpenChange = (open: boolean) => {
    setFiltersOpen(open);
    if (open) {
      setDraftQ(appliedQ);
      setDraftMinPrice(appliedMinPrice);
      setDraftMaxPrice(appliedMaxPrice);
      setDraftInStockOnly(appliedInStockOnly);
    }
  };

  const applySheetFilters = () => {
    setAppliedQ(draftQ);
    setAppliedMinPrice(draftMinPrice);
    setAppliedMaxPrice(draftMaxPrice);
    setAppliedInStockOnly(draftInStockOnly);
    setFiltersOpen(false);
  };

  const cardAspect = showOnModel ? "aspect-[3/4]" : "aspect-square";
  const tc = Boolean(themeChrome);

  const inner = (
    <div className="flex min-h-0 flex-1 flex-col bg-background" {...(tc && style ? { style } : {})}>
        {/* Hero */}
        <section className="relative isolate min-h-[min(52vh,520px)] w-full overflow-hidden bg-neutral-900">
          {heroImage ? (
            <>
              <Image src={heroImage} alt="" fill className="object-cover object-center" priority unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/30" aria-hidden />
            </>
          ) : (
            <div
              className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950"
              aria-hidden
            />
          )}
          <div className="relative z-10 flex min-h-[min(52vh,520px)] flex-col justify-end px-4 pb-10 pt-24 md:px-8 lg:px-12">
            <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-white/85">
              <Link href="/shop" className="inline-flex items-center gap-1 transition hover:text-white">
                <Home className="h-4 w-4" aria-hidden />
                <span className="sr-only">Home</span>
              </Link>
              <span className="text-white/50" aria-hidden>
                /
              </span>
              <Link href="/shop" className="transition hover:text-white">
                Collections
              </Link>
              <span className="text-white/50" aria-hidden>
                /
              </span>
              <span className="font-medium text-white">{collection.title}</span>
            </nav>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
              {collection.title}
            </h1>
            {collection.description ? (
              <p className="mt-3 max-w-2xl text-sm text-white/80 md:text-base">{collection.description}</p>
            ) : null}
          </div>
        </section>

        {/* Toolbar */}
        <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-6 lg:px-8">
            <div className="flex shrink-0 items-center gap-3">
              <Sheet open={filtersOpen} onOpenChange={onFiltersOpenChange}>
                <SheetTrigger asChild>
                  <Button type="button" variant="outline" className="rounded-full border-border px-4">
                    <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden />
                    Show filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" aria-hidden />
                      Filters
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 flex flex-col gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="pf-cat-q">Search</Label>
                      <Input
                        id="pf-cat-q"
                        value={draftQ}
                        onChange={(e) => setDraftQ(e.target.value)}
                        placeholder="Product name or SKU"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="pf-min-p">Min price</Label>
                        <Input
                          id="pf-min-p"
                          inputMode="decimal"
                          value={draftMinPrice}
                          onChange={(e) => setDraftMinPrice(e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pf-max-p">Max price</Label>
                        <Input
                          id="pf-max-p"
                          inputMode="decimal"
                          value={draftMaxPrice}
                          onChange={(e) => setDraftMaxPrice(e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={draftInStockOnly}
                        onCheckedChange={(v) => setDraftInStockOnly(v === true)}
                      />
                      In stock only
                    </label>
                    <div className="flex gap-2 pt-2">
                      <Button type="button" className="rounded-full" onClick={() => applySheetFilters()}>
                        Apply filters
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => {
                          setDraftQ("");
                          setDraftMinPrice("");
                          setDraftMaxPrice("");
                          setDraftInStockOnly(false);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {categoryTabs.length > 1 ? (
              <div className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <ul className="flex items-baseline gap-6 whitespace-nowrap px-1 pb-1 text-sm md:justify-center">
                  {categoryTabs.map((tab) => {
                    const active = tab.key === activeTabKey;
                    return (
                      <li key={tab.key}>
                        <button
                          type="button"
                          onClick={() => setActiveTabKey(tab.key)}
                          className={cn(
                            "inline-flex items-baseline gap-0.5 border-b-2 border-transparent pb-1 font-medium transition-colors",
                            active
                              ? "border-foreground text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <span>{tab.label}</span>
                          <sup className="ml-0.5 text-[0.65em] font-semibold text-muted-foreground tabular-nums">
                            {tab.count}
                          </sup>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="hidden flex-1 md:block" />
            )}

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowOnModel((v) => !v)}
                className={cn(
                  "text-sm font-medium underline-offset-4 transition hover:underline",
                  showOnModel ? "text-foreground" : "text-muted-foreground",
                )}
              >
                Show on model
              </button>
              <div className="w-full min-w-[160px] sm:w-[200px]">
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-10 rounded-full border-border bg-background px-4">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="best_selling">Best selling</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price_asc">Price: low to high</SelectItem>
                    <SelectItem value="price_desc">Price: high to low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 lg:px-8">
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/shop/products/${p.slug ?? p.id}`}
                  className="group block overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition hover:border-foreground/20 hover:shadow-md"
                >
                  <div className={cn("relative w-full bg-muted/60 p-4", cardAspect)}>
                    {isNewProduct(p.createdAt) ? (
                      <span className="absolute left-3 top-3 z-10 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                        New
                      </span>
                    ) : null}
                    <span className="absolute right-3 top-3 z-10 flex items-center gap-0.5 text-xs font-medium text-amber-600">
                      <span aria-hidden>★</span>
                      <span>5.0</span>
                    </span>
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt=""
                        fill
                        className={cn(
                          "object-contain transition duration-300 group-hover:scale-[1.02]",
                          showOnModel && "object-cover",
                        )}
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full min-h-[160px] items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 px-4 pb-4 pt-3">
                    <p className="line-clamp-2 font-medium leading-snug text-foreground">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">${p.price.toFixed(2)}</span>
                      {p.compareAtPrice != null && p.compareAtPrice > p.price ? (
                        <span className="ml-2 line-through">${p.compareAtPrice.toFixed(2)}</span>
                      ) : null}
                      {typeof p.stock === "number" && p.stock <= 0 ? (
                        <span className="ml-2 text-xs text-destructive">Out of stock</span>
                      ) : null}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {products.length === 0 ? (
            <p className="mt-12 text-center text-muted-foreground">
              {loading ? "Loading…" : "No products match your filters."}
            </p>
          ) : null}
        </main>
      </div>
  );

  if (tc) return inner;
  return (
    <PublishedPageChrome publicSettings={publicSettings} title={collection.title} websiteId={websiteId} style={style}>
      {inner}
    </PublishedPageChrome>
  );
}
