import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { resolveCourseLessonPlaybackAccess } from "@/lib/lms-course-access";
import { parseVideoSettings } from "@/lib/lms-lesson-video-settings";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { presignLmsLessonVideoUrl, tryParseS3HttpUrl } from "@/lib/lms-s3-presign";
import {
  buildVimeoEmbedSrc,
  buildYoutubeEmbedSrc,
  extractVimeoVideoId,
  extractYoutubeVideoId,
  inferVideoProvider,
} from "@/lib/lms-video-providers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseId(raw: string | undefined | null): bigint | null {
  if (raw == null || typeof raw !== "string") return null;
  try {
    return BigInt(raw.trim());
  } catch {
    return null;
  }
}

function canManageCourses(perms: string[]): boolean {
  return perms.includes("*") || hasPermission(perms, "manage-lms-courses") || hasPermission(perms, "manage-lms");
}

/**
 * Authorized lesson video playback descriptor (embed URL, signed S3 URL, or same-origin file URL).
 * Access: course managers bypass checks; assigned instructors bypass checks; learners need active enrollment,
 * published/scheduled course, access window, valid paid storefront order when applicable, and a capacity seat.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const { courseId: cRaw, lessonId: lRaw } = await ctx.params;
  const courseId = parseId(cRaw);
  const lessonId = parseId(lRaw);
  if (courseId == null || lessonId == null) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const perms = await getPermissionsFromRequest(req);

  const lesson = await prisma.courseLesson.findFirst({
    where: {
      id: lessonId,
      courseId,
      organizationId: actor.organizationId,
      lessonType: "VIDEO",
    },
    select: {
      id: true,
      title: true,
      videoUrl: true,
      videoMetadata: true,
      isPublished: true,
      course: {
        select: {
          id: true,
          isPublic: true,
          organizationId: true,
          status: true,
          accessStartsAt: true,
          accessEndsAt: true,
          capacity: true,
        },
      },
    },
  });
  if (!lesson || !lesson.course) {
    return NextResponse.json({ ok: false, message: "Lesson not found." }, { status: 404 });
  }

  const canManage = canManageCourses(perms);
  if (!lesson.isPublished && !canManage) {
    return NextResponse.json({ ok: false, message: "Lesson is not published." }, { status: 403 });
  }

  const access = await resolveCourseLessonPlaybackAccess({
    organizationId: actor.organizationId,
    userId: actor.userId,
    courseId,
    perms,
    course: lesson.course,
  });
  if (!access.ok) {
    return NextResponse.json({ ok: false, message: access.message, code: access.code }, { status: access.httpStatus });
  }

  const videoUrl = (lesson.videoUrl ?? "").trim();
  if (!videoUrl) {
    return NextResponse.json({ ok: false, message: "No video URL configured." }, { status: 400 });
  }

  const settings = parseVideoSettings(lesson.videoMetadata);
  const providerHint = settings.provider ?? inferVideoProvider(videoUrl);

  if (providerHint === "youtube" || extractYoutubeVideoId(videoUrl)) {
    const id = extractYoutubeVideoId(videoUrl);
    if (!id) {
      return NextResponse.json({ ok: false, message: "Invalid YouTube URL." }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      mode: "youtube_embed",
      embedUrl: buildYoutubeEmbedSrc(id, settings),
      streamUrl: null,
      expiresAt: null,
      settings,
    });
  }

  if (providerHint === "vimeo" || extractVimeoVideoId(videoUrl)) {
    const id = extractVimeoVideoId(videoUrl);
    if (!id) {
      return NextResponse.json({ ok: false, message: "Invalid Vimeo URL." }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      mode: "vimeo_embed",
      embedUrl: buildVimeoEmbedSrc(id, settings),
      streamUrl: null,
      expiresAt: null,
      settings,
    });
  }

  const s3Like =
    providerHint === "s3" || tryParseS3HttpUrl(videoUrl) != null || videoUrl.trim().toLowerCase().startsWith("s3://");
  if (s3Like) {
    const signed = await presignLmsLessonVideoUrl(videoUrl, 3600);
    if (!signed) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "S3-style video URL could not be signed. Use the bucket configured in Settings → Storage (AWS S3 or Wasabi), or use YouTube/Vimeo.",
        },
        { status: 503 },
      );
    }
    const exp = new Date(Date.now() + 3500 * 1000).toISOString();
    return NextResponse.json({
      ok: true,
      mode: "s3_signed",
      embedUrl: null,
      streamUrl: signed,
      expiresAt: exp,
      settings,
    });
  }

  if (videoUrl.startsWith("/")) {
    const origin = req.nextUrl.origin;
    return NextResponse.json({
      ok: true,
      mode: "same_origin",
      embedUrl: null,
      streamUrl: `${origin}${videoUrl}`,
      expiresAt: null,
      settings,
    });
  }

  if (videoUrl.startsWith("https://") || videoUrl.startsWith("http://")) {
    return NextResponse.json({
      ok: true,
      mode: "direct",
      embedUrl: null,
      streamUrl: videoUrl,
      expiresAt: null,
      settings,
    });
  }

  return NextResponse.json({ ok: false, message: "Unsupported video URL format." }, { status: 400 });
}
