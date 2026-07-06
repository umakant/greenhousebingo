"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import {
  cartLineCount,
  cartSubtotal,
  readCompanySiteCart,
  type CompanySiteCart,
  writeCompanySiteCart,
} from "@/lib/company-themes/company-site-cart";

type Props = {
  companySlug: string;
  siteBase?: string;
};

export function CompanySiteCartClient({ companySlug, siteBase: siteBaseProp }: Props) {
  const [cart, setCart] = useState<CompanySiteCart>({ lines: [] });
  const siteBase = siteBaseProp ?? `/sites/${encodeURIComponent(companySlug)}`;

  useEffect(() => {
    const refresh = () => setCart(readCompanySiteCart(companySlug));
    refresh();
    window.addEventListener("company-site-cart-changed", refresh);
    return () => window.removeEventListener("company-site-cart-changed", refresh);
  }, [companySlug]);

  const total = useMemo(() => cartSubtotal(cart), [cart]);
  const count = useMemo(() => cartLineCount(cart), [cart]);

  const updateQty = (id: string, quantity: number) => {
    const next = readCompanySiteCart(companySlug);
    next.lines = next.lines
      .map((line) => (line.id === id ? { ...line, quantity } : line))
      .filter((line) => line.quantity > 0);
    writeCompanySiteCart(companySlug, next);
    setCart(next);
  };

  const removeLine = (id: string) => updateQty(id, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Your cart</h1>
      <p className="mt-2 text-slate-600">
        Review courses and workshops before checkout.{" "}
        <span className="text-slate-500">
          {count} item{count === 1 ? "" : "s"}
        </span>
      </p>

      {cart.lines.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-medium">Your cart is empty</p>
          <p className="mt-2 text-sm text-slate-600">Browse courses and add something to get started.</p>
          <Link
            href={`${siteBase}/courses`}
            className="mt-6 inline-flex rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Browse courses
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {cart.lines.map((line) => (
              <div
                key={line.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">{line.type}</p>
                  <Link href={`${siteBase}${line.path}`} className="mt-1 block text-lg font-semibold hover:text-red-600">
                    {line.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">${line.price.toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-md border border-slate-200">
                    <button
                      type="button"
                      className="px-2 py-1 hover:bg-slate-50"
                      onClick={() => updateQty(line.id, Math.max(1, line.quantity - 1))}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-8 text-center text-sm font-medium">{line.quantity}</span>
                    <button
                      type="button"
                      className="px-2 py-1 hover:bg-slate-50"
                      onClick={() => updateQty(line.id, line.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => removeLine(line.id)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Order summary</p>
            <p className="mt-3 text-3xl font-bold">${total.toFixed(2)}</p>
            <p className="mt-1 text-sm text-slate-600">USD · taxes calculated at checkout</p>
            <Link
              href={`${siteBase}/checkout`}
              className="mt-6 flex w-full items-center justify-center rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
            >
              Proceed to checkout
            </Link>
            <Link href={`${siteBase}/courses`} className="mt-3 block text-center text-sm text-slate-600 hover:text-red-600">
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
