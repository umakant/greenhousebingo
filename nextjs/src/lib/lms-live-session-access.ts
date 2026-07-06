import { hasPermission } from "@/lib/authz";

/** Admin access to list/create/update live sessions (Classes, Meetings, Courses). */
export function canManageLmsLiveSessions(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms") ||
    hasPermission(perms, "manage-lms-classes") ||
    hasPermission(perms, "manage-lms-meetings") ||
    hasPermission(perms, "manage-lms-courses")
  );
}

/** Roster and attendance management (Classes page). */
export function canManageLmsLiveSessionAttendance(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms") ||
    hasPermission(perms, "manage-lms-classes") ||
    hasPermission(perms, "manage-lms-courses")
  );
}

/** Read course titles for meeting/session forms. */
export function canListLmsCoursesForMeetings(perms: string[]): boolean {
  return (
    canManageLmsLiveSessions(perms) ||
    hasPermission(perms, "manage-lms-instructor-courses") ||
    hasPermission(perms, "view-lms-instructor-assignments") ||
    hasPermission(perms, "manage-lms-instructor-dashboard")
  );
}
