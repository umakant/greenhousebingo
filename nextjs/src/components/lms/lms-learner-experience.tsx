"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Smartphone } from "lucide-react";

import { useTranslation } from "@/contexts/translation-context";
import { Button } from "@/components/ui/button";
import { LmsAdBanners } from "@/components/lms/lms-ad-banners";
import { LmsGdprConsent } from "@/components/lms/lms-gdpr-consent";
import { EventPlatformPopupRenderer } from "@/components/event-platform/event-platform-popup-renderer";

export type LmsPublicConfig = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  mobileOnlyMode: boolean;
  locale: string;
  rtl: "ltr" | "rtl";
  gdprEnabled: boolean;
  gdprRequireConsent: boolean;
  gdprBannerText: string;
  primaryColor: string;
  fontFamily: string;
  adBanners: { id: string; title: string; imageUrl: string; linkUrl: string; active: boolean }[];
  firstPurchaseCouponCode: string | null;
};

const LMS_GDPR_KEY = "lms_gdpr_consent_v1";

type LmsLearnerExperienceContextValue = {
  config: LmsPublicConfig | null;
  loading: boolean;
};

const LmsLearnerExperienceContext = React.createContext<LmsLearnerExperienceContextValue>({
  config: null,
  loading: true,
});

function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return true;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
}

/** Loads LMS public config (locale, RTL, maintenance). Place promotions inside main content via `LmsLearnerContent`. */
export function LmsLearnerExperienceProvider({ children }: { children: React.ReactNode }) {
  const { setLocale } = useTranslation();
  const [config, setConfig] = React.useState<LmsPublicConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [gdprOk, setGdprOk] = React.useState(true);
  const [mobileOk, setMobileOk] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void fetch("/api/lms/public-config", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data: { ok?: boolean; config?: LmsPublicConfig }) => {
        if (cancelled || !data?.ok || !data.config) return;
        setConfig(data.config);
        if (data.config.locale) setLocale(data.config.locale);
        document.documentElement.dir = data.config.rtl;
        if (data.config.primaryColor) {
          document.documentElement.style.setProperty("--lms-primary", data.config.primaryColor);
        }
        if (data.config.fontFamily) {
          document.documentElement.style.setProperty("--lms-font-family", data.config.fontFamily);
        }
        if (data.config.gdprEnabled && data.config.gdprRequireConsent) {
          const stored = localStorage.getItem(LMS_GDPR_KEY);
          setGdprOk(stored === "1");
        }
        if (data.config.mobileOnlyMode) {
          setMobileOk(isMobileUserAgent());
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setLocale]);

  const ctx = React.useMemo(() => ({ config, loading }), [config, loading]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (config?.maintenanceMode) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border/80 bg-card p-8 text-center">
        <h2 className="text-lg font-semibold">Maintenance</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{config.maintenanceMessage}</p>
        <Button variant="outline" size="sm" className="mt-6" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (config?.mobileOnlyMode && !mobileOk) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border/80 bg-card p-8 text-center">
        <Smartphone className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Mobile only</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This learning portal is available on mobile devices only. Open this page on your phone or tablet.
        </p>
      </div>
    );
  }

  if (config?.gdprEnabled && config.gdprRequireConsent && !gdprOk) {
    return (
      <LmsGdprConsent
        text={config.gdprBannerText}
        onAccept={() => {
          localStorage.setItem(LMS_GDPR_KEY, "1");
          setGdprOk(true);
        }}
      />
    );
  }

  return (
    <LmsLearnerExperienceContext.Provider value={ctx}>
      <div
        className="lms-learner-root min-w-0"
        style={{
          fontFamily: config?.fontFamily ? `var(--lms-font-family), inherit` : undefined,
        }}
      >
        {children}
      </div>
    </LmsLearnerExperienceContext.Provider>
  );
}

/** Promo banners + first-purchase coupon — render inside the main content column (not outside the app shell). */
export function LmsLearnerPromotions() {
  const { config, loading } = React.useContext(LmsLearnerExperienceContext);
  if (loading || !config) return null;

  const activeBanners = config.adBanners?.filter((b) => b.active && b.imageUrl) ?? [];

  return (
    <>
      {activeBanners.length > 0 ? <LmsAdBanners banners={activeBanners} className="mb-4" /> : null}
      {config.firstPurchaseCouponCode ? (
        <p className="mb-4 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          First purchase offer: use code{" "}
          <strong className="font-mono">{config.firstPurchaseCouponCode}</strong> at checkout.
        </p>
      ) : null}
    </>
  );
}

/** Convenience wrapper: promotions above page content within the authenticated main area. */
export function LmsLearnerContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LmsLearnerPromotions />
      <EventPlatformPopupRenderer />
      {children}
    </>
  );
}
