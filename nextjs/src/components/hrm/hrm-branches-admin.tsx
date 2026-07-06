"use client";

import { GitBranch } from "lucide-react";
import { HrmSimpleCrudAdmin } from "@/components/hrm/hrm-simple-crud-admin";

export default function HrmBranchesAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  return (
    <HrmSimpleCrudAdmin
      apiPath="/api/hrm/branches"
      label="Branch"
      icon={<GitBranch className="h-6 w-6 text-muted-foreground" />}
      canCreate={can("create-branches")}
      canEdit={can("edit-branches")}
      canDelete={can("delete-branches")}
    />
  );
}
