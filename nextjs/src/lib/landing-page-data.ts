import { prisma } from "@/lib/prisma";

export type LandingPageConfigSections = {
  sections?: Record<string, any>;
  section_visibility?: Record<string, boolean>;
  section_order?: string[];
  colors?: { primary: string; secondary: string; accent: string };
};

export type LandingPageSettings = {
  company_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  config_sections?: LandingPageConfigSections | null;
  enable_registration?: boolean;
  is_authenticated?: boolean;
  /** Set from session cookie on public shell pages for header account menu. */
  user_email?: string;
  admin_settings?: Record<string, string>;
};

function parseBool(v: unknown, fallback: boolean) {
  if (v === true || v === "1" || v === 1 || v === "true") return true;
  if (v === false || v === "0" || v === 0 || v === "false") return false;
  return fallback;
}

export async function getLandingPageSettingsFromDb(): Promise<{
  landingPageEnabled: boolean;
  settings: LandingPageSettings;
}> {
  const defaults = {
    landingPageEnabled: false,
    settings: {
      company_name: "WorkDo Dash",
      contact_email: null,
      contact_phone: null,
      contact_address: null,
      config_sections: null,
      enable_registration: true,
      admin_settings: {},
    } as LandingPageSettings,
  };

  if (!process.env.DATABASE_URL) {
    return defaults;
  }

  try {
    const superadmin = await prisma.user.findFirst({
      where: { type: "superadmin" },
      select: { id: true },
    });
    const superadminId = superadmin?.id ? Number(superadmin.id) : undefined;

    const adminSettings: Record<string, string> = {};
    if (superadminId) {
      const rows = await prisma.setting.findMany({
        where: { createdBy: BigInt(superadminId) },
        select: { key: true, value: true },
      });
      for (const r of rows) {
        if (r.key) adminSettings[r.key] = r.value ?? "";
      }
    }

    const landingPageEnabled = parseBool(
      adminSettings.landingPageEnabled ?? "0",
      false,
    );
    const enableRegistration =
      (adminSettings.enableRegistration ?? "on") === "on" ||
      parseBool(adminSettings.enableRegistration, true);

    const lps = await prisma.landingPageSetting.findFirst({
      orderBy: { id: "asc" },
      select: {
        companyName: true,
        contactEmail: true,
        contactPhone: true,
        contactAddress: true,
        configSections: true,
      },
    });

    let configSections: LandingPageConfigSections | null = null;
    try {
      const raw = lps?.configSections;
      configSections = raw ? (raw as LandingPageConfigSections) : null;
    } catch {
      configSections = null;
    }

    const settings: LandingPageSettings = {
      company_name: lps?.companyName ?? "WorkDo Dash",
      contact_email: lps?.contactEmail ?? null,
      contact_phone: lps?.contactPhone ?? null,
      contact_address: lps?.contactAddress ?? null,
      config_sections: configSections,
      enable_registration: enableRegistration,
      admin_settings: adminSettings,
    };

    return { landingPageEnabled, settings };
  } catch {
    return defaults;
  }
}
