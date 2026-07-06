import type { LmsLessonVideoSettings } from "@/lib/lms-lesson-video-settings";

export type LmsVideoProvider = "youtube" | "vimeo" | "s3" | "file" | "unknown";

const YT_HOST = /^(?:www\.)?youtube\.com$/i;
const YT_SHORT = /^(?:www\.)?youtu\.be$/i;

export function extractYoutubeVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
    const u = new URL(raw, "https://example.com");
    const host = u.hostname;
    if (YT_SHORT.test(host)) {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (YT_HOST.test(host)) {
      const v = u.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[1];
      const m2 = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (m2) return m2[1];
    }
  } catch {
    return null;
  }
  return null;
}

export function extractVimeoVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return raw;
  try {
    const u = new URL(raw, "https://example.com");
    const host = u.hostname.replace(/^www\./i, "");
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const m = u.pathname.match(/\/(?:video\/)?(\d+)/);
      if (m?.[1]) return m[1];
    }
  } catch {
    return null;
  }
  return null;
}

export function inferVideoProvider(videoUrl: string): LmsVideoProvider {
  const t = videoUrl.trim().toLowerCase();
  if (!t) return "unknown";
  if (t.includes("youtube.com") || t.includes("youtu.be")) return "youtube";
  if (t.includes("vimeo.com")) return "vimeo";
  if (t.startsWith("s3://")) return "s3";
  if (/amazonaws\.com|\.s3\.|wasabisys\.com|wasabi\.com/i.test(t)) return "s3";
  if (t.startsWith("/") || t.startsWith("./")) return "file";
  if (t.startsWith("http://") || t.startsWith("https://")) return "unknown";
  return "file";
}

export function buildYoutubeEmbedSrc(videoId: string, settings: LmsLessonVideoSettings): string {
  const host = settings.privacyEnhanced !== false ? "www.youtube-nocookie.com" : "www.youtube.com";
  const params = new URLSearchParams();
  if (settings.showControls === false) params.set("controls", "0");
  if (settings.autoplay === true) {
    params.set("autoplay", "1");
    params.set("mute", "1");
  }
  const start = settings.startSeconds != null && settings.startSeconds > 0 ? Math.floor(settings.startSeconds) : 0;
  if (start > 0) params.set("start", String(start));
  params.set("rel", "0");
  const q = params.toString();
  return `https://${host}/embed/${encodeURIComponent(videoId)}${q ? `?${q}` : ""}`;
}

/** Normalize a pasted watch URL, embed URL, or iframe snippet into an iframe src. */
export function resolveCourseVideoEmbedUrl(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;

  const iframeMatch = raw.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeMatch?.[1]) raw = iframeMatch[1].trim();

  const ytId = extractYoutubeVideoId(raw);
  if (ytId) return buildYoutubeEmbedSrc(ytId, {});

  const vimeoId = extractVimeoVideoId(raw);
  if (vimeoId) return buildVimeoEmbedSrc(vimeoId, {});

  if (/^https?:\/\//i.test(raw)) return raw;
  return null;
}

export function buildVimeoEmbedSrc(videoId: string, settings: LmsLessonVideoSettings): string {
  const params = new URLSearchParams();
  if (settings.autoplay === true) {
    params.set("autoplay", "1");
    params.set("muted", "1");
  }
  if (settings.showControls === false) params.set("controls", "0");
  if (settings.vimeoDnt !== false) params.set("dnt", "1");
  const h = settings.startSeconds != null && settings.startSeconds > 0 ? `#t=${Math.floor(settings.startSeconds)}s` : "";
  const q = params.toString();
  return `https://player.vimeo.com/video/${encodeURIComponent(videoId)}${q ? `?${q}` : ""}${h}`;
}
