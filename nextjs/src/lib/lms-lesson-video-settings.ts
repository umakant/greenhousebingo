/**
 * Lesson `video_metadata` JSON (Prisma Json) — lesson-level video behaviour.
 * Stored alongside `video_url` for VIDEO lessons.
 */
export type LmsLessonVideoSettings = {
  /** Source hint; can be inferred from URL when missing. */
  provider?: "youtube" | "vimeo" | "s3" | "file" | "unknown";
  /** YouTube: use youtube-nocookie embed domain. */
  privacyEnhanced?: boolean;
  /** Vimeo: enable dnt=1 on player. */
  vimeoDnt?: boolean;
  showControls?: boolean;
  autoplay?: boolean;
  /** Start offset in seconds (YouTube `start`, HTML5 `currentTime` after load). */
  startSeconds?: number;
  /** VTT or SRT URL for `<track>` on direct / signed HTML5 playback. */
  captionsUrl?: string;
};

export function parseVideoSettings(raw: unknown): LmsLessonVideoSettings {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const provider = o.provider;
  const out: LmsLessonVideoSettings = {};
  if (
    provider === "youtube" ||
    provider === "vimeo" ||
    provider === "s3" ||
    provider === "file" ||
    provider === "unknown"
  ) {
    out.provider = provider;
  }
  if (typeof o.privacyEnhanced === "boolean") out.privacyEnhanced = o.privacyEnhanced;
  if (typeof o.vimeoDnt === "boolean") out.vimeoDnt = o.vimeoDnt;
  if (typeof o.showControls === "boolean") out.showControls = o.showControls;
  if (typeof o.autoplay === "boolean") out.autoplay = o.autoplay;
  if (typeof o.startSeconds === "number" && Number.isFinite(o.startSeconds) && o.startSeconds >= 0) {
    out.startSeconds = Math.floor(o.startSeconds);
  }
  if (typeof o.captionsUrl === "string") {
    const c = o.captionsUrl.trim();
    if (c) out.captionsUrl = c.slice(0, 2048);
  }
  return out;
}

export function mergeVideoSettings(base: LmsLessonVideoSettings, patch: Partial<LmsLessonVideoSettings>): LmsLessonVideoSettings {
  return { ...base, ...patch };
}
