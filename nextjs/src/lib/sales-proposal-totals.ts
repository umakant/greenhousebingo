export type ProposalLineInput = {
  product_id?: number;
  service_id?: number;
  description?: string;
  item_name?: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  tax_percentage?: number;
};

export function computeProposalTotals(
  items: ProposalLineInput[],
  calculateTax: string,
  discountValue: number,
  discountType: "percent" | "fixed",
) {
  let subtotal = 0;
  const lines: Array<{ lineTotal: number; taxPct: number; discPct: number }> = [];

  for (const it of items) {
    const desc = String(it.description ?? it.item_name ?? "").trim();
    const catalogId = it.product_id ?? it.service_id;
    if (!desc && !catalogId) continue;
    const qty = Math.max(1, Number(it.quantity) || 1);
    const unitPrice = Math.max(0, Number(it.unit_price) || 0);
    const discPct = Math.min(100, Math.max(0, Number(it.discount_percentage) || 0));
    const taxPct = Math.min(100, Math.max(0, Number(it.tax_percentage) || 0));
    const lineTotal = qty * unitPrice;
    subtotal += lineTotal;
    lines.push({ lineTotal, taxPct, discPct });
  }

  const proposalDiscount =
    discountType === "percent"
      ? (subtotal * Math.min(100, Math.max(0, discountValue))) / 100
      : Math.min(Math.max(0, discountValue), subtotal);

  let lineDiscountAmount = 0;
  let taxAmount = 0;
  for (const line of lines) {
    const lineDiscAmt = (line.lineTotal * line.discPct) / 100;
    lineDiscountAmount += lineDiscAmt;
    const afterLineDisc = line.lineTotal - lineDiscAmt;
    const lineShare = subtotal > 0 ? line.lineTotal / subtotal : 0;
    const proposalDiscShare = proposalDiscount * lineShare;
    const taxableBase =
      calculateTax === "before_discount" ? line.lineTotal : afterLineDisc - proposalDiscShare;
    taxAmount += (Math.max(0, taxableBase) * line.taxPct) / 100;
  }

  const discountAmount = lineDiscountAmount + proposalDiscount;
  const totalAmount = subtotal - discountAmount + taxAmount;

  return { subtotal, discountAmount, taxAmount, totalAmount, lines };
}
