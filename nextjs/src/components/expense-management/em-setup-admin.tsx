"use client";

import * as React from "react";
import { Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HrmSimpleCrudAdmin } from "@/components/hrm/hrm-simple-crud-admin";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/contexts/translation-context";
import { cn } from "@/lib/utils";

type SetupSectionId = "categories";

const SETUP_SECTIONS: Array<{
  id: SetupSectionId;
  titleKey: string;
  descKey: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "categories",
    titleKey: "Categories",
    descKey:
      "Labels used when creating expense lines and in dashboards. Add, edit, or remove categories for your organization.",
    icon: Tags,
  },
];

export default function EmSetupAdmin({ permissions }: { permissions: string[] }) {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const canManage =
    permissions.includes("*") || permissions.includes("manage-expense-management");
  const [active, setActive] = React.useState<SetupSectionId>("categories");

  const section = SETUP_SECTIONS.find((s) => s.id === active)!;
  const SectionIcon = section.icon;

  const onNavClick = (id: SetupSectionId) => setActive(id);

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="md:w-64 flex-shrink-0">
        <div className="md:sticky md:top-4">
          <div className="md:hidden -mx-3 px-3">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {SETUP_SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <Button
                    key={s.id}
                    variant={active === s.id ? "default" : "outline"}
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => onNavClick(s.id)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {t(s.titleKey)}
                  </Button>
                );
              })}
            </div>
          </div>

          <ScrollArea className="hidden md:block h-[min(70vh,calc(100vh-8rem))]">
            <div className="pr-4 space-y-1">
              {SETUP_SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <Button
                    key={s.id}
                    variant="ghost"
                    className={cn("w-full justify-start", active === s.id && "bg-muted font-medium")}
                    onClick={() => onNavClick(s.id)}
                  >
                    <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                    {t(s.titleKey)}
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="pt-4">
          <section id={`sec-${active}`} className="scroll-mt-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <SectionIcon className="h-5 w-5" />
                    {t(section.titleKey)}
                  </CardTitle>
                  <CardDescription className="mt-1">{t(section.descKey)}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {active === "categories" && (
                  <HrmSimpleCrudAdmin
                    apiPath="/api/expense-management/categories"
                    label={t("Category")}
                    icon={<Tags className="h-6 w-6 text-muted-foreground" />}
                    canCreate={canManage}
                    canEdit={canManage}
                    canDelete={canManage}
                    columnStorageKey="pf-em-simple-categories-cols-v1"
                  />
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
