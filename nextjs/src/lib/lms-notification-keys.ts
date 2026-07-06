/** Email template names (`email_templates.name`) and settings toggle keys (`notifications.action`). */
export const LMS_EMAIL_TEMPLATE = {
  enrollmentConfirmation: "LMS Enrollment Confirmation",
  lessonCompleted: "LMS Lesson Completed",
  classReminder: "LMS Class Reminder",
} as const;

/** Company settings keys for SMS toggles (WhatsApp API notification settings). */
export const LMS_SMS_SETTING_KEY = {
  enrollmentConfirmation: "wa_notify_lms_enrollment_confirmation",
  lessonCompleted: "wa_notify_lms_lesson_completed",
  classReminder: "wa_notify_lms_class_reminder",
} as const;

export type LmsNotificationReferenceType = "enrollment" | "lesson_progress" | "live_session";
