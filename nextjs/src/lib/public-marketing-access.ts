import "server-only";

import { redirect } from "next/navigation";

import { getLandingPageSettingsFromDb } from "@/lib/landing-page-data";

/** Ensures public marketing pages are enabled; returns settings snippet for CTAs. */
export async function requirePublicMarketingAccess() {
  const { landingPageEnabled, settings } = await getLandingPageSettingsFromDb();
  if (!landingPageEnabled) redirect("/login");
  return {
    enableRegistration: settings?.enable_registration !== false,
  };
}
