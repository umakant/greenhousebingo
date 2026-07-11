import {
  BONUS_CARD_TICKET_DESCRIPTION,
  DEFAULT_BONUS_CARD_NAME,
  EXTRA_BINGO_CARD_TICKET_NAME,
} from "@/lib/lms-events/event-wizard-input";

export function isBonusTicketRow(ticket: { name: string; description: string | null } | null): boolean {
  if (!ticket) return false;
  return (
    ticket.description === BONUS_CARD_TICKET_DESCRIPTION ||
    ticket.name === EXTRA_BINGO_CARD_TICKET_NAME ||
    ticket.name === DEFAULT_BONUS_CARD_NAME
  );
}

export function splitAttendeeName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function attendeeInitials(firstName: string, lastName: string, email: string): string {
  const a = firstName.trim()[0]?.toUpperCase() ?? "";
  const b = lastName.trim()[0]?.toUpperCase() ?? "";
  if (a && b) return `${a}${b}`;
  if (a) return a;
  return email.trim()[0]?.toUpperCase() ?? "?";
}

export function formatRegistrationSource(method: string | null | undefined): string {
  if (!method) return "Online";
  const m = method.replace(/_/g, " ");
  return m.charAt(0).toUpperCase() + m.slice(1);
}

export function computeBonusCardCount(input: {
  isBonusPrimaryTicket: boolean;
  bonusUnitPrice: number;
  primaryTicketPrice: number;
  transactions: Array<{ amount: number; status: string }>;
}): { count: number; revenue: number } {
  if (input.isBonusPrimaryTicket) {
    const paid = input.transactions
      .filter((t) => t.status === "completed")
      .reduce((s, t) => s + t.amount, 0);
    return { count: 1, revenue: paid };
  }

  const completed = input.transactions.filter((t) => t.status === "completed");
  if (!input.bonusUnitPrice || input.bonusUnitPrice <= 0) {
    const extras = Math.max(0, completed.length - 1);
    const extraRevenue = completed.slice(1).reduce((s, t) => s + t.amount, 0);
    return { count: extras, revenue: extraRevenue };
  }

  let count = 0;
  let revenue = 0;
  for (const tx of completed) {
    const matchesBonus = Math.abs(tx.amount - input.bonusUnitPrice) < 0.02;
    const matchesPrimary = Math.abs(tx.amount - input.primaryTicketPrice) < 0.02;
    if (matchesBonus && !matchesPrimary) {
      count += 1;
      revenue += tx.amount;
    } else if (matchesBonus && input.primaryTicketPrice <= 0) {
      count += 1;
      revenue += tx.amount;
    }
  }

  if (count === 0 && completed.length > 1) {
    const extras = completed.slice(1);
    count = extras.length;
    revenue = extras.reduce((s, t) => s + t.amount, 0);
  }

  return { count, revenue };
}

export type BonusTierInput = {
  count: number;
  buyerAverage: number | null;
  powerThreshold: number | null;
};

export function classifyBonusTier(input: BonusTierInput): {
  tier: import("@/lib/event-platform/attendees/event-attendees-types").EventAttendeeBonusTier;
  showBadge: boolean;
} {
  if (input.count <= 0) return { tier: "none", showBadge: false };
  if (input.powerThreshold != null && input.count >= input.powerThreshold) {
    return { tier: "power_buyer", showBadge: true };
  }
  if (input.buyerAverage != null && input.count > input.buyerAverage) {
    return { tier: "above_average", showBadge: true };
  }
  return { tier: "buyer", showBadge: false };
}

export function computePowerBuyerThreshold(counts: number[]): number | null {
  const buyers = counts.filter((c) => c > 0).sort((a, b) => a - b);
  if (buyers.length === 0) return null;
  const idx = Math.max(0, Math.ceil(buyers.length * 0.9) - 1);
  return buyers[idx] ?? null;
}
