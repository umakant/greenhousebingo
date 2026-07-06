"use client";

import { Briefcase } from "lucide-react";
import { HrmSimpleCrudAdmin } from "@/components/hrm/hrm-simple-crud-admin";

export default function HrmDesignationsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  return (
    <HrmSimpleCrudAdmin
      apiPath="/api/hrm/designations"
      label="Designation"
      icon={<Briefcase className="h-6 w-6 text-muted-foreground" />}
      canCreate={can("create-designations")}
      canEdit={can("edit-designations")}
      canDelete={can("delete-designations")}
    />
  );
}
