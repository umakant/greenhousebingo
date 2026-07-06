import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { bytesToMbString, dirSizeBytes } from "@/lib/next-cache-admin";
import type { CompanyPlanDetailsPayload } from "@/components/companies/company-billing-plan-panel";
import type { UserSubscriptionInfo } from "@/components/plans/subscription-setting";
import type { SettingsBlob } from "@/lib/settings-service";
import {
  applyCompanyProfileFieldsToSettings,
  loadCompanyProfileUser,
} from "@/lib/company-profile-settings";
import {
  companyHasOwnBrandLogos,
  companyHasOwnMailSettings,
  getEffectiveBrandSettings,
  getEffectiveMailSettings,
  getMergedSettingsForUserEmail,
  getSettingsForOwner,
  getUserByEmail,
  settingsOwnerIdForUser,
} from "@/lib/settings-service";
import {
  DEFAULT_ENABLED_LANGUAGE_CODE,
  isDefaultEnabledLanguage,
  LANGUAGE_CATALOG_SETTING_KEY,
  resolveLanguageEnabled,
  type LanguageRow,
} from "@/lib/language-catalog";
import { hasPrismaDelegate } from "@/lib/company-billing-prisma";

/** Calendar date (YYYY-MM-DD) for `createdAt` + `trialDays` (local calendar), last day of trial window. */
function inferTrialExpireYmdFromSignup(createdAt: Date, trialDays: number): string | null {
  if (!Number.isFinite(trialDays) || trialDays <= 0) return null;
  const end = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate() + trialDays);
  const y = end.getFullYear();
  const mo = String(end.getMonth() + 1).padStart(2, "0");
  const da = String(end.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function ymdFromDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Derive billing period start from expiry (trial window or monthly), never before signup. */
function inferPlanStartYmd(
  expireYmd: string | null,
  createdAt: Date,
  trialWindowDays: number,
): string {
  const signupYmd = ymdFromDate(createdAt);
  if (!expireYmd) return signupYmd;
  const end = new Date(
    Number(expireYmd.slice(0, 4)),
    Number(expireYmd.slice(5, 7)) - 1,
    Number(expireYmd.slice(8, 10)),
  );
  const start = new Date(end);
  if (trialWindowDays > 0) start.setDate(start.getDate() - trialWindowDays);
  else start.setMonth(start.getMonth() - 1);
  const inferred = ymdFromDate(start);
  return inferred < signupYmd ? signupYmd : inferred;
}

export type CompanyDefaultPaymentMethod = {
  displayBrand: string;
  last4: string;
  expiresText: string | null;
};

export type TenantBillingPanelPageData = {
  companyId: string;
  companyName: string | null;
  defaultCurrency: string;
  subscriptionInfo: UserSubscriptionInfo | null;
  planDetails: CompanyPlanDetailsPayload;
  /** First saved company card (or PayPal), when billing tables exist. */
  defaultPaymentMethod?: CompanyDefaultPaymentMethod | null;
};

export async function getTenantBillingPanelData(email: string): Promise<TenantBillingPanelPageData | null> {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail) return null;
  const actor = await getUserByEmail(normalizedEmail);
  if (!actor) return null;
  const tenantId = settingsOwnerIdForUser(actor);
  const company = await prisma.user.findFirst({
    where: { id: tenantId, type: { in: ["company", "company_admin"] } },
    select: {
      id: true,
      name: true,
      activePlan: true,
      planExpireDate: true,
      createdAt: true,
    },
  });
  if (!company) return null;

  let subscriptionInfo: UserSubscriptionInfo | null = null;
  let planDetails: CompanyPlanDetailsPayload = null;

  if (company.activePlan != null) {
    const planRow = await prisma.plan.findFirst({
      where: { id: BigInt(company.activePlan) },
      select: {
        id: true,
        name: true,
        description: true,
        freePlan: true,
        packagePriceMonthly: true,
        packagePriceYearly: true,
        trial: true,
        trialDays: true,
        numberOfUsers: true,
      },
    });
    if (planRow) {
      const ped = company.planExpireDate;
      const expireStr =
        ped instanceof Date
          ? ped.toISOString().slice(0, 10)
          : ped
            ? String(ped).slice(0, 10)
            : null;
      const rawTrialDays = planRow.trialDays ?? 0;
      /**
       * When `plan_expire_date` is missing, infer trial length from signup:
       * explicit trial_days, or `trial=true` with 0 days (legacy), or **free plans** with no flags (profile “Free trial” UI).
       */
      const inferredWindowDays =
        rawTrialDays > 0 ? rawTrialDays : planRow.trial ? 30 : planRow.freePlan ? 30 : 0;
      const inferredExpireStr =
        !expireStr && inferredWindowDays > 0
          ? inferTrialExpireYmdFromSignup(company.createdAt, inferredWindowDays)
          : null;
      const effectiveExpireStr = expireStr ?? inferredExpireStr;
      const expireAt = effectiveExpireStr ? new Date(`${effectiveExpireStr}T23:59:59`) : null;
      const trialStillActive =
        expireAt != null &&
        !Number.isNaN(expireAt.getTime()) &&
        expireAt.getTime() >= Date.now() &&
        /** DB end date only counts as trial when the plan has trial days; inferred path uses `inferredWindowDays`. */
        (expireStr != null ? rawTrialDays > 0 : inferredWindowDays > 0);
      const planStartDate = inferPlanStartYmd(effectiveExpireStr, company.createdAt, inferredWindowDays);
      subscriptionInfo = {
        activePlanId: String(planRow.id),
        activePlanName: planRow.name,
        planStartDate,
        /** DB date, or inferred trial end while trial is still active (so profile billing + timer stay in sync). */
        planExpireDate: expireStr ?? (trialStillActive ? effectiveExpireStr : null),
        trialExpireDate: trialStillActive ? effectiveExpireStr : null,
        isTrialDone: !trialStillActive,
      };
      planDetails = {
        id: String(planRow.id),
        name: planRow.name,
        description: planRow.description,
        freePlan: planRow.freePlan,
        packagePriceMonthly:
          planRow.packagePriceMonthly?.toString?.() ?? String(planRow.packagePriceMonthly ?? "0"),
        packagePriceYearly:
          planRow.packagePriceYearly?.toString?.() ?? String(planRow.packagePriceYearly ?? "0"),
        trialDays: rawTrialDays,
        numberOfUsers: planRow.numberOfUsers ?? 0,
      };
    }
  }

  let defaultPaymentMethod: CompanyDefaultPaymentMethod | null = null;
  if (hasPrismaDelegate(prisma, "companyBillingPaymentMethod", "findMany")) {
    try {
      const pmRows = await prisma.companyBillingPaymentMethod.findMany({
        where: { companyId: company.id },
        orderBy: [{ isDefault: "desc" }, { id: "desc" }],
        take: 1,
        select: {
          kind: true,
          cardBrand: true,
          cardLast4: true,
          expMonth: true,
          expYear: true,
          paypalEmail: true,
        },
      });
      const pm = pmRows[0];
      if (pm?.kind === "card" && pm.cardLast4) {
        const brand = (pm.cardBrand ?? "Card").trim();
        const displayBrand = brand ? brand[0]!.toUpperCase() + brand.slice(1).toLowerCase() : "Card";
        const exp =
          pm.expMonth != null && pm.expYear != null
            ? `${pm.expMonth}/${String(pm.expYear).slice(-2)}`
            : null;
        defaultPaymentMethod = { displayBrand, last4: pm.cardLast4, expiresText: exp };
      } else if (pm?.kind === "paypal" && pm.paypalEmail) {
        defaultPaymentMethod = { displayBrand: "PayPal", last4: "", expiresText: null };
      }
    } catch {
      defaultPaymentMethod = null;
    }
  }

  return {
    companyId: company.id.toString(),
    companyName: company.name ?? null,
    defaultCurrency: "USD",
    subscriptionInfo,
    planDetails,
    defaultPaymentMethod,
  };
}

