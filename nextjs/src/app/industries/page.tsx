import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";

import { FeedbackTab, FooterSection, IndustriesSection, Navbar } from "@/components/landing/landing-page";
import { HomeownerBulqitHero } from "@/components/landing/homeowner-bulqit-hero";
import { LANDING_BRAND } from "@/lib/landing-brand-colors";
import { getLandingPageSettingsFromDb } from "@/lib/landing-page-data";
import type { LandingPageSettings } from "@/lib/landing-page-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function IndustriesPage() {
  noStore();
  const store = await cookies();

  let settings: LandingPageSettings = {
    company_name: "WorkDo Dash",
    contact_email: null,
    contact_phone: null,
    contact_address: null,
    config_sections: null,
    enable_registration: true,
    admin_settings: {},
  };

  try {
    const result = await getLandingPageSettingsFromDb();
    settings = result.settings;
  } catch {
    // use defaults
  }

  const isAuthenticated = !!store.get("pf_role")?.value;
  const userEmail = store.get("pf_email")?.value ?? undefined;

  return (
    <div className="min-h-screen" style={{ backgroundColor: LANDING_BRAND.softPageBg }}>
      <Navbar settings={settings} isAuthenticated={isAuthenticated} userEmail={userEmail} theme="bulkMarketing" />
      <main>
        <HomeownerBulqitHero />
        <IndustriesSection maxPerCategory={Number.POSITIVE_INFINITY} />
      </main>
      <FooterSection settings={settings} footerLayout="bulk" />
      <FeedbackTab />
    </div>
  );
}
