import "server-only";

import { prisma } from "@/lib/prisma";
import type { SettingsBlob } from "@/lib/settings-service";

export type CompanyProfileUser = {
  name: string | null;
  email: string | null;
  mobileNo: string | null;
};

function firstNonBlank(...values: (string | undefined | null)[]): string {
  for (const v of values) {
    const t = (v ?? "").trim();
    if (t) return t;
  }
  return "";
}

/** Load the company tenant user row (name, email, phone). */
export async function loadCompanyProfileUser(ownerId: bigint): Promise<CompanyProfileUser | null> {
  return prisma.user.findFirst({
    where: { id: ownerId, type: { in: ["company", "company_admin"] } },
    select: { name: true, email: true, mobileNo: true },
  });
}

/**
 * Companies created under Superadmin → Companies store camelCase keys (`companyAddress`, …)
 * and put the legal name on `users.name`. Map those into Settings → Company form fields.
 */
export function applyCompanyProfileFieldsToSettings(
  settings: SettingsBlob,
  stored: SettingsBlob,
  companyUser: CompanyProfileUser | null,
): void {
  settings.company_name = firstNonBlank(settings.company_name, stored.company_name, companyUser?.name);
  settings.company_email = firstNonBlank(settings.company_email, stored.company_email, companyUser?.email);
  settings.company_telephone = firstNonBlank(
    settings.company_telephone,
    stored.company_telephone,
    stored.companyPhone,
    companyUser?.mobileNo,
  );
  settings.company_address = firstNonBlank(settings.company_address, stored.companyAddress);
  settings.company_address_2 = firstNonBlank(settings.company_address_2, stored.companyAddress2);
  settings.company_city = firstNonBlank(settings.company_city, stored.companyCity);
  settings.company_state = firstNonBlank(settings.company_state, stored.companyState);
  settings.company_county = firstNonBlank(
    settings.company_county,
    stored.company_county,
    stored.companyCounty,
  );
  settings.company_country = firstNonBlank(
    settings.company_country,
    stored.company_country,
    stored.companyCountry,
    "United States",
  );
  settings.company_zipcode = firstNonBlank(settings.company_zipcode, stored.companyZipCode);
  settings.companyWebsite = firstNonBlank(settings.companyWebsite, stored.companyWebsite);
}

/** Persist company profile edits in legacy camelCase keys used elsewhere in the app. */
export function companyProfileLegacySettingItems(form: Record<string, string>): Array<{ key: string; value: string }> {
  const items: Array<{ key: string; value: string }> = [];
  const push = (key: string, value: string) => {
    if (value.trim()) items.push({ key, value: value.trim() });
  };

  push("companyPhone", form.company_telephone ?? "");
  push("companyAddress", form.company_address ?? "");
  push("companyAddress2", form.company_address_2 ?? "");
  push("companyCity", form.company_city ?? "");
  push("companyState", form.company_state ?? "");
  push("companyCounty", form.company_county ?? "");
  push("companyCountry", form.company_country ?? "");
  push("companyZipCode", form.company_zipcode ?? "");
  push("companyWebsite", form.companyWebsite ?? "");

  return items;
}
