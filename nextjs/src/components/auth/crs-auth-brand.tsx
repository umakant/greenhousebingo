"use client";

import { useEffect, useState } from "react";
import { getImagePath } from "@/utils/image-path";

export const PF_RED = "#e31837";
export const NAVY_LEFT = "#0a1628";
export const NAVY_FORM = "#0d1a30";
export const CRS_INPUT_BG = "#121c2f";
export const CRS_INPUT_BORDER = "#3d4f6b";

/** @deprecated — use className="text-primary" instead */
export const CRS_GOLD_LINK = "#d4b44a";
/** @deprecated — use bg-primary Button variant instead */
export const CRS_BUTTON_BG = "#a89f68";
/** @deprecated use PF_RED */
export const CRS_RED = PF_RED;

type PublicBrandSettings = {
  loginImage?: string;
  loginBgColor?: string;
  loginFormBgColor?: string;
};

/** Public login/register branding from `/api/public-settings`. */
export function usePublicLoginBranding(): PublicBrandSettings {
  const [brand, setBrand] = useState<PublicBrandSettings>({});
  useEffect(() => {
    fetch("/api/public-settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.settings) setBrand(data.settings as PublicBrandSettings);
      })
      .catch(() => {});
  }, []);
  return brand;
}

/** Resolved background colors for auth split layout (from public settings + defaults). */
export function usePublicAuthBackgrounds(): { leftBg: string; rightBg: string } {
  const s = usePublicLoginBranding();
  const left = s.loginBgColor?.trim();
  const right = s.loginFormBgColor?.trim();
  return {
    leftBg: left || NAVY_LEFT,
    rightBg: right || NAVY_FORM,
  };
}

/** Left split panel: only the branding image from Settings → public `loginImage` (no hardcoded PF / shield fallback). */
export function CrsBrandPanel() {
  const { loginImage, loginBgColor } = usePublicLoginBranding();

  const resolvedImage = loginImage ? getImagePath(loginImage) : null;
  const bgColor = loginBgColor || NAVY_LEFT;

  if (!resolvedImage) {
    return (
      <div
        className="relative hidden min-h-svh flex-1 flex-col lg:flex"
        style={{ backgroundColor: bgColor }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className="relative hidden min-h-svh flex-1 flex-col lg:flex"
      style={{ backgroundColor: bgColor }}
    >
      <div className="pointer-events-none absolute inset-0 bg-black/25" aria-hidden />
      <div
        className="relative z-[1] flex min-h-svh w-full flex-1 flex-col items-center justify-center px-[clamp(1.75rem,10vw,6rem)] py-[clamp(2rem,12vh,8rem)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic branding URL from settings */}
        <img
          src={resolvedImage}
          alt=""
          className="h-auto w-full max-h-[min(58vh,640px)] max-w-[min(100%,720px)] object-contain select-none"
          draggable={false}
        />
      </div>
    </div>
  );
}

/** Mobile top strip: same settings image only (no PF fallback). */
export function CrsMobileBrandBar() {
  const { loginImage, loginBgColor } = usePublicLoginBranding();
  const resolvedImage = loginImage ? getImagePath(loginImage) : null;
  const bgColor = loginBgColor || NAVY_LEFT;

  if (!resolvedImage) return null;

  return (
    <div
      className="relative flex min-h-[3.5rem] items-center justify-center gap-3 overflow-hidden border-b border-white/10 px-4 py-2 lg:hidden"
      style={{ backgroundColor: bgColor }}
    >
      <div className="pointer-events-none absolute inset-0 bg-black/35" aria-hidden />
      <div className="relative z-[1] flex w-full max-w-[min(100%,280px)] items-center justify-center py-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic branding URL from settings */}
        <img
          src={resolvedImage}
          alt=""
          className="max-h-9 w-auto max-w-full object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
}
