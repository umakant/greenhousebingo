"use client";

import { COMPLIANCE_BRAND } from "@/components/compliance/compliance-ui";
import { COMPLIANCE_FRAMEWORK_DEFAULT_ICONS } from "@/lib/compliance/compliance-frameworks";
import { resolveComplianceFrameworkIconSrc } from "@/lib/compliance/compliance-framework-icon-url";
import { cn } from "@/lib/utils";

export const COMPLIANCE_FRAMEWORK_ICON_COLORS: Record<string, string> = {
  GDPR: "#2563eb",
  HIPAA: "#7c3aed",
  SOC2: "#E31B23",
  ISO27001: "#0891b2",
  USDP: "#059669",
  NIST_CSF: "#d97706",
};

export function complianceFrameworkIconLabel(code: string) {
  if (code === "SOC2") return "SOC";
  if (code === "ISO27001") return "ISO";
  if (code === "NIST_CSF") return "NIST";
  return code.replace(/_/g, "").slice(0, 3);
}

export function ComplianceFrameworkIcon({
  code,
  iconUrl,
  size = "md",
  className,
}: {
  code: string;
  iconUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const resolvedUrl =
    resolveComplianceFrameworkIconSrc(iconUrl) ??
    COMPLIANCE_FRAMEWORK_DEFAULT_ICONS[code as keyof typeof COMPLIANCE_FRAMEWORK_DEFAULT_ICONS] ??
    null;
  const sizeClass = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  if (resolvedUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedUrl}
        alt={code}
        className={cn("shrink-0 rounded-full object-contain", sizeClass, className)}
        title={code}
      />
    );
  }

  const bg = COMPLIANCE_FRAMEWORK_ICON_COLORS[code] ?? COMPLIANCE_BRAND;
  const label = complianceFrameworkIconLabel(code);
  const fallbackSizeClass =
    size === "sm" ? "h-8 w-8 rounded-full text-[7px]" : "h-10 w-10 rounded-full text-[10px]";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center font-bold uppercase text-white",
        fallbackSizeClass,
        className,
      )}
      style={{ backgroundColor: bg }}
      title={code}
    >
      {label}
    </div>
  );
}
