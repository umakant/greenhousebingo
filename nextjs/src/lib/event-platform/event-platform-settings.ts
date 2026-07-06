import "server-only";

import { getSettingsForOwner, upsertOwnerSettings } from "@/lib/settings-service";

/** Settings keys stored in tenant `settings` table (owner = organizationId). */
export const EP_SETTINGS_KEYS = {
  currencyCode: "ep_currency_code",
  currencySymbol: "ep_currency_symbol",
  currencyExchangeRate: "ep_currency_exchange_rate",
  currencyDecimalPlaces: "ep_currency_decimal_places",
  currencyThousandSep: "ep_currency_thousand_sep",
  currencyDecimalSep: "ep_currency_decimal_sep",
  currencyPosition: "ep_currency_position",
  maintenanceEnabled: "ep_maintenance_enabled",
  maintenanceTitle: "ep_maintenance_title",
  maintenanceMessage: "ep_maintenance_message",
  maintenanceBackground: "ep_maintenance_background",
  maintenanceReturnAt: "ep_maintenance_return_at",
  maintenanceBypassPath: "ep_maintenance_bypass_path",
  maintenanceAllowedRoutes: "ep_maintenance_allowed_routes",
  integrationOpenaiEnabled: "ep_integration_openai_enabled",
  integrationOpenaiKey: "ep_integration_openai_key",
  integrationGeminiEnabled: "ep_integration_gemini_enabled",
  integrationGeminiKey: "ep_integration_gemini_key",
  integrationStripeEnabled: "ep_integration_stripe_enabled",
  integrationStripePublicKey: "ep_integration_stripe_public_key",
  integrationStripeSecretKey: "ep_integration_stripe_secret_key",
  integrationTwilioEnabled: "ep_integration_twilio_enabled",
  integrationTwilioSid: "ep_integration_twilio_sid",
  integrationTwilioToken: "ep_integration_twilio_token",
  integrationGoogleMapsKey: "ep_integration_google_maps_key",
  paymentGatewaysJson: "ep_payment_gateways_json",
  offlinePaymentMethodsJson: "ep_offline_payment_methods_json",
  appearancePrimaryColor: "ep_appearance_primary_color",
  appearanceSecondaryColor: "ep_appearance_secondary_color",
  appearanceLogoUrl: "ep_appearance_logo_url",
  appearanceFaviconUrl: "ep_appearance_favicon_url",
  appearanceFontFamily: "ep_appearance_font_family",
  appearanceHeaderHtml: "ep_appearance_header_html",
  appearanceFooterHtml: "ep_appearance_footer_html",
  emailUseGlobalSmtp: "ep_email_use_global_smtp",
  emailFromName: "ep_email_from_name",
  emailFromAddress: "ep_email_from_address",
  emailReplyTo: "ep_email_reply_to",
  emailSmtpHost: "ep_email_smtp_host",
  emailSmtpPort: "ep_email_smtp_port",
  emailSmtpEncryption: "ep_email_smtp_encryption",
  emailSmtpUser: "ep_email_smtp_user",
  emailSmtpPassword: "ep_email_smtp_password",
  emailTemplatesJson: "ep_email_templates_json",
  languagesJson: "ep_languages_json",
  translationsJson: "ep_translations_json",
} as const;

export type EventPlatformCurrencySettings = {
  currencyCode: string;
  currencySymbol: string;
  exchangeRate: number;
  decimalPlaces: number;
  thousandSeparator: string;
  decimalSeparator: string;
  currencyPosition: "before" | "after";
};

export type EventPlatformMaintenanceSettings = {
  enabled: boolean;
  title: string;
  message: string;
  backgroundImage: string;
  estimatedReturnAt: string;
  bypassPath: string;
  allowedAdminRoutes: string;
};

export type EventPlatformIntegrationsSettings = {
  openaiEnabled: boolean;
  openaiKey: string;
  geminiEnabled: boolean;
  geminiKey: string;
  stripeEnabled: boolean;
  stripePublicKey: string;
  stripeSecretKey: string;
  twilioEnabled: boolean;
  twilioSid: string;
  twilioToken: string;
  googleMapsKey: string;
};

export type PaymentGatewayConfig = {
  id: string;
  label: string;
  enabled: boolean;
  mode: "test" | "live";
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  instructions: string;
};

export type OfflinePaymentMethod = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  requireProof: boolean;
  enabled: boolean;
  sortOrder: number;
};

export type EventPlatformAppearanceSettings = {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  fontFamily: string;
  headerHtml: string;
  footerHtml: string;
};

