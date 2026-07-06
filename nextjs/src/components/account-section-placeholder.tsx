"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/admin-t";


export function AccountSectionPlaceholder({ section, title }: { section: string; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          {t("This section mirrors Laravel Account module. Wire to Account API when available.")}
        </p>
      </CardContent>
    </Card>
  );
}
