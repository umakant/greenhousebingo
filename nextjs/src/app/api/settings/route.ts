import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

import { hasPermission, isSuperAdminFromRoleCookies } from "@/lib/authz";
import { companyProfileLegacySettingItems } from "@/lib/company-profile-settings";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { prisma } from "@/lib/prisma";
import { SITE_SEO_CACHE_TAG } from "@/lib/site-seo";
import {
  getMergedSettingsForUserEmail,
  getSettingsForOwner,
  getUserByEmail,
  settingsOwnerIdForUser,
  upsertOwnerSettings,
} from "@/lib/settings-service";
import { getSettingsPageDataForUserEmail } from "@/lib/settings-page-data";
import { companyWebsiteOwnerId } from "@/lib/company-themes/company-website-access";
import { findCompanyOwnerIdByWebsiteHostname } from "@/lib/company-themes/company-website-host-resolver";
import { syncCompanyUserAvatarFromSettings } from "@/lib/company-user-avatar";
import { normalizeWebsiteUrl, websiteUrlToHostname } from "@/lib/website-url";

function appUrlFromReq(req: NextRequest): string {
  const env = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (env) return env.replace(/\/+$/, "");
  return req.nextUrl.origin;
}

async function requirePermission(
  req: NextRequest,
  required: string,
): Promise<{ ok: true; perms: string[] } | { ok: false; res: NextResponse }> {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return { ok: false, res: NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 }) };

  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, required) && !perms.includes("*")) {
    return { ok: false, res: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, perms };
}

/** Who may persist Email Notification toggles (matches product expectation: email admins, not only a niche perm). */
function canWriteEmailNotificationToggles(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "manage-email-notification-settings") ||
    hasPermission(perms, "edit-email-settings") ||
    hasPermission(perms, "manage-email-settings")
  );
}

function canWriteWhatsAppApiSettings(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "manage-whatsapp-settings") ||
    hasPermission(perms, "manage-whatsapp-chat") ||
    hasPermission(perms, "edit-settings") ||
    hasPermission(perms, "manage-settings")
  );
}

type Section =
  | "brand"
  | "company-website-theme"
  | "system"
  | "company"
  | "payment-terms"
  | "currency"
  | "cookie"
  | "pusher"
  | "seo"
  | "cache"
  | "storage"
  | "email"
  | "email-notifications"
  | "whatsapp-api"
  | "bank-transfer"
  | "stripe"
  | "paypal"
  | "recurring-invoice";

const SECTION_WRITE_PERMISSION: Record<Section, string> = {
  brand: "edit-brand-settings",
  "company-website-theme": "edit-brand-settings",
  system: "edit-system-settings",
  company: "edit-company-settings",
  "payment-terms": "edit-company-settings",
  currency: "edit-currency-settings",
  cookie: "edit-cookie-settings",
  pusher: "edit-pusher-settings",
  seo: "edit-seo-settings",
  cache: "clear-cache",
  storage: "edit-storage-settings",
  email: "edit-email-settings",
  "email-notifications": "manage-email-notification-settings",
  "whatsapp-api": "manage-whatsapp-settings",
  "bank-transfer": "edit-bank-transfer-settings",
  stripe: "edit-stripe-settings",
  paypal: "edit-paypal-settings",
  "recurring-invoice": "manage-recurring-invoice-bill",
};

/** Section write access; payment gateways also allow company `manage-settings` / `edit-settings`. */
function canWriteSettingsSection(perms: string[], section: Section): boolean {
  if (perms.includes("*")) return true;
  const required = SECTION_WRITE_PERMISSION[section];
  if (hasPermission(perms, required)) return true;
  if (section === "stripe" || section === "paypal" || section === "bank-transfer") {
    return hasPermission(perms, "edit-settings") || hasPermission(perms, "manage-settings");
  }
  return false;
}

