/** Sidebar sections configurable per project (Project Setup). */
export const PROJECT_SIDEBAR_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "checklist", label: "Checklist" },
  { id: "agent_checklist", label: "Agent Checklist" },
  { id: "vendors", label: "Vendors" },
  { id: "agents", label: "Agents" },
  { id: "medics", label: "Medics" },
  { id: "security", label: "Security" },
  { id: "schedule", label: "Schedule" },
  { id: "lodging", label: "Lodging" },
  { id: "locations", label: "Locations" },
  { id: "documents", label: "Documents" },
  { id: "risk_assessment", label: "Risk Assessment" },
  { id: "notes", label: "Notes" },
  { id: "leadership", label: "Leadership" },
  { id: "activity", label: "Activity" },
  { id: "reports", label: "Reports" },
  { id: "incident_reports", label: "Incident Reports" },
  { id: "medical_facilities", label: "Medical Facilities" },
  { id: "lost_found", label: "Lost & Found" },
  { id: "after_action", label: "After Action" },
  { id: "position", label: "Position" },
  { id: "project_details", label: "Project Details" },
  { id: "missions", label: "Missions" },
  { id: "tasks", label: "Tasks" },
  { id: "bugs", label: "Bugs" },
  { id: "milestones", label: "Milestones" },
  { id: "team", label: "Team" },
  { id: "files", label: "Files" },
  { id: "sow", label: "SOW" },
] as const;

export type ProjectSidebarSectionId = (typeof PROJECT_SIDEBAR_SECTIONS)[number]["id"];

export const DEFAULT_PROJECT_VISIBLE_SECTIONS: Record<string, boolean> = Object.fromEntries(
  PROJECT_SIDEBAR_SECTIONS.map((s) => [s.id, true]),
);

export function normalizeProjectVisibleSections(
  raw: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  const base = { ...DEFAULT_PROJECT_VISIBLE_SECTIONS };
  if (!raw || typeof raw !== "object") return base;
  for (const section of PROJECT_SIDEBAR_SECTIONS) {
    if (typeof raw[section.id] === "boolean") base[section.id] = raw[section.id];
  }
  // Overview is always available
  base.overview = true;
  return base;
}

export function isProjectSectionVisible(
  sectionId: string,
  visible: Record<string, boolean> | null | undefined,
): boolean {
  if (sectionId === "overview") return true;
  const normalized = normalizeProjectVisibleSections(visible);
  return normalized[sectionId] !== false;
}

/** Overview stays first; remaining visible sections sort A–Z by label. */
export function sortProjectNavSections<T extends { id: string }>(
  sections: T[],
  labelFor: (section: T) => string,
): T[] {
  const overview = sections.filter((s) => s.id === "overview");
  const rest = sections
    .filter((s) => s.id !== "overview")
    .sort((a, b) => labelFor(a).localeCompare(labelFor(b), undefined, { sensitivity: "base" }));
  return [...overview, ...rest];
}
