"use client";

import * as React from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function SettingsSectionShell({
  title,
  description,
  icon: Icon,
  canEdit = true,
  onSave,
  saving,
  saveLabel = "Save Changes",
  actions,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  canEdit?: boolean;
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {actions ? (
          actions
        ) : canEdit && onSave ? (
          <Button onClick={onSave} disabled={saving} size="sm" className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : saveLabel}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export type SettingsSidebarSection = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function SettingsSidebarLayout({
  sections,
  active,
  onSelect,
  children,
}: {
  sections: SettingsSidebarSection[];
  active: string;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="md:w-64 flex-shrink-0">
        <div className="md:sticky md:top-4">
          <div className="md:hidden -mx-3 px-3">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sections.map((s) => (
                <Button
                  key={s.id}
                  variant={active === s.id ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => onSelect(s.id)}
                >
                  <s.icon className="h-4 w-4 mr-2" />
                  {s.title}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="hidden md:block h-[min(70vh,calc(100vh-8rem))]">
            <div className="pr-4 space-y-1">
              {sections.map((s) => (
                <Button
                  key={s.id}
                  variant="ghost"
                  className={cn("w-full justify-start", active === s.id && "bg-muted font-medium")}
                  onClick={() => onSelect(s.id)}
                >
                  <s.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                  {s.title}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <div className="flex-1 min-w-0 pt-4 md:pt-0">{children}</div>
    </div>
  );
}
