import "server-only";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import {
  type CompanyWebsiteAccessSettings,
  companySiteAccessCookieName,
  isTruthySettingValue,
} from "@/lib/company-themes/company-website-access-shared";
import { verifyCompanySiteAccessToken } from "@/lib/company-themes/company-website-access-token";
import { findCompanyOwnerIdBySessionUserId } from "@/lib/company-themes/company-website-host-resolver";
import { getSettingsForOwner } from "@/lib/settings-service";

export {
  COMPANY_WEBSITE_PASSWORD_SETTING_KEYS,
  type CompanyWebsiteAccessSettings,
  companySiteAccessCookieName,
  sanitizeCompanyWebsiteSettingsForClient,
} from "@/lib/company-themes/company-website-access-shared";

export {
  createCompanySiteAccessToken,
  verifyCompanySiteAccessToken,
} from "@/lib/company-themes/company-website-access-token";

export async function getCompanyWebsiteAccessSettings(
  ownerId: bigint,
): Promise<CompanyWebsiteAccessSettings> {
  const settings = await getSettingsForOwner(ownerId);
  return {
    passwordProtected: isTruthySettingValue(settings.companyWebsitePasswordProtected),
    passwordHash: (settings.companyWebsiteAccessPasswordHash ?? "").trim(),
  };
}

export async function verifyCompanyWebsiteAccessPassword(
  ownerId: bigint,
  password: string,
): Promise<boolean> {
  const access = await getCompanyWebsiteAccessSettings(ownerId);
  if (!access.passwordHash) return false;
  const plain = password.trim();
  if (!plain) return false;
  return bcrypt.compare(plain, access.passwordHash);
}

function parseSessionUserId(req?: NextRequest): bigint | null {
  const raw = req?.cookies.get("pf_user_id")?.value;
  if (!raw) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

async function staffCanPreviewSite(
  ownerId: bigint,
  req?: NextRequest,
): Promise<boolean> {
  let sessionUserId = parseSessionUserId(req);
  if (sessionUserId == null) {
    const jar = await cookies();
    const raw = jar.get("pf_user_id")?.value;
    if (raw) {
      try {
        sessionUserId = BigInt(raw);
      } catch {
        sessionUserId = null;
      }
    }
  }
  if (sessionUserId == null) return false;
  const sessionOwnerId = await findCompanyOwnerIdBySessionUserId(sessionUserId);
  return sessionOwnerId === ownerId;
}

export async function isCompanyWebsiteAccessBlocked(
  ownerId: bigint,
  companySlug: string,
  req?: NextRequest,
): Promise<boolean> {
  const access = await getCompanyWebsiteAccessSettings(ownerId);
  if (!access.passwordProtected || !access.passwordHash) return false;

  if (await staffCanPreviewSite(ownerId, req)) return false;

  const token =
    req?.cookies.get(companySiteAccessCookieName(companySlug))?.value ??
    (await cookies()).get(companySiteAccessCookieName(companySlug))?.value;

  if (token && (await verifyCompanySiteAccessToken(token, companySlug, ownerId))) {
    return false;
  }

  return true;
}
