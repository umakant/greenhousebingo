import type { FormFieldDef } from "@/components/form-builder/form-field-types";

export type ProjectOpsSectionId =
  | "after_action"
  | "agent_checklist"
  | "agents"
  | "medics"
  | "security"
  | "bugs"
  | "checklist"
  | "documents"
  | "files"
  | "incident_reports"
  | "leadership"
  | "lodging"
  | "lost_found"
  | "medical_facilities"
  | "milestones"
  | "tasks"
  | "team"
  | "notes"
  | "position"
  | "risk_assessment"
  | "vendors";

export const PROJECT_OPS_FORM_SECTIONS: {
  id: ProjectOpsSectionId;
  label: string;
}[] = [
  { id: "after_action", label: "After Action" },
  { id: "agent_checklist", label: "Agent Checklist" },
  { id: "agents", label: "Agents" },
  { id: "medics", label: "Medics" },
  { id: "security", label: "Security" },
  { id: "bugs", label: "Bugs" },
  { id: "checklist", label: "Checklist" },
  { id: "documents", label: "Documents" },
  { id: "files", label: "Files" },
  { id: "incident_reports", label: "Incident Reports" },
  { id: "leadership", label: "Leadership" },
  { id: "lodging", label: "Lodging" },
  { id: "lost_found", label: "Lost & Found" },
  { id: "medical_facilities", label: "Medical Facilities" },
  { id: "milestones", label: "Milestones" },
  { id: "tasks", label: "Tasks" },
  { id: "team", label: "Team" },
  { id: "notes", label: "Notes" },
  { id: "position", label: "Position" },
  { id: "risk_assessment", label: "Risk Assessment" },
  { id: "vendors", label: "Vendors" },
];

type TemplateField = Omit<FormFieldDef, "order">;

function f(
  id: string,
  label: string,
  type: string,
  extra: Partial<Pick<FormFieldDef, "placeholder" | "required" | "options">> & { bindKey?: string } = {},
): TemplateField {
  const { bindKey, ...rest } = extra;
  let options: unknown;
  if (bindKey != null) {
    if (Array.isArray(rest.options)) {
      options = { bindKey, choices: rest.options };
    } else if (rest.options && typeof rest.options === "object") {
      options = { ...(rest.options as Record<string, unknown>), bindKey };
    } else {
      options = { bindKey };
    }
  } else {
    options = rest.options !== undefined ? rest.options : [];
  }
  return {
    id,
    label,
    type,
    required: rest.required ?? false,
    placeholder: rest.placeholder ?? "",
    options,
  };
}

function withOrder(fields: TemplateField[]): FormFieldDef[] {
  return fields.map((field, order) => ({ ...field, order }));
}

