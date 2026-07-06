"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import * as React from "react";
import { Minus, Plus, Sparkles, X } from "lucide-react";

import type { PublicCatalogProduct } from "@/lib/storefront/public-catalog";
import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";
import { canSellQty, parseInventoryPolicy } from "@/lib/storefront/inventory-storefront";
import { formatStorefrontCatalogMoney } from "@/lib/storefront/storefront-price-format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { PublishedPageChrome } from "@/components/storefront/public/published-page-view";
import { PF_STOREFRONT_CART_SYNC_EVENT } from "@/components/storefront/public/storefront-liquid-cart-sync";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  product: PublicCatalogProduct;
  publicSettings: PublicStorefrontBrandSettings;
  websiteId: string;
  style?: CSSProperties;
  /** When true, skip `PublishedPageChrome` — content mounts inside Liquid theme `#pf-react-main-slot`. */
  themeChrome?: boolean;
};

type VariantOption = { id: string; name: string; price?: number; image?: string | null };

function parseVariantOptions(variants: unknown): VariantOption[] {
  if (!variants || !Array.isArray(variants)) return [];
  const out: VariantOption[] = [];
  for (const v of variants) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const id = String(o.id ?? o.sku ?? "");
    const name = String(o.name ?? o.title ?? id);
    if (!id) continue;
    const price = typeof o.price === "number" ? o.price : undefined;
    const image =
      typeof o.image === "string"
        ? o.image
        : typeof o.imageUrl === "string"
          ? o.imageUrl
          : null;
    out.push({ id, name, price, image: image?.trim() || null });
  }
  return out;
}

async function postCartLine(productId: string, quantity: number, variantKey: string): Promise<void> {
  const res = await fetch("/api/storefront/public/cart", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId, quantity, variantKey }),
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string };
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error ?? "Could not update cart");
  }
}

