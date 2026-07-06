"use client";

import Link from "next/link";

import { LmsCourseReviewsSection } from "@/components/lms/lms-course-reviews-section";
import { LmsLessonPdfViewer } from "@/components/lms/lms-lesson-pdf-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lmsMyLearningCoursePath } from "@/lib/lms-my-learning-path";
import { resolveCourseVideoEmbedUrl } from "@/lib/lms-video-providers";
import { getImagePath } from "@/utils/image-path";

function resolvePdfViewerUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return getImagePath(raw);
}

export function LmsCourseOverviewClient(props: {
  courseId: string;
  courseSlug?: string | null;
  title: string;
  description: string | null;
  videoEmbedUrl?: string | null;
  pdfDocumentUrl?: string | null;
  isEnrolled: boolean;
}) {
  const { courseId, courseSlug, title, description, videoEmbedUrl, pdfDocumentUrl, isEnrolled } = props;
  const embedSrc = videoEmbedUrl ? resolveCourseVideoEmbedUrl(videoEmbedUrl) : null;
  const pdfSrc = resolvePdfViewerUrl(pdfDocumentUrl);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link href="/lms/my-learning">← Catalog</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription className="whitespace-pre-wrap">{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {isEnrolled ? (
            <Button asChild>
              <Link href={lmsMyLearningCoursePath({ id: courseId, slug: courseSlug })}>Continue learning</Link>
            </Button>
          ) : (
            <Button variant="secondary" asChild>
              <Link href="/lms/my-learning">Enroll from catalog</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {embedSrc ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Course video</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border/80 bg-muted/20">
              <iframe
                title={`${title} video`}
                src={embedSrc}
                className="aspect-video w-full bg-background"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {pdfSrc ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Course PDF</CardTitle>
          </CardHeader>
          <CardContent>
            <LmsLessonPdfViewer documentUrl={pdfSrc} title={title} />
          </CardContent>
        </Card>
      ) : null}

      <LmsCourseReviewsSection courseId={courseId} canSubmit={isEnrolled} />
    </div>
  );
}