export type EventPlatformEmailSettings = {
  useGlobalSmtp: boolean;
  fromName: string;
  fromAddress: string;
  replyTo: string;
  smtpHost: string;
  smtpPort: string;
  smtpEncryption: string;
  smtpUser: string;
  smtpPassword: string;
};

export type EventPlatformEmailTemplate = {
  slug: string;
  name: string;
  subject: string;
  bodyHtml: string;
};

export type EventPlatformLanguage = {
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
};

const DEFAULT_EMAIL_TEMPLATES: EventPlatformEmailTemplate[] = [
  {
    slug: "registration_confirmed",
    name: "Registration confirmed",
    subject: "Your event registration is confirmed",
    bodyHtml: "<p>Hi {{attendee_name}},</p><p>You are registered for <strong>{{event_title}}</strong>.</p>",
  },
  {
    slug: "ticket_receipt",
    name: "Ticket receipt",
    subject: "Receipt for {{event_title}}",
    bodyHtml: "<p>Thank you for your purchase of {{ticket_name}}.</p>",
  },
  {
    slug: "event_reminder",
    name: "Event reminder",
    subject: "Reminder: {{event_title}} starts soon",
    bodyHtml: "<p>Your event begins on {{event_starts_at}}.</p>",
  },
];

const DEFAULT_LANGUAGES: EventPlatformLanguage[] = [
  { code: "en", name: "English", isDefault: true, isActive: true },
];

const DEFAULT_GATEWAYS: PaymentGatewayConfig[] = [
  { id: "stripe", label: "Stripe", enabled: false, mode: "test", publicKey: "", secretKey: "", webhookSecret: "", instructions: "" },
  { id: "paypal", label: "PayPal", enabled: false, mode: "test", publicKey: "", secretKey: "", webhookSecret: "", instructions: "" },
  { id: "razorpay", label: "Razorpay", enabled: false, mode: "test", publicKey: "", secretKey: "", webhookSecret: "", instructions: "" },
];

const DEFAULT_OFFLINE: OfflinePaymentMethod[] = [
  { id: "invoice", name: "Pay by invoice", description: "", instructions: "", requireProof: false, enabled: true, sortOrder: 1 },
  { id: "bank_transfer", name: "Bank transfer", description: "", instructions: "", requireProof: true, enabled: true, sortOrder: 2 },
];

