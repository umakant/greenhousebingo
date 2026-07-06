"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  Cookie as CookieIcon,
  Globe2,
  Settings2,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "pf_cookie_consent";

const ACCENT = "bg-green-600 hover:bg-green-700 text-white";

type CookiePrefs = {
  v: 1;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  updatedAt: string;
};

function isPopupEnabled(settings: Record<string, unknown>): boolean {
  const v = settings?.enableCookiePopup;
  if (v === undefined || v === null) return false;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  return s === "1" || s === "on" || s === "true" || s === "yes";
}

function parseStoredConsent(raw: string | null): CookiePrefs | "legacy_accept" | "legacy_decline" | null {
  if (raw === null || raw === "") return null;
  if (raw === "accepted") return "legacy_accept";
  if (raw === "declined") return "legacy_decline";
  try {
    const o = JSON.parse(raw) as Partial<CookiePrefs>;
    if (o && o.v === 1 && o.essential === true && typeof o.analytics === "boolean" && typeof o.marketing === "boolean" && typeof o.functional === "boolean") {
      return {
        v: 1,
        essential: true,
        analytics: o.analytics,
        marketing: o.marketing,
        functional: o.functional,
        updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function prefsFromLegacy(which: "legacy_accept" | "legacy_decline"): CookiePrefs {
  const all = which === "legacy_accept";
  return {
    v: 1,
    essential: true,
    analytics: all,
    marketing: all,
    functional: all,
    updatedAt: new Date().toISOString(),
  };
}

function writeConsent(prefs: CookiePrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
}

type CookieConsentProps = { settings?: Record<string, unknown> };

function greenSwitchClass(disabled?: boolean) {
  return cn(
    "data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-neutral-200",
    disabled && "opacity-90",
  );
}

function CookieConsentInner({ settings: settingsProp }: CookieConsentProps) {
  const settings = (settingsProp ?? {}) as Record<string, string | boolean | undefined>;
  const [mounted, setMounted] = React.useState(false);
  const [storedRaw, setStoredRaw] = React.useState<string | null>(null);
  const [prefsOpen, setPrefsOpen] = React.useState(false);

  const [draft, setDraft] = React.useState<Omit<CookiePrefs, "v" | "essential" | "updatedAt">>({
    analytics: true,
    marketing: true,
    functional: true,
  });

  React.useEffect(() => {
    setMounted(true);
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(CONSENT_KEY) : null;
    setStoredRaw(raw);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || storedRaw === null) return;
    const p = parseStoredConsent(storedRaw);
    if (p === "legacy_accept" || p === "legacy_decline") {
      const next = prefsFromLegacy(p);
      writeConsent(next);
      setStoredRaw(JSON.stringify(next));
    }
  }, [storedRaw]);

  const parsed = React.useMemo(() => parseStoredConsent(storedRaw), [storedRaw]);
  const resolvedPrefs = React.useMemo(() => {
    if (parsed === "legacy_accept" || parsed === "legacy_decline") return prefsFromLegacy(parsed);
    return parsed;
  }, [parsed]);

  const openCustomize = React.useCallback(() => {
    if (resolvedPrefs) {
      setDraft({
        analytics: resolvedPrefs.analytics,
        marketing: resolvedPrefs.marketing,
        functional: resolvedPrefs.functional,
      });
    }
    setPrefsOpen(true);
  }, [resolvedPrefs]);

  const finalize = React.useCallback((prefs: CookiePrefs) => {
    writeConsent(prefs);
    setStoredRaw(JSON.stringify(prefs));
    setPrefsOpen(false);
  }, []);

  const acceptAll = React.useCallback(() => {
    finalize({
      v: 1,
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
      updatedAt: new Date().toISOString(),
    });
  }, [finalize]);

  const rejectAll = React.useCallback(() => {
    finalize({
      v: 1,
      essential: true,
      analytics: false,
      marketing: false,
      functional: false,
      updatedAt: new Date().toISOString(),
    });
  }, [finalize]);

  const saveCustomize = React.useCallback(() => {
    finalize({
      v: 1,
      essential: true,
      analytics: draft.analytics,
      marketing: draft.marketing,
      functional: draft.functional,
      updatedAt: new Date().toISOString(),
    });
  }, [draft, finalize]);

  if (!mounted || resolvedPrefs !== null || !isPopupEnabled(settings as Record<string, unknown>)) {
    return null;
  }

  const rawTitle = String(settings.cookieTitle ?? "").trim();
  const bannerTitle =
    !rawTitle || /^cookie\s*consent$/i.test(rawTitle) ? "We value your privacy" : rawTitle;
  const bannerDescription =
    String(
      settings.cookieDescription ??
        "We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts. By clicking 'Accept All', you consent to our use of cookies.",
    ).trim() ||
    "We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts. By clicking 'Accept All', you consent to our use of cookies.";
  const contactUrl = String(settings.contactUsUrl ?? "").trim();
  const contactBlurb = String(settings.contactUsDescription ?? "").trim() || "Contact us";
  const modalTitle = "Cookie Preferences";
  const modalIntro =
    "Choose which cookies you'd like to accept. You can change these settings at any time.";

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] border-t border-neutral-200 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
        role="dialog"
        aria-label={bannerTitle}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-5 md:flex-row md:items-center md:justify-between md:gap-10 md:py-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <CookieIcon className="mt-0.5 h-6 w-6 shrink-0 text-green-600" aria-hidden />
              <div className="min-w-0">
                <h3 className="text-base font-semibold tracking-tight text-neutral-900">{bannerTitle}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{bannerDescription}</p>
                {contactUrl ? (
                  <p className="mt-2 text-sm">
                    <Link href={contactUrl} className="text-blue-600 underline underline-offset-2 hover:text-blue-700">
                      {contactBlurb}
                    </Link>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="ghost" className="h-10 px-3 text-neutral-900 hover:bg-neutral-100" onClick={rejectAll}>
              Reject All
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
              onClick={openCustomize}
            >
              <Settings2 className="h-4 w-4" aria-hidden />
              Customize
            </Button>
            <Button type="button" className={cn("h-10 px-5 shadow-sm", ACCENT)} onClick={acceptAll}>
              Accept All
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="gap-6 border border-neutral-200 bg-white p-6 shadow-2xl sm:rounded-2xl sm:p-8 sm:px-10 md:px-12 max-w-[100rem] w-[min(92vw,calc(100vw-1rem))] sm:w-[min(50vw,calc(100vw-2rem))]">
          <PrefsBody
            settings={settings}
            draft={draft}
            setDraft={setDraft}
            onCancel={() => setPrefsOpen(false)}
            onSave={saveCustomize}
            modalTitle={modalTitle}
            modalIntro={modalIntro}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function PrefsBody({
  settings,
  draft,
  setDraft,
  onCancel,
  onSave,
  modalTitle = "Cookie Preferences",
  modalIntro = "Choose which cookies you'd like to accept. You can change these settings at any time.",
}: {
  settings: Record<string, string | boolean | undefined>;
  draft: Omit<CookiePrefs, "v" | "essential" | "updatedAt">;
  setDraft: React.Dispatch<React.SetStateAction<Omit<CookiePrefs, "v" | "essential" | "updatedAt">>>;
  onCancel: () => void;
  onSave: () => void;
  modalTitle?: string;
  modalIntro?: string;
}) {
  const strictlyTitle = String(settings.strictlyCookieTitle ?? "Essential Cookies").trim() || "Essential Cookies";
  const strictlyDescription =
    String(
      settings.strictlyCookieDescription ??
        "Required for basic site functionality, authentication, and security. These cannot be disabled.",
    ).trim() ||
    "Required for basic site functionality, authentication, and security. These cannot be disabled.";

  type RowKey = "essential" | "analytics" | "marketing" | "functional";

  const rows: Array<{
    key: RowKey;
    icon: typeof Shield;
    title: string;
    badge?: string;
    description: string;
    checked: boolean;
    disabled: boolean;
  }> = [
    {
      key: "essential",
      icon: Shield,
      title: strictlyTitle,
      badge: "REQUIRED",
      description: strictlyDescription,
      checked: true,
      disabled: true,
    },
    {
      key: "analytics",
      icon: BarChart3,
      title: "Analytics Cookies",
      description: "Help us understand how visitors interact with our website to improve user experience.",
      checked: draft.analytics,
      disabled: false,
    },
    {
      key: "marketing",
      icon: Globe2,
      title: "Marketing Cookies",
      description: "Used to track visitors and display personalized advertisements.",
      checked: draft.marketing,
      disabled: false,
    },
    {
      key: "functional",
      icon: Settings2,
      title: "Functional Cookies",
      description: "Remember your preferences and settings to enhance your experience.",
      checked: draft.functional,
      disabled: false,
    },
  ];

  return (
    <>
      <DialogHeader className="space-y-3 pr-10 text-left sm:pr-12">
        <div className="flex items-center gap-2.5">
          <Settings2 className="h-5 w-5 shrink-0 text-neutral-900" strokeWidth={2} aria-hidden />
          <DialogTitle className="text-lg font-bold leading-tight text-neutral-900 sm:text-xl">{modalTitle}</DialogTitle>
        </div>
        <DialogDescription className="text-sm leading-relaxed text-neutral-500">{modalIntro}</DialogDescription>
      </DialogHeader>

      <div className="max-h-[min(420px,55vh)] space-y-3 overflow-y-auto">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.key}
              className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:items-center">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
                  <Icon className="h-5 w-5 text-neutral-900" strokeWidth={1.75} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-neutral-900 sm:text-[15px]">{row.title}</span>
                    {row.badge ? (
                      <span className="rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                        {row.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500 sm:text-sm">{row.description}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-end sm:pl-2">
                <Switch
                  checked={row.checked}
                  disabled={row.disabled}
                  onCheckedChange={
                    row.key === "analytics"
                      ? (c) => setDraft((p) => ({ ...p, analytics: !!c }))
                      : row.key === "marketing"
                        ? (c) => setDraft((p) => ({ ...p, marketing: !!c }))
                        : row.key === "functional"
                          ? (c) => setDraft((p) => ({ ...p, functional: !!c }))
                          : undefined
                  }
                  className={greenSwitchClass(row.disabled)}
                  aria-label={row.title}
                />
              </div>
            </div>
          );
        })}
      </div>

      <DialogFooter className="mt-1 flex flex-row flex-wrap items-center justify-end gap-3 border-t border-neutral-100 pt-5 sm:space-x-0">
        <Button
          type="button"
          variant="outline"
          className="border-neutral-300 bg-white font-medium text-neutral-800 hover:bg-neutral-50"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="button" className={cn("font-semibold shadow-sm", ACCENT)} onClick={onSave}>
          Save Preferences
        </Button>
      </DialogFooter>
    </>
  );
}

/** Wrapper that provides app settings from context to CookieConsent. Use inside AppSettingsProvider. */
export function CookieConsentWithContext() {
  const ctx = useAppSettingsOptional();
  return <CookieConsentInner settings={(ctx?.settings as Record<string, unknown>) ?? {}} />;
}

export default function CookieConsent(props?: CookieConsentProps) {
  return <CookieConsentInner settings={props?.settings} />;
}
