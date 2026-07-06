"use client";

import { Building2 } from "lucide-react";
import { HrmSimpleCrudAdmin } from "@/components/hrm/hrm-simple-crud-admin";

export default function HrmDepartmentsAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  return (
    <HrmSimpleCrudAdmin
      apiPath="/api/hrm/departments"
      label="Department"
      icon={<Building2 className="h-6 w-6 text-muted-foreground" />}
      canCreate={can("create-departments")}
      canEdit={can("edit-departments")}
      canDelete={can("delete-departments")}
    />
  );
}
