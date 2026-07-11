import type { CommandCenterAlert, CommandCenterMetricAvailability } from "@/lib/event-platform/command-center/command-center-types";
import { buildAlerts as buildBaseAlerts } from "@/lib/event-platform/command-center/command-center-health";

export type ExtendedAlert = CommandCenterAlert & {
  dismissible: boolean;
  recommendedAction: string;
  explanation: string;
};

export function buildOperationalAlerts(input: {
  hostConfirmed: boolean;
  venueName: string | null;
  venueConfirmed: CommandCenterMetricAvailability;
  gamesCount: number;
  gamesWithPrizes: number;
  remainingCapacity: { availability: CommandCenterMetricAvailability; value: number | null };
  capacity: number | null;
  registrations: number;
  paymentsOutstanding: number;
  plantInventoryReady: CommandCenterMetricAvailability;
  pendingCommissions: number;
  startsAt: Date;
  hostPaymentPending: boolean;
  venuePaymentOverdue: boolean;
  plantDemandExceedsInventory: boolean;
  sponsorDeliverablesIncomplete: boolean;
  dismissedKeys: Set<string>;
}): ExtendedAlert[] {
  const hoursUntilStart = (input.startsAt.getTime() - Date.now()) / (1000 * 60 * 60);
  const alerts: ExtendedAlert[] = [];

  const base = buildBaseAlerts({
    hostConfirmed: input.hostConfirmed,
    venueConfirmed: input.venueConfirmed,
    gamesCount: input.gamesCount,
    gamesWithPrizes: input.gamesWithPrizes,
    remainingCapacity: input.remainingCapacity,
    capacity: input.capacity,
    registrations: input.registrations,
    paymentsOutstanding: input.paymentsOutstanding,
    plantInventoryReady: input.plantInventoryReady,
    pendingCommissions: input.pendingCommissions,
  });

  for (const a of base) {
    alerts.push({
      ...a,
      explanation: a.message,
      recommendedAction: a.actionLabel,
      dismissible: a.severity !== "critical",
    });
  }

  if (!input.venueName) {
    alerts.push({
      id: "no-venue",
      severity: "critical",
      title: "No venue assigned",
      message: "This event has no venue on record.",
      explanation: "A venue is required for in-person bingo operations.",
      recommendedAction: "Assign and confirm a venue",
      actionLabel: "Review venue",
      actionKind: "edit",
      dismissible: false,
    });
  }

  if (hoursUntilStart <= 48 && hoursUntilStart > 0 && !input.hostConfirmed) {
    alerts.push({
      id: "host-critical-soon",
      severity: "critical",
      title: "Event starts soon — no host confirmed",
      message: `Event begins in ${Math.ceil(hoursUntilStart)} hours without a confirmed host.`,
      explanation: "Host confirmation is required before event day.",
      recommendedAction: "Invite or confirm host immediately",
      actionLabel: "Manage host",
      actionKind: "hosts",
      dismissible: false,
    });
  }

  if (input.gamesCount === 0) {
    const existing = alerts.find((a) => a.id === "games-missing");
    if (existing) {
      existing.severity = "critical";
      existing.dismissible = false;
    }
  }

  if (input.plantDemandExceedsInventory) {
    alerts.push({
      id: "plant-demand-exceeds",
      severity: "warning",
      title: "Plant demand exceeds inventory",
      message: "Registered plant demand is higher than available inventory.",
      explanation: "Attendee plant requests may not be fulfillable.",
      recommendedAction: "Add plant inventory or adjust prizes",
      actionLabel: "Review plants",
      actionKind: "none",
      dismissible: true,
    });
  }

  if (input.venuePaymentOverdue) {
    alerts.push({
      id: "venue-payment-overdue",
      severity: "warning",
      title: "Venue payment overdue",
      message: "Venue fee payment is pending or overdue.",
      explanation: "Outstanding venue fees can block day-of operations.",
      recommendedAction: "Mark venue fee paid or schedule payment",
      actionLabel: "Review financials",
      actionKind: "financials",
      dismissible: true,
    });
  }

  if (input.hostPaymentPending) {
    alerts.push({
      id: "host-payment-pending",
      severity: "warning",
      title: "Host payment pending",
      message: "Host payment has not been marked paid.",
      explanation: "Confirm host compensation before or after the event.",
      recommendedAction: "Review host payment status",
      actionLabel: "Venue & host",
      actionKind: "hosts",
      dismissible: true,
    });
  }

  if (input.sponsorDeliverablesIncomplete) {
    alerts.push({
      id: "sponsor-deliverables",
      severity: "warning",
      title: "Sponsor deliverables incomplete",
      message: "One or more sponsor deliverables are not marked complete.",
      explanation: "Review sponsor obligations before the event.",
      recommendedAction: "Complete sponsor checklist",
      actionLabel: "Marketing tab",
      actionKind: "none",
      dismissible: true,
    });
  }

  if (input.capacity != null && input.capacity > 0 && input.registrations < input.capacity * 0.25 && hoursUntilStart <= 168) {
    alerts.push({
      id: "low-ticket-sales",
      severity: "warning",
      title: "Low ticket sales",
      message: `Only ${input.registrations} of ${input.capacity} seats filled.`,
      explanation: "Registration volume is below 25% of capacity with event approaching.",
      recommendedAction: "Run promotions or affiliate campaigns",
      actionLabel: "Marketing",
      actionKind: "none",
      dismissible: true,
    });
  }

  if (
    input.remainingCapacity.availability === "available" &&
    input.capacity != null &&
    input.capacity > 0 &&
    (input.remainingCapacity.value ?? 0) <= Math.ceil(input.capacity * 0.05) &&
    (input.remainingCapacity.value ?? 0) > 0
  ) {
    alerts.push({
      id: "nearly-sold-out",
      severity: "info",
      title: "Event nearly sold out",
      message: `Only ${input.remainingCapacity.value} seats remain.`,
      explanation: "Consider enabling waitlist or adding capacity.",
      recommendedAction: "Review attendee list",
      actionLabel: "View attendees",
      actionKind: "check_in",
      dismissible: true,
    });
  }

  if (input.paymentsOutstanding > 0) {
    const payAlert = alerts.find((a) => a.id === "payments-outstanding");
    if (payAlert && input.paymentsOutstanding >= 3) {
      payAlert.severity = "critical";
      payAlert.dismissible = false;
      payAlert.title = "Payment failures affecting registrations";
    }
  }

  return alerts.filter((a) => {
    if (a.severity === "critical") return true;
    return !input.dismissedKeys.has(a.id);
  });
}

export function checklistCompletionMetric(percent: number, total: number): CommandCenterMetricAvailability {
  if (total === 0) return "not_configured";
  if (percent >= 80) return "available";
  return "no_records";
}
