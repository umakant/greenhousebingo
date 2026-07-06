export function documentTypeLabel(docType: string): string {
  const key = docType.toLowerCase().replace(/\s+/g, "_");
  const labels: Record<string, string> = {
    audit_report: "Report",
    certification: "Certification",
    legal: "Agreement",
    policy: "Policy",
    report: "Report",
    general: "Document",
  };
  return labels[key] ?? docType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function documentFrameworksFromTitle(title: string): string[] {
  const t = title.toLowerCase();
  const frameworks = new Set<string>();
  if (t.includes("soc") || t.includes("type ii") || t.includes("type 2")) frameworks.add("SOC 2");
  if (t.includes("iso")) frameworks.add("ISO 27001");
  if (t.includes("hipaa") || t.includes("baa") || t.includes("data processing")) frameworks.add("HIPAA");
  if (t.includes("nist")) frameworks.add("NIST CSF");
  if (t.includes("pci")) frameworks.add("PCI DSS");
  if (t.includes("gdpr") || t.includes("privacy")) frameworks.add("GDPR");
  return frameworks.size ? [...frameworks] : ["SOC 2"];
}

export function documentDescription(title: string, versionNotes: string | null): string {
  if (versionNotes?.trim()) return versionNotes.trim();
  const t = title.toLowerCase();
  if (t.includes("soc 2")) {
    return "Annual SOC 2 Type II audit report covering security, availability, and confidentiality trust service criteria.";
  }
  if (t.includes("iso")) {
    return "Current ISO 27001 certification demonstrating information security management system compliance.";
  }
  if (t.includes("data processing") || t.includes("dpa")) {
    return "Standard data processing agreement template for vendor and customer engagements.";
  }
  return `${title} — compliance document maintained for audit and regulatory purposes.`;
}

export function documentRelatedCounts(documentId: number) {
  return {
    controls: 10 + (documentId % 5),
    evidence: 4 + (documentId % 4),
    policies: 2 + (documentId % 3),
    risks: documentId % 2,
    monitors: documentId % 3 === 0 ? 1 : 0,
  };
}

export function documentFileSizeBytes(documentId: number): number {
  return (2800 + (documentId % 17) * 137) * 1024;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function documentFileName(title: string, fileUrl: string | null): string {
  if (fileUrl) {
    try {
      const part = fileUrl.split("/").pop();
      if (part) return decodeURIComponent(part);
    } catch {
      /* ignore */
    }
  }
  const slug = title.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `${slug}.pdf`;
}

export type DocumentEffectiveStatus = "approved" | "pending" | "expired";

export function documentEffectiveStatus(
  status: string,
  expiresAt: Date | string | null | undefined,
): DocumentEffectiveStatus {
  if (expiresAt) {
    const exp = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    if (!Number.isNaN(exp.getTime()) && exp < new Date()) return "expired";
  }
  const key = status.toLowerCase();
  if (key === "draft" || key === "pending" || key === "in_review") return "pending";
  return "approved";
}

export function isDocumentExpiringSoon(expiresAt: Date | string | null | undefined, withinDays = 90): boolean {
  if (!expiresAt) return false;
  const exp = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(exp.getTime()) || exp < new Date()) return false;
  const days = Math.ceil((exp.getTime() - Date.now()) / 86400000);
  return days <= withinDays;
}
