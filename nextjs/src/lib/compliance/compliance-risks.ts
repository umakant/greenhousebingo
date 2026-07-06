import {
  COMPLIANCE_IMPACT_LEVELS,
  COMPLIANCE_LIKELIHOOD_LEVELS,
  computeRiskScore,
  riskMatrixLabel,
} from "@/lib/compliance/compliance-day2";

export function riskCategoryFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("breach") || t.includes("encryption") || t.includes("mfa") || t.includes("access") || t.includes("s3")) {
    return "Security";
  }
  if (t.includes("vendor") || t.includes("third party") || t.includes("saas")) return "Vendor";
  if (t.includes("employee") || t.includes("training") || t.includes("people") || t.includes("hr")) return "People";
  if (t.includes("compliance") || t.includes("policy") || t.includes("audit")) return "Compliance";
  if (t.includes("legacy") || t.includes("system")) return "Technology";
  return "Operational";
}

export function riskDescription(title: string, description: string | null): string {
  if (description?.trim()) return description.trim();
  const t = title.toLowerCase();
  if (t.includes("breach") || t.includes("unauthorized")) {
    return "Unauthorized access to sensitive customer or employee data through compromised credentials or misconfigured systems.";
  }
  if (t.includes("mfa") || t.includes("legacy")) {
    return "Legacy systems or user accounts without multi-factor authentication increase the likelihood of account takeover.";
  }
  if (t.includes("s3") || t.includes("encryption")) {
    return "Misconfigured cloud storage or missing encryption controls could expose regulated data to unauthorized parties.";
  }
  return `${title} — identified risk requiring assessment, mitigation, and ongoing monitoring.`;
}

export function riskCode(id: number): string {
  return `R${id}`;
}

export function impactWeightValue(impact: string): number {
  return COMPLIANCE_IMPACT_LEVELS.find((x) => x.value === impact)?.weight ?? 3;
}

export function likelihoodWeightValue(likelihood: string): number {
  return COMPLIANCE_LIKELIHOOD_LEVELS.find((x) => x.value === likelihood)?.weight ?? 3;
}

export function impactDisplayLabel(impact: string): string {
  const item = COMPLIANCE_IMPACT_LEVELS.find((x) => x.value === impact);
  if (!item) return impact;
  if (item.value === "critical") return "Critical";
  if (item.value === "high") return "Major";
  return item.label;
}

export function likelihoodDisplayLabel(likelihood: string): string {
  return COMPLIANCE_LIKELIHOOD_LEVELS.find((x) => x.value === likelihood)?.label ?? likelihood;
}

export function riskAppetite(riskLevel: string): string {
  const level = riskLevel.toLowerCase();
  if (level === "critical" || level === "high") return "Low";
  if (level === "medium") return "Medium";
  return "High";
}

export function riskRelatedCounts(riskId: number) {
  return {
    controls: 2 + (riskId % 4),
    policies: 1 + (riskId % 3),
    incidents: riskId % 2,
    vendors: riskId % 3 === 0 ? 1 : 0,
    evidence: 3 + (riskId % 3),
  };
}

export function nextReviewDate(lastReviewedAt: string | null | undefined, dueDate: string | null | undefined): string | null {
  if (dueDate) return dueDate;
  if (!lastReviewedAt) return null;
  const next = new Date(lastReviewedAt);
  if (Number.isNaN(next.getTime())) return null;
  next.setFullYear(next.getFullYear() + 1);
  return next.toISOString();
}

export function daysUntilReview(value: string | null | undefined): string | null {
  if (!value) return null;
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  return `in ${days} days`;
}

export function riskLevelBucket(riskLevel: string): "high" | "medium" | "low" | "minimal" {
  const level = riskLevel.toLowerCase();
  if (level === "critical" || level === "high") return "high";
  if (level === "medium") return "medium";
  if (level === "low") return "low";
  return "minimal";
}

export function buildRiskMatrix(items: Array<{ impact: string; likelihood: string }>): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, r) => {
    const key = `${r.impact}:${r.likelihood}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export function matrixCellScore(impact: string, likelihood: string): number {
  return computeRiskScore(impact, likelihood);
}

export function matrixCellTone(score: number): "critical" | "high" | "medium" | "low" | "minimal" {
  const level = riskMatrixLabel(score).toLowerCase();
  if (level === "critical") return "critical";
  if (level === "high") return "high";
  if (level === "medium") return "medium";
  if (level === "low") return "low";
  return "minimal";
}

export { COMPLIANCE_IMPACT_LEVELS, COMPLIANCE_LIKELIHOOD_LEVELS, computeRiskScore, riskMatrixLabel };