const PHASE_OPTIONS = ["pre_project", "project", "post_project"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High"];
const SEVERITY_OPTIONS = ["low", "medium", "high"];
const LOST_FOUND_STATUS = ["unclaimed", "claimed", "returned"];
const FACILITY_TYPES = ["hospital", "urgent_care", "pharmacy"];
const MILESTONE_STATUS = ["Incomplete", "Complete"];
const ASSIGN_MODE = ["existing", "new"];

export function getProjectOpsSectionLabel(sectionId: ProjectOpsSectionId): string {
  return PROJECT_OPS_FORM_SECTIONS.find((s) => s.id === sectionId)?.label ?? sectionId;
}

export function getProjectOpsFormTemplate(sectionId: ProjectOpsSectionId): {
  name: string;
  default_layout: string;
  fields: FormFieldDef[];
} {
  const label = getProjectOpsSectionLabel(sectionId);
  const name = `Project — ${label}`;

  switch (sectionId) {
    case "after_action":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_aa_summary", "Event Summary", "textarea", {
            bindKey: "event_summary",
            placeholder: "Describe the event, date range, number of agents deployed, and overall result…",
          }),
          f("po_aa_well", "What Went Well", "textarea", { bindKey: "went_well", placeholder: "Bullet points — what went well" }),
          f("po_aa_improve", "Areas for Improvement", "textarea", { bindKey: "improvements", placeholder: "Areas to improve" }),
          f("po_aa_actions", "Action Items / Follow-Ups", "textarea", { bindKey: "action_items", placeholder: "Follow-up actions" }),
          f("po_aa_staff", "Staff Performance", "textarea", { bindKey: "staff_performance", placeholder: "Staff performance notes" }),
        ]),
      };

    case "agent_checklist":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_ac_confirmed", "Confirmed", "checkbox", { bindKey: "confirmed" }),
          f("po_ac_whatsapp", "WhatsApp", "checkbox", { bindKey: "whatsapp" }),
          f("po_ac_housing", "Housing", "checkbox", { bindKey: "housing" }),
          f("po_ac_attire", "Attire", "checkbox", { bindKey: "attire" }),
          f("po_ac_meals", "Meals", "checkbox", { bindKey: "meals" }),
          f("po_ac_parking", "Parking", "checkbox", { bindKey: "parking" }),
          f("po_ac_policy", "Policy", "checkbox", { bindKey: "policy" }),
          f("po_ac_checkin", "Check-In", "checkbox", { bindKey: "check_in" }),
          f("po_ac_hotel", "Hotel Security", "checkbox", { bindKey: "hotel_security" }),
        ]),
      };

    case "agents":
    case "medics":
    case "security":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_st_mode", "Assignment mode", "radio", {
            bindKey: "assignment_mode",
            required: true,
            options: ASSIGN_MODE,
          }),
          f("po_st_user", "Select from roster", "project_roster", {
            bindKey: "user_id",
            options: { role: sectionId === "medics" ? "medic" : sectionId === "security" ? "security" : "agent" },
          }),
          f("po_st_fname", "First name", "text", { bindKey: "first_name" }),
          f("po_st_lname", "Last name", "text", { bindKey: "last_name" }),
          f("po_st_name", "Full name", "text", { bindKey: "name" }),
          f("po_st_email", "Email", "email", { bindKey: "email", required: true }),
          f("po_st_start", "Start date", "date", { bindKey: "work_date" }),
          f("po_st_end", "End date", "date", { bindKey: "end_date" }),
          f("po_st_start_time", "Start time", "time", { bindKey: "start_time" }),
          f("po_st_end_time", "End time", "time", { bindKey: "end_time" }),
          f("po_st_position", "Position", "text", { bindKey: "position" }),
        ]),
      };

    case "bugs":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_bug_title", "Title", "text", { bindKey: "title", required: true, placeholder: "Bug title" }),
          f("po_bug_priority", "Priority", "select", { bindKey: "priority", options: PRIORITY_OPTIONS }),
          f("po_bug_stage", "Stage", "project_stages", { bindKey: "stage_id", options: { stageKind: "bug" } }),
          f("po_bug_desc", "Description", "textarea", { bindKey: "description" }),
          f("po_bug_assigned", "Assigned to", "project_members", { bindKey: "assigned_to" }),
        ]),
      };

    case "checklist":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_cl_name", "Task name", "text", { bindKey: "name", required: true, placeholder: "Checklist item" }),
          f("po_cl_phase", "Phase", "select", { bindKey: "phase", options: PHASE_OPTIONS }),
        ]),
      };

    case "documents":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_doc_title", "Title", "text", { bindKey: "title", placeholder: "Document title" }),
          f("po_doc_cat", "Category", "text", { bindKey: "category", placeholder: "Security Plan" }),
          f("po_doc_file", "File", "file", { bindKey: "file", required: true }),
        ]),
      };

    case "files":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_file_title", "Title", "text", { bindKey: "title", placeholder: "File title" }),
          f("po_file_cat", "Category", "text", { bindKey: "category", placeholder: "General" }),
          f("po_file_upload", "File", "file", { bindKey: "file", required: true }),
        ]),
      };

    case "incident_reports":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_ir_title", "Title", "text", { bindKey: "title", required: true }),
          f("po_ir_desc", "Description", "textarea", { bindKey: "description" }),
          f("po_ir_loc", "Location", "text", { bindKey: "location" }),
          f("po_ir_sev", "Severity", "select", { bindKey: "severity", options: SEVERITY_OPTIONS }),
        ]),
      };

    case "leadership":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_lead_user", "Lead agent", "project_roster", {
            bindKey: "user_id",
            required: true,
            options: { role: "all" },
          }),
        ]),
      };

    case "lodging":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_lod_name", "Hotel name", "text", { bindKey: "name", required: true }),
          f("po_lod_addr", "Address", "text", { bindKey: "address" }),
        ]),
      };

    case "lost_found":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_lf_item", "Item name", "text", { bindKey: "item_name", required: true, placeholder: "e.g. Black backpack" }),
          f("po_lf_desc", "Description", "textarea", { bindKey: "description" }),
          f("po_lf_date", "Found date", "date", { bindKey: "found_date" }),
          f("po_lf_loc", "Found location", "text", { bindKey: "found_location", placeholder: "e.g. Main stage area" }),
          f("po_lf_by", "Found by", "project_roster", { bindKey: "found_by_user_id", options: { role: "all" } }),
          f("po_lf_status", "Status", "select", { bindKey: "status", options: LOST_FOUND_STATUS }),
          f("po_lf_notes", "Notes", "textarea", { bindKey: "notes" }),
          f("po_lf_photo", "Photo", "file", { bindKey: "photo" }),
        ]),
      };

    case "medical_facilities":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_mf_type", "Facility type", "select", { bindKey: "facility_type", options: FACILITY_TYPES }),
          f("po_mf_name", "Facility name", "text", { bindKey: "name", required: true }),
          f("po_mf_addr", "Address", "text", { bindKey: "address" }),
          f("po_mf_phone", "Phone", "tel", { bindKey: "phone" }),
          f("po_mf_dist", "Distance / travel time", "text", { bindKey: "distance" }),
          f("po_mf_notes", "Notes", "textarea", { bindKey: "notes" }),
        ]),
      };

    case "milestones":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_ms_title", "Title", "text", { bindKey: "title", required: true }),
          f("po_ms_cost", "Cost", "text", { bindKey: "cost" }),
          f("po_ms_start", "Start date", "date", { bindKey: "start_date" }),
          f("po_ms_end", "End date", "date", { bindKey: "end_date" }),
          f("po_ms_status", "Status", "select", { bindKey: "status", options: MILESTONE_STATUS }),
          f("po_ms_progress", "Progress (%)", "number", { bindKey: "progress" }),
          f("po_ms_summary", "Summary", "textarea", { bindKey: "summary" }),
        ]),
      };

    case "tasks":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_task_title", "Title", "text", { bindKey: "title", required: true }),
          f("po_task_priority", "Priority", "select", { bindKey: "priority", options: PRIORITY_OPTIONS }),
          f("po_task_stage", "Stage", "project_stages", { bindKey: "stage_id", options: { stageKind: "task" } }),
          f("po_task_milestone", "Milestone", "project_milestones", { bindKey: "milestone_id" }),
          f("po_task_start", "Start date", "date", { bindKey: "start_date" }),
          f("po_task_end", "End date", "date", { bindKey: "end_date" }),
          f("po_task_desc", "Description", "textarea", { bindKey: "description" }),
          f("po_task_assigned", "Assigned to", "project_members", { bindKey: "assigned_to" }),
        ]),
      };

    case "team":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_team_user", "Team member", "project_users", {
            bindKey: "user_id",
            required: true,
            placeholder: "Search and select a user…",
          }),
        ]),
      };

    case "notes":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_note_content", "Note", "textarea", { bindKey: "content", required: true, placeholder: "Add a note…" }),
        ]),
      };

    case "position":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_pos_name", "Position name", "text", { bindKey: "name", required: true, placeholder: "New position" }),
        ]),
      };

    case "risk_assessment":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_risk_title", "Title", "text", { bindKey: "title", placeholder: "Document title" }),
          f("po_risk_cat", "Category", "text", { bindKey: "category", placeholder: "Risk Assessment" }),
          f("po_risk_file", "File", "file", { bindKey: "file", required: true }),
        ]),
      };

    case "vendors":
      return {
        name,
        default_layout: "single",
        fields: withOrder([
          f("po_v_mode", "Vendor source", "radio", { bindKey: "vendor_mode", options: ASSIGN_MODE }),
          f("po_v_id", "Existing vendor", "project_vendors", { bindKey: "vendor_id" }),
          f("po_v_name", "Name", "text", { bindKey: "name" }),
          f("po_v_email", "Email", "email", { bindKey: "email" }),
          f("po_v_phone", "Phone", "tel", { bindKey: "phone" }),
        ]),
      };

    default:
      return { name, default_layout: "single", fields: [] };
  }
}

export function isProjectOpsSectionId(value: string): value is ProjectOpsSectionId {
  return PROJECT_OPS_FORM_SECTIONS.some((s) => s.id === value);
}
