"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/admin-t";


export function HrmSectionPlaceholder({
  section,
  title,
}: {
  section: string;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          {t("This section mirrors Laravel HRM module. Wire to HRM API when available.")}
        </p>
      </CardContent>
    </Card>
  );
}