export type { LanguageRow } from "@/lib/language-catalog";
export {
  DEFAULT_ENABLED_LANGUAGE_CODE,
  isDefaultEnabledLanguage,
  LANGUAGE_CATALOG_SETTING_KEY,
} from "@/lib/language-catalog";

function coerceLanguageRow(o: unknown): LanguageRow | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const code = String(r.code ?? "").trim().toLowerCase();
  const name = String(r.name ?? "").trim();
  const countryCode = String(r.countryCode ?? r.country_code ?? "").trim().toUpperCase();
  if (!/^[a-z0-9-]{2,24}$/.test(code) || !name || !/^[A-Z]{2}$/.test(countryCode)) return null;
  const enabled = resolveLanguageEnabled(r.enabled, code);
  return { code, name, countryCode, enabled };
}

function coerceLanguageRows(arr: unknown): LanguageRow[] {
  if (!Array.isArray(arr)) return [];
  const out: LanguageRow[] = [];
  for (const el of arr) {
    const row = coerceLanguageRow(el);
    if (row) out.push(row);
  }
  return out;
}

/**
 * Strict validation for API / persisted catalog (unique codes, required fields).
 */
export function normalizeLanguageCatalogInput(
  input: unknown,
): { ok: true; rows: LanguageRow[] } | { ok: false; message: string } {
  if (!Array.isArray(input)) return { ok: false, message: "languages must be an array" };
  if (input.length === 0) return { ok: false, message: "Add at least one language." };
  const seen = new Set<string>();
  const rows: LanguageRow[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const code = String(o.code ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    const name = String(o.name ?? "").trim();
    const countryCode = String(o.countryCode ?? o.country_code ?? "")
      .trim()
      .toUpperCase();
    if (!/^[a-z0-9-]{2,24}$/.test(code)) {
      return { ok: false, message: `Invalid language code: ${code || "(empty)"}` };
    }
    if (!name || name.length > 120) {
      return { ok: false, message: `Invalid name for "${code}".` };
    }
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return { ok: false, message: `Country code must be two letters (e.g. US) for "${code}".` };
    }
    if (seen.has(code)) return { ok: false, message: `Duplicate language code: ${code}` };
    seen.add(code);
    const enabled = resolveLanguageEnabled(o.enabled, code);
    rows.push({ code, name, countryCode, enabled });
  }
  if (rows.length === 0) return { ok: false, message: "No valid language rows." };
  if (!rows.some((r) => r.code === DEFAULT_ENABLED_LANGUAGE_CODE)) {
    return { ok: false, message: "English (en) must be included in the language list." };
  }
  for (const row of rows) {
    if (row.code === DEFAULT_ENABLED_LANGUAGE_CODE) row.enabled = true;
  }
  return { ok: true, rows };
}

