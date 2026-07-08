import type {
  LmsEventBookingStatus,
  LmsEventCertificateStatus,
  LmsEventStatus,
  LmsEventTicketStatus,
} from "@/lib/lms-events/constants";

export type LmsAuditableRow = {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  updatedById: string | null;
};

export type LmsEventBaseFields = LmsAuditableRow & {
  status: LmsEventStatus;
};

export type LmsEventCategory = LmsAuditableRow & {
  status: LmsEventStatus;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
};

export type LmsEvent = LmsEventBaseFields & {
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  eventType: string;
  deliveryMode: string;
  instructorName: string | null;
  instructorUserId: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  venueName: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  venueState: string | null;
  venuePostalCode: string | null;
  venueCountry: string | null;
  venueLat: number | null;
  venueLng: number | null;
  onlineMeetingUrl: string | null;
  capacity: number | null;
  registeredCount: number;
  seatsRemaining: number | null;
  isPublic: boolean;
  isFree: boolean;
  priceFrom: number | null;
  currency: string;
  certificationAvailable: boolean;
  certificationName: string | null;
  requirements: string | null;
  cancellationPolicy: string | null;
  isFeatured: boolean;
  ageRule: string | null;
  doorsOpen: string | null;
  bingoStart: string | null;
  venueType: string | null;
  cardsIncluded: number | null;
  extraCardPrice: number | null;
  foodAndDrinks: string | null;
  attire: string | null;
  linkedCourseId: string | null;
  linkedLiveSessionId: string | null;
  revenueTotal: number;
};

export type LmsEventTicket = LmsAuditableRow & {
  eventId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  quantity: number | null;
  soldCount: number;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  ticketStatus: LmsEventTicketStatus;
  isFree: boolean;
  accessRules: string | null;
};

export type LmsEventRegistration = LmsAuditableRow & {
  eventId: string;
  ticketId: string;
  studentUserId: string;
  bookingStatus: LmsEventBookingStatus;
  attendeeName: string;
  attendeeEmail: string;
  paymentStatus: "unpaid" | "paid" | "refunded" | "comped";
  amountPaid: number;
  currency: string;
  registeredAt: string;
  checkedInAt: string | null;
  qrToken: string;
};

export type LmsEventAttendee = {
  registrationId: string;
  eventId: string;
  name: string;
  email: string;
  ticketName: string;
  bookingStatus: LmsEventBookingStatus;
  paymentStatus: LmsEventRegistration["paymentStatus"];
  checkedInAt: string | null;
};

export type LmsEventBooking = LmsEventRegistration;

export type LmsEventPayment = LmsAuditableRow & {
  registrationId: string;
  eventId: string;
  amount: number;
  currency: string;
  method: string;
  transactionRef: string | null;
  paidAt: string | null;
};

export type LmsEventCertificate = LmsAuditableRow & {
  eventId: string;
  registrationId: string;
  studentUserId: string;
  studentName: string;
  eventTitle: string;
  certificateStatus: LmsEventCertificateStatus;
  issuedAt: string | null;
  expiresAt: string | null;
  renewalRequired: boolean;
  templateId: string | null;
  downloadUrl: string | null;
};

export type LmsEventCheckIn = LmsAuditableRow & {
  eventId: string;
  registrationId: string;
  checkedInAt: string;
  method: "qr" | "manual";
  checkedInById: string | null;
};

export type LmsEventSupportTicket = LmsAuditableRow & {
  eventId: string | null;
  registrationId: string | null;
  studentUserId: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high";
  lastReplyAt: string | null;
};

export type LmsEventSupportMessage = {
  id: string;
  ticketId: string;
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: string;
  attachmentUrls: string[];
};

export type LmsEventNotification = LmsAuditableRow & {
  userId: string;
  eventId: string | null;
  kind:
    | "event_published"
    | "registration_confirmed"
    | "ticket_generated"
    | "event_reminder"
    | "event_cancelled"
    | "waitlist_approved"
    | "certificate_issued"
    | "support_updated"
    | "refund_processed";
  title: string;
  body: string;
  readAt: string | null;
};

export type LmsEventTransaction = LmsAuditableRow & {
  eventId: string;
  registrationId: string;
  attendeeName: string;
  amount: number;
  currency: string;
  method: string;
  status: "pending" | "completed" | "failed" | "refunded";
  processedAt: string;
};

export type LmsEventWithdrawal = LmsAuditableRow & {
  amount: number;
  currency: string;
  payoutMethod: string;
  status: "pending" | "processing" | "paid" | "rejected";
  requestedAt: string;
  processedAt: string | null;
};

export type LmsEventIncomeReport = {
  month: string;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  registrationCount: number;
};

export type LmsEventWishlistItem = LmsAuditableRow & {
  eventId: string;
  studentUserId: string;
};

export type LmsEventListFilters = {
  search?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  freeOnly?: boolean;
  paidOnly?: boolean;
  certificationOnly?: boolean;
  deliveryMode?: string;
  status?: LmsEventStatus | LmsEventStatus[];
};

export type LmsEventOrganizerKpis = {
  totalEvents: number;
  publishedEvents: number;
  upcomingEvents: number;
  totalRegistrations: number;
  attendanceRate: number;
  totalRevenue: number;
  refunds: number;
  certificatesIssued: number;
  openSupportTickets: number;
};

export type LmsEventCardModel = Pick<
  LmsEvent,
  | "id"
  | "title"
  | "slug"
  | "shortDescription"
  | "imageUrl"
  | "categoryName"
  | "eventType"
  | "deliveryMode"
  | "startsAt"
  | "endsAt"
  | "venueName"
  | "venueCity"
  | "capacity"
  | "seatsRemaining"
  | "isFree"
  | "priceFrom"
  | "currency"
  | "certificationAvailable"
  | "status"
>;
