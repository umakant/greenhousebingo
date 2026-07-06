import { resolveComplianceFrameworkIconSrc } from "@/lib/compliance/compliance-framework-icon-url";

export const COMPLIANCE_FRAMEWORK_CODES = [
  "GDPR",
  "HIPAA",
  "SOC2",
  "ISO27001",
  "USDP",
  "NIST_CSF",
] as const;

export type ComplianceFrameworkCode = (typeof COMPLIANCE_FRAMEWORK_CODES)[number];

/** Default badge images for built-in compliance frameworks. */
export const COMPLIANCE_FRAMEWORK_DEFAULT_ICONS: Record<ComplianceFrameworkCode, string> = {
  GDPR: "/images/compliance/frameworks/gdpr.png",
  HIPAA: "/images/compliance/frameworks/hipaa.png",
  SOC2: "/images/compliance/frameworks/soc2.png",
  ISO27001: "/images/compliance/frameworks/iso27001.png",
  USDP: "/images/compliance/frameworks/usdp.png",
  NIST_CSF: "/images/compliance/frameworks/nist-csf.png",
};

export function complianceFrameworkIconUrl(
  code: string,
  iconUrl?: string | null,
): string | null {
  const custom = resolveComplianceFrameworkIconSrc(iconUrl);
  if (custom) return custom;
  return COMPLIANCE_FRAMEWORK_DEFAULT_ICONS[code as ComplianceFrameworkCode] ?? null;
}

export const COMPLIANCE_FRAMEWORK_META: Record<
  ComplianceFrameworkCode,
  { name: string; description: string; category: string; tags?: string[] }
> = {
  GDPR: {
    name: "GDPR",
    description: "EU General Data Protection Regulation privacy and data protection requirements.",
    category: "Privacy",
    tags: ["Privacy", "EU", "Data Protection"],
  },
  HIPAA: {
    name: "HIPAA",
    description: "US health information privacy and security standards.",
    category: "Privacy",
    tags: ["Healthcare", "Privacy", "US"],
  },
  SOC2: {
    name: "SOC 2",
    description: "Service organization controls for security, availability, and confidentiality.",
    category: "Security",
    tags: ["Security", "Trust Services", "AICPA"],
  },
  ISO27001: {
    name: "ISO 27001",
    description: "Information security management system (ISMS) international standard.",
    category: "Security",
    tags: ["Security", "ISMS", "International"],
  },
  USDP: {
    name: "USDP",
    description: "US Data Privacy framework for consumer data protection programs.",
    category: "Privacy",
    tags: ["Privacy", "US", "Consumer Data"],
  },
  NIST_CSF: {
    name: "NIST CSF",
    description: "NIST Cybersecurity Framework for identifying and managing cyber risk.",
    category: "Security",
    tags: ["Security", "Cyber Risk", "NIST"],
  },
};

export const COMPLIANCE_FRAMEWORK_TABLE_STATS: Record<
  ComplianceFrameworkCode,
  { controlTotal: number; controlImplemented: number; evidenceCount: number }
> = {
  GDPR: { controlTotal: 85, controlImplemented: 78, evidenceCount: 112 },
  HIPAA: { controlTotal: 90, controlImplemented: 62, evidenceCount: 87 },
  SOC2: { controlTotal: 106, controlImplemented: 64, evidenceCount: 41 },
  ISO27001: { controlTotal: 76, controlImplemented: 41, evidenceCount: 33 },
  USDP: { controlTotal: 60, controlImplemented: 48, evidenceCount: 56 },
  NIST_CSF: { controlTotal: 81, controlImplemented: 55, evidenceCount: 29 },
};

export const COMPLIANCE_FRAMEWORK_RECOMMENDATIONS = [
  {
    code: "PCI_DSS",
    name: "PCI DSS",
    description: "Payment card industry data security standard for organizations handling cardholder data.",
    category: "Security",
  },
  {
    code: "FEDRAMP",
    name: "FedRAMP",
    description: "US government cloud security authorization program for federal agencies.",
    category: "Security",
  },
  {
    code: "ISO27701",
    name: "ISO 27701",
    description: "Privacy information management extension to ISO 27001 for PII controllers and processors.",
    category: "Privacy",
  },
  {
    code: "CCPA",
    name: "CCPA / CPRA",
    description: "California consumer privacy act requirements for businesses serving CA residents.",
    category: "Privacy",
  },
] as const;

export const COMPLIANCE_SOC2_TRUST_CRITERIA = [
  { name: "Security", status: "complete" },
  { name: "Availability", status: "in_progress" },
  { name: "Processing Integrity", status: "in_progress" },
  { name: "Confidentiality", status: "complete" },
  { name: "Privacy", status: "in_progress" },
] as const;

export const COMPLIANCE_LAUNCHPAD_STEPS = [
  { id: "frameworks", label: "Enable frameworks", href: "/compliance/frameworks" },
  { id: "policies", label: "Publish core policies", href: "/compliance/policies" },
  { id: "controls", label: "Implement controls", href: "/compliance/controls" },
  { id: "evidence", label: "Collect evidence", href: "/compliance/evidence" },
  { id: "monitors", label: "Configure monitors", href: "/compliance/monitors" },
  { id: "vendors", label: "Review vendors", href: "/compliance/vendors" },
  { id: "access", label: "Run access reviews", href: "/compliance/access-reviews" },
  { id: "trust", label: "Publish trust center", href: "/compliance/trust-center" },
] as const;
