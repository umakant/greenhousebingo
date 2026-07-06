"use client";

import Link from "next/link";
import { ChevronDown, Menu, ShoppingCart, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const brandLogo = "/waterice/water-ice-express-logo-icicle.png";

type NavKey = "home" | "services" | "memberships" | "events" | "about" | "testimonials" | "contact";

export type CartItem = { title: string; price: number; qty?: number; format?: string; cover?: string };

const STORAGE_KEY = "ebooks:state";
const EVENT_KEY = "cart:update";
const OPEN_KEY = "cart:open";

/** Dispatch this from any "add to cart" action to auto-open the cart drawer. */
export function openCartDrawer() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_KEY));
}

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.items)) {
      return parsed.items.filter(
        (item: Partial<CartItem>) =>
          item && typeof item.title === "string" && typeof item.price === "number",
      );
    }
  } catch {}
  return [];
}

export function writeCart(next: { cart: string[]; formats: Record<string, string>; items: CartItem[] }) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT_KEY));
  } catch {}
}

export function SiteHeader({
  active,
  cartCount,
  cartItems: cartItemsProp,
  onRemoveItem,
}: {
  active?: NavKey;
  cartCount?: number;
  cartItems?: CartItem[];
  onRemoveItem?: (title: string) => void;
}) {
  const [internalItems, setInternalItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setInternalItems(readCart());
    const sync = () => setInternalItems(readCart());
    const open = () => setCartOpen(true);
    window.addEventListener(EVENT_KEY, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    window.addEventListener(OPEN_KEY, open);
    return () => {
      window.removeEventListener(EVENT_KEY, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener(OPEN_KEY, open);
    };
  }, []);

  const cartItems = cartItemsProp ?? internalItems;

  const removeItem = (title: string) => {
    if (onRemoveItem) {
      onRemoveItem(title);
      return;
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : { cart: [], formats: {}, items: [] };
      const nextCart = (parsed.cart ?? []).filter((t: string) => t !== title);
      const nextItems = (parsed.items ?? []).filter(
        (i: Partial<CartItem>) =>
          i && typeof i.title === "string" && typeof i.price === "number" && i.title !== title,
      );
      writeCart({ cart: nextCart, formats: parsed.formats ?? {}, items: nextItems });
    } catch {}
  };

  const cls = (key: NavKey) =>
    active === key ? "text-primary font-semibold" : "text-foreground/80 hover:text-primary transition-colors";

  const count = cartCount ?? cartItems.reduce((s, i) => s + (i.qty ?? 1), 0);
  const subtotal = cartItems.reduce((s, i) => s + i.price * (i.qty ?? 1), 0);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-border/60">
      <div className="w-full px-4 sm:px-6 lg:px-10 py-2 grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-1">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="grid place-items-center w-10 h-10 -ml-1 rounded-full hover:bg-muted/70 transition-colors lg:hidden"
              >
                <Menu className="w-6 h-6 text-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[18rem] max-w-[85vw] flex flex-col">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1 text-base font-medium">
                <SheetClose asChild>
                  <Link href="/" className="rounded-lg px-3 py-2.5 hover:bg-muted">Home</Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/about" className="rounded-lg px-3 py-2.5 hover:bg-muted">About Us</Link>
                </SheetClose>
                <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Services</p>
                <SheetClose asChild>
                  <a href="/services#consulting" className="rounded-lg px-3 py-2 hover:bg-muted">Consulting</a>
                </SheetClose>
                <SheetClose asChild>
                  <a href="/services#wholesale" className="rounded-lg px-3 py-2 hover:bg-muted">Wholesale</a>
                </SheetClose>
                <SheetClose asChild>
                  <a href="/services#distribution" className="rounded-lg px-3 py-2 hover:bg-muted">Distribution</a>
                </SheetClose>
                <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shop</p>
                <SheetClose asChild>
                  <Link href="/ebooks" className="rounded-lg px-3 py-2 hover:bg-muted">eBooks</Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/shop/flavors" className="rounded-lg px-3 py-2 hover:bg-muted">Flavors</Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/shop/supplies" className="rounded-lg px-3 py-2 hover:bg-muted">Supplies</Link>
                </SheetClose>
                <div className="my-2 border-t border-border" />
                <SheetClose asChild>
                  <Link href="/memberships" className="rounded-lg px-3 py-2.5 hover:bg-muted">Memberships</Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/events" className="rounded-lg px-3 py-2.5 hover:bg-muted">Events</Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/testimonials" className="rounded-lg px-3 py-2.5 hover:bg-muted">Testimonials</Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>

          <Link href="/" className="hidden w-[360px] max-w-[34vw] items-center justify-start overflow-visible lg:flex">
            <img
              src={brandLogo}
              alt="Water Ice Express"
              className="h-auto w-full object-contain object-left"
              width={1024}
              height={204}
            />
          </Link>
        </div>

        {/* Mobile: centered logo. Desktop: primary nav. */}
        <Link
          href="/"
          className="flex w-[200px] max-w-[60vw] items-center justify-center justify-self-center lg:hidden"
        >
          <img
            src={brandLogo}
            alt="Water Ice Express"
            className="h-auto w-full object-contain object-center"
            width={1024}
            height={204}
          />
        </Link>

        <nav className="hidden lg:flex items-center justify-center gap-8 text-sm font-medium whitespace-nowrap">
          <Link href="/" className={cls("home")}>Home</Link>
          <Link href="/about" className={cls("about")}>About&nbsp;Us</Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`${cls("services")} inline-flex items-center gap-1 outline-none`}>
                Services <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44">
              <DropdownMenuItem asChild>
                <a href="/services#consulting">Consulting</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/services#wholesale">Wholesale</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/services#distribution">Distribution</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-1 outline-none">
                Shop <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44">
              <DropdownMenuItem asChild>
                <Link href="/ebooks">eBooks</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/shop/flavors">Flavors</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/shop/supplies">Supplies</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/memberships" className={cls("memberships")}>Memberships</Link>

          <Link href="/events" className={cls("events")}>Events</Link>

          <Link href="/testimonials" className={cls("testimonials")}>Testimonials</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <button
                aria-label={`Shopping cart, ${count} items`}
                className="relative grid place-items-center w-11 h-11 rounded-full bg-muted hover:bg-muted/70 transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-foreground" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                    {count}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
              <SheetHeader>
                <SheetTitle>Your Cart</SheetTitle>
                <SheetDescription>
                  {count === 0 ? "Your cart is empty." : `${count} item${count === 1 ? "" : "s"} in your cart.`}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto mt-4 -mx-6 px-6 divide-y divide-border">
                {cartItems.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Add items to get started.</p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.title} className="py-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.cover ? (
                          <img
                            src={item.cover}
                            alt={item.title}
                            className="w-14 h-14 flex-shrink-0 rounded-lg border border-border bg-muted object-contain"
                          />
                        ) : (
                          <div className="w-14 h-14 flex-shrink-0 rounded-lg border border-border bg-muted grid place-items-center">
                            <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{item.title}</p>
                          {item.format && (
                            <p className="text-xs text-muted-foreground truncate">{item.format}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            ${item.price.toFixed(2)}
                            {item.qty && item.qty > 1 ? ` × ${item.qty}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground">
                          ${(item.price * (item.qty ?? 1)).toFixed(2)}
                        </span>
                        <button
                          aria-label={`Remove ${item.title}`}
                          onClick={() => removeItem(item.title)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="border-t border-border pt-4 mt-4 space-y-3">
                  <div className="flex items-center justify-between text-foreground">
                    <span className="font-semibold">Subtotal</span>
                    <span className="font-display text-xl font-extrabold">${subtotal.toFixed(2)}</span>
                  </div>
                  <SheetClose asChild>
                    <Link
                      href="/checkout"
                      className="w-full block text-center rounded-full bg-primary text-primary-foreground font-semibold py-3 hover:opacity-90 transition-opacity"
                    >
                      Checkout
                    </Link>
                  </SheetClose>
                </div>
              )}
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Profile"
                className="grid place-items-center w-11 h-11 rounded-full bg-muted hover:bg-muted/70 transition-colors"
              >
                <User className="w-5 h-5 text-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/login">Sign In</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/register">Create Account</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>My Orders</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