export function parseStoredLanguageCatalog(raw: string | undefined | null): LanguageRow[] | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  try {
    const parsed = JSON.parse(t) as unknown;
    const n = normalizeLanguageCatalogInput(parsed);
    return n.ok ? n.rows : null;
  } catch {
    return null;
  }
}

export async function resolveAvailableLanguages(settings: SettingsBlob): Promise<LanguageRow[]> {
  const fromDb = parseStoredLanguageCatalog(settings.language_catalog);
  if (fromDb && fromDb.length > 0) return fromDb;

  const repoRoot = path.resolve(process.cwd(), "..");
  const languagesPath = path.join(repoRoot, "resources", "lang", "language.json");
  const fromFileRaw = await safeReadJson<unknown>(languagesPath, []);
  const fromFile = coerceLanguageRows(fromFileRaw);
  if (fromFile.length > 0) return fromFile;

  const builtinPath = path.join(process.cwd(), "src", "data", "languages.json");
  const builtinRaw = await safeReadJson<unknown>(builtinPath, []);
  const builtin = coerceLanguageRows(builtinRaw);
  return builtin;
}

export type CurrencyForClient = {
  id: string;
  name: string;
  code: string;
  symbol: string;
  description?: string | null;
  is_default: boolean;
};

/**
 * When the `currencies` table has no rows (fresh DB / not seeded), Currency Settings would show an empty dropdown.
 * These options match common Laravel/WorkDo defaults so the UI and `defaultCurrency` setting remain usable.
 */
export const FALLBACK_CURRENCIES_FOR_SETTINGS: CurrencyForClient[] = [
  { id: "fallback-usd", name: "US Dollar", code: "USD", symbol: "$", is_default: true },
  { id: "fallback-eur", name: "Euro", code: "EUR", symbol: "€", is_default: false },
  { id: "fallback-gbp", name: "British Pound", code: "GBP", symbol: "£", is_default: false },
  { id: "fallback-aud", name: "Australian Dollar", code: "AUD", symbol: "A$", is_default: false },
  { id: "fallback-cad", name: "Canadian Dollar", code: "CAD", symbol: "C$", is_default: false },
  { id: "fallback-myr", name: "Malaysian Ringgit", code: "MYR", symbol: "RM", is_default: false },
  { id: "fallback-sgd", name: "Singapore Dollar", code: "SGD", symbol: "S$", is_default: false },
  { id: "fallback-inr", name: "Indian Rupee", code: "INR", symbol: "₹", is_default: false },
];

