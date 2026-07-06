/** Ops tabs the lead agent may be granted access to per project. */
export const PROJECT_LEAD_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "checklist", label: "Checklist" },
  { id: "agent_checklist", label: "Agent Checklist" },
  { id: "vendors", label: "Vendors" },
  { id: "agents", label: "Agents" },
  { id: "medics", label: "Medics" },
  { id: "security", label: "Security" },
  { id: "lodging", label: "Lodging" },
  { id: "locations", label: "Locations" },
  { id: "documents", label: "Documents" },
  { id: "risk_assessment", label: "Risk Assessment" },
  { id: "notes", label: "Notes" },
  { id: "leadership", label: "Leadership" },
  { id: "activity", label: "Activity Log" },
  { id: "reports", label: "Reports" },
  { id: "incident_reports", label: "Incident Reports" },
  { id: "medical_facilities", label: "Medical Facilities" },
  { id: "lost_found", label: "Lost & Found" },
  { id: "after_action", label: "After Action" },
  { id: "position", label: "Position" },
  { id: "sow", label: "SOW" },
] as const;

export type ProjectLeadSectionId = (typeof PROJECT_LEAD_SECTIONS)[number]["id"];

export const DEFAULT_LEAD_SECTION_ACCESS: Record<string, boolean> = Object.fromEntries(
  PROJECT_LEAD_SECTIONS.map((s) => [s.id, true]),
);

export function normalizeLeadSectionAccess(
  raw: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  const base = { ...DEFAULT_LEAD_SECTION_ACCESS };
  if (!raw || typeof raw !== "object") return base;
  for (const section of PROJECT_LEAD_SECTIONS) {
    if (typeof raw[section.id] === "boolean") base[section.id] = raw[section.id];
  }
  return base;
}

export const PROJECT_TIMEZONE_OPTIONS = [
  "Eastern Time (ET)",
  "Central Time (CT)",
  "Mountain Time (MT)",
  "Pacific Time (PT)",
  "Alaska Time (AKT)",
  "Hawaii Time (HT)",
] as const;
