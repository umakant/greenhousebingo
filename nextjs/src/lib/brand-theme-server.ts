import { cookies, headers } from "next/headers";

import { buildBrandThemeStyleBlock, resolveBrandPrimaryHex } from "@/lib/brand-theme";
import { getMergedSettingsForUserEmail } from "@/lib/settings-service";

export function resolveAppOriginFromHeaders(hdrs: Headers): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (env) return env;

  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

/** Loads merged app settings for the signed-in user and returns SSR brand CSS, if any. */
export async function getServerBrandThemeStyleBlock(): Promise<string | null> {
  try {
    const store = await cookies();
    const email = store.get("pf_email")?.value?.trim();
    if (!email) return null;

    const hdrs = await headers();
    const appUrl = resolveAppOriginFromHeaders(hdrs);
    const settings = await getMergedSettingsForUserEmail(email, appUrl);
    return buildBrandThemeStyleBlock(settings);
  } catch {
    return null;
  }
}

/** Brand primary hex for SSR props (e.g. charts) matching the signed-in user's theme. */
export async function getServerBrandPrimaryHex(): Promise<string | null> {
  try {
    const store = await cookies();
    const email = store.get("pf_email")?.value?.trim();
    if (!email) return null;

    const hdrs = await headers();
    const appUrl = resolveAppOriginFromHeaders(hdrs);
    const settings = await getMergedSettingsForUserEmail(email, appUrl);
    return resolveBrandPrimaryHex(settings.themeColor ?? "green", settings.customColor ?? "");
  } catch {
    return null;
  }
}
