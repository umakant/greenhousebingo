import { z } from "zod";

import {
  LMS_BOOKING_STATUSES,
  LMS_EVENT_DELIVERY_MODES,
  LMS_EVENT_STATUSES,
  LMS_EVENT_TYPES,
  LMS_TICKET_STATUSES,
} from "@/lib/lms-events/constants";

export const lmsEventListFiltersSchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  eventType: z.enum(LMS_EVENT_TYPES).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  location: z.string().trim().optional(),
  freeOnly: z.coerce.boolean().optional(),
  paidOnly: z.coerce.boolean().optional(),
  certificationOnly: z.coerce.boolean().optional(),
  deliveryMode: z.enum(LMS_EVENT_DELIVERY_MODES).optional(),
  status: z.union([z.enum(LMS_EVENT_STATUSES), z.array(z.enum(LMS_EVENT_STATUSES))]).optional(),
});

export type LmsEventListFiltersInput = z.infer<typeof lmsEventListFiltersSchema>;

export const lmsEventRegistrationStepConfirmSchema = z.object({
  attendeeName: z.string().trim().min(2, "Enter your full name"),
  attendeeEmail: z.string().trim().email("Enter a valid email"),
  acceptRequirements: z.boolean().refine((v) => v === true, {
    message: "You must confirm the requirements",
  }),
});

export const lmsEventRegistrationStepTicketSchema = z.object({
  ticketId: z.string().min(1, "Select a ticket"),
});

export const lmsEventRegistrationWizardSchema = lmsEventRegistrationStepConfirmSchema.merge(
  lmsEventRegistrationStepTicketSchema,
);

export type LmsEventRegistrationWizardInput = z.infer<typeof lmsEventRegistrationWizardSchema>;

export const lmsEventBasicInfoSchema = z.object({
  title: z.string().trim().min(3, "Title is required"),
  slug: z.string().trim().min(2).optional(),
  description: z.string().trim().optional(),
  shortDescription: z.string().trim().max(150).optional(),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  categoryId: z.string().min(1, "Category is required"),
  eventType: z.enum(LMS_EVENT_TYPES),
  deliveryMode: z.enum(LMS_EVENT_DELIVERY_MODES),
  instructorName: z.string().trim().optional(),
  isPublic: z.boolean().default(true),
  certificationAvailable: z.boolean().default(false),
  certificationName: z.string().trim().optional(),
  requirements: z.string().trim().optional(),
});

export const lmsEventScheduleSchema = z.object({
  startsAt: z.string().min(1, "Start date/time is required"),
  endsAt: z.string().min(1, "End date/time is required"),
  timezone: z.string().default("America/New_York"),
});

export const lmsEventLocationSchema = z.object({
  venueName: z.string().trim().optional(),
  venueAddress: z.string().trim().optional(),
  venueCity: z.string().trim().optional(),
  venueState: z.string().trim().optional(),
  venuePostalCode: z.string().trim().optional(),
  venueCountry: z.string().trim().optional(),
  onlineMeetingUrl: z.string().url().optional().or(z.literal("")),
});

export const lmsEventTicketFormSchema = z.object({
  ticketName: z.string().trim().min(1, "Ticket name is required"),
  ticketDescription: z.string().trim().optional(),
  price: z.coerce.number().min(0),
  currency: z.string().length(3).default("USD"),
  quantity: z.coerce.number().int().positive().nullable().optional(),
  saleStartsAt: z.string().optional(),
  saleEndsAt: z.string().optional(),
  ticketStatus: z.enum(LMS_TICKET_STATUSES).default("available"),
  isFree: z.boolean().default(false),
});

export type LmsEventTicketFormInput = z.infer<typeof lmsEventTicketFormSchema>;

export const lmsEventSettingsSchema = z.object({
  capacity: z.coerce.number().int().positive().nullable().optional(),
  cancellationPolicy: z.string().trim().optional(),
  status: z.enum(LMS_EVENT_STATUSES).default("draft"),
});

export const lmsEventCreateWizardSchema = lmsEventBasicInfoSchema
  .merge(lmsEventScheduleSchema)
  .merge(lmsEventLocationSchema)
  .merge(lmsEventTicketFormSchema)
  .merge(lmsEventSettingsSchema);

export type LmsEventCreateWizardInput = z.infer<typeof lmsEventCreateWizardSchema>;

export const lmsEventSupportTicketSchema = z.object({
  subject: z.string().trim().min(3, "Subject is required"),
  body: z.string().trim().min(10, "Describe your issue"),
  eventId: z.string().optional(),
});

export type LmsEventSupportTicketInput = z.infer<typeof lmsEventSupportTicketSchema>;

export const lmsEventCheckInManualSchema = z.object({
  query: z.string().trim().min(1, "Search by name or email"),
});

export const lmsEventBookingStatusSchema = z.enum(LMS_BOOKING_STATUSES);
