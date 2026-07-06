"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LmsGdprConsent({ text, onAccept }: { text: string; onAccept: () => void }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="text-base">Privacy & cookies</CardTitle>
          <CardDescription>GDPR compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{text}</p>
          <Button type="button" onClick={onAccept}>
            Accept and continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
