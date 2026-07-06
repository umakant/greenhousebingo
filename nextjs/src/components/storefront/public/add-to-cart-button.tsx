"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Props = {
  productId: string;
  disabled?: boolean;
  /** Day 24 — JSON variants from PosProduct.variants */
  variants?: unknown;
  basePrice: number;
};

export function AddToCartButton({ productId, disabled, variants, basePrice }: Props) {
  const [qty, setQty] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  const options = React.useMemo(() => {
    if (!variants || !Array.isArray(variants)) return [] as Array<{ id: string; name: string; price?: number }>;
    const out: Array<{ id: string; name: string; price?: number }> = [];
    for (const v of variants) {
      if (!v || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      const id = String(o.id ?? o.sku ?? "");
      const name = String(o.name ?? o.title ?? id);
      const price = typeof o.price === "number" ? o.price : undefined;
      if (id) out.push({ id, name, price });
    }
    return out;
  }, [variants]);

  const [variantKey, setVariantKey] = React.useState("");

  React.useEffect(() => {
    if (options.length && !variantKey) {
      setVariantKey(options[0]!.id);
    }
  }, [options, variantKey]);

  const displayPrice =
    options.length > 0 && variantKey
      ? options.find((o) => o.id === variantKey)?.price ?? basePrice
      : basePrice;

  const add = async () => {
    setLoading(true);
    try {
      const vk = options.length > 0 ? variantKey : "";
      const res = await fetch("/api/storefront/public/cart", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, quantity: qty, variantKey: vk }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.error ?? "Could not add to cart");
        return;
      }
      toast.success("Added to cart");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {options.length > 0 ? (
        <div className="space-y-1">
          <Label className="text-muted-foreground">Variant</Label>
          <Select value={variantKey} onValueChange={setVariantKey}>
            <SelectTrigger>
              <SelectValue placeholder="Choose variant" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                  {o.price != null ? ` — $${o.price.toFixed(2)}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground" htmlFor="sf-qty">
            Qty
          </label>
          <Input
            id="sf-qty"
            type="number"
            min={1}
            className="h-10 w-20"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Price</span>
          <span className="text-lg font-semibold">${displayPrice.toFixed(2)}</span>
        </div>
        <Button type="button" disabled={disabled || loading || (options.length > 0 && !variantKey)} onClick={() => void add()}>
          {loading ? "Adding…" : "Add to cart"}
        </Button>
      </div>
    </div>
  );
}
