import type {
  CommandCenterAlert,
  CommandCenterHealth,
  CommandCenterHealthFactor,
  CommandCenterMetricAvailability,
  CommandCenterNumericMetric,
  CommandCenterOperations,
} from "@/lib/event-platform/command-center/command-center-types";
import { healthStatus } from "@/lib/event-platform/command-center/command-center-helpers";

type HealthInput = {
  capacity: number | null;
  registrations: number;
  hostConfirmed: boolean;
  venueConfirmed: CommandCenterMetricAvailability;
  gamesCount: number;
  gamesWithPrizes: number;
  plantInventoryReady: CommandCenterMetricAvailability;
  grossRevenue: CommandCenterNumericMetric;
  promotionConfigured: boolean;
  checklistCompletion: CommandCenterMetricAvailability;
};

function factorScore(
  earned: number,
  max: number,
  availability: CommandCenterMetricAvailability,
): number {
  if (availability === "not_configured") return 0;
  return Math.min(max, Math.max(0, earned));
}

export function buildHealth(input: HealthInput): CommandCenterHealth {
  const factors: CommandCenterHealthFactor[] = [];

  const regProgress =
    input.capacity != null && input.capacity > 0
      ? Math.min(1, input.registrations / input.capacity)
      : input.registrations > 0
        ? 0.75
        : 0;
  const regEarned = Math.round(regProgress * 20);
  factors.push({
    id: "registration",
    label: "Registration progress",
    weight: 20,
    earned: regEarned,
    max: 20,
    availability: "available",
    detail:
      input.capacity != null
        ? `${input.registrations} of ${input.capacity} capacity`
        : `${input.registrations} registrations`,
    action: regEarned < 20 ? "Promote registration or adjust capacity" : undefined,
  });

  factors.push({
    id: "host",
    label: "Host confirmation",
    weight: 10,
    earned: input.hostConfirmed ? 10 : 0,
    max: 10,
    availability: "available",
    detail: input.hostConfirmed ? "Host confirmed" : "Host not confirmed",
    action: input.hostConfirmed ? undefined : "Confirm host assignment",
  });

  factors.push({
    id: "venue",
    label: "Venue confirmation",
    weight: 10,
    earned: input.venueConfirmed === "available" ? 10 : 0,
    max: 10,
    availability: input.venueConfirmed,
    detail:
      input.venueConfirmed === "not_configured"
        ? "Venue fee tracking not configured"
        : input.venueConfirmed === "available"
          ? "Venue confirmed"
          : "Venue not confirmed",
    action: input.venueConfirmed !== "available" ? "Confirm venue details" : undefined,
  });

  const gamesReady = input.gamesCount > 0 && input.gamesWithPrizes === input.gamesCount;
  const gamesEarned = input.gamesCount === 0 ? 0 : Math.round((input.gamesWithPrizes / input.gamesCount) * 15);
  factors.push({
    id: "games",
    label: "Games configured",
    weight: 15,
    earned: gamesEarned,
    max: 15,
    availability: "available",
    detail:
      input.gamesCount === 0
        ? "No bingo rounds configured"
        : `${input.gamesWithPrizes} of ${input.gamesCount} rounds have prizes`,
    action: gamesReady ? undefined : "Add prizes to all game rounds",
  });

  factors.push({
    id: "plants",
    label: "Plant & prize readiness",
    weight: 15,
    earned: input.plantInventoryReady === "available" ? 15 : 0,
    max: 15,
    availability: input.plantInventoryReady,
    detail:
      input.plantInventoryReady === "not_configured"
        ? "Plant inventory tracking not configured"
        : input.plantInventoryReady === "available"
          ? "Inventory meets prize requirements"
          : "Inventory below prize requirements",
    action: input.plantInventoryReady !== "available" ? "Review plant inventory" : undefined,
  });

  const finEarned =
    input.grossRevenue.availability === "available" && (input.grossRevenue.value ?? 0) > 0 ? 10 : 0;
  factors.push({
    id: "financial",
    label: "Financial readiness",
    weight: 10,
    earned: finEarned,
    max: 10,
    availability: input.grossRevenue.availability,
    detail:
      input.grossRevenue.availability === "not_configured"
        ? "Revenue tracking not configured"
        : finEarned > 0
          ? "Ticket revenue recorded"
          : "No revenue recorded yet",
    action: finEarned === 0 ? "Review ticket sales and pricing" : undefined,
  });

  factors.push({
    id: "promotion",
    label: "Promotion performance",
    weight: 10,
    earned: input.promotionConfigured ? 5 : 0,
    max: 10,
    availability: input.promotionConfigured ? "available" : "not_configured",
    detail: input.promotionConfigured
      ? "Event is public and featured or promoted"
      : "Promotion tracking not configured",
    action: input.promotionConfigured ? undefined : "Enable public listing or marketing",
  });

  factors.push({
    id: "checklist",
    label: "Operational checklist",
    weight: 10,
    earned: input.checklistCompletion === "available" ? 10 : 0,
    max: 10,
    availability: input.checklistCompletion,
    detail:
      input.checklistCompletion === "not_configured"
        ? "Checklist tracking not configured"
        : "Checklist complete",
    action: input.checklistCompletion !== "available" ? "Complete operational checklist" : undefined,
  });

  const score = Math.round(factors.reduce((s, f) => s + factorScore(f.earned, f.max, f.availability), 0));
  const { status, statusLabel } = healthStatus(score);

  const incomplete = factors.filter((f) => f.earned < f.max && f.availability !== "not_configured");
  const notConfigured = factors.filter((f) => f.availability === "not_configured");
  let recommendedAction = "Event readiness looks strong — monitor check-in and live operations.";
  if (incomplete.length > 0 && incomplete[0]?.action) {
    recommendedAction = incomplete[0].action;
  } else if (notConfigured.length > 0) {
    recommendedAction = `Connect ${notConfigured[0]?.label.toLowerCase() ?? "missing data"} for a complete score.`;
  } else if (score < 75) {
    recommendedAction = "Review alerts and complete open operational tasks before event day.";
  }

  return { score, status, statusLabel, factors, recommendedAction };
}

