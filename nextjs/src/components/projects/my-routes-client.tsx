"use client";

import { MapPin, Route as RouteIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { RouteDetailClient } from "@/components/projects/route-detail-client";
import type { EmployeeRoute } from "@/lib/project-routes-data";
import { t } from "@/lib/admin-t";

type Props = {
  route: EmployeeRoute | null;
};

export function MyRoutesClient({ route }: Props) {
  if (route) {
    return <RouteDetailClient route={route} backHref="/projects/my-routes" employeeView />;
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <RouteIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold">{t("No route assigned")}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("There is no active route scheduled for you yet. Check back later or contact dispatch.")}
          </p>
        </div>
        <MapPin className="h-4 w-4 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
