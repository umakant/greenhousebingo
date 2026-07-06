import { getWinWithBarlowCatalogItem } from "@/lib/company-themes/win-with-barlow-catalog";

export type CompanySiteCheckoutItemInput = {
  id: string;
  quantity: number;
  price?: number;
  title?: string;
};

export type NormalizedCompanySiteCheckoutItem = {
  id: string;
  type: "course" | "workshop";
  slug: string;
  title: string;
  path: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export function normalizeCompanySiteCheckoutItems(
  items: CompanySiteCheckoutItemInput[],
):
  | { ok: true; items: NormalizedCompanySiteCheckoutItem[]; total: number }
  | { ok: false; message: string } {
  if (items.length === 0) {
    return { ok: false, message: "Your cart is empty." };
  }

  let total = 0;
  const normalizedItems: NormalizedCompanySiteCheckoutItem[] = [];

  for (const item of items) {
    const catalog = getWinWithBarlowCatalogItem(item.id);
    if (!catalog) {
      return { ok: false, message: `Unknown item: ${item.id}` };
    }
    const unitPrice = catalog.price;
    total += unitPrice * item.quantity;
    normalizedItems.push({
      id: catalog.id,
      type: catalog.type,
      slug: catalog.slug,
      title: catalog.title,
      path: catalog.path,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    });
  }

  return { ok: true, items: normalizedItems, total };
}
