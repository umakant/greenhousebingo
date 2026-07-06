import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getSuperadminId, getSettingsForOwner } from "@/lib/settings-service";

export type ParsedS3Object = { bucket: string; key: string };

/** Parse common virtual-hosted and path-style S3 / Wasabi HTTPS URLs. */
export function tryParseS3HttpUrl(urlStr: string): ParsedS3Object | null {
  const raw = urlStr.trim();
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.replace(/^\//, "");

    const mVhAws = host.match(/^([^.]+)\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/);
    if (mVhAws && path) {
      return { bucket: mVhAws[1], key: decodeURIComponent(path) };
    }

    const mPathAws = host.match(/^s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/);
    if (mPathAws && path) {
      const i = path.indexOf("/");
      if (i <= 0) return null;
      const bucket = path.slice(0, i);
      const key = path.slice(i + 1);
      if (!bucket || !key) return null;
      return { bucket, key: decodeURIComponent(key) };
    }

    const mVhWasabi = host.match(/^([^.]+)\.s3\.([^.]+)\.wasabisys\.com$/);
    if (mVhWasabi && path) {
      return { bucket: mVhWasabi[1], key: decodeURIComponent(path) };
    }

    if (host.endsWith(".wasabisys.com") && path) {
      const mPath = path.match(/^([^/]+)\/(.+)$/);
      if (mPath) {
        return { bucket: mPath[1], key: decodeURIComponent(mPath[2]) };
      }
    }

    return null;
  } catch {
    return null;
  }
}

type S3CompatConfig =
  | {
      kind: "aws";
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
      bucket: string;
      endpoint?: string;
    }
  | {
      kind: "wasabi";
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
      bucket: string;
      endpoint: string;
    };

async function loadS3CompatConfig(): Promise<S3CompatConfig | null> {
  const ownerId = await getSuperadminId();
  const s = await getSettingsForOwner(ownerId);
  const storageType = (s.storageType ?? "local").trim().toLowerCase();

  if (storageType === "wasabi") {
    const accessKeyId = (s.wasabiAccessKey ?? "").trim();
    const secretAccessKey = (s.wasabiSecretKey ?? "").trim();
    const region = (s.wasabiRegion ?? "us-east-1").trim() || "us-east-1";
    const bucket = (s.wasabiBucket ?? "").trim();
    const endpoint =
      (s.wasabiUrl ?? "").trim() ||
      `https://s3.${region}.wasabisys.com`;
    if (!accessKeyId || !secretAccessKey || !bucket) return null;
    return { kind: "wasabi", accessKeyId, secretAccessKey, region, bucket, endpoint };
  }

  if (storageType === "aws_s3") {
    const accessKeyId = (s.awsAccessKeyId ?? "").trim();
    const secretAccessKey = (s.awsSecretAccessKey ?? "").trim();
    const region = (s.awsDefaultRegion ?? "us-east-1").trim() || "us-east-1";
    const bucket = (s.awsBucket ?? "").trim();
    const endpoint = (s.awsEndpoint ?? "").trim() || undefined;
    if (!accessKeyId || !secretAccessKey || !bucket) return null;
    return { kind: "aws", accessKeyId, secretAccessKey, region, bucket, endpoint };
  }

  return null;
}

/**
 * Returns a time-limited HTTPS GET URL for an object in the **configured** S3/Wasabi bucket,
 * when `objectUrl` points at that bucket. Otherwise returns null (caller may fall back or 403).
 */
function tryParseS3Uri(uri: string): ParsedS3Object | null {
  const t = uri.trim();
  if (!t.startsWith("s3://")) return null;
  const rest = t.slice(5);
  const i = rest.indexOf("/");
  if (i <= 0) return null;
  const bucket = rest.slice(0, i);
  const key = decodeURIComponent(rest.slice(i + 1).replace(/^\/+/, ""));
  if (!bucket || !key) return null;
  return { bucket, key };
}

export async function presignLmsLessonVideoUrl(objectUrl: string, expiresSeconds = 3600): Promise<string | null> {
  const parsed = tryParseS3HttpUrl(objectUrl) ?? tryParseS3Uri(objectUrl);
  if (!parsed) return null;
  const cfg = await loadS3CompatConfig();
  if (!cfg) return null;
  if (parsed.bucket.toLowerCase() !== cfg.bucket.toLowerCase()) return null;

  const client =
    cfg.kind === "wasabi"
      ? new S3Client({
          region: cfg.region,
          endpoint: cfg.endpoint,
          credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
          forcePathStyle: true,
        })
      : new S3Client({
          region: cfg.region,
          ...(cfg.endpoint ? { endpoint: cfg.endpoint } : {}),
          credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
        });

  const cmd = new GetObjectCommand({ Bucket: cfg.bucket, Key: parsed.key });
  return getSignedUrl(client, cmd, { expiresIn: Math.min(Math.max(60, expiresSeconds), 86400) });
}
