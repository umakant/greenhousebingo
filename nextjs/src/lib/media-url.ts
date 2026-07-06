import { prisma } from "@/lib/prisma";

function jsonObject(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as Record<string, unknown>;
}

export function urlForMediaRow(row: {
  disk: string;
  fileName: string;
  customProperties: unknown;
}): { url: string; thumb: string } {
  if (row.disk === "cloudinary") {
    const cp = jsonObject(row.customProperties);
    const url = typeof cp.cloudinary_url === "string" ? cp.cloudinary_url : "";
    if (url) return { url, thumb: url };
  }
  const url = `/uploads/media/${row.fileName}`;
  return { url, thumb: url };
}

export function extractMediaFileName(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null;
  const s = stored.trim();
  if (/^https?:\/\//i.test(s)) return null;
  const match = s.match(/\/uploads\/media\/([^/?#]+)$/i);
  if (match?.[1]) return match[1];
  if (!s.includes("/")) return s;
  return null;
}

/** Map stored `/uploads/media/{file}` paths to Cloudinary URLs when applicable. */
export async function resolveMediaUrlMap(
  storedPaths: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const fileNames = new Set<string>();
  for (const stored of storedPaths) {
    const fileName = extractMediaFileName(stored);
    if (fileName) fileNames.add(fileName);
  }
  if (fileNames.size === 0) return new Map();

  const rows = await prisma.media.findMany({
    where: { fileName: { in: [...fileNames] } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { fileName: true, disk: true, customProperties: true },
  });

  const map = new Map<string, string>();
  for (const row of rows) {
    if (!map.has(row.fileName)) {
      map.set(row.fileName, urlForMediaRow(row).url);
    }
  }
  return map;
}

export function resolveStoredMediaUrl(
  stored: string | null | undefined,
  resolved: Map<string, string>,
): string | null {
  if (!stored?.trim()) return null;
  const s = stored.trim();
  if (/^https?:\/\//i.test(s) || s.startsWith("//")) {
    return s.startsWith("//") ? `https:${s}` : s;
  }
  const fileName = extractMediaFileName(s);
  if (fileName && resolved.has(fileName)) return resolved.get(fileName)!;
  return s.startsWith("/") ? s : `/${s.replace(/^\/+/, "")}`;
}
