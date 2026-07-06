"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { t } from "@/lib/admin-t";

const CrmLeadsAdmin = dynamic(() => import("./crm-leads-admin"), { ssr: false });
const CrmDealsAdmin = dynamic(() => import("./crm-deals-admin"), { ssr: false });
const CrmSetupAdmin = dynamic(() => import("./crm-setup-admin"), { ssr: false });
const CrmReportsLead = dynamic(() => import("./crm-reports-lead"), { ssr: false });
const CrmReportsDeal = dynamic(() => import("./crm-reports-deal"), { ssr: false });


export function CrmSectionContent({ section, permissions }: { section: string; permissions: string[] }) {
  switch (section) {
    case "leads":
      return <CrmLeadsAdmin permissions={permissions} />;
    case "deals":
      return <CrmDealsAdmin permissions={permissions} />;
    case "setup":
      return <CrmSetupAdmin permissions={permissions} />;
    case "reports":
    case "reports/leads":
      return <CrmReportsLead />;
    case "reports/deals":
      return <CrmReportsDeal />;
    default:
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <p className="text-lg font-medium">{t("Section not found")}</p>
          <p className="text-sm">{t("Section")} &ldquo;{section}&rdquo; {t("is not available.")}</p>
        </div>
      );
  }
}
