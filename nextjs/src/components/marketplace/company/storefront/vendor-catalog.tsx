"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Store, ShoppingCart, Plus, Minus, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { useCart, type CartProduct } from "@/components/marketplace/company/storefront/use-cart";

type Vendor = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  bannerImage: string | null;
};
type Category = { id: string; name: string; slug: string };
type Product = {
  id: string;
  vendorId: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  image: string | null;
  category: string | null;
  bucketCountValue: number;
  inventoryCount: number | null;
};

export default function VendorCatalog({
  companySlug,
  vendorSlug,
}: {
  companySlug: string;
  vendorSlug: string;
}) {
  const { settings } = useAppSettings();
  const { addItem, setQuantity, itemCount, state } = useCart(companySlug);
  const [vendor, setVendor] = React.useState<Vendor | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [minBuckets, setMinBuckets] = React.useState<number>(6);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState<string>("");
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(
          `/api/marketplace/company/${encodeURIComponent(companySlug)}/vendors/${encodeURIComponent(vendorSlug)}`,
          { credentials: "include" },
        );
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (res.ok && data?.ok) {
          setVendor(data.vendor as Vendor);
          setCategories(data.categories as Category[]);
          setProducts(data.products as Product[]);
          if (typeof data.minBuckets === "number") setMinBuckets(data.minBuckets);
        } else if (res.status === 404) {
          setVendor(null);
        } else {
          setError(true);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [companySlug, vendorSlug, reloadKey]);

  const visibleProducts = React.useMemo(
    () => (activeCategory ? products.filter((p) => p.categoryId === activeCategory) : products),
    [products, activeCategory],
  );

  const qtyInCart = (productId: string) => state.lines[productId]?.quantity ?? 0;

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border bg-background py-16 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load this vendor. Please try again.</p>
        <Button variant="outline" className="mt-4" onClick={() => setReloadKey((k) => k + 1)}>
          Retry
        </Button>
      </div>
    );
  }
  if (!vendor) {
    return (
      <div className="rounded-xl border bg-background py-16 text-center">
        <p className="text-sm text-muted-foreground">Vendor not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/company/${companySlug}/marketplace`}>Back to marketplace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="relative h-40 w-full bg-muted sm:h-52">
          {vendor.bannerImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vendor.bannerImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <Store className="h-10 w-10 text-primary/40" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h2 className="text-lg font-semibold">{vendor.name}</h2>
            {vendor.description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{vendor.description}</p>
            ) : null}
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/company/${companySlug}/cart`}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart {itemCount > 0 ? `(${itemCount})` : ""}
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
        <Info className="h-4 w-4 shrink-0" />
        Minimum order: {minBuckets} bucket{minBuckets === 1 ? "" : "s"} for delivery.
      </div>

      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeCategory === "" ? "default" : "outline"}
            onClick={() => setActiveCategory("")}
          >
            All
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              type="button"
              size="sm"
              variant={activeCategory === c.id ? "default" : "outline"}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      ) : null}

      {visibleProducts.length === 0 ? (
        <div className="rounded-xl border bg-background py-16 text-center text-muted-foreground">
          No products in this category.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((p) => {
            const inCart = qtyInCart(p.id);
            return (
              <div key={p.id} className="flex flex-col overflow-hidden rounded-xl border bg-background">
                <div className="flex h-40 items-center justify-center bg-muted">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex-1">
                    <div className="font-medium">{p.name}</div>
                    {p.category ? (
                      <Badge variant="outline" className="mt-1">
                        {p.category}
                      </Badge>
                    ) : null}
                    {p.description ? (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                    ) : null}
                    {p.bucketCountValue > 0 ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {p.bucketCountValue} bucket{p.bucketCountValue === 1 ? "" : "s"} each
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-semibold">{formatCurrency(p.price, settings)}</span>
                    {inCart > 0 ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => setQuantity(p.id, inCart - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{inCart}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() =>
                            addItem(toCartProduct(p), { id: vendor.id, slug: vendor.slug, name: vendor.name }, 1)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          addItem(toCartProduct(p), { id: vendor.id, slug: vendor.slug, name: vendor.name }, 1);
                          toast.success(`Added ${p.name}`);
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add to Cart
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function toCartProduct(p: Product): CartProduct {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    currency: p.currency,
    image: p.image,
    bucketCountValue: p.bucketCountValue,
  };
}