export type NotificationForClient = {
  id: string;
  module: string;
  type: string;
  action: string;
  status: string;
  permissions: string;
};

export type EmailProvidersMap = Record<
  string,
  {
    name: string;
    driver: string;
    host: string;
    port: string;
    encryption: string;
  }
>;

export const EMAIL_PROVIDERS: EmailProvidersMap = {
  smtp: { name: "SMTP", driver: "smtp", host: "smtp.example.com", port: "587", encryption: "tls" },
  gmail: { name: "Gmail", driver: "smtp", host: "smtp.gmail.com", port: "587", encryption: "tls" },
  outlook: { name: "Outlook/Hotmail", driver: "smtp", host: "smtp-mail.outlook.com", port: "587", encryption: "tls" },
  yahoo: { name: "Yahoo Mail", driver: "smtp", host: "smtp.mail.yahoo.com", port: "587", encryption: "tls" },
  mailgun: { name: "Mailgun", driver: "mailgun", host: "smtp.mailgun.org", port: "587", encryption: "tls" },
  ses: { name: "Amazon SES", driver: "ses", host: "email-smtp.us-east-1.amazonaws.com", port: "587", encryption: "tls" },
  sendgrid: { name: "SendGrid", driver: "smtp", host: "smtp.sendgrid.net", port: "587", encryption: "tls" },
  postmark: { name: "Postmark", driver: "smtp", host: "smtp.postmarkapp.com", port: "587", encryption: "tls" },
  sparkpost: { name: "SparkPost", driver: "smtp", host: "smtp.sparkpostmail.com", port: "587", encryption: "tls" },
  mandrill: { name: "Mandrill", driver: "smtp", host: "smtp.mandrillapp.com", port: "587", encryption: "tls" },
  zoho: { name: "Zoho Mail", driver: "smtp", host: "smtp.zoho.com", port: "587", encryption: "tls" },
  mailjet: { name: "Mailjet", driver: "smtp", host: "in-v3.mailjet.com", port: "587", encryption: "tls" },
  elastic_email: { name: "Elastic Email", driver: "smtp", host: "smtp.elasticemail.com", port: "2525", encryption: "tls" },
  smtp2go: { name: "SMTP2GO", driver: "smtp", host: "mail.smtp2go.com", port: "587", encryption: "tls" },
  socketlabs: { name: "SocketLabs", driver: "smtp", host: "smtp.socketlabs.com", port: "587", encryption: "tls" },
  pepipost: { name: "Pepipost", driver: "smtp", host: "smtp.pepipost.com", port: "587", encryption: "tls" },
  sendinblue: { name: "Sendinblue (Brevo)", driver: "smtp", host: "smtp-relay.sendinblue.com", port: "587", encryption: "tls" },
  mailchimp: { name: "Mailchimp Transactional", driver: "smtp", host: "smtp.mandrillapp.com", port: "587", encryption: "tls" },
  sendmail: { name: "Sendmail", driver: "sendmail", host: "", port: "", encryption: "none" },
  log: { name: "Log (Testing)", driver: "log", host: "", port: "", encryption: "none" },
  array: { name: "Array (Testing)", driver: "array", host: "", port: "", encryption: "none" },
  failover: { name: "Failover", driver: "failover", host: "", port: "", encryption: "none" },
  roundrobin: { name: "Round Robin", driver: "roundrobin", host: "", port: "", encryption: "none" },
  resend: { name: "Resend", driver: "resend", host: "smtp.resend.com", port: "587", encryption: "tls" },
  postmarkapp: { name: "PostmarkApp API", driver: "postmark", host: "", port: "", encryption: "none" },
  mailersend: { name: "MailerSend", driver: "smtp", host: "smtp.mailersend.net", port: "587", encryption: "tls" },
  smtp_com: { name: "SMTP.com", driver: "smtp", host: "smtp.smtp.com", port: "587", encryption: "tls" },
};

