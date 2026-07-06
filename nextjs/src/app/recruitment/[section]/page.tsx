import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { RecruitmentSectionContent } from "@/components/recruitment/recruitment-section-content";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";


const SECTION_TITLES: Record<string, string> = {
  "job-locations": t("Job Locations"),
  "custom-questions": t("Custom Questions"),
  "job-postings": t("Job Postings"),
  candidates: t("Candidates"),
  "interview-rounds": t("Interview Rounds"),
  interviews: t("Interviews"),
  "interview-feedbacks": t("Interview Feedback"),
  "candidate-assessments": t("Candidate Assessments"),
  "checklist-items": t("Checklist Items"),
  onboarding: t("Candidate Onboarding"),
  setup: t("System Setup"),
};

export default async function RecruitmentSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const { section } = await params;
  const title =
    SECTION_TITLES[section] ??
    section.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Recruitment Dashboard"), url: "/recruitment" },
        { label: title },
      ]}
      pageTitle={title}
    >
      <RecruitmentSectionContent section={section} permissions={permissions} />
    </AuthenticatedLayout>
  );
}