export function buildAlerts(input: {
  hostConfirmed: boolean;
  venueConfirmed: CommandCenterMetricAvailability;
  gamesCount: number;
  gamesWithPrizes: number;
  remainingCapacity: CommandCenterNumericMetric;
  capacity: number | null;
  registrations: number;
  paymentsOutstanding: number;
  plantInventoryReady: CommandCenterMetricAvailability;
  pendingCommissions: number;
}): CommandCenterAlert[] {
  const alerts: CommandCenterAlert[] = [];

  if (!input.hostConfirmed) {
    alerts.push({
      id: "host-unconfirmed",
      severity: "warning",
      title: "Host not confirmed",
      message: "No accepted host invitation or assigned host for this event.",
      actionLabel: "Manage host",
      actionKind: "hosts",
    });
  }

  if (input.venueConfirmed === "no_records") {
    alerts.push({
      id: "venue-unconfirmed",
      severity: "warning",
      title: "Venue not confirmed",
      message: "Venue details are set but confirmation has not been recorded.",
      actionLabel: "Review venue",
      actionKind: "edit",
    });
  }

  if (input.gamesCount === 0) {
    alerts.push({
      id: "games-missing",
      severity: "warning",
      title: "Games not configured",
      message: "No bingo rounds are configured for this event.",
      actionLabel: "Configure games",
      actionKind: "games",
    });
  } else if (input.gamesWithPrizes < input.gamesCount) {
    alerts.push({
      id: "games-missing-prizes",
      severity: "info",
      title: "Games missing prizes",
      message: `${input.gamesCount - input.gamesWithPrizes} round(s) need prize assignments.`,
      actionLabel: "Edit games",
      actionKind: "games",
    });
  }

  if (input.plantInventoryReady === "no_records") {
    alerts.push({
      id: "plants-low",
      severity: "warning",
      title: "Plants below prize requirement",
      message: "Configured rounds exceed available plant inventory (when connected).",
      actionLabel: "Review plants",
      actionKind: "none",
    });
  }

  if (
    input.remainingCapacity.availability === "available" &&
    input.capacity != null &&
    input.capacity > 0 &&
    (input.remainingCapacity.value ?? 0) <= Math.ceil(input.capacity * 0.1)
  ) {
    alerts.push({
      id: "capacity-near",
      severity: input.remainingCapacity.value === 0 ? "critical" : "warning",
      title: input.remainingCapacity.value === 0 ? "At capacity" : "Capacity nearly reached",
      message:
        input.remainingCapacity.value === 0
          ? "No remaining seats based on valid registrations."
          : `Only ${input.remainingCapacity.value} seat(s) remaining.`,
      actionLabel: "View attendees",
      actionKind: "check_in",
    });
  }

  if (input.paymentsOutstanding > 0) {
    alerts.push({
      id: "payments-outstanding",
      severity: "info",
      title: "Payments outstanding",
      message: `${input.paymentsOutstanding} registration(s) have unpaid balances.`,
      actionLabel: "Review financials",
      actionKind: "financials",
    });
  }

  if (input.pendingCommissions > 0) {
    alerts.push({
      id: "affiliate-pending",
      severity: "info",
      title: "Affiliate commissions pending",
      message: `${input.pendingCommissions} pending commission ledger entries for this event.`,
      actionLabel: "View commissions",
      actionKind: "financials",
    });
  }

  return alerts;
}

export function deriveOperations(input: {
  hostConfirmed: boolean;
  hostConfirmedSource: CommandCenterOperations["hostConfirmedSource"];
  venueName: string | null;
  gamesReady: boolean;
  plantInventoryReady: CommandCenterMetricAvailability;
  paymentsOutstanding: number;
  checklistCompletion: CommandCenterMetricAvailability;
}): CommandCenterOperations {
  return {
    hostConfirmed: input.hostConfirmed,
    hostConfirmedSource: input.hostConfirmedSource,
    venueConfirmed: input.venueName ? "no_records" : "not_configured",
    gamesReady: input.gamesReady,
    plantInventoryReady: input.plantInventoryReady,
    paymentsOutstanding: input.paymentsOutstanding,
    checklistCompletion: input.checklistCompletion,
  };
}
