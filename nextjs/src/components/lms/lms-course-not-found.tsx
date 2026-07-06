import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LmsCourseNotFound(props: { courseRef?: string }) {
  const { courseRef } = props;
  return (
    <Card className="max-w-lg border-border/80">
      <CardHeader>
        <CardTitle className="text-base">Course not found</CardTitle>
        <CardDescription>
          {courseRef
            ? `We could not find a course matching “${courseRef}”. It may have been removed or the link is outdated.`
            : "We could not find this course. It may have been removed or the link is outdated."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" asChild>
          <Link href="/lms/my-learning">Back to My learning</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
