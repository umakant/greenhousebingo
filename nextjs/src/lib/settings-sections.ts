import { hasPermission } from "@/lib/authz";
import type { NavSearchEntry } from "@/utils/flatten-nav-for-search";

export type SettingsSectionId =
  | "brand"
  | "company-website-theme"
  | "system"
  | "system-setup"
  | "company"
  | "payment-terms"
  | "payment-settings"
  | "media-library"
  | "currency"
  | "cookie"
  | "pusher"
  | "seo"
  | "cache"
  | "storage"
  | "email"
  | "email-notifications"
  | "subscription-plans"
  | "whatsapp-api"
  | "twilio-sms"
  | "database-backup"
  | "user-management"
  | "form-builder"
  | "project-roadmap"
  | "employee-payout"
  | "bank-transfer"
  | "stripe"
  | "paypal"
  | "recurring-invoice"
  | "storefront"
  | "lms";

export type SettingsSectionDef = {
  id: SettingsSectionId;
  title: string;
  viewPermission: string;
  /** Extra keywords for global search (e.g. tab slug without hyphen). */
  keywords?: string[];
};

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  { id: "brand", title: "Brand Settings", viewPermission: "manage-brand-settings", keywords: ["logo", "favicon"] },
  {
    id: "company-website-theme",
    title: "Company Website Theme",
    viewPermission: "manage-brand-settings",
    keywords: ["website", "marketing", "theme", "company-website", "password", "access"],
  },
  { id: "system", title: "System Settings", viewPermission: "manage-system-settings" },
  {
    id: "system-setup",
    title: "System Setup",
    viewPermission: "manage-appointment",
    keywords: ["appointment", "booking"],
  },
  { id: "company", title: "Company Settings", viewPermission: "manage-company-settings", keywords: ["profile"] },
  { id: "payment-terms", title: "Payment terms", viewPermission: "manage-company-settings" },
  { id: "payment-settings", title: "Payment Settings", viewPermission: "manage-settings", keywords: ["payment"] },
  { id: "media-library", title: "Media Library", viewPermission: "manage-media", keywords: ["media", "uploads"] },
  { id: "currency", title: "Currency Settings", viewPermission: "manage-currency-settings", keywords: ["currency"] },
  { id: "cookie", title: "Cookie Settings", viewPermission: "manage-cookie-settings" },
  { id: "pusher", title: "Pusher Settings", viewPermission: "manage-pusher-settings" },
  { id: "seo", title: "SEO Settings", viewPermission: "manage-seo-settings" },
  { id: "cache", title: "Cache Settings", viewPermission: "manage-cache-settings" },
  { id: "storage", title: "Storage Settings", viewPermission: "manage-storage-settings" },
  { id: "recurring-invoice", title: "Recurring Invoice Settings", viewPermission: "manage-recurring-invoice-bill" },
  { id: "email", title: "Email Settings", viewPermission: "manage-email-settings", keywords: ["smtp", "delivery"] },
  {
    id: "email-notifications",
    title: "Email Notification Settings",
    viewPermission: "manage-email-notification-settings",
    keywords: ["notifications"],
  },
  { id: "subscription-plans", title: "Subscription Plans", viewPermission: "manage-plans", keywords: ["plans", "billing"] },
  {
    id: "whatsapp-api",
    title: "WhatsApp API Settings",
    viewPermission: "manage-whatsapp-settings",
    keywords: ["whatsapp", "meta"],
  },
  { id: "twilio-sms", title: "Twilio SMS Settings", viewPermission: "manage-system-settings", keywords: ["twilio", "sms"] },
  { id: "database-backup", title: "Database Backup", viewPermission: "manage-system-settings", keywords: ["backup"] },
  { id: "user-management", title: "User Management", viewPermission: "manage-user", keywords: ["users", "roles"] },
  {
    id: "form-builder",
    title: "Form Builder",
    viewPermission: "view-formbuilder-form",
    keywords: ["forms", "formbuilder"],
  },
  { id: "project-roadmap", title: "Project Roadmap", viewPermission: "manage-project", keywords: ["roadmap", "gantt"] },
  { id: "employee-payout", title: "Employee Payout", viewPermission: "manage-project", keywords: ["payroll", "pay rate", "payout"] },
  { id: "bank-transfer", title: "Bank Transfer Settings", viewPermission: "manage-bank-transfer-settings" },
  { id: "stripe", title: "Stripe Settings", viewPermission: "manage-stripe-settings" },
  { id: "paypal", title: "PayPal Settings", viewPermission: "manage-paypal-settings" },
  { id: "storefront", title: "Storefront", viewPermission: "storefront.settings.manage", keywords: ["shop", "merchant"] },
  { id: "lms", title: "LMS", viewPermission: "manage-lms-settings", keywords: ["learning", "courses"] },
];

function can(perms: string[], required: string) {
  return perms.includes("*") || hasPermission(perms, required);
}

function canAccessMediaLibrary(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "manage-media") ||
    hasPermission(perms, "create-media") ||
    hasPermission(perms, "delete-media") ||
    hasPermission(perms, "manage-media-directories") ||
    hasPermission(perms, "create-media-directories")
  );
}

function canAccessSubscriptionPlans(perms: string[], roles: string[] = []): boolean {
  if (perms.includes("*")) return true;
  if (
    hasPermission(perms, "manage-plans") ||
    hasPermission(perms, "view-plans") ||
    hasPermission(perms, "manage-settings") ||
    hasPermission(perms, "edit-settings")
  ) {
    return true;
  }
  return roles.some((r) => r === "company" || r === "company_admin" || r === "staff");
}

