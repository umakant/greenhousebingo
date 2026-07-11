import type { LmsEventBookingStatus } from "@/lib/lms-events/constants";

/** Booking statuses excluded from registration and capacity counts. */
export const COMMAND_CENTER_INVALID_BOOKING_STATUSES: LmsEventBookingStatus[] = [
  "cancelled",
  "refunded",
];

/** Bookings that do not consume capacity. */
export const COMMAND_CENTER_NON_CAPACITY_STATUSES: LmsEventBookingStatus[] = [
  "cancelled",
  "refunded",
  "waitlisted",
];

export function isCommandCenterValidRegistration(status: string): boolean {
  return !COMMAND_CENTER_INVALID_BOOKING_STATUSES.includes(status as LmsEventBookingStatus);
}

export function commandCenterCountsTowardCapacity(status: string): boolean {
  return !COMMAND_CENTER_NON_CAPACITY_STATUSES.includes(status as LmsEventBookingStatus);
}

export type CommandCenterRegistrationRow = {
  bookingStatus: string;
  paymentStatus: string;
  registeredAt: Date;
  checkedInAt: Date | null;
  amountPaid: number;
  ticketName: string | null;
  attendeeName: string;
};

export function filterValidRegistrations<T extends { bookingStatus: string }>(rows: T[]): T[] {
  return rows.filter((r) => isCommandCenterValidRegistration(r.bookingStatus));
}

export function filterCapacityRegistrations<T extends { bookingStatus: string }>(rows: T[]): T[] {
  return rows.filter((r) => commandCenterCountsTowardCapacity(r.bookingStatus));
}