/** Concept-style PDP — gallery column + thumbs + buy box (upgrades, stock meter, qty, add / buy now). */
export function PublicProductView({ product, publicSettings, websiteId, style, themeChrome }: Props) {
  const imgs = React.useMemo(() => {
    const raw = product.galleryImages?.length ? product.galleryImages : product.image ? [product.image] : [];
    return [...new Set(raw.map((u) => String(u ?? "").trim()).filter(Boolean))];
  }, [product.galleryImages, product.image]);

  const [activeIndex, setActiveIndex] = React.useState(0);
  React.useEffect(() => {
    setActiveIndex((i) => {
      if (imgs.length === 0) return 0;
      return Math.min(Math.max(0, i), imgs.length - 1);
    });
  }, [imgs.length]);
  const activeUrl = imgs[activeIndex] ?? null;

  const variantOptions = React.useMemo(() => parseVariantOptions(product.variants), [product.variants]);
  const [variantKey, setVariantKey] = React.useState("");
  React.useEffect(() => {
    if (variantOptions.length && !variantKey) {
      setVariantKey(variantOptions[0]!.id);
    }
  }, [variantOptions, variantKey]);

  const displayPrice =
    variantOptions.length > 0 && variantKey
      ? (variantOptions.find((o) => o.id === variantKey)?.price ?? product.price)
      : product.price;

  const [qty, setQty] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [selectedUpgrades, setSelectedUpgrades] = React.useState<Record<string, boolean>>({});
  const [upgradesOpen, setUpgradesOpen] = React.useState(true);

  const invPolicy = parseInventoryPolicy(product.inventoryPolicy);
  const purchasable = canSellQty(product.stock, qty, invPolicy);
  const maxQty =
    invPolicy === "continue" ? 99 : Math.max(1, Math.min(99, product.stock));

  const upgrades = product.related.slice(0, 4);
  const upgradeTotal = upgrades
    .filter((r) => selectedUpgrades[r.id])
    .reduce((sum, r) => sum + r.price, 0);
  const lineTotal = displayPrice * qty + upgradeTotal;

  const showUrgency =
    invPolicy === "track" && product.stock > 0 && product.stock <= Math.max(product.stockAlert * 3, 20);
  const urgencyFillPct = Math.min(100, Math.max(10, Math.round((product.stock / 40) * 100)));

  const descRaw = product.description?.trim() ?? "";
  const descriptionLooksHtml = /<[a-z][\s\S]*>/i.test(descRaw);

  const others = imgs.map((u, i) => ({ u, i })).filter(({ i }) => i !== activeIndex);
  const sideThumbs = others.slice(0, 2);

  const toggleUpgrade = (id: string, checked: boolean) => {
    setSelectedUpgrades((prev) => ({ ...prev, [id]: checked }));
  };

  const addBundle = async (thenCheckout: boolean) => {
    if (!purchasable) {
      toast.error("This product is not available in the requested quantity.");
      return;
    }
    if (variantOptions.length > 0 && !variantKey) {
      toast.error("Choose an option.");
      return;
    }
    setLoading(true);
    try {
      const vk = variantOptions.length > 0 ? variantKey : "";
      await postCartLine(product.id, qty, vk);
      for (const r of upgrades) {
        if (!selectedUpgrades[r.id]) continue;
        await postCartLine(r.id, 1, "");
      }
      toast.success(thenCheckout ? "Added — continuing to checkout" : "Added to cart");
      if (themeChrome && !thenCheckout) {
        window.dispatchEvent(
          new CustomEvent(PF_STOREFRONT_CART_SYNC_EVENT, {
            bubbles: true,
            detail: { openDrawer: true },
          }),
        );
      }
      if (thenCheckout) {
        window.location.href = "/shop/checkout";
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const showSwatches = variantOptions.length > 0 && variantOptions.length <= 10;

  const tc = Boolean(themeChrome);
  const storeLabel = publicSettings.storeName?.trim() || "Shop";

  /** In Concept `#pf-react-main-slot`, avoid theme `.section` color tokens + OS2 grid clashes (`pf-pdp-layout` CSS). */
  const pdpSurface = tc
    ? "pf-storefront-pdp rounded-[1.75rem] bg-white p-6 text-slate-900 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.06] sm:p-8 lg:p-10 dark:bg-white dark:text-slate-900"
    : "rounded-[1.75rem] border border-border/70 bg-card p-6 text-card-foreground shadow-sm sm:p-8 lg:p-10";

  const ink = tc ? "text-slate-900" : "text-foreground";
  const muted = tc ? "text-slate-600" : "text-muted-foreground";
  const borderSoft = tc ? "border-slate-200" : "border-border/60";
  const panelBg = tc ? "bg-slate-50" : "bg-muted/20";

  const money = React.useCallback(
    (n: number) =>
      formatStorefrontCatalogMoney(n, publicSettings.catalogCurrencyCode, publicSettings.currencyDisplay),
    [publicSettings.catalogCurrencyCode, publicSettings.currencyDisplay],
  );

  const inner = (
    <main
      className={cn(
        tc
          ? "mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10 lg:px-8"
          : "mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:py-10 lg:px-8",
      )}
      {...(tc && style ? { style } : {})}
    >
      <div className={cn("mx-auto w-full max-w-6xl", pdpSurface)}>
        {/*
          OS2 ships a global `.grid { grid-template-columns: repeat(3, …) }`. Avoid bare `.grid`.
          In theme chrome, `pf-pdp-layout` + injected CSS defines the desktop 5 | 2 | 5 columns.
        */}
        <div
          className={cn(
            "[display:grid] grid-cols-1 gap-8 lg:gap-10",
            tc ? "pf-pdp-layout" : "lg:grid-cols-12",
          )}
        >
          {/* Main gallery */}
          <div className={cn(!tc && "lg:col-span-5")}>
            <div
              className={cn(
                "relative aspect-[3/4] w-full overflow-hidden rounded-3xl border bg-muted/40",
                borderSoft,
              )}
            >
              {activeUrl ? (
                <img
                  src={activeUrl}
                  alt={product.name}
                  className="absolute inset-0 h-full w-full object-contain p-4"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className={cn("flex h-full min-h-[320px] items-center justify-center", muted)}>No image</div>
              )}
            </div>
          </div>

          {/* Secondary angles */}
          <div
            className={cn("flex flex-row gap-3 lg:flex-col lg:gap-4", !tc && "lg:col-span-2")}
          >
            {sideThumbs.length === 0 ? (
              <div
                className={cn(
                  "hidden min-h-[120px] rounded-2xl border border-dashed lg:block",
                  borderSoft,
                  tc ? "bg-slate-50/80" : "bg-muted/20",
                )}
              />
            ) : null}
            {sideThumbs.map(({ u, i }) => (
              <button
                key={`${u}-${i}`}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "relative aspect-square w-1/3 shrink-0 overflow-hidden rounded-2xl border ring-offset-2 transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 lg:aspect-square lg:w-full",
                  borderSoft,
                  tc ? "bg-slate-50" : "bg-muted/50",
                )}
              >
                <img
                  src={u}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain p-2"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>

          {/* Buy column */}
          <div className={cn("flex flex-col gap-6", !tc && "lg:col-span-5")}>
            <div>
              <p className={cn("text-sm font-medium tracking-wide", muted)}>{storeLabel}</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <h1
                  className={cn(
                    "text-balance text-3xl font-semibold tracking-tight sm:flex-1 md:text-4xl",
                    ink,
                  )}
                >
                  {product.name}
                </h1>
                <div className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end">
                  <p className={cn("text-3xl font-bold tabular-nums md:text-4xl", ink)}>${displayPrice.toFixed(2)}</p>
                  {product.compareAtPrice != null && product.compareAtPrice > displayPrice ? (
                    <p className={cn("text-base line-through", muted)}>${product.compareAtPrice.toFixed(2)}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className={cn("flex flex-wrap items-center gap-2 text-sm", muted)}>
              <span className="text-amber-500" aria-hidden>
                ★★★★★
              </span>
              <span className={cn("font-medium tabular-nums", ink)}>5.0</span>
              <span aria-hidden>·</span>
              <span>2 reviews</span>
            </div>

            {descRaw ? (
              descriptionLooksHtml ? (
                <div
                  className={cn(
                    "max-w-none text-sm leading-relaxed [&_a]:underline [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5",
                    tc
                      ? "text-slate-600 [&_a]:text-blue-700 [&_h1]:text-slate-900 [&_h2]:text-slate-900 [&_h3]:text-slate-900 [&_strong]:text-slate-900"
                      : "prose prose-sm prose-neutral text-foreground dark:prose-invert",
                  )}
                  dangerouslySetInnerHTML={{ __html: descRaw }}
                />
              ) : (
                <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", muted)}>{descRaw}</p>
              )
            ) : null}

            {product.storefrontHighlights && product.storefrontHighlights.length > 0 ? (
              <div className="space-y-3">
                <p className={cn("text-base font-semibold tracking-tight", ink)}>
                  {product.storefrontHighlightsHeading?.trim() || "Why you'll love it"}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {product.storefrontHighlights.map((row, idx) => (
                    <div
                      key={`hl-${idx}-${row.title}`}
                      className={cn(
                        "flex flex-col gap-2 rounded-xl border p-3 text-center sm:flex-row sm:items-start sm:text-left",
                        borderSoft,
                        panelBg,
                      )}
                    >
                      {row.imageUrl?.trim() ? (
                        <div className="relative mx-auto h-10 w-10 shrink-0 overflow-hidden rounded-md sm:mx-0">
                          <img
                            src={row.imageUrl.trim()}
                            alt=""
                            className="absolute inset-0 h-full w-full object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-xs font-semibold tabular-nums sm:mx-0",
                            borderSoft,
                            tc ? "bg-white text-slate-700" : "bg-background text-muted-foreground",
                          )}
                          aria-hidden
                        >
                          {row.title.trim().charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-medium leading-snug", ink)}>{row.title}</p>
                        {row.subtitle?.trim() ? (
                          <p className={cn("mt-0.5 text-xs leading-snug", muted)}>{row.subtitle.trim()}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {showSwatches ? (
              <div className="space-y-2">
                <p className={cn("text-sm", muted)}>
                  <span className={cn("font-medium", ink)}>Option:</span>{" "}
                  {variantOptions.find((v) => v.id === variantKey)?.name ?? "—"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {variantOptions.map((v) => {
                    const active = v.id === variantKey;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        title={v.name}
                        onClick={() => setVariantKey(v.id)}
                        className={cn(
                          "relative h-12 w-12 overflow-hidden rounded-full border-2 transition",
                          active
                            ? "border-blue-600 ring-2 ring-blue-600/30"
                            : cn(
                                tc ? "border-slate-200 hover:border-slate-400" : "border-border hover:border-foreground/40",
                              ),
                        )}
                      >
                        {v.image ? (
                          <img
                            src={v.image}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span
                            className={cn(
                              "flex h-full w-full items-center justify-center bg-muted text-[10px] font-medium leading-tight",
                              muted,
                            )}
                          >
                            {v.name.slice(0, 2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : variantOptions.length > 10 ? (
              <div className="space-y-1">
                <p className={cn("text-sm", muted)}>Choose an option</p>
                <Select value={variantKey} onValueChange={setVariantKey}>
                  <SelectTrigger className={cn("h-11 rounded-xl", tc && "border-slate-200 bg-white")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {variantOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                        {o.price != null ? ` — ${money(o.price)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {upgrades.length > 0 && upgradesOpen ? (
              <div className={cn("relative rounded-2xl border p-4", borderSoft, panelBg)}>
                <button
                  type="button"
                  className={cn(
                    "absolute right-3 top-3 rounded-full p-1 transition",
                    muted,
                    tc ? "hover:bg-white hover:text-slate-900" : "hover:bg-background hover:text-foreground",
                  )}
                  aria-label="Close add-ons"
                  onClick={() => setUpgradesOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="mb-3 flex items-center gap-2 pr-8">
                  <Sparkles className={cn("h-4 w-4", muted)} aria-hidden />
                  <h2 className={cn("text-sm font-semibold tracking-tight", ink)}>Popular add-ons</h2>
                </div>
                <ul className="flex flex-col gap-3">
                  {upgrades.map((r) => (
                    <li key={r.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`up-${r.id}`}
                        checked={Boolean(selectedUpgrades[r.id])}
                        onCheckedChange={(c) => toggleUpgrade(r.id, c === true)}
                      />
                      <label htmlFor={`up-${r.id}`} className="flex flex-1 cursor-pointer items-center gap-3">
                        <div
                          className={cn(
                            "relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border",
                            tc ? "border-slate-200 bg-white" : "border-border bg-background",
                          )}
                        >
                          {r.image ? (
                            <img
                              src={r.image}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className={cn("flex h-full items-center justify-center text-[10px]", muted)}>—</div>
                          )}
                        </div>
                        <span className={cn("flex-1 text-sm font-medium leading-snug", ink)}>{r.name}</span>
                        <span className={cn("text-sm font-semibold tabular-nums", ink)}>{money(r.price)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {showUrgency ? (
              <div className="space-y-2">
                <p className={cn("text-sm font-medium", ink)}>
                  Hurry, only {product.stock} {product.stock === 1 ? "item" : "items"} left in stock!
                </p>
                <div className={cn("h-2 w-full overflow-hidden rounded-full", tc ? "bg-slate-200" : "bg-muted")}>
                  <div
                    className={cn("h-full rounded-full transition-[width]", tc ? "bg-slate-900" : "bg-foreground")}
                    style={{ width: `${urgencyFillPct}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className={cn("text-sm", muted)}>Qty</span>
                <div
                  className={cn(
                    "inline-flex items-center rounded-full border",
                    tc ? "border-slate-200 bg-white" : "border-border bg-background",
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-l-full text-lg transition",
                      tc ? "hover:bg-slate-100" : "hover:bg-muted",
                    )}
                    aria-label="Decrease quantity"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className={cn("min-w-[2.5rem] text-center text-sm font-semibold tabular-nums", ink)}>
                    {qty}
                  </span>
                  <button
                    type="button"
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-r-full text-lg transition",
                      tc ? "hover:bg-slate-100" : "hover:bg-muted",
                    )}
                    aria-label="Increase quantity"
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    disabled={qty >= maxQty}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Button
                type="button"
                size="lg"
                data-pf-pdp-add=""
                disabled={loading || !purchasable || (variantOptions.length > 0 && !variantKey)}
                className={cn(
                  "relative z-10 h-12 w-full rounded-xl border-0 text-base font-semibold shadow-md hover:opacity-[0.96]",
                  tc
                    ? "!bg-orange-500 !text-white hover:!bg-orange-600 disabled:!bg-slate-400 disabled:!text-white disabled:!opacity-100"
                    : "bg-gradient-to-r from-orange-500 via-amber-500 to-blue-600 text-white",
                )}
                onClick={() => void addBundle(false)}
              >
                {loading ? "Adding…" : `Add to cart — ${money(lineTotal)}`}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={loading || !purchasable || (variantOptions.length > 0 && !variantKey)}
                className={cn(
                  "h-12 w-full rounded-xl text-base font-semibold",
                  tc ? "border-2 border-slate-900 bg-white text-slate-900 hover:bg-slate-50" : "border-foreground/20",
                )}
                onClick={() => void addBundle(true)}
              >
                Buy it now
              </Button>
            </div>

            <p className={cn("text-xs", muted)}>SKU {product.sku ?? "—"}</p>
          </div>
        </div>
      </div>

        {product.related.length > 4 ? (
          <section className="mt-14 border-t border-border pt-10">
            <h2 className="mb-4 text-lg font-semibold tracking-tight">More to explore</h2>
            <ul className="[display:grid] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {product.related.slice(4).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/shop/products/${r.slug ?? r.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card transition hover:border-foreground/20"
                  >
                    <div className="relative aspect-square w-full bg-muted/50 p-3">
                      {r.image ? (
                        <img
                          src={r.image}
                          alt=""
                          className="absolute inset-0 h-full w-full object-contain transition group-hover:scale-[1.02]"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                    </div>
                    <div className="p-3">
                      <p className="font-medium leading-snug">{r.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{money(r.price)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
    </main>
  );

  if (themeChrome) {
    return inner;
  }

  return (
    <PublishedPageChrome publicSettings={publicSettings} title={product.name} websiteId={websiteId} style={style}>
      {inner}
    </PublishedPageChrome>
  );
}
