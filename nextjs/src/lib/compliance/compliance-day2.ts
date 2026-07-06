/** Day 2 compliance constants and helpers (risks, audits, trust center, etc.) */

export const COMPLIANCE_IMPACT_LEVELS = [
  { value: "negligible", label: "Negligible", weight: 1 },
  { value: "low", label: "Low", weight: 2 },
  { value: "medium", label: "Medium", weight: 3 },
  { value: "high", label: "High", weight: 4 },
  { value: "critical", label: "Critical", weight: 5 },
] as const;

export const COMPLIANCE_LIKELIHOOD_LEVELS = [
  { value: "rare", label: "Rare", weight: 1 },
  { value: "unlikely", label: "Unlikely", weight: 2 },
  { value: "possible", label: "Possible", weight: 3 },
  { value: "likely", label: "Likely", weight: 4 },
  { value: "almost_certain", label: "Almost Certain", weight: 5 },
] as const;

export const COMPLIANCE_RISK_STATUSES = ["open", "mitigating", "accepted", "closed"] as const;
export const COMPLIANCE_VENDOR_TIERS = ["low", "medium", "high", "critical"] as const;
export const COMPLIANCE_DATA_CLASSIFICATIONS = ["public", "internal", "confidential", "restricted"] as const;
export const COMPLIANCE_CERT_STATUSES = ["not_applicable", "pending", "in_progress", "valid", "expired"] as const;
export const COMPLIANCE_REVIEW_SCHEDULES = ["monthly", "quarterly", "semi_annual", "annual"] as const;

export const COMPLIANCE_ACCESS_REVIEW_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"] as const;
export const COMPLIANCE_USER_REVIEW_DECISIONS = ["pending", "approved", "revoked", "exception"] as const;

export const COMPLIANCE_VULN_SEVERITIES = ["critical", "high", "medium", "low", "informational"] as const;
export const COMPLIANCE_VULN_STATUSES = ["open", "in_progress", "remediated", "accepted", "false_positive"] as const;

export const COMPLIANCE_AUDIT_TYPES = [
  { value: "soc2_type_i", label: "SOC 2 Type I" },
  { value: "soc2_type_ii", label: "SOC 2 Type II" },
  { value: "hipaa", label: "HIPAA" },
  { value: "iso27001", label: "ISO 27001" },
  { value: "gdpr", label: "GDPR" },
  { value: "nist_csf", label: "NIST CSF" },
  { value: "internal", label: "Internal" },
] as const;

export const COMPLIANCE_AUDIT_STATUSES = ["planned", "in_progress", "fieldwork", "reporting", "completed", "cancelled"] as const;

export const COMPLIANCE_TRUST_SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "compliance", label: "Compliance" },
  { key: "documents", label: "Documents" },
  { key: "monitoring", label: "Monitoring" },
  { key: "security", label: "Security Overview" },
  { key: "faq", label: "FAQ" },
] as const;

export const COMPLIANCE_DOC_ACCESS_LEVELS = [
  { value: "public", label: "Public" },
  { value: "request_access", label: "Request Access" },
  { value: "nda_required", label: "NDA Required" },
] as const;

const impactWeight = (v: string) => COMPLIANCE_IMPACT_LEVELS.find((x) => x.value === v)?.weight ?? 3;
const likelihoodWeight = (v: string) => COMPLIANCE_LIKELIHOOD_LEVELS.find((x) => x.value === v)?.weight ?? 3;

export function computeRiskScore(impact: string, likelihood: string): number {
  return impactWeight(impact) * likelihoodWeight(likelihood);
}

export function riskMatrixLabel(score: number): string {
  if (score >= 20) return "Critical";
  if (score >= 12) return "High";
  if (score >= 6) return "Medium";
  if (score >= 3) return "Low";
  return "Minimal";
}

export type RiskMetadata = {
  mitigationPlan?: string;
  residualImpact?: string;
  residualLikelihood?: string;
  reviewNotes?: string;
  lastReviewedAt?: string;
};

export type VendorComplianceMetadata = {
  dataClassification?: string;
  soc2Status?: string;
  isoStatus?: string;
  hipaaBaa?: string;
  gdprDpa?: string;
  reviewSchedule?: string;
  lastReviewNotes?: string;
};

export type AccessReviewMetadata = {
  userReviews?: Array<{
    userId?: number;
    name: string;
    role?: string;
    decision: string;
    notes?: string;
    reviewedAt?: string;
  }>;
  evidenceExportedAt?: string;
};

export type VulnerabilityMetadata = {
  ownerUserId?: number;
  dueDate?: string;
  frameworkIds?: number[];
  remediationSteps?: Array<{ step: string; status: string; completedAt?: string }>;
};

export type AuditMetadata = {
  findings?: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    description?: string;
  }>;
  evidencePackages?: Array<{
    id: string;
    name: string;
    documentIds?: number[];
    evidenceIds?: number[];
  }>;
  requests?: Array<{
    id: string;
    title: string;
    status: string;
    requestedAt?: string;
    notes?: string;
  }>;
  finalReportUrl?: string;
  auditorUserIds?: number[];
};

export type TrustCenterSections = Record<
  string,
  {
    enabled?: boolean;
    headline?: string;
    body?: string;
    documents?: Array<{ id: number; title: string; accessLevel: string; fileUrl?: string | null }>;
  }
>;

export function parseJsonObject<T extends Record<string, unknown>>(
  raw: unknown,
  fallback: T,
): T {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;
  return { ...fallback, ...(raw as T) };
}

export function defaultTrustCenterSections(): TrustCenterSections {
  return Object.fromEntries(
    COMPLIANCE_TRUST_SECTIONS.map((s) => [
      s.key,
      { enabled: s.key === "overview" || s.key === "compliance", headline: s.label, body: "" },
    ]),
  );
}