function parseJsonArray<T>(raw: string | undefined, fallback: T[]): T[] {
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export async function readEventPlatformCurrencySettings(organizationId: bigint): Promise<EventPlatformCurrencySettings> {
  const s = await getSettingsForOwner(organizationId);
  const rate = Number(s[EP_SETTINGS_KEYS.currencyExchangeRate] ?? "1");
  const decimals = Number(s[EP_SETTINGS_KEYS.currencyDecimalPlaces] ?? "2");
  return {
    currencyCode: s[EP_SETTINGS_KEYS.currencyCode]?.trim() || "USD",
    currencySymbol: s[EP_SETTINGS_KEYS.currencySymbol]?.trim() || "$",
    exchangeRate: Number.isFinite(rate) && rate > 0 ? rate : 1,
    decimalPlaces: Number.isFinite(decimals) && decimals >= 0 && decimals <= 4 ? decimals : 2,
    thousandSeparator: s[EP_SETTINGS_KEYS.currencyThousandSep]?.trim() || ",",
    decimalSeparator: s[EP_SETTINGS_KEYS.currencyDecimalSep]?.trim() || ".",
    currencyPosition: s[EP_SETTINGS_KEYS.currencyPosition]?.trim() === "after" ? "after" : "before",
  };
}

export async function writeEventPlatformCurrencySettings(
  organizationId: bigint,
  input: EventPlatformCurrencySettings,
): Promise<void> {
  await upsertOwnerSettings(organizationId, [
    { key: EP_SETTINGS_KEYS.currencyCode, value: input.currencyCode.slice(0, 3).toUpperCase() },
    { key: EP_SETTINGS_KEYS.currencySymbol, value: input.currencySymbol.slice(0, 8) },
    { key: EP_SETTINGS_KEYS.currencyExchangeRate, value: String(input.exchangeRate) },
    { key: EP_SETTINGS_KEYS.currencyDecimalPlaces, value: String(input.decimalPlaces) },
    { key: EP_SETTINGS_KEYS.currencyThousandSep, value: input.thousandSeparator.slice(0, 4) },
    { key: EP_SETTINGS_KEYS.currencyDecimalSep, value: input.decimalSeparator.slice(0, 4) },
    { key: EP_SETTINGS_KEYS.currencyPosition, value: input.currencyPosition },
  ]);
}

export async function readEventPlatformMaintenanceSettings(
  organizationId: bigint,
): Promise<EventPlatformMaintenanceSettings> {
  const s = await getSettingsForOwner(organizationId);
  return {
    enabled: s[EP_SETTINGS_KEYS.maintenanceEnabled] === "1",
    title: s[EP_SETTINGS_KEYS.maintenanceTitle]?.trim() || "We'll be back soon",
    message: s[EP_SETTINGS_KEYS.maintenanceMessage]?.trim() || "The event platform is undergoing scheduled maintenance.",
    backgroundImage: s[EP_SETTINGS_KEYS.maintenanceBackground]?.trim() || "",
    estimatedReturnAt: s[EP_SETTINGS_KEYS.maintenanceReturnAt]?.trim() || "",
    bypassPath: s[EP_SETTINGS_KEYS.maintenanceBypassPath]?.trim() || "",
    allowedAdminRoutes: s[EP_SETTINGS_KEYS.maintenanceAllowedRoutes]?.trim() || "/admin,/lms/admin",
  };
}

export async function writeEventPlatformMaintenanceSettings(
  organizationId: bigint,
  input: EventPlatformMaintenanceSettings,
): Promise<void> {
  await upsertOwnerSettings(organizationId, [
    { key: EP_SETTINGS_KEYS.maintenanceEnabled, value: input.enabled ? "1" : "0" },
    { key: EP_SETTINGS_KEYS.maintenanceTitle, value: input.title.slice(0, 255) },
    { key: EP_SETTINGS_KEYS.maintenanceMessage, value: input.message.slice(0, 4000) },
    { key: EP_SETTINGS_KEYS.maintenanceBackground, value: input.backgroundImage.slice(0, 2048) },
    { key: EP_SETTINGS_KEYS.maintenanceReturnAt, value: input.estimatedReturnAt.slice(0, 64) },
    { key: EP_SETTINGS_KEYS.maintenanceBypassPath, value: input.bypassPath.slice(0, 128) },
    { key: EP_SETTINGS_KEYS.maintenanceAllowedRoutes, value: input.allowedAdminRoutes.slice(0, 512) },
  ]);
}

export async function readEventPlatformIntegrationsSettings(
  organizationId: bigint,
): Promise<EventPlatformIntegrationsSettings> {
  const s = await getSettingsForOwner(organizationId);
  return {
    openaiEnabled: s[EP_SETTINGS_KEYS.integrationOpenaiEnabled] === "1",
    openaiKey: s[EP_SETTINGS_KEYS.integrationOpenaiKey]?.trim() || "",
    geminiEnabled: s[EP_SETTINGS_KEYS.integrationGeminiEnabled] === "1",
    geminiKey: s[EP_SETTINGS_KEYS.integrationGeminiKey]?.trim() || "",
    stripeEnabled: s[EP_SETTINGS_KEYS.integrationStripeEnabled] === "1",
    stripePublicKey: s[EP_SETTINGS_KEYS.integrationStripePublicKey]?.trim() || "",
    stripeSecretKey: s[EP_SETTINGS_KEYS.integrationStripeSecretKey]?.trim() || "",
    twilioEnabled: s[EP_SETTINGS_KEYS.integrationTwilioEnabled] === "1",
    twilioSid: s[EP_SETTINGS_KEYS.integrationTwilioSid]?.trim() || "",
    twilioToken: s[EP_SETTINGS_KEYS.integrationTwilioToken]?.trim() || "",
    googleMapsKey: s[EP_SETTINGS_KEYS.integrationGoogleMapsKey]?.trim() || "",
  };
}

export async function writeEventPlatformIntegrationsSettings(
  organizationId: bigint,
  input: EventPlatformIntegrationsSettings,
): Promise<void> {
  await upsertOwnerSettings(organizationId, [
    { key: EP_SETTINGS_KEYS.integrationOpenaiEnabled, value: input.openaiEnabled ? "1" : "0" },
    { key: EP_SETTINGS_KEYS.integrationOpenaiKey, value: input.openaiKey.slice(0, 512) },
    { key: EP_SETTINGS_KEYS.integrationGeminiEnabled, value: input.geminiEnabled ? "1" : "0" },
    { key: EP_SETTINGS_KEYS.integrationGeminiKey, value: input.geminiKey.slice(0, 512) },
    { key: EP_SETTINGS_KEYS.integrationStripeEnabled, value: input.stripeEnabled ? "1" : "0" },
    { key: EP_SETTINGS_KEYS.integrationStripePublicKey, value: input.stripePublicKey.slice(0, 512) },
    { key: EP_SETTINGS_KEYS.integrationStripeSecretKey, value: input.stripeSecretKey.slice(0, 512) },
    { key: EP_SETTINGS_KEYS.integrationTwilioEnabled, value: input.twilioEnabled ? "1" : "0" },
    { key: EP_SETTINGS_KEYS.integrationTwilioSid, value: input.twilioSid.slice(0, 128) },
    { key: EP_SETTINGS_KEYS.integrationTwilioToken, value: input.twilioToken.slice(0, 512) },
    { key: EP_SETTINGS_KEYS.integrationGoogleMapsKey, value: input.googleMapsKey.slice(0, 512) },
  ]);
}

export async function readPaymentGateways(organizationId: bigint): Promise<PaymentGatewayConfig[]> {
  const s = await getSettingsForOwner(organizationId);
  const stored = parseJsonArray<PaymentGatewayConfig>(s[EP_SETTINGS_KEYS.paymentGatewaysJson], DEFAULT_GATEWAYS);
  const byId = new Map(stored.map((g) => [g.id, g]));
  return DEFAULT_GATEWAYS.map((d) => ({ ...d, ...byId.get(d.id) }));
}

export async function writePaymentGateways(organizationId: bigint, gateways: PaymentGatewayConfig[]): Promise<void> {
  await upsertOwnerSettings(organizationId, [
    { key: EP_SETTINGS_KEYS.paymentGatewaysJson, value: JSON.stringify(gateways) },
  ]);
}

export async function readOfflinePaymentMethods(organizationId: bigint): Promise<OfflinePaymentMethod[]> {
  const s = await getSettingsForOwner(organizationId);
  return parseJsonArray<OfflinePaymentMethod>(s[EP_SETTINGS_KEYS.offlinePaymentMethodsJson], DEFAULT_OFFLINE);
}

export async function writeOfflinePaymentMethods(
  organizationId: bigint,
  methods: OfflinePaymentMethod[],
): Promise<void> {
  await upsertOwnerSettings(organizationId, [
    { key: EP_SETTINGS_KEYS.offlinePaymentMethodsJson, value: JSON.stringify(methods) },
  ]);
}

export async function readEventPlatformAppearanceSettings(
  organizationId: bigint,
): Promise<EventPlatformAppearanceSettings> {
  const s = await getSettingsForOwner(organizationId);
  return {
    primaryColor: s[EP_SETTINGS_KEYS.appearancePrimaryColor]?.trim() || "#dc2626",
    secondaryColor: s[EP_SETTINGS_KEYS.appearanceSecondaryColor]?.trim() || "#1e293b",
    logoUrl: s[EP_SETTINGS_KEYS.appearanceLogoUrl]?.trim() || "",
    faviconUrl: s[EP_SETTINGS_KEYS.appearanceFaviconUrl]?.trim() || "",
    fontFamily: s[EP_SETTINGS_KEYS.appearanceFontFamily]?.trim() || "inherit",
    headerHtml: s[EP_SETTINGS_KEYS.appearanceHeaderHtml]?.trim() || "",
    footerHtml: s[EP_SETTINGS_KEYS.appearanceFooterHtml]?.trim() || "",
  };
}

export async function writeEventPlatformAppearanceSettings(
  organizationId: bigint,
  input: EventPlatformAppearanceSettings,
): Promise<void> {
  await upsertOwnerSettings(organizationId, [
    { key: EP_SETTINGS_KEYS.appearancePrimaryColor, value: input.primaryColor.slice(0, 32) },
    { key: EP_SETTINGS_KEYS.appearanceSecondaryColor, value: input.secondaryColor.slice(0, 32) },
    { key: EP_SETTINGS_KEYS.appearanceLogoUrl, value: input.logoUrl.slice(0, 2048) },
    { key: EP_SETTINGS_KEYS.appearanceFaviconUrl, value: input.faviconUrl.slice(0, 2048) },
    { key: EP_SETTINGS_KEYS.appearanceFontFamily, value: input.fontFamily.slice(0, 128) },
    { key: EP_SETTINGS_KEYS.appearanceHeaderHtml, value: input.headerHtml.slice(0, 16000) },
    { key: EP_SETTINGS_KEYS.appearanceFooterHtml, value: input.footerHtml.slice(0, 16000) },
  ]);
}

export async function readEventPlatformEmailSettings(organizationId: bigint): Promise<EventPlatformEmailSettings> {
  const s = await getSettingsForOwner(organizationId);
  return {
    useGlobalSmtp: s[EP_SETTINGS_KEYS.emailUseGlobalSmtp] !== "0",
    fromName: s[EP_SETTINGS_KEYS.emailFromName]?.trim() || "",
    fromAddress: s[EP_SETTINGS_KEYS.emailFromAddress]?.trim() || "",
    replyTo: s[EP_SETTINGS_KEYS.emailReplyTo]?.trim() || "",
    smtpHost: s[EP_SETTINGS_KEYS.emailSmtpHost]?.trim() || "",
    smtpPort: s[EP_SETTINGS_KEYS.emailSmtpPort]?.trim() || "587",
    smtpEncryption: s[EP_SETTINGS_KEYS.emailSmtpEncryption]?.trim() || "tls",
    smtpUser: s[EP_SETTINGS_KEYS.emailSmtpUser]?.trim() || "",
    smtpPassword: s[EP_SETTINGS_KEYS.emailSmtpPassword]?.trim() || "",
  };
}

export async function writeEventPlatformEmailSettings(
  organizationId: bigint,
  input: EventPlatformEmailSettings,
): Promise<void> {
  await upsertOwnerSettings(organizationId, [
    { key: EP_SETTINGS_KEYS.emailUseGlobalSmtp, value: input.useGlobalSmtp ? "1" : "0" },
    { key: EP_SETTINGS_KEYS.emailFromName, value: input.fromName.slice(0, 255) },
    { key: EP_SETTINGS_KEYS.emailFromAddress, value: input.fromAddress.slice(0, 255) },
    { key: EP_SETTINGS_KEYS.emailReplyTo, value: input.replyTo.slice(0, 255) },
    { key: EP_SETTINGS_KEYS.emailSmtpHost, value: input.smtpHost.slice(0, 255) },
    { key: EP_SETTINGS_KEYS.emailSmtpPort, value: input.smtpPort.slice(0, 8) },
    { key: EP_SETTINGS_KEYS.emailSmtpEncryption, value: input.smtpEncryption.slice(0, 16) },
    { key: EP_SETTINGS_KEYS.emailSmtpUser, value: input.smtpUser.slice(0, 255) },
    { key: EP_SETTINGS_KEYS.emailSmtpPassword, value: input.smtpPassword.slice(0, 512) },
  ]);
}

export async function readEventPlatformEmailTemplates(organizationId: bigint): Promise<EventPlatformEmailTemplate[]> {
  const s = await getSettingsForOwner(organizationId);
  const stored = parseJsonArray<EventPlatformEmailTemplate>(s[EP_SETTINGS_KEYS.emailTemplatesJson], []);
  const bySlug = new Map(stored.map((t) => [t.slug, t]));
  return DEFAULT_EMAIL_TEMPLATES.map((d) => ({ ...d, ...bySlug.get(d.slug) }));
}

export async function writeEventPlatformEmailTemplates(
  organizationId: bigint,
  templates: EventPlatformEmailTemplate[],
): Promise<void> {
  await upsertOwnerSettings(organizationId, [
    { key: EP_SETTINGS_KEYS.emailTemplatesJson, value: JSON.stringify(templates) },
  ]);
}

export async function readEventPlatformLanguages(organizationId: bigint): Promise<EventPlatformLanguage[]> {
  const s = await getSettingsForOwner(organizationId);
  return parseJsonArray<EventPlatformLanguage>(s[EP_SETTINGS_KEYS.languagesJson], DEFAULT_LANGUAGES);
}

export async function writeEventPlatformLanguages(
  organizationId: bigint,
  languages: EventPlatformLanguage[],
): Promise<void> {
  await upsertOwnerSettings(organizationId, [
    { key: EP_SETTINGS_KEYS.languagesJson, value: JSON.stringify(languages) },
  ]);
}

export async function readEventPlatformTranslations(organizationId: bigint): Promise<Record<string, Record<string, string>>> {
  const s = await getSettingsForOwner(organizationId);
  const raw = s[EP_SETTINGS_KEYS.translationsJson]?.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, Record<string, string>>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export async function writeEventPlatformTranslations(
  organizationId: bigint,
  translations: Record<string, Record<string, string>>,
): Promise<void> {
  await upsertOwnerSettings(organizationId, [
    { key: EP_SETTINGS_KEYS.translationsJson, value: JSON.stringify(translations) },
  ]);
}

/** Formats amounts using tenant event-platform currency settings. */
export function formatEventPlatformMoney(
  amount: number,
  settings: EventPlatformCurrencySettings,
): string {
  const fixed = amount.toFixed(settings.decimalPlaces);
  const [intPart, fracPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, settings.thousandSeparator);
  const body = fracPart != null ? `${grouped}${settings.decimalSeparator}${fracPart}` : grouped;
  return settings.currencyPosition === "after"
    ? `${body}${settings.currencySymbol}`
    : `${settings.currencySymbol}${body}`;
}
