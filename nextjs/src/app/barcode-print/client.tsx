"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Search } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  barcode?: string;
  price: number;
}

export default function PosBarcodeClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [printList, setPrintList] = useState<Array<{ product: Product; qty: number }>>([]);

  useEffect(() => {
    fetch("/api/pos/products", { credentials: "include" })
      .then(r => r.json())
      .then(d => setProducts(d.filter((p: Product) => p.barcode)));
  }, []);

  const addToPrint = () => {
    const product = products.find(p => String(p.id) === selected);
    if (!product) return;
    setPrintList(prev => {
      const existing = prev.find(i => String(i.product.id) === selected);
      if (existing) return prev.map(i => String(i.product.id) === selected ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { product, qty }];
    });
    setSelected(""); setQty(1);
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-end p-4 border rounded-lg bg-muted/30">
        <div className="flex-1">
          <Label className="mb-1.5 block">Product</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Select product with barcode..." />
            </SelectTrigger>
            <SelectContent>
              {products.map(p => (
                <SelectItem key={String(p.id)} value={String(p.id)}>{p.name} — {p.barcode}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-28">
          <Label className="mb-1.5 block">Quantity</Label>
          <Input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))} />
        </div>
        <Button onClick={addToPrint} disabled={!selected}><Search className="mr-2 h-4 w-4" />Add</Button>
      </div>

      {printList.length > 0 && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{printList.reduce((s, i) => s + i.qty, 0)} barcode(s) ready to print</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPrintList([])}>Clear</Button>
              <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print</Button>
            </div>
          </div>
          <div className="border rounded-lg p-4" id="barcode-print-area">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {printList.flatMap(({ product, qty: q }) =>
                Array.from({ length: q }).map((_, i) => (
                  <div key={`${product.id}-${i}`} className="border rounded p-2 text-center text-xs">
                    <div className="font-mono text-base font-bold tracking-widest mb-1">||| ||| |||</div>
                    <div className="font-mono text-xs">{product.barcode}</div>
                    <div className="truncate">{product.name}</div>
                    <div className="font-semibold">${Number(product.price).toFixed(2)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {products.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No products with barcodes found.</p>
          <p className="text-xs mt-1">Add barcode values to your products to print them here.</p>
        </div>
      )}
    </div>
  );
}
