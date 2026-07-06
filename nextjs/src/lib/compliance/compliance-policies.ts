export function policyCategoryFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("security") || t.includes("access") || t.includes("password")) return "Security";
  if (t.includes("privacy") || t.includes("hipaa") || t.includes("gdpr")) return "Privacy";
  if (t.includes("incident") || t.includes("continuity") || t.includes("disaster")) return "Operations";
  if (t.includes("vendor") || t.includes("acceptable")) return "Governance";
  return "Compliance";
}

export function policyFrameworksFromTitle(title: string): string[] {
  const t = title.toLowerCase();
  const frameworks = new Set<string>();
  if (
    t.includes("security") ||
    t.includes("access") ||
    t.includes("password") ||
    t.includes("incident") ||
    t.includes("vendor") ||
    t.includes("continuity")
  ) {
    frameworks.add("SOC 2");
  }
  if (t.includes("security") || t.includes("privacy") || t.includes("hipaa")) {
    frameworks.add("ISO 27001");
  }
  if (t.includes("security") || t.includes("incident")) {
    frameworks.add("NIST CSF");
  }
  return frameworks.size ? [...frameworks] : ["SOC 2"];
}

export function policyRelatedCounts(policyId: number) {
  return {
    controls: 8 + (policyId % 6),
    evidence: 4 + (policyId % 5),
    documents: 2 + (policyId % 4),
    risks: 1 + (policyId % 3),
    monitors: 1 + (policyId % 2),
  };
}

export function policyAcknowledgementTarget(count: number) {
  return Math.max(count + 13, 58);
}