const SECTION_KEYS: Record<Section, string[]> = {
  brand: [
  "logo_dark",
  "logo_light",
  "logo_dark_width",
  "logo_dark_height",
  "logo_light_width",
  "logo_light_height",
  "logo_position",
  "favicon",
    "logo_icon",
    "powered_by_light",
    "powered_by_dark",
    "titleText",
    "footerText",
    "sidebarVariant",
    "sidebarStyle",
    "layoutDirection",
    "themeMode",
    "themeColor",
    "customColor",
    "loginImage",
    "loginBgColor",
    "loginFormBgColor",
  ],
  "company-website-theme": [
    "companyNextjsThemeSlug",
    "companyNextjsThemeCustomizer",
    "companyWebsite",
    "companyWebsitePasswordProtected",
    "companyWebsiteAccessPassword",
  ],
  system: [
    "defaultLanguage",
    "dateFormat",
    "timeFormat",
    "calendarStartDay",
    "enableRegistration",
    "enableEmailVerification",
    "landingPageEnabled",
    "termsConditionsUrl",
    "googleMapsApiKey",
  ],
  company: [
    "company_name",
    "company_address",
    "company_address_2",
    "company_city",
    "company_state",
    "company_county",
    "company_country",
    "company_zipcode",
    "company_telephone",
    "company_email",
    "companyWebsite",
  ],
  "payment-terms": ["account_payment_terms_options"],
  currency: [
    "defaultCurrency",
    "decimalFormat",
    "decimalSeparator",
    "thousandsSeparator",
    "floatNumber",
    "currencySymbolSpace",
    "currencySymbolPosition",
  ],
  cookie: [
    "enableCookiePopup",
    "enableLogging",
    "strictlyNecessaryCookies",
    "cookieTitle",
    "strictlyCookieTitle",
    "cookieDescription",
    "strictlyCookieDescription",
    "contactUsDescription",
    "contactUsUrl",
  ],
  pusher: ["pusher_app_id", "pusher_app_key", "pusher_app_secret", "pusher_app_cluster", "pusher_enabled"],
  seo: ["metaKeywords", "metaTitle", "metaDescription", "metaImage"],
  cache: [],
  storage: [
    "storageType",
    "allowedFileTypes",
    "maxUploadSize",
    "awsAccessKeyId",
    "awsSecretAccessKey",
    "awsDefaultRegion",
    "awsBucket",
    "awsUrl",
    "awsEndpoint",
    "wasabiAccessKey",
    "wasabiSecretKey",
    "wasabiRegion",
    "wasabiBucket",
    "wasabiUrl",
    "wasabiRoot",
    "cloudinaryCloudName",
    "cloudinaryApiKey",
    "cloudinaryApiSecret",
    "cloudinaryFolder",
  ],
  email: [
    "email_provider",
    "email_driver",
    "email_host",
    "email_port",
    "email_username",
    "email_password",
    "email_encryption",
    "email_fromAddress",
  ],
  "email-notifications": [], // free-form, comes as key/value map
  "whatsapp-api": [], // free-form: wa_enabled, wa_phone_number_id, wa_access_token, wa_notify_*
  "bank-transfer": ["bankTransferEnabled", "instructions"],
  stripe: ["stripe_enabled", "stripe_key", "stripe_secret"],
  paypal: ["paypal_enabled", "paypal_mode", "paypal_client_id", "paypal_secret_key"],
  "recurring-invoice": ["recurring_sales_purchase_invoices"],
};

/** Only platform superadmin may persist these; company tenants inherit merged values in the UI. */
const SUPERADMIN_ONLY_BRAND_KEYS = new Set([
  "powered_by_light",
  "powered_by_dark",
  "loginImage",
  "loginBgColor",
  "loginFormBgColor",
]);

const SUPERADMIN_ONLY_SYSTEM_KEYS = new Set([
  "googleMapsApiKey",
  "enableRegistration",
  "enableEmailVerification",
  "landingPageEnabled",
  "termsConditionsUrl",
]);

function normalizeValue(v: unknown): string {
  // Laravel stored many toggles as 1/0 strings (e.g. cookie + currency switches).
  // Other toggles are already sent as "on"/"off" strings by the client.
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return String(v);
  if (v == null) return "";
  return String(v);
}

export async function GET(req: NextRequest) {
  const authz = await requirePermission(req, "manage-settings");
  if (!authz.ok) return authz.res;

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const appUrl = appUrlFromReq(req);
  let roles: string[] = [];
  try {
    roles = JSON.parse(req.cookies.get("pf_roles")?.value ?? "[]") as string[];
  } catch {
    roles = [];
  }
  const isSuperAdmin = roles.includes("superadmin") || roles.includes("super_admin");
  const pageData = await getSettingsPageDataForUserEmail(email, appUrl, { isSuperAdmin });
  return NextResponse.json({ ok: true, ...pageData });
}

