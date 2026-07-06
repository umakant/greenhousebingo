export function vendorCategoryFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("aws") || n.includes("amazon")) return "Cloud Infrastructure";
  if (n.includes("google workspace") || n.includes("microsoft")) return "SaaS";
  if (n.includes("okta")) return "Security";
  if (n.includes("datadog")) return "Monitoring";
  if (n.includes("payroll")) return "Payroll";
  if (n.includes("github")) return "DevOps";
  return "SaaS";
}

export function vendorCategoryShort(name: string): string {
  const full = vendorCategoryFromName(name);
  if (full.includes("Cloud")) return "Cloud";
  if (full.includes("Security")) return "Security";
  if (full.includes("Monitoring")) return "Monitoring";
  if (full.includes("Payroll")) return "HR";
  return "SaaS";
}

export function vendorFrameworksFromName(name: string): string[] {
  const n = name.toLowerCase();
  const frameworks = new Set<string>();
  if (n.includes("aws") || n.includes("amazon") || n.includes("microsoft") || n.includes("google") || n.includes("okta")) {
    frameworks.add("SOC 2");
    frameworks.add("ISO 27001");
  }
  if (n.includes("aws") || n.includes("datadog")) frameworks.add("PCI DSS");
  if (n.includes("google") || n.includes("microsoft") || n.includes("payroll")) frameworks.add("HIPAA");
  if (n.includes("google") || n.includes("microsoft")) frameworks.add("GDPR");
  return frameworks.size ? [...frameworks] : ["SOC 2"];
}

export function vendorWebsiteFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("aws") || n.includes("amazon")) return "https://aws.amazon.com";
  if (n.includes("google")) return "https://workspace.google.com";
  if (n.includes("microsoft")) return "https://www.microsoft.com/microsoft-365";
  if (n.includes("okta")) return "https://www.okta.com";
  if (n.includes("datadog")) return "https://www.datadoghq.com";
  return "https://vendor.example.com";
}

export function vendorDisplayName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("amazon web services") || n === "amazon web services") return "AWS (Amazon Web Services)";
  if (n.includes("microsoft 365")) return "Microsoft 365";
  if (n.includes("google workspace")) return "Google Workspace";
  return name;
}

export type VendorDisplayStatus = "active" | "under_review";

export function vendorDisplayStatus(reviewStatus: string): VendorDisplayStatus {
  if (reviewStatus === "completed") return "active";
  return "under_review";
}

export function vendorRiskScore(riskTier: string, id: number): number {
  switch (riskTier) {
    case "critical":
    case "high":
      return 75 + (id % 15);
    case "medium":
      return 45 + (id % 20);
    case "low":
      return 15 + (id % 15);
    default:
      return 50;
  }
}

export function vendorInherentRisk(riskTier: string): string {
  if (riskTier === "critical" || riskTier === "high") return "High";
  if (riskTier === "medium") return "Medium";
  return "Low";
}

export function vendorResidualRisk(riskTier: string, id: number): { label: string; score: number } {
  const inherent = vendorRiskScore(riskTier, id);
  const score = Math.max(10, Math.round(inherent * 0.55));
  const label = score >= 60 ? "High" : score >= 35 ? "Medium" : "Low";
  return { label, score };
}

export function vendorContractEndDate(id: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1 + (id % 2));
  d.setMonth(11);
  d.setDate(31);
  return d.toISOString();
}

export function vendorContractStartDate(id: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  d.setMonth(0);
  d.setDate(1);
  return d.toISOString();
}

export function daysUntilDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  return `${days} days left`;
}

export function certStatusLabel(
  key: string | null | undefined,
  vendorId: number,
  type: "soc2" | "iso" | "pci" | "hipaa" | "gdpr",
): { label: string; tone: "success" | "muted" | "warning" } {
  if (!key || key === "not_applicable") {
    if (type === "pci") return { label: "Not Applicable", tone: "muted" };
    return { label: "—", tone: "muted" };
  }
  if (key === "valid" || key === "signed" || key === "in_progress") {
    const d = new Date();
    d.setMonth(d.getMonth() + (vendorId % 8) + 3);
    const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (type === "hipaa" || type === "gdpr") return { label: "Signed", tone: "success" };
    return { label: `Valid until ${formatted}`, tone: "success" };
  }
  return { label: key.replace(/_/g, " "), tone: "warning" };
}

export function vendorRelatedCounts(vendorId: number) {
  return {
    documents: 2 + (vendorId % 4),
    reviews: 1 + (vendorId % 3),
    risks: vendorId % 2,
  };
}

export function reviewDueTone(dueDate: string | null | undefined, reviewStatus: string): "success" | "warning" | "info" {
  if (reviewStatus === "pending") return "info";
  if (!dueDate) return "success";
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  if (days <= 45) return "warning";
  return "success";
}
