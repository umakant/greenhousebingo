"use client";

import CookieConsent from "@/components/cookie-consent";
import Header from "@/components/landing/sections/header";
import Footer from "@/components/landing/sections/footer";
import type { LandingPageSettings } from "@/lib/landing-page-data";

export default function PublicLandingShell({
  settings,
  children,
}: {
  settings: LandingPageSettings;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <Header settings={settings} />
      <main>{children}</main>
      <Footer settings={settings} />
      <CookieConsent settings={(settings?.admin_settings as any) || {}} />
    </div>
  );
}

