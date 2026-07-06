"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import type { LmsLessonVideoSettings } from "@/lib/lms-lesson-video-settings";

type PlaybackOk = {
  ok: true;
  mode: string;
  embedUrl: string | null;
  streamUrl: string | null;
  expiresAt: string | null;
  settings: LmsLessonVideoSettings;
};

type PlaybackErr = { ok: false; message?: string };

export function LmsLessonVideoPlayer({
  courseId,
  lessonId,
  title,
  className,
  onPlaybackReady,
  onNativeVideoEnded,
}: {
  courseId: string;
  lessonId: string;
  title?: string;
  className?: string;
  /** Fires once when playback metadata is ready (all modes). */
  onPlaybackReady?: () => void;
  /** HTML5 `<video>` only — e.g. mark lesson complete when the file reaches the end. */
  onNativeVideoEnded?: () => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<PlaybackOk | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `/api/lms/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/playback`,
          { credentials: "include", cache: "no-store" },
        );
        const json = (await res.json()) as PlaybackOk | PlaybackErr;
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setErr((json as PlaybackErr).message ?? "Playback unavailable.");
          setData(null);
          return;
        }
        setData(json);
      } catch {
        if (!cancelled) setErr("Playback unavailable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, lessonId]);

  const readyFired = React.useRef<string | null>(null);
  React.useEffect(() => {
    readyFired.current = null;
  }, [courseId, lessonId]);

  React.useEffect(() => {
    const key = `${courseId}:${lessonId}`;
    if (!data?.ok || readyFired.current === key) return;
    readyFired.current = key;
    onPlaybackReady?.();
  }, [courseId, lessonId, data, onPlaybackReady]);

  React.useEffect(() => {
    const el = videoRef.current;
    const start = data?.settings?.startSeconds;
    if (!el || !data || data.mode === "youtube_embed" || data.mode === "vimeo_embed") return;
    if (typeof start !== "number" || start <= 0) return;
    const onMeta = () => {
      try {
        el.currentTime = start;
      } catch {
        /* ignore */
      }
    };
    el.addEventListener("loadeddata", onMeta);
    return () => el.removeEventListener("loadeddata", onMeta);
  }, [data]);

  if (loading) {
    return (
      <div className={`flex aspect-video w-full items-center justify-center rounded-md border bg-muted/30 ${className ?? ""}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className={`rounded-md border border-destructive/40 bg-destructive/5 px-3 py-6 text-center text-sm text-destructive ${className ?? ""}`}>
        {err ?? "Playback unavailable."}
      </div>
    );
  }

  const allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  const cap = data.settings.captionsUrl;

  if (data.mode === "youtube_embed" || data.mode === "vimeo_embed") {
    if (!data.embedUrl) return null;
    return (
      <div className={`overflow-hidden rounded-md border bg-black ${className ?? ""}`}>
        <iframe
          title={title ?? "Video"}
          src={data.embedUrl}
          className="aspect-video w-full"
          allow={allow}
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  if (data.streamUrl) {
    return (
      <div className={`overflow-hidden rounded-md border bg-black ${className ?? ""}`}>
        <video
          ref={videoRef}
          key={data.streamUrl}
          className="aspect-video w-full"
          controls={data.settings.showControls !== false}
          autoPlay={data.settings.autoplay === true}
          muted={data.settings.autoplay === true}
          playsInline
          preload="metadata"
          src={data.streamUrl}
          onEnded={() => onNativeVideoEnded?.()}
          {...(cap ? { crossOrigin: "anonymous" as const } : {})}
        >
          {cap ? <track kind="captions" src={cap} srcLang="en" label="Captions" /> : null}
        </video>
      </div>
    );
  }

  return null;
}
