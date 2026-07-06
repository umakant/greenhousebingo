/** Normalize marketplace order status for admin tabs and badges. */

export type OrderTabKey = "all" | "pending" | "processing" | "out_for_delivery" | "completed" | "cancelled";

export const ORDER_TABS: { key: OrderTabKey; label: string }[] = [
  { key: "all", label: "All Orders" },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const TAB_STATUS_MAP: Record<Exclude<OrderTabKey, "all">, string[]> = {
  pending: ["pending", "confirmed", "paid", "unpaid", "waiting_for_city_minimum", "waiting"],
  processing: ["processing", "scheduled", "ready_to_schedule", "ready", "confirmed"],
  out_for_delivery: ["out_for_delivery", "in_transit", "assigned", "shipped"],
  completed: ["delivered", "completed", "done"],
  cancelled: ["cancelled", "canceled", "refunded"],
};

export function orderStatusValues(order: {
  status: string;
  orderStatus?: string | null;
  deliveryStatus?: string | null;
}): string[] {
  return [order.status, order.orderStatus, order.deliveryStatus]
    .filter((v): v is string => Boolean(v))
    .map((v) => v.toLowerCase());
}

export function matchesOrderTab(
  order: { status: string; orderStatus?: string | null; deliveryStatus?: string | null },
  tab: OrderTabKey,
): boolean {
  if (tab === "all") return true;
  const values = orderStatusValues(order);
  const allowed = TAB_STATUS_MAP[tab];
  return values.some((v) => allowed.includes(v));
}

export function resolveOrderTab(order: {
  status: string;
  orderStatus?: string | null;
  deliveryStatus?: string | null;
}): Exclude<OrderTabKey, "all"> {
  for (const tab of Object.keys(TAB_STATUS_MAP) as Exclude<OrderTabKey, "all">[]) {
    if (matchesOrderTab(order, tab)) return tab;
  }
  return "pending";
}

export function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (["pending", "paid", "waiting_for_city_minimum", "waiting", "unpaid"].includes(s)) {
    return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200";
  }
  if (["processing", "scheduled", "ready_to_schedule", "confirmed"].includes(s)) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200";
  }
  if (["out_for_delivery", "in_transit", "assigned", "shipped"].includes(s)) {
    return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200";
  }
  if (["delivered", "completed", "done"].includes(s)) {
    return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200";
  }
  if (["cancelled", "canceled", "refunded"].includes(s)) {
    return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
  }
  return "bg-muted text-muted-foreground";
}

export function paymentBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "paid") return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200";
  if (s === "refunded") return "bg-muted text-muted-foreground";
  return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200";
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