export async function POST(req: NextRequest) {
  const baseAuthz = await requirePermission(req, "manage-settings");
  if (!baseAuthz.ok) return baseAuthz.res;

  const body = (await req.json().catch(() => ({}))) as { section?: unknown; settings?: unknown };
  const section = String(body.section ?? "") as Section;
  const incoming = body.settings;

  if (!section || !(section in SECTION_WRITE_PERMISSION)) {
    return NextResponse.json({ ok: false, message: "Invalid section." }, { status: 400 });
  }

  if (section === "email-notifications") {
    if (!canWriteEmailNotificationToggles(baseAuthz.perms)) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
  } else if (section === "whatsapp-api") {
    if (!canWriteWhatsAppApiSettings(baseAuthz.perms)) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
  } else if (!canWriteSettingsSection(baseAuthz.perms, section)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const user = await getUserByEmail(email);
  if (!user) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  if (section === "company-website-theme") {
    const companyOwnerId = companyWebsiteOwnerId(user);
    if (!companyOwnerId) {
      return NextResponse.json(
        { ok: false, message: "Company website theme is only available for individual company accounts." },
        { status: 403 },
      );
    }
  }

  const ownerId =
    section === "company-website-theme" ? companyWebsiteOwnerId(user)! : settingsOwnerIdForUser(user);

  // Cache actions are placeholders in Next.js (Laravel used Artisan).
  if (section === "cache") {
    return NextResponse.json({ ok: true });
  }

  if (section === "email-notifications" || section === "whatsapp-api") {
    if (!incoming || typeof incoming !== "object") {
      return NextResponse.json({ ok: false, message: "settings must be an object" }, { status: 400 });
    }
    const items = Object.entries(incoming as Record<string, unknown>).map(([key, value]) => ({
      key,
      value: normalizeValue(value),
      isPublic: true,
    }));
    await upsertOwnerSettings(ownerId, items);
    return NextResponse.json({ ok: true });
  }

  const keys = SECTION_KEYS[section] ?? [];
  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json({ ok: false, message: "settings must be an object" }, { status: 400 });
  }

  const payload = { ...(incoming as Record<string, unknown>) };
  if (section === "email") {
    const pwd = normalizeValue(payload.email_password);
    if (pwd === "") {
      const existing = await getSettingsForOwner(ownerId);
      const keep = (existing.email_password ?? "").trim();
      if (keep) payload.email_password = keep;
    }
  }

  if (section === "company-website-theme") {
    const plainPassword = normalizeValue(payload.companyWebsiteAccessPassword);
    delete payload.companyWebsiteAccessPassword;
    const existing = await getSettingsForOwner(ownerId);
    if (plainPassword) {
      const bcrypt = await import("bcryptjs");
      payload.companyWebsiteAccessPasswordHash = await bcrypt.hash(plainPassword, 10);
    } else {
      const keep = (existing.companyWebsiteAccessPasswordHash ?? "").trim();
      if (keep) payload.companyWebsiteAccessPasswordHash = keep;
    }
    const protectedEnabled = normalizeValue(payload.companyWebsitePasswordProtected);
    if (!protectedEnabled || protectedEnabled === "0" || protectedEnabled === "false") {
      payload.companyWebsitePasswordProtected = "0";
    } else {
      payload.companyWebsitePasswordProtected = "1";
    }
    if (Object.prototype.hasOwnProperty.call(payload, "companyWebsite")) {
      const normalized = normalizeWebsiteUrl(normalizeValue(payload.companyWebsite));
      payload.companyWebsite = normalized;
      if (normalized) {
        const host = websiteUrlToHostname(normalized);
        const existingOwner = await findCompanyOwnerIdByWebsiteHostname(host);
        if (existingOwner != null && existingOwner !== ownerId) {
          return NextResponse.json(
            { ok: false, message: "That domain is already connected to another company." },
            { status: 400 },
          );
        }
      }
    }
  }

  let effectiveKeys = keys;
  if (section === "brand") {
    const isSa = isSuperAdminFromRoleCookies(
      req.cookies.get("pf_role")?.value,
      req.cookies.get("pf_roles")?.value,
    );
    if (!isSa) {
      effectiveKeys = keys.filter((k) => !SUPERADMIN_ONLY_BRAND_KEYS.has(k));
    }
  }
  if (section === "system") {
    const isSa = isSuperAdminFromRoleCookies(
      req.cookies.get("pf_role")?.value,
      req.cookies.get("pf_roles")?.value,
    );
    if (!isSa) {
      effectiveKeys = keys.filter((k) => !SUPERADMIN_ONLY_SYSTEM_KEYS.has(k));
    }
  }

  if (section === "company-website-theme") {
    effectiveKeys = [
      ...keys.filter((k) => k !== "companyWebsiteAccessPassword"),
      "companyWebsiteAccessPasswordHash",
    ];
  }

  const items = effectiveKeys
    .filter((key) => Object.prototype.hasOwnProperty.call(payload, key))
    .map((key) => ({
      key,
      value: normalizeValue(payload[key]),
      isPublic:
        key === "companyNextjsThemeCustomizer" ||
        key === "companyWebsiteAccessPasswordHash"
          ? false
          : true,
    }));

  if (items.length === 0) {
    return NextResponse.json({ ok: false, message: "No settings provided." }, { status: 400 });
  }

  await upsertOwnerSettings(ownerId, items);

  if (section === "company") {
    const legacyItems = companyProfileLegacySettingItems(payload as Record<string, string>);
    if (legacyItems.length > 0) {
      await upsertOwnerSettings(ownerId, legacyItems);
    }

    const companyName = normalizeValue(payload.company_name);
    const companyEmail = normalizeValue(payload.company_email);
    const companyPhone = normalizeValue(payload.company_telephone);
    const userUpdates: { name?: string; email?: string; mobileNo?: string | null } = {};
    if (companyName) userUpdates.name = companyName;
    if (companyEmail) userUpdates.email = companyEmail.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(payload, "company_telephone")) {
      userUpdates.mobileNo = companyPhone || null;
    }
    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.updateMany({
        where: { id: ownerId, type: { in: ["company", "company_admin"] } },
        data: userUpdates,
      });
    }
  }

  if (section === "brand") {
    const owner = await getUserByEmail(email);
    if (owner?.type === "company") {
      const settings = await getSettingsForOwner(ownerId);
      await syncCompanyUserAvatarFromSettings(ownerId, settings);
    }
  }

  if (section === "seo") {
    revalidateTag(SITE_SEO_CACHE_TAG, { expire: 0 });
  }

  return NextResponse.json({ ok: true });
}

