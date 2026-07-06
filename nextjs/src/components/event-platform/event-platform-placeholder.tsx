"use client";

import { Construction } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EventPlatformPlaceholder(props: {
  title: string;
  description?: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Construction className="h-5 w-5 text-muted-foreground" />
          {props.title}
        </CardTitle>
        {props.description ? <CardDescription>{props.description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This section is wired into the Event Platform module. Configuration UI will be expanded in the next
          implementation pass.
        </p>
      </CardContent>
    </Card>
  );
}
