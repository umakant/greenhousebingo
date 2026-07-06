import "server-only";

import {
  getCompanyThemeCustomizerSchema,
  getDefaultCustomizerValues,
  type CompanyThemeCustomizerSchema,
} from "@/lib/company-themes/customizer-schema";
import { companyWebsiteOwnerId } from "@/lib/company-themes/company-website-access";
import { resolveCompanyThemeSlugForUserId } from "@/lib/company-themes/resolve-company-theme";
import { getCompanyWebsiteSettingsForUser } from "@/lib/company-themes/company-website-settings";
import { getSettingsForOwner } from "@/lib/settings-service";
import { prisma } from "@/lib/prisma";

export type CompanyThemeCustomizerPayload = {
  slug: string;
  schema: CompanyThemeCustomizerSchema;
  values: Record<string, string>;
  canEdit: boolean;
};

function parseCustomizerStore(raw: string | undefined): Record<string, Record<string, string>> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, Record<string, string>>;
  } catch {
    return {};
  }
}

/** Legacy keys before website logos were isolated from dashboard brand settings. */
const WEBSITE_LOGO_KEY_ALIASES: Record<string, string> = {
  "global.logoMain": "website.logoMain",
  "global.logoSticky": "website.logoSticky",
  "global.favicon": "website.favicon",
};

function migrateCustomizerValues(values: Record<string, string>): Record<string, string> {
  const out = { ...values };
  for (const [legacy, next] of Object.entries(WEBSITE_LOGO_KEY_ALIASES)) {
    if (out[legacy]?.trim() && !out[next]?.trim()) {
      out[next] = out[legacy];
    }
    delete out[legacy];
  }
  return out;
}

export async function getCompanyThemeCustomizerForUserId(userId: bigint): Promise<CompanyThemeCustomizerPayload | null> {
  const slug = await resolveCompanyThemeSlugForUserId(userId);
  if (!slug) return null;

  const schema = getCompanyThemeCustomizerSchema(slug);
  if (!schema) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, type: true, createdBy: true },
  });
  if (!user) return null;

  const ownerId = companyWebsiteOwnerId(user);
  if (!ownerId) return null;

  const companyWebsite = await getCompanyWebsiteSettingsForUser(user);
  if (!companyWebsite) return null;

  const store = parseCustomizerStore(companyWebsite.customizerRaw);
  const saved = migrateCustomizerValues(store[slug] ?? {});
  const values = { ...getDefaultCustomizerValues(schema), ...saved };

  return { slug, schema, values, canEdit: true };
}

export async function saveCompanyThemeCustomizerForUserId(
  userId: bigint,
  slug: string,
  values: Record<string, string>,
): Promise<void> {
  const schema = getCompanyThemeCustomizerSchema(slug);
  if (!schema) throw new Error("Customizer is not available for this theme.");

  const activeSlug = await resolveCompanyThemeSlugForUserId(userId);
  if (activeSlug !== slug) {
    throw new Error("Save the theme selection before customizing.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, type: true, createdBy: true },
  });
  if (!user) throw new Error("User not found.");

  const ownerId = companyWebsiteOwnerId(user);
  if (!ownerId) {
    throw new Error("Company website theme is only available for company accounts.");
  }

  const settings = await getSettingsForOwner(ownerId);
  const store = parseCustomizerStore(settings.companyNextjsThemeCustomizer);

  const cleaned: Record<string, string> = {};
  for (const field of schema.fields) {
    const next = values[field.id];
    if (next == null) continue;
    const trimmed = String(next).trim();
    if (trimmed && trimmed !== field.defaultValue.trim()) {
      cleaned[field.id] = trimmed;
    }
  }

  for (const legacy of Object.keys(WEBSITE_LOGO_KEY_ALIASES)) {
    delete cleaned[legacy];
  }

  store[slug] = cleaned;

  const { upsertOwnerSettings } = await import("@/lib/settings-service");
  await upsertOwnerSettings(ownerId, [
    { key: "companyNextjsThemeCustomizer", value: JSON.stringify(store), isPublic: false },
  ]);
}

export function getCustomizerValuesForSlug(
  slug: string,
  rawSettingsValue: string | undefined,
): Record<string, string> {
  const schema = getCompanyThemeCustomizerSchema(slug);
  if (!schema) return {};
  const store = parseCustomizerStore(rawSettingsValue);
  return { ...getDefaultCustomizerValues(schema), ...migrateCustomizerValues(store[slug] ?? {}) };
}
