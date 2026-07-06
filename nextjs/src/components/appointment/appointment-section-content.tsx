"use client";

import dynamic from "next/dynamic";

const AppointmentAppointmentsAdmin = dynamic(() => import("@/components/appointment/appointment-appointments-admin"), { ssr: false });
const AppointmentQuestionsAdmin = dynamic(() => import("@/components/appointment/appointment-questions-admin"), { ssr: false });
const AppointmentSchedulesAdmin = dynamic(() => import("@/components/appointment/appointment-schedules-admin"), { ssr: false });
const AppointmentCallbacksAdmin = dynamic(() => import("@/components/appointment/appointment-callbacks-admin"), { ssr: false });
const AppointmentSetupAdmin = dynamic(() => import("@/components/appointment/appointment-setup-admin"), { ssr: false });

export function AppointmentSectionContent({ section, permissions }: { section: string; permissions: string[] }) {
  switch (section) {
    case "appointments":
      return <AppointmentAppointmentsAdmin permissions={permissions} />;
    case "questions":
      return <AppointmentQuestionsAdmin permissions={permissions} />;
    case "schedules":
      return <AppointmentSchedulesAdmin permissions={permissions} />;
    case "callbacks":
      return <AppointmentCallbacksAdmin permissions={permissions} />;
    case "setup":
      return <AppointmentSetupAdmin permissions={permissions} />;
    default:
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="text-lg font-medium">Section not found</div>
          <div className="text-sm mt-1">&ldquo;{section}&rdquo; is not a recognized Appointment section.</div>
        </div>
      );
  }
}
