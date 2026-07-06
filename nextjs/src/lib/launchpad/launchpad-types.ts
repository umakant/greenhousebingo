/** Client-safe launchpad types (no server imports). */

export type LaunchpadStepId =
  | "verify_email"
  | "brand_settings"
  | "company_profile"
  | "email_delivery"
  | "invite_team"
  | "notification_templates"
  | "payment_setup"
  | "accounting_setup"
  | "project_first"
  | "crm_first_lead"
  | "hrm_first_employee"
  | "lms_first_course"
  | "expense_workspace"
  | "expense_setup"
  | "affiliate_partners"
  | "support_setup"
  | "storefront_launch"
  | "pos_catalog"
  | "recruitment_jobs"
  | "appointment_setup"
  | "whatsapp_setup"
  | "form_builder_form"
  | "review_setup"
  | "go_live";

export type LaunchpadStepSnapshot = {
  id: LaunchpadStepId;
  label: string;
  description: string;
  href: string;
  completed: boolean;
  section: "core" | "module";
  moduleLabel?: string;
  addonScope?: string;
  groupId: string;
  subsectionId: string;
  required: boolean;
  visible: boolean;
};

export type LaunchpadSubsectionSnapshot = {
  id: string;
  title: string;
  description?: string;
  completedCount: number;
  total: number;
  steps: LaunchpadStepSnapshot[];
};

export type LaunchpadGroupSnapshot = {
  id: string;
  title: string;
  description: string;
  optional: boolean;
  completedCount: number;
  total: number;
  subsections: LaunchpadSubsectionSnapshot[];
};

export type LaunchpadPlanInfo = {
  name: string;
  status: "active" | "trial" | "none";
  features: string[];
};

export type LaunchpadActivityItem = {
  id: string;
  message: string;
  timeLabel: string;
};

export type LaunchpadOverviewPayload = {
  steps: LaunchpadStepSnapshot[];
  groups: LaunchpadGroupSnapshot[];
  completedCount: number;
  total: number;
  percent: number;
  coreCompleted: number;
  coreTotal: number;
  nextStep: LaunchpadStepSnapshot | null;
  quickStartChips: string[];
  isCompanyAdmin: boolean;
  companyName: string;
  goLiveTarget: string | null;
  plan: LaunchpadPlanInfo | null;
  recentActivity: LaunchpadActivityItem[];
};
