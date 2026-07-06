"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Store, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/marketplace/company/storefront/use-cart";

type Vendor = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  bannerImage: string | null;
  productCount: number;
};

export default function MarketplaceVendors({ companySlug }: { companySlug: string }) {
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const { itemCount } = useCart(companySlug);

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/marketplace/company/${encodeURIComponent(companySlug)}/vendors`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (res.ok && data?.ok) setVendors(data.items as Vendor[]);
        else setError(true);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [companySlug, reloadKey]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button asChild variant="outline">
          <Link href={`/company/${companySlug}/cart`}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Cart {itemCount > 0 ? `(${itemCount})` : ""}
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-xl border bg-background py-16 text-center">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load vendors. Please try again.</p>
          <Button variant="outline" className="mt-4" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </Button>
        </div>
      ) : vendors.length === 0 ? (
        <div className="rounded-xl border bg-background py-16 text-center text-muted-foreground">
          No vendors available yet.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => (
            <div key={v.id} className="flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
              <div className="relative h-32 w-full bg-muted">
                {v.bannerImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.bannerImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <Store className="h-8 w-8 text-primary/40" />
                  </div>
                )}
                <div className="absolute -bottom-6 left-4 h-14 w-14 overflow-hidden rounded-xl border-4 border-background bg-background shadow">
                  {v.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.logo} alt={v.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Store className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4 pt-8">
                <div className="flex-1">
                  <div className="text-base font-semibold">{v.name}</div>
                  {v.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{v.description}</p>
                  ) : null}
                  <div className="mt-2 text-xs text-muted-foreground">{v.productCount} products</div>
                </div>
                <Button asChild className="mt-4 w-full">
                  <Link href={`/company/${companySlug}/marketplace/${v.slug}`}>View Products</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