async function safeReadJson<T>(absPath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(absPath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function pgTableExists(table: string): Promise<boolean> {
  try {
    const tableName = table.includes(".") ? table.split(".").pop() || table : table;
    const rows = (await prisma.$queryRaw`
      SELECT EXISTS(
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
      ) AS "exists"
    `) as Array<{ exists: boolean }>;
    return !!rows?.[0]?.exists;
  } catch {
    return false;
  }
}

export async function getSettingsPageDataForUserEmail(email: string, appUrl: string, opts?: { isSuperAdmin?: boolean }) {
  const settings = await getMergedSettingsForUserEmail(email, appUrl);
  const defaultCurrency = (settings.defaultCurrency ?? "USD").trim() || "USD";

  const user = await getUserByEmail(email);
  if (user && !opts?.isSuperAdmin) {
    const ownerId = settingsOwnerIdForUser(user);
    const companyOnly = await getSettingsForOwner(ownerId);
    const companyUser = await loadCompanyProfileUser(ownerId);
    applyCompanyProfileFieldsToSettings(settings, companyOnly, companyUser);
  }

  const currenciesRaw = (await pgTableExists("currencies"))
    ? await prisma.currency
        .findMany({
          select: { id: true, name: true, code: true, symbol: true, description: true, isDefault: true },
          orderBy: { code: "asc" },
        })
        .catch(() => [])
    : [];
  const currencies: CurrencyForClient[] =
    currenciesRaw.length > 0
      ? currenciesRaw.map((c) => ({
          id: String(c.id),
          name: c.name,
          code: c.code,
          symbol: c.symbol ?? "",
          description: c.description,
          is_default: c.isDefault,
        }))
      : FALLBACK_CURRENCIES_FOR_SETTINGS;

  const notificationsRaw = (await pgTableExists("notifications"))
    ? await prisma.notification
        .findMany({
          where: opts?.isSuperAdmin ? { type: "mail", module: "general" } : { type: "mail" },
          select: { id: true, module: true, type: true, action: true, status: true, permissions: true },
          orderBy: [{ module: "asc" }, { id: "asc" }],
        })
        .catch(() => [])
    : [];

  const notifications: Record<string, NotificationForClient[]> = {};
  for (const n of notificationsRaw) {
    const module = (n.module ?? "general").toLowerCase() || "general";
    const item: NotificationForClient = {
      id: String(n.id),
      module,
      type: n.type ?? "",
      action: n.action ?? "",
      status: n.status ?? "",
      permissions: n.permissions ?? "",
    };
    (notifications[module] ||= []).push(item);
  }

  const availableLanguages = await resolveAvailableLanguages(settings);

  const cacheDir = path.join(process.cwd(), ".next", "cache");
  const cacheSize = bytesToMbString(await dirSizeBytes(cacheDir));

  let userSubscriptionInfo: UserSubscriptionInfo | null = null;
  let companyBilling: TenantBillingPanelPageData | null = null;

  if (!opts?.isSuperAdmin) {
    const tenant = await getTenantBillingPanelData(email);
    if (tenant) {
      userSubscriptionInfo = tenant.subscriptionInfo;
      companyBilling = { ...tenant, defaultCurrency };
    }
  }

  let mailUsesPlatformDefaults = false;
  let brandUsesPlatformDefaults = false;
  let currentUserPhone = "";
  if (email.trim()) {
    const profile = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() },
      select: { mobileNo: true },
    });
    currentUserPhone = profile?.mobileNo?.trim() ?? "";
  }
  if (user && (user.type ?? "").toLowerCase() !== "superadmin") {
    const ownerId = settingsOwnerIdForUser(user);
    const companyOnly = await getSettingsForOwner(ownerId);
    const effectiveMail = await getEffectiveMailSettings(ownerId);
    mailUsesPlatformDefaults =
      !companyHasOwnMailSettings(companyOnly) && Boolean((effectiveMail.email_host ?? "").trim());
    const effectiveBrand = await getEffectiveBrandSettings(ownerId);
    const platformHasLogos =
      Boolean((effectiveBrand.logo_light ?? "").trim() || (effectiveBrand.logo_dark ?? "").trim()) &&
      Boolean((effectiveBrand.favicon ?? "").trim());
    brandUsesPlatformDefaults = !companyHasOwnBrandLogos(companyOnly) && platformHasLogos;
  }

  return {
    settings,
    currencies,
    notifications,
    emailProviders: EMAIL_PROVIDERS,
    availableLanguages,
    cacheSize,
    userSubscriptionInfo,
    companyBilling,
    mailUsesPlatformDefaults,
    brandUsesPlatformDefaults,
    currentUserPhone,
  };
}

