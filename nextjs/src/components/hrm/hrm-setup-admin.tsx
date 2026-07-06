"use client";

import * as React from "react";
import { GitBranch, Building2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { HrmSimpleCrudAdmin } from "@/components/hrm/hrm-simple-crud-admin";
import { t } from "@/lib/admin-t";


type SetupSectionId = "branches" | "departments" | "designations";

const SETUP_SECTIONS: Array<{
  id: SetupSectionId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "branches",
    title: "Branches",
    description: "Office or regional branches used when assigning employees and transfers.",
    icon: GitBranch,
  },
  {
    id: "departments",
    title: "Departments",
    description: "Organizational departments for reporting, leave, and headcount.",
    icon: Building2,
  },
  {
    id: "designations",
    title: "Designations",
    description: "Job titles and roles displayed on profiles and HR records.",
    icon: Briefcase,
  },
];

export default function HrmSetupAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");
  const [active, setActive] = React.useState<SetupSectionId>("branches");

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="md:w-64 flex-shrink-0">
        <div className="md:sticky md:top-4">
          <div className="md:hidden -mx-3 px-3">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {SETUP_SECTIONS.map((s) => (
                <Button
                  key={s.id}
                  variant={active === s.id ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => setActive(s.id)}
                >
                  <s.icon className="h-4 w-4 mr-2" />
                  {s.title}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="hidden md:block h-[min(70vh,calc(100vh-8rem))]">
            <div className="pr-4 space-y-1">
              {SETUP_SECTIONS.map((s) => (
                <Button
                  key={s.id}
                  variant="ghost"
                  className={cn("w-full justify-start h-auto py-3", active === s.id && "bg-muted font-medium")}
                  onClick={() => setActive(s.id)}
                >
                  <s.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="text-left">{s.title}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {SETUP_SECTIONS.map((s) =>
          s.id === active ? (
            <section key={s.id} className="scroll-mt-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{s.title}</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{s.description}</p>
              </div>

              {s.id === "branches" && (
                <HrmSimpleCrudAdmin
                  apiPath="/api/hrm/branches"
                  label="Branch"
                  icon={<GitBranch className="h-6 w-6 text-muted-foreground" />}
                  canCreate={can("create-branches")}
                  canEdit={can("edit-branches")}
                  canDelete={can("delete-branches")}
                />
              )}
              {s.id === "departments" && (
                <HrmSimpleCrudAdmin
                  apiPath="/api/hrm/departments"
                  label="Department"
                  icon={<Building2 className="h-6 w-6 text-muted-foreground" />}
                  canCreate={can("create-departments")}
                  canEdit={can("edit-departments")}
                  canDelete={can("delete-departments")}
                />
              )}
              {s.id === "designations" && (
                <HrmSimpleCrudAdmin
                  apiPath="/api/hrm/designations"
                  label="Designation"
                  icon={<Briefcase className="h-6 w-6 text-muted-foreground" />}
                  canCreate={can("create-designations")}
                  canEdit={can("edit-designations")}
                  canDelete={can("delete-designations")}
                />
              )}
            </section>
          ) : null,
        )}
      </div>
    </div>
  );
}
