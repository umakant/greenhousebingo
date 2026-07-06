"use client";

import * as React from "react";
import { ComplianceAccessReviewsClient } from "@/components/compliance/compliance-access-reviews-client";
import { ComplianceAuditsClient } from "@/components/compliance/compliance-audits-client";
import { ComplianceControlsClient } from "@/components/compliance/compliance-controls-client";
import { ComplianceDocumentsClient } from "@/components/compliance/compliance-documents-client";
import { ComplianceEvidenceClient } from "@/components/compliance/compliance-evidence-client";
import { ComplianceFrameworksClient } from "@/components/compliance/compliance-frameworks-client";
import { ComplianceMonitorsClient } from "@/components/compliance/compliance-monitors-client";
import { CompliancePoliciesClient } from "@/components/compliance/compliance-policies-client";
import { ComplianceRisksClient } from "@/components/compliance/compliance-risks-client";
import { ComplianceIntegrationsClient } from "@/components/compliance/compliance-integrations-client";
import { ComplianceLaunchpadClient } from "@/components/compliance/compliance-launchpad-client";
import { ComplianceReportsClient } from "@/components/compliance/compliance-reports-client";
import { ComplianceSettingsClient } from "@/components/compliance/compliance-settings-client";
import { ComplianceTasksClient } from "@/components/compliance/compliance-tasks-client";
import { ComplianceTrustCenterClient } from "@/components/compliance/compliance-trust-center-client";
import { ComplianceVendorsClient } from "@/components/compliance/compliance-vendors-client";
import { ComplianceVulnerabilitiesClient } from "@/components/compliance/compliance-vulnerabilities-client";
import { ComplianceSectionPlaceholder } from "@/components/compliance/compliance-section-placeholder";
import type { COMPLIANCE_SECTIONS } from "@/lib/compliance/compliance-sections";

type SectionKey = keyof typeof COMPLIANCE_SECTIONS;

const OPERATIONAL: Partial<Record<SectionKey, React.ComponentType>> = {
  frameworks: ComplianceFrameworksClient,
  controls: ComplianceControlsClient,
  evidence: ComplianceEvidenceClient,
  policies: CompliancePoliciesClient,
  documents: ComplianceDocumentsClient,
  monitors: ComplianceMonitorsClient,
  risks: ComplianceRisksClient,
  vendors: ComplianceVendorsClient,
  "access-reviews": ComplianceAccessReviewsClient,
  vulnerabilities: ComplianceVulnerabilitiesClient,
  audits: ComplianceAuditsClient,
  "trust-center": ComplianceTrustCenterClient,
  integrations: ComplianceIntegrationsClient,
  launchpad: ComplianceLaunchpadClient,
  reports: ComplianceReportsClient,
  tasks: ComplianceTasksClient,
  settings: ComplianceSettingsClient,
};

export function ComplianceSectionView({
  section,
  title,
  description,
}: {
  section: string;
  title: string;
  description: string;
}) {
  const Client = OPERATIONAL[section as SectionKey];
  if (Client) return <Client />;
  return <ComplianceSectionPlaceholder title={title} description={description} section={section} />;
}
