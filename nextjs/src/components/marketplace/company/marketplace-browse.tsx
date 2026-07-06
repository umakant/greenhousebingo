"use client";

import * as React from "react";
import { Search, Loader2, Plus, Minus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";

type Product = {
  id: string;
  name: string;
  vendorName: string | null;
  description: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
  category: string | null;
  stock: number | null;
};

type CartItem = { product: Product; quantity: number };

export default function MarketplaceBrowse({ canOrder }: { canOrder: boolean }) {
  const { settings } = useAppSettings();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("");
  const searchRef = React.useRef("");

  const [cart, setCart] = React.useState<Record<string, CartItem>>({});
  const [cartOpen, setCartOpen] = React.useState(false);
  const [placing, setPlacing] = React.useState(false);
  const [notes, setNotes] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/marketplace/shop/catalog", window.location.origin);
      if (searchRef.current.trim()) url.searchParams.set("search", searchRef.current.trim());
      if (activeCategory) url.searchParams.set("category", activeCategory);
      const res = await fetch(url.toString(), { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setProducts(data.items as Product[]);
        setCategories(data.categories as string[]);
      }
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const applySearch = () => {
    searchRef.current = search;
    void load();
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev[product.id];
      const quantity = (existing?.quantity ?? 0) + 1;
      return { ...prev, [product.id]: { product, quantity } };
    });
    toast.success(`Added ${product.name}`);
  };

  const setQty = (id: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...prev[id], quantity } };
    });
  };

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((n, i) => n + i.quantity, 0);
  const cartTotal = cartItems.reduce((n, i) => n + i.product.price * i.quantity, 0);

  const placeOrder = async () => {
    if (cartItems.length === 0) return;
    setPlacing(true);
    try {
      const res = await fetch("/api/marketplace/shop/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          lines: cartItems.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        toast.success(`Order ${data.item.orderNumber} placed`);
        setCart({});
        setNotes("");
        setCartOpen(false);
      } else {
        toast.error(data?.message ?? "Could not place order");
      }
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-md flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applySearch();
                }
              }}
              placeholder="Search products…"
            />
          </div>
          <Button type="button" onClick={applySearch}>
            Search
          </Button>
        </div>
        {canOrder ? (
          <Button variant="outline" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Cart {cartCount > 0 ? `(${cartCount})` : ""}
          </Button>
        ) : null}
      </div>

      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={activeCategory === "" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("")}
          >
            All
          </Button>
          {categories.map((c) => (
            <Button
              key={c}
              type="button"
              variant={activeCategory === c ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border bg-background py-16 text-center text-muted-foreground">
          No products available.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="flex flex-col overflow-hidden rounded-xl border bg-background">
              <div className="flex h-40 items-center justify-center bg-muted">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex-1">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.vendorName ?? "—"}</div>
                  {p.category ? (
                    <Badge variant="outline" className="mt-2">
                      {p.category}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-semibold">{formatCurrency(p.price, settings)}</span>
                  {canOrder ? (
                    <Button size="sm" onClick={() => addToCart(p)}>
                      <Plus className="mr-1 h-4 w-4" />
                      Add
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Your cart</SheetTitle>
            <SheetDescription>Review items and place your order.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            {cartItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            ) : (
              <>
                {cartItems.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center gap-3 rounded-md border p-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(product.price, settings)} each
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(product.id, quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{quantity}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(product.id, quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setQty(product.id, 0)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="grid gap-2">
                  <Label htmlFor="cart-notes">Order notes</Label>
                  <Textarea id="cart-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(cartTotal, settings)}</span>
                </div>
              </>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setCartOpen(false)} disabled={placing}>
              Keep shopping
            </Button>
            <Button onClick={() => void placeOrder()} disabled={placing || cartItems.length === 0}>
              {placing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Place order
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
