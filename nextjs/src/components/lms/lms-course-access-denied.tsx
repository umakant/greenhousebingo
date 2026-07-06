"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lmsAccessDenialCta, lmsAccessDenialMessage } from "@/lib/lms-access-messages";

export function LmsCourseAccessDenied(props: {
  code?: string;
  message?: string;
  courseTitle?: string;
  showEnrollHint?: boolean;
  courseId?: string;
}) {
  const { code, message, courseTitle, showEnrollHint, courseId } = props;
  const copy = message?.trim() || lmsAccessDenialMessage(code);
  const cta = lmsAccessDenialCta(code);

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-base">Course access restricted</CardTitle>
        {courseTitle ? <CardDescription>{courseTitle}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{copy}</p>
        {showEnrollHint && code === "not_enrolled" && courseId ? (
          <p className="text-sm text-muted-foreground">
            If this course is free and public, you can enroll from the catalog on My learning.
          </p>
        ) : null}
        <Button variant="outline" size="sm" asChild>
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
