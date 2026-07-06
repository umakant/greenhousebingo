import {
  LMS_EVENT_ADMIN_BASE,
  LMS_EVENT_STUDENT_BASE,
  LMS_MY_EVENTS_BASE,
} from "@/lib/lms-events/constants";

export function lmsEventStudentDetailPath(eventId: string): string {
  return `${LMS_EVENT_STUDENT_BASE}/${encodeURIComponent(eventId)}`;
}

export function lmsEventStudentRegisterPath(eventId: string): string {
  return `${lmsEventStudentDetailPath(eventId)}/register`;
}

export function lmsEventStudentTicketPath(eventId: string): string {
  return `${lmsEventStudentDetailPath(eventId)}/ticket`;
}

export function lmsMyEventDetailPath(eventId: string): string {
  return `${LMS_MY_EVENTS_BASE}/${encodeURIComponent(eventId)}`;
}

export function lmsEventAdminDetailPath(eventId: string): string {
  return `${LMS_EVENT_ADMIN_BASE}/${encodeURIComponent(eventId)}`;
}

export function lmsEventAdminEditPath(eventId: string): string {
  return `${lmsEventAdminDetailPath(eventId)}/edit`;
}

export function lmsEventAdminTicketsPath(eventId: string): string {
  return `${lmsEventAdminDetailPath(eventId)}/tickets`;
}

export function lmsEventAdminAttendeesPath(eventId: string): string {
  return `${lmsEventAdminDetailPath(eventId)}/attendees`;
}

export function lmsEventAdminCheckInPath(eventId: string): string {
  return `${lmsEventAdminDetailPath(eventId)}/check-in`;
}

export function lmsEventAdminCertificatesPath(eventId: string): string {
  return `${lmsEventAdminDetailPath(eventId)}/certificates`;
}
