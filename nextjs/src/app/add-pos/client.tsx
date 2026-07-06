"use client";

import { useEffect, useState, useRef } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Printer, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  barcode?: string;
  price: number;
  stock: number;
  category?: { name: string } | null;
}

interface Customer {
  id: string;
  name: string;
}

interface CartItem {
  product: Product;
  qty: number;
  price: number;
  discount: number;
  subtotal: number;
}

export default function PosTerminalClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastSale, setLastSale] = useState<{ number: string; total: number; change: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/pos/products", { credentials: "include" })
      .then((r) => r.json())
      .then((data: unknown) => setProducts(Array.isArray(data) ? data : []));
    fetch("/api/pos/customers", { credentials: "include" })
      .then((r) => r.json())
      .then((data: unknown) => setCustomers(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const categories = Array.from(new Set(products.map(p => p.category?.name).filter(Boolean))) as string[];

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
    const matchCat = categoryFilter === "all" || p.category?.name === categoryFilter;
    return matchSearch && matchCat && p.stock > 0;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id
          ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.price - i.discount }
          : i
        );
      }
      return [...prev, { product, qty: 1, price: Number(product.price), discount: 0, subtotal: Number(product.price) }];
    });
    setSearch("");
    searchRef.current?.focus();
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return; }
    setCart(prev => prev.map(i => i.product.id === productId
      ? { ...i, qty, subtotal: qty * i.price - i.discount }
      : i
    ));
  };

  const updateItemDiscount = (productId: string, disc: number) => {
    setCart(prev => prev.map(i => i.product.id === productId
      ? { ...i, discount: disc, subtotal: i.qty * i.price - disc }
      : i
    ));
  };

  const removeItem = (productId: string) => setCart(prev => prev.filter(i => i.product.id !== productId));

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const taxAmount = 0;
  const total = subtotal + taxAmount - discount;
  const change = paymentMethod === "cash" ? cashReceived - total : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/pos/sales", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || null,
          items: cart.map(i => ({ productId: i.product.id, name: i.product.name, qty: i.qty, price: i.price, discount: i.discount, taxRate: 0, subtotal: i.subtotal })),
          discount, subtotal, taxAmount, total,
          paymentMethod, paid: paymentMethod === "cash" ? cashReceived : total,
          status: "completed",
        }),
      });
      if (res.ok) {
        const sale = await res.json();
        setLastSale({ number: sale.number, total, change: Math.max(0, change) });
        setCart([]); setDiscount(0); setCashReceived(0); setCustomerId("");
        setCheckoutOpen(false); setSuccessOpen(true);
      }
    } finally { setProcessing(false); }
  };

  const openCheckout = () => { setCashReceived(total); setCheckoutOpen(true); };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-12rem)]">
      {/* Product Panel */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input ref={searchRef} placeholder="Search products or scan barcode..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
            {filtered.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="border rounded-lg p-3 text-left hover:bg-primary/5 hover:border-primary/30 transition-colors active:scale-95"
              >
                <div className="font-medium text-sm truncate">{product.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{product.category?.name ?? "—"}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-base font-bold text-primary">${Number(product.price).toFixed(2)}</span>
                  <Badge variant="secondary" className="text-xs">{product.stock}</Badge>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-10 text-muted-foreground text-sm">
                {search ? "No products match your search" : "No products with stock available"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-3 border rounded-xl p-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <ShoppingCart className="h-5 w-5" />
            Cart
            {cart.length > 0 && <Badge>{cart.reduce((s, i) => s + i.qty, 0)}</Badge>}
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" className="text-destructive h-7 text-xs" onClick={() => setCart([])}>
              <X className="h-3.5 w-3.5 mr-1" />Clear
            </Button>
          )}
        </div>

        {/* Customer */}
        <div>
          <Label className="text-xs mb-1 block">Customer</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Walk-in</SelectItem>
              {customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
              <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
              <p>Click products to add them</p>
            </div>
          ) : cart.map(item => (
            <div key={item.product.id} className="border rounded-lg p-2 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-tight flex-1 truncate">{item.product.name}</p>
                <button onClick={() => removeItem(item.product.id)} className="text-destructive hover:text-destructive/70 flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border rounded">
                  <button className="px-1.5 py-0.5 hover:bg-muted" onClick={() => updateQty(item.product.id, item.qty - 1)}><Minus className="h-3 w-3" /></button>
                  <span className="px-2 text-sm font-medium w-8 text-center">{item.qty}</span>
                  <button className="px-1.5 py-0.5 hover:bg-muted" onClick={() => updateQty(item.product.id, item.qty + 1)}><Plus className="h-3 w-3" /></button>
                </div>
                <span className="text-xs text-muted-foreground">× ${item.price.toFixed(2)}</span>
                <span className="ml-auto text-sm font-semibold">${item.subtotal.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />Discount</span>
            <Input type="number" min={0} value={discount} onChange={e => setDiscount(Number(e.target.value))} className="h-6 w-20 text-right text-xs" />
          </div>
          <div className="flex justify-between font-bold text-base pt-1 border-t">
            <span>Total</span><span className="text-primary">${total.toFixed(2)}</span>
          </div>
        </div>

        <Button size="lg" className="w-full" onClick={openCheckout} disabled={cart.length === 0}>
          <CreditCard className="mr-2 h-5 w-5" />Checkout — ${total.toFixed(2)}
        </Button>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Process Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-center bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Due</p>
              <p className="text-3xl font-bold text-primary">${total.toFixed(2)}</p>
            </div>
            <div>
              <Label className="mb-1.5 block">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {["cash", "card", "bank"].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`border rounded-lg p-2 text-sm capitalize font-medium transition-colors ${paymentMethod === method ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
            {paymentMethod === "cash" && (
              <>
                <div>
                  <Label className="mb-1.5 block">Cash Received</Label>
                  <Input type="number" value={cashReceived} onChange={e => setCashReceived(Number(e.target.value))} className="text-lg font-bold" autoFocus />
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {[Math.ceil(total), Math.ceil(total / 10) * 10 + 10, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100].filter((v, i, a) => a.indexOf(v) === i && v >= total).map(v => (
                      <button key={v} onClick={() => setCashReceived(v)} className="border rounded px-2 py-1 text-xs hover:bg-muted">${v}</button>
                    ))}
                  </div>
                </div>
                {cashReceived >= total && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600">Change</p>
                    <p className="text-2xl font-bold text-green-700">${(cashReceived - total).toFixed(2)}</p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
            <Button onClick={handleCheckout} disabled={processing || (paymentMethod === "cash" && cashReceived < total)}>
              {processing ? "Processing..." : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Sale Complete!</DialogTitle></DialogHeader>
          {lastSale && (
            <div className="space-y-3 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invoice #{lastSale.number}</p>
                <p className="text-2xl font-bold">${lastSale.total.toFixed(2)}</p>
                {lastSale.change > 0 && <p className="text-lg text-green-600 font-semibold">Change: ${lastSale.change.toFixed(2)}</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSuccessOpen(false); window.print(); }} className="gap-2">
              <Printer className="h-4 w-4" />Print Receipt
            </Button>
            <Button onClick={() => setSuccessOpen(false)}>New Sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