function canAccessFormBuilder(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "view-formbuilder-form") ||
    hasPermission(perms, "manage-formbuilder") ||
    hasPermission(perms, "create-formbuilder")
  );
}

function canAccessProjectRoadmap(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return hasPermission(perms, "manage-project");
}

function canAccessPaymentSettings(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "manage-settings") ||
    hasPermission(perms, "edit-settings") ||
    hasPermission(perms, "manage-stripe-settings") ||
    hasPermission(perms, "edit-stripe-settings") ||
    hasPermission(perms, "manage-paypal-settings") ||
    hasPermission(perms, "edit-paypal-settings") ||
    hasPermission(perms, "manage-bank-transfer-settings") ||
    hasPermission(perms, "edit-bank-transfer-settings")
  );
}

function canAccessStorefrontSettings(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "storefront.settings.manage") ||
    hasPermission(perms, "manage-storefront-settings") ||
    hasPermission(perms, "manage-storefront")
  );
}

function canAccessLmsOrgSettings(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return hasPermission(perms, "manage-lms-settings") || hasPermission(perms, "manage-lms");
}

function canAccessAppointmentSystemSetup(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "manage-appointment") ||
    hasPermission(perms, "manage-appointment-hours") ||
    hasPermission(perms, "manage-appointment-settings")
  );
}

export function getVisibleSettingsSections(opts: {
  permissions: string[];
  roles?: string[];
  activatedPackages?: string[];
  isSuperAdmin?: boolean;
}): SettingsSectionDef[] {
  const perms = opts.permissions ?? [];
  const roles = opts.roles ?? [];
  const activatedLower = (opts.activatedPackages ?? []).map((p) => String(p).toLowerCase());
  const isSuperAdmin = opts.isSuperAdmin ?? false;

  const base = SETTINGS_SECTIONS.filter((s) => {
    if (s.id === "database-backup" && !isSuperAdmin) return false;
    if (s.id === "twilio-sms" && !isSuperAdmin) return false;
    if (s.id === "storefront") {
      if (!activatedLower.includes("storefront")) return false;
      return perms.includes("*") || canAccessStorefrontSettings(perms);
    }
    if (s.id === "lms") {
      if (isSuperAdmin) return false;
      if (!activatedLower.includes("lms")) return false;
      return canAccessLmsOrgSettings(perms);
    }
    if (s.id === "project-roadmap") {
      if (isSuperAdmin) return false;
      return canAccessProjectRoadmap(perms);
    }
    if (s.id === "employee-payout") {
      if (isSuperAdmin) return false;
      return canAccessProjectRoadmap(perms);
    }
    if (s.id === "system-setup") {
      const hasApptAddon = activatedLower.some(
        (p) => p === "appointment" || p.includes("appointment") || p === "hrm" || p.startsWith("hrm-"),
      );
      if (!hasApptAddon) return false;
      return perms.includes("*") || canAccessAppointmentSystemSetup(perms);
    }
    if (s.id === "company-website-theme") {
      if (isSuperAdmin) return false;
      return perms.includes("*") || can(perms, s.viewPermission) || can(perms, "edit-brand-settings");
    }
    if (perms.includes("*")) return true;
    if (s.id === "media-library") return canAccessMediaLibrary(perms);
    if (s.id === "subscription-plans") return canAccessSubscriptionPlans(perms, roles);
    if (s.id === "form-builder") return canAccessFormBuilder(perms);
    if (s.id === "payment-settings") {
      if (isSuperAdmin) return false;
      return canAccessPaymentSettings(perms);
    }
    if (!isSuperAdmin && (s.id === "bank-transfer" || s.id === "stripe" || s.id === "paypal")) {
      return false;
    }
    if (s.id === "email-notifications") {
      return (
        can(perms, s.viewPermission) ||
        hasPermission(perms, "edit-email-settings") ||
        hasPermission(perms, "manage-email-settings")
      );
    }
    if (s.id === "whatsapp-api") {
      return (
        can(perms, s.viewPermission) ||
        hasPermission(perms, "manage-whatsapp-chat") ||
        hasPermission(perms, "manage-settings") ||
        hasPermission(perms, "edit-settings")
      );
    }
    return can(perms, s.viewPermission);
  });

  return base.filter((s) => (isSuperAdmin ? s.id !== "company" && s.id !== "payment-terms" : true));
}

/** Settings sidebar tabs as global-search navigable entries. */
export function getSettingsSearchEntries(opts: {
  permissions: string[];
  roles?: string[];
  activatedPackages?: string[];
  isSuperAdmin?: boolean;
}): NavSearchEntry[] {
  return getVisibleSettingsSections(opts).map((s) => ({
    id: `settings::${s.id}`,
    title: s.title,
    href: `/settings?tab=${s.id}`,
    name: s.id.replace(/-/g, ""),
    breadcrumbs: ["Settings"],
    keywords: s.keywords,
  }));
}

/** Standalone module pages not always listed as separate sidebar links. */
export const EXTRA_GLOBAL_SEARCH_ROUTES: NavSearchEntry[] = [
  {
    id: "form-builder-page",
    title: "Form Builder",
    href: "/form-builder",
    name: "formbuilder",
    breadcrumbs: ["Form Builder"],
    keywords: ["forms"],
  },
];

export function filterExtraSearchRoutes(
  entries: NavSearchEntry[],
  permissions: string[],
): NavSearchEntry[] {
  const perms = permissions ?? [];
  return entries.filter((e) => {
    if (e.href === "/form-builder") {
      return perms.includes("*") || canAccessFormBuilder(perms);
    }
    return true;
  });
}
