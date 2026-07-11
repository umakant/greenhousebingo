export const ACTIVITY_FILTER_CATEGORIES = [
  "all",
  "attendee",
  "game",
  "plant",
  "financial",
  "marketing",
  "system",
] as const;

export type ActivityFilterCategory = (typeof ACTIVITY_FILTER_CATEGORIES)[number];

export const CHECKLIST_CATEGORIES = [
  "Venue",
  "Host",
  "Tickets",
  "Check-In",
  "Plants",
  "Games",
  "Sponsors",
  "Marketing",
  "Financial",
  "Staff",
  "Post-Event",
] as const;

export type ChecklistCategory = (typeof CHECKLIST_CATEGORIES)[number];

export const DEFAULT_OPERATIONAL_TASKS: Array<{
  templateKey: string;
  title: string;
  category: ChecklistCategory;
}> = [
  { templateKey: "venue_confirmed", title: "Venue confirmed", category: "Venue" },
  { templateKey: "venue_contract_received", title: "Venue contract received", category: "Venue" },
  { templateKey: "venue_fee_scheduled", title: "Venue fee scheduled", category: "Venue" },
  { templateKey: "host_invited", title: "Host invited", category: "Host" },
  { templateKey: "host_confirmed", title: "Host confirmed", category: "Host" },
  { templateKey: "host_arrival_confirmed", title: "Host arrival time confirmed", category: "Host" },
  { templateKey: "ticket_tiers_active", title: "Ticket tiers active", category: "Tickets" },
  { templateKey: "qr_checkin_tested", title: "QR check-in tested", category: "Check-In" },
  { templateKey: "bingo_cards_ready", title: "Bingo cards ready", category: "Games" },
  { templateKey: "plant_inventory_assigned", title: "Plant inventory assigned", category: "Plants" },
  { templateKey: "all_games_configured", title: "All games configured", category: "Games" },
  { templateKey: "all_prizes_assigned", title: "All prizes assigned", category: "Games" },
  { templateKey: "final_round_prize_assigned", title: "Final-round prize assigned", category: "Games" },
  { templateKey: "sponsor_deliverables_reviewed", title: "Sponsor deliverables reviewed", category: "Sponsors" },
  { templateKey: "promotions_active", title: "Promotions active", category: "Marketing" },
  { templateKey: "affiliate_links_tested", title: "Affiliate links tested", category: "Marketing" },
  { templateKey: "staff_assignments_confirmed", title: "Staff assignments confirmed", category: "Staff" },
  { templateKey: "event_announcement_scheduled", title: "Event announcement scheduled", category: "Marketing" },
  { templateKey: "host_payment_completed", title: "Host payment completed", category: "Financial" },
  { templateKey: "venue_payment_completed", title: "Venue payment completed", category: "Financial" },
  { templateKey: "post_event_report_generated", title: "Post-event report generated", category: "Post-Event" },
];

type ActivityMeta = {
  activityType: string;
  category: ActivityFilterCategory;
  label: string;
  description: (action: string, meta: Record<string, unknown>) => string;
};

