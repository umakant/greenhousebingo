"use client";

import * as React from "react";

import { brandLogoImageStyle } from "@/lib/brand-logo-size";
import { getImagePath } from "@/utils/image-path";

type ThemePreviewProps = {
  logoDark?: string;
  logoLight?: string;
  logoWidth?: string;
  logoHeight?: string;
  themeColor?: string;
  customColor?: string;
  sidebarVariant?: string;
  sidebarStyle?: string;
  layoutDirection?: string;
  themeMode?: string;
};

export function ThemePreview({
  logoDark,
  logoLight,
  logoWidth,
  logoHeight,
  themeColor = "green",
  customColor = "#10b981",
  sidebarVariant = "inset",
  sidebarStyle = "plain",
  layoutDirection = "ltr",
  themeMode = "light",
}: ThemePreviewProps) {
  const themeColors = {
    blue: "#3b82f6",
    green: "#10b981",
    purple: "#8b5cf6",
    orange: "#f97316",
    red: "#ef4444",
  };

  const primaryColor = themeColor === "custom" ? customColor : (themeColors as any)[themeColor] || "#10b981";
  const isDark = themeMode === "dark" || (themeMode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const isRTL = layoutDirection === "rtl";

  const getSidebarStyles = () => {
    let baseClasses = "w-16 border-r flex flex-col py-3 px-2 gap-2";
    if (sidebarStyle === "colored") baseClasses += " text-white";
    if (sidebarStyle === "gradient") baseClasses += " text-white";
    return baseClasses;
  };

  const getSidebarBackground = () => {
    if (sidebarStyle === "colored") return { backgroundColor: primaryColor };
    if (sidebarStyle === "gradient") return { background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}80 100%)` };
    return {};
  };

  const currentLogo = isDark ? logoLight : logoDark;
  const currentLogoStyle = brandLogoImageStyle(logoWidth, logoHeight);

  return (
    <div
      className={`border rounded-lg overflow-hidden text-xs transition-all duration-300 ${
        isDark ? "bg-gray-900 text-white border-gray-700" : "bg-white text-foreground border-gray-200"
      } ${isRTL ? "rtl" : "ltr"}`}
      style={{ ["--primary-color" as any]: primaryColor } as React.CSSProperties}
    >
      <div className={`px-3 py-2 border-b flex items-center justify-between ${isDark ? "bg-gray-800 border-gray-700" : "bg-muted"}`}>
        <div className="flex items-center gap-2 order-1 rtl:order-2">
          <span className="font-medium">Dashboard</span>
        </div>
        <div className="flex items-center gap-1 order-2 rtl:order-1">
          <div className={`w-4 h-4 rounded ${isDark ? "bg-gray-600" : "bg-muted-foreground/20"}`} />
          <div className={`w-4 h-4 rounded ${isDark ? "bg-gray-600" : "bg-muted-foreground/20"}`} />
        </div>
      </div>

      <div className={`flex h-48 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div
          className={`order-1 rtl:order-2 ${getSidebarStyles()} ${
            sidebarVariant === "floating" ? "m-2 rounded-lg shadow-sm" : ""
          } ${sidebarVariant === "minimal" ? "w-12" : "w-16"} ${
            isDark && sidebarStyle === "plain"
              ? "bg-gray-800 border-gray-700"
              : !isDark && sidebarStyle === "plain"
                ? "bg-muted/50"
                : ""
          }`}
          style={getSidebarBackground()}
        >
          <div className="mb-2 flex w-full justify-center px-1">
            {currentLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getImagePath(currentLogo)}
                alt="Logo"
                className="w-full max-w-full object-contain object-center"
                style={currentLogoStyle}
              />
            ) : (
              <div className="h-10 w-full rounded" style={{ backgroundColor: primaryColor }} />
            )}
          </div>

          <div className="space-y-2">
            <div
              className="w-full h-2 rounded"
              style={{ backgroundColor: sidebarStyle === "plain" ? primaryColor : "rgba(255,255,255,0.8)" }}
            />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`w-full h-2 rounded ${
                  sidebarStyle === "plain" ? (isDark ? "bg-gray-600" : "bg-muted-foreground/30") : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 p-3 space-y-2 order-2 rtl:order-1">
          <div className={`h-2 rounded w-3/4 ${isDark ? "bg-gray-700" : "bg-muted"}`} />
          <div className={`h-2 rounded w-1/2 ${isDark ? "bg-gray-700" : "bg-muted"}`} />
          <div className={`h-2 rounded w-2/3 ${isDark ? "bg-gray-700" : "bg-muted"}`} />
          <div className="flex gap-2 mt-3">
            <div className="w-6 h-4 rounded" style={{ backgroundColor: `${primaryColor}33` }} />
            <div className={`w-6 h-4 rounded ${isDark ? "bg-gray-700" : "bg-muted"}`} />
            <div className={`w-6 h-4 rounded ${isDark ? "bg-gray-700" : "bg-muted"}`} />
          </div>
          <div className="space-y-1 mt-4">
            <div className={`h-1.5 rounded w-full ${isDark ? "bg-gray-700" : "bg-muted"}`} />
            <div className={`h-1.5 rounded w-4/5 ${isDark ? "bg-gray-700" : "bg-muted"}`} />
            <div className={`h-1.5 rounded w-3/5 ${isDark ? "bg-gray-700" : "bg-muted"}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

