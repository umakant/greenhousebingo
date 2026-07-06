"use client";

import dynamic from "next/dynamic";

const HrmSetupAdmin = dynamic(() => import("@/components/hrm/hrm-setup-admin"), { ssr: false });
const HrmEmployeesAdmin = dynamic(() => import("@/components/hrm/hrm-employees-admin"), { ssr: false });
const HrmShiftsAdmin = dynamic(() => import("@/components/hrm/hrm-shifts-admin"), { ssr: false });
const HrmAttendancesAdmin = dynamic(() => import("@/components/hrm/hrm-attendances-admin"), { ssr: false });
const HrmLeaveTypesAdmin = dynamic(() => import("@/components/hrm/hrm-leave-types-admin"), { ssr: false });
const HrmLeaveApplicationsAdmin = dynamic(() => import("@/components/hrm/hrm-leave-applications-admin"), { ssr: false });
const HrmLeaveBalanceAdmin = dynamic(() => import("@/components/hrm/hrm-leave-balance-admin"), { ssr: false });
const HrmHolidaysAdmin = dynamic(() => import("@/components/hrm/hrm-holidays-admin"), { ssr: false });
const HrmAwardsAdmin = dynamic(() => import("@/components/hrm/hrm-awards-admin"), { ssr: false });
const HrmPromotionsAdmin = dynamic(() => import("@/components/hrm/hrm-promotions-admin"), { ssr: false });
const HrmResignationsAdmin = dynamic(() => import("@/components/hrm/hrm-resignations-admin"), { ssr: false });
const HrmTerminationsAdmin = dynamic(() => import("@/components/hrm/hrm-terminations-admin"), { ssr: false });
const HrmWarningsAdmin = dynamic(() => import("@/components/hrm/hrm-warnings-admin"), { ssr: false });
const HrmComplaintsAdmin = dynamic(() => import("@/components/hrm/hrm-complaints-admin"), { ssr: false });
const HrmTransfersAdmin = dynamic(() => import("@/components/hrm/hrm-transfers-admin"), { ssr: false });
const HrmDocumentsAdmin = dynamic(() => import("@/components/hrm/hrm-documents-admin"), { ssr: false });
const HrmSetSalaryAdmin = dynamic(() => import("@/components/hrm/hrm-set-salary-admin"), { ssr: false });
const HrmPayrollsAdmin = dynamic(() => import("@/components/hrm/hrm-payrolls-admin"), { ssr: false });
const HrmAnnouncementsAdmin = dynamic(() => import("@/components/hrm/hrm-announcements-admin"), { ssr: false });
const HrmEventsAdmin = dynamic(() => import("@/components/hrm/hrm-events-admin"), { ssr: false });
const HrmAcknowledgmentsAdmin = dynamic(() => import("@/components/hrm/hrm-acknowledgments-admin"), { ssr: false });
const HrmBranchesAdmin = dynamic(() => import("@/components/hrm/hrm-branches-admin"), { ssr: false });
const HrmDepartmentsAdmin = dynamic(() => import("@/components/hrm/hrm-departments-admin"), { ssr: false });
const HrmDesignationsAdmin = dynamic(() => import("@/components/hrm/hrm-designations-admin"), { ssr: false });

export function HrmSectionContent({ section, permissions }: { section: string; permissions: string[] }) {
  switch (section) {
    case "setup":
      return <HrmSetupAdmin permissions={permissions} />;
    case "employees":
      return <HrmEmployeesAdmin permissions={permissions} />;
    case "shifts":
      return <HrmShiftsAdmin permissions={permissions} />;
    case "attendances":
      return <HrmAttendancesAdmin permissions={permissions} />;
    case "leave-types":
      return <HrmLeaveTypesAdmin permissions={permissions} />;
    case "leave-applications":
      return <HrmLeaveApplicationsAdmin permissions={permissions} />;
    case "leave-balance":
      return <HrmLeaveBalanceAdmin permissions={permissions} />;
    case "holidays":
      return <HrmHolidaysAdmin permissions={permissions} />;
    case "awards":
      return <HrmAwardsAdmin permissions={permissions} />;
    case "promotions":
      return <HrmPromotionsAdmin permissions={permissions} />;
    case "resignations":
      return <HrmResignationsAdmin permissions={permissions} />;
    case "terminations":
      return <HrmTerminationsAdmin permissions={permissions} />;
    case "warnings":
      return <HrmWarningsAdmin permissions={permissions} />;
    case "complaints":
      return <HrmComplaintsAdmin permissions={permissions} />;
    case "transfers":
      return <HrmTransfersAdmin permissions={permissions} />;
    case "documents":
      return <HrmDocumentsAdmin permissions={permissions} />;
    case "set-salary":
      return <HrmSetSalaryAdmin permissions={permissions} />;
    case "payrolls":
      return <HrmPayrollsAdmin permissions={permissions} />;
    case "announcements":
      return <HrmAnnouncementsAdmin permissions={permissions} />;
    case "events":
      return <HrmEventsAdmin permissions={permissions} />;
    case "acknowledgments":
      return <HrmAcknowledgmentsAdmin permissions={permissions} />;
    case "branches":
      return <HrmBranchesAdmin permissions={permissions} />;
    case "departments":
      return <HrmDepartmentsAdmin permissions={permissions} />;
    case "designations":
      return <HrmDesignationsAdmin permissions={permissions} />;
    default:
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="text-lg font-medium">Section not found</div>
          <div className="text-sm mt-1">&ldquo;{section}&rdquo; is not a recognized HRM section.</div>
        </div>
      );
  }
}
