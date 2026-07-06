import { prisma } from "@/lib/prisma";

export type InventoryPolicy = "track" | "continue" | "deny";

export function parseInventoryPolicy(raw: string | null | undefined): InventoryPolicy {
  const s = (raw ?? "track").trim().toLowerCase();
  if (s === "continue" || s === "deny" || s === "track") return s;
  return "track";
}

/** Whether qty can be added to cart given current stock and policy. */
export function canSellQty(stock: number, addQty: number, policy: InventoryPolicy): boolean {
  const s = Number.isFinite(stock) ? stock : 0;
  const q = Number.isFinite(addQty) && addQty > 0 ? Math.floor(addQty) : 1;
  if (policy === "continue") return true;
  if (policy === "deny") return s >= q;
  return s >= q;
}

/** Decrement stock after paid order (track policy only). */
export async function decrementStockForProduct(productId: bigint, quantity: number, policy: InventoryPolicy): Promise<void> {
  if (policy !== "track" || quantity <= 0) return;
  await prisma.posProduct.updateMany({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
}
