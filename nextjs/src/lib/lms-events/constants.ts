/** Admin organizer routes — separate from employee `/lms/events` catalog. */
export const LMS_EVENT_ADMIN_BASE = "/admin/event-platform/events" as const;
export const LMS_EVENT_STUDENT_BASE = "/lms/events" as const;
export const LMS_MY_EVENTS_BASE = "/lms/my-events" as const;

export const LMS_EVENT_TYPES = [
  "online_training",
  "in_person_training",
  "live_workshop",
  "certification_class",
  "conference_session",
  "safety_briefing",
  "cpr_class",
  "background_check_workshop",
  "security_training",
  "medical_training",
] as const;

export type LmsEventType = (typeof LMS_EVENT_TYPES)[number];

export const LMS_EVENT_TYPE_LABELS: Record<LmsEventType, string> = {
  online_training: "Online training",
  in_person_training: "In-person training",
  live_workshop: "Live workshop",
  certification_class: "Certification class",
  conference_session: "Conference session",
  safety_briefing: "Safety briefing",
  cpr_class: "CPR class",
  background_check_workshop: "Background check workshop",
  security_training: "Security training",
  medical_training: "Medical training",
};

export const LMS_EVENT_STATUSES = [
  "draft",
  "published",
  "registration_open",
  "sold_out",
  "in_progress",
  "completed",
  "cancelled",
  "archived",
] as const;

export type LmsEventStatus = (typeof LMS_EVENT_STATUSES)[number];

export const LMS_EVENT_STATUS_LABELS: Record<LmsEventStatus, string> = {
  draft: "Draft",
  published: "Published",
  registration_open: "Registration open",
  sold_out: "Sold out",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
};

export const LMS_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "waitlisted",
  "checked_in",
  "completed",
  "cancelled",
  "refunded",
  "no_show",
] as const;

export type LmsEventBookingStatus = (typeof LMS_BOOKING_STATUSES)[number];

export const LMS_TICKET_STATUSES = ["available", "sold_out", "closed", "hidden"] as const;

export type LmsEventTicketStatus = (typeof LMS_TICKET_STATUSES)[number];

export const LMS_CERTIFICATE_STATUSES = [
  "not_eligible",
  "eligible",
  "issued",
  "expired",
  "revoked",
] as const;

export type LmsEventCertificateStatus = (typeof LMS_CERTIFICATE_STATUSES)[number];

export const LMS_EVENT_DELIVERY_MODES = ["online", "in_person", "hybrid"] as const;

export type LmsEventDeliveryMode = (typeof LMS_EVENT_DELIVERY_MODES)[number];

/** Plant Bingo / community event age restrictions shown on public event pages. */
export const LMS_EVENT_AGE_RULES = ["21+", "Family", "All ages"] as const;
export type LmsEventAgeRule = (typeof LMS_EVENT_AGE_RULES)[number];

/** Venue category badge (Brewery, Greenhouse, etc.). */
export const LMS_EVENT_VENUE_TYPES = [
  "Brewery",
  "Greenhouse",
  "Cidery",
  "Taproom",
  "Nursery",
  "Beer Hall",
] as const;
export type LmsEventVenueType = (typeof LMS_EVENT_VENUE_TYPES)[number];

/** Future RBAC — seeded in Phase 5. */
export const LMS_EVENT_PERMISSIONS = {
  view: "view-lms-events",
  manage: "manage-lms-events",
  checkIn: "manage-lms-event-checkin",
  income: "manage-lms-event-income",
} as const;