const ACTION_MAP: Record<string, ActivityMeta> = {
  "event.created": { activityType: "event_created", category: "system", label: "Event created", description: () => "Event was created." },
  "event.updated": { activityType: "event_edited", category: "system", label: "Event edited", description: () => "Event details were updated." },
  "event.published": { activityType: "event_published", category: "system", label: "Event published", description: () => "Event was published." },
  "registration.received": { activityType: "registration_received", category: "attendee", label: "Registration received", description: (a, m) => `Registration received${m.attendeeName ? ` for ${m.attendeeName}` : ""}.` },
  "registration.checked_in": { activityType: "attendee_checked_in", category: "attendee", label: "Attendee checked in", description: (a, m) => `${m.attendeeName ?? "Attendee"} checked in.` },
  "registration.no_show": { activityType: "attendee_no_show", category: "attendee", label: "No-show marked", description: (a, m) => `${m.attendeeName ?? "Attendee"} marked no-show.` },
  "registration.walk_in": { activityType: "walk_in_added", category: "attendee", label: "Walk-in added", description: () => "Walk-in registration added." },
  "ticket.purchased": { activityType: "ticket_purchased", category: "attendee", label: "Ticket purchased", description: (a, m) => `Ticket purchase${m.amount ? ` ($${m.amount})` : ""}.` },
  "ticket.refunded": { activityType: "ticket_refunded", category: "attendee", label: "Ticket refunded", description: () => "Ticket was refunded." },
  "bonus_cards.sold": { activityType: "bonus_cards_sold", category: "attendee", label: "Bonus cards sold", description: (a, m) => `Bonus card sale${m.quantity ? ` ×${m.quantity}` : ""}.` },
  "plant.added": { activityType: "plant_added", category: "plant", label: "Plant added", description: (a, m) => `Plant added to inventory${m.plantName ? `: ${m.plantName}` : ""}.` },
  "plant.assigned": { activityType: "plant_assigned", category: "plant", label: "Plant assigned", description: () => "Plant assigned to a game round." },
  "plant.awarded": { activityType: "plant_awarded", category: "plant", label: "Plant awarded", description: () => "Plant prize awarded to winner." },
  "game.started": { activityType: "game_started", category: "game", label: "Game started", description: (a, m) => `Round started${m.roundName ? `: ${m.roundName}` : ""}.` },
  "game.paused": { activityType: "game_paused", category: "game", label: "Game paused", description: () => "Live round paused." },
  "winner.recorded": { activityType: "winner_recorded", category: "game", label: "Winner recorded", description: () => "Bingo winner recorded." },
  "winner.verified": { activityType: "winner_verified", category: "game", label: "Winner verified", description: () => "Winner verification completed." },
  "expense.added": { activityType: "expense_added", category: "financial", label: "Expense added", description: (a, m) => `Expense added${m.category ? ` (${m.category})` : ""}.` },
  "expense.approved": { activityType: "expense_approved", category: "financial", label: "Expense approved", description: () => "Expense approved." },
  "payment.marked_paid": { activityType: "payment_marked_paid", category: "financial", label: "Payment marked paid", description: () => "Payment marked as paid." },
  "host.invited": { activityType: "host_invited", category: "marketing", label: "Host invited", description: (a, m) => `Host invitation sent${m.hostName ? ` to ${m.hostName}` : ""}.` },
  "host.confirmed": { activityType: "host_confirmed", category: "marketing", label: "Host confirmed", description: () => "Host confirmed for event." },
  "venue.updated": { activityType: "venue_updated", category: "system", label: "Venue updated", description: () => "Venue details updated." },
  "venue_host.ops_updated": { activityType: "venue_updated", category: "system", label: "Venue/host ops updated", description: () => "Venue or host operational fields updated." },
  "message.sent": { activityType: "message_sent", category: "marketing", label: "Message sent", description: () => "Message sent to attendees or partners." },
  "marketing.commission_approved": { activityType: "affiliate_commission_created", category: "marketing", label: "Affiliate commission", description: () => "Affiliate commission approved." },
  "sponsor.deliverable_completed": { activityType: "sponsor_deliverable_completed", category: "marketing", label: "Sponsor deliverable", description: () => "Sponsor deliverable marked complete." },
  "event.completed": { activityType: "event_completed", category: "system", label: "Event completed", description: () => "Event marked completed." },
  "event.cancelled": { activityType: "event_cancelled", category: "system", label: "Event cancelled", description: () => "Event was cancelled." },
  "task.completed": { activityType: "task_completed", category: "system", label: "Task completed", description: (a, m) => `Checklist task completed${m.title ? `: ${m.title}` : ""}.` },
  "host.performance_note_added": { activityType: "host_confirmed", category: "marketing", label: "Host performance note", description: () => "Host performance note added." },
  "financials.locked": { activityType: "expense_approved", category: "financial", label: "Financials locked", description: () => "Event financials locked." },
};

export function formatActivityEntry(input: {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: Date;
  actorName: string | null;
  actorUserId?: bigint | null;
  metadata: Record<string, unknown> | null;
}): {
  id: string;
  timestamp: string;
  userName: string | null;
  userId: string | null;
  activityType: string;
  activityLabel: string;
  description: string;
  category: ActivityFilterCategory;
  entityType: string;
  entityId: string | null;
  source: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadataFormatted: Array<{ key: string; value: string }>;
  relatedLink: string | null;
} {
  const meta = input.metadata ?? {};
  const mapped = ACTION_MAP[input.action];
  const category = mapped?.category ?? inferCategory(input.action, input.entityType);
  const activityType = mapped?.activityType ?? input.action.replace(/\./g, "_");
  const activityLabel = mapped?.label ?? humanizeAction(input.action);
  const description = mapped?.description(input.action, meta) ?? `${activityLabel} on ${input.entityType}.`;

  const before = meta.before && typeof meta.before === "object" ? (meta.before as Record<string, unknown>) : null;
  const after = meta.after && typeof meta.after === "object" ? (meta.after as Record<string, unknown>) : null;
  const source = typeof meta.source === "string" ? meta.source : null;

  const sensitive = new Set(["token", "password", "secret", "inviteToken", "qrToken"]);
  const metadataFormatted: Array<{ key: string; value: string }> = [];
  for (const [key, value] of Object.entries(meta)) {
    if (["before", "after", "eventId"].includes(key) || sensitive.has(key)) continue;
    if (value == null) continue;
    metadataFormatted.push({ key: humanizeAction(key), value: String(value) });
  }

  return {
    id: input.id,
    timestamp: input.createdAt.toISOString(),
    userName: input.actorName,
    userId: input.actorUserId?.toString() ?? null,
    activityType,
    activityLabel,
    description,
    category,
    entityType: input.entityType,
    entityId: input.entityId,
    source,
    before,
    after,
    metadataFormatted,
    relatedLink: null,
  };
}

function inferCategory(action: string, entityType: string): ActivityFilterCategory {
  if (action.includes("plant") || entityType.includes("plant")) return "plant";
  if (action.includes("game") || action.includes("winner") || action.includes("bingo")) return "game";
  if (action.includes("expense") || action.includes("financial") || action.includes("payment")) return "financial";
  if (action.includes("host") || action.includes("marketing") || action.includes("affiliate")) return "marketing";
  if (action.includes("registration") || action.includes("attendee") || action.includes("ticket")) return "attendee";
  return "system";
}

function humanizeAction(action: string): string {
  return action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function computeChecklistCompletion(tasks: Array<{ status: string }>): {
  percent: number;
  completed: number;
  total: number;
  overdue: number;
} {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const now = Date.now();
  const overdue = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length;
  void now;
  return {
    total,
    completed,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    overdue: 0,
  };
}
