import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  getMediaActorFromRequest,
  requireMediaDelete,
  requireMediaRead,
  requireMediaWrite,
} from "@/lib/media-api-auth";
import { getStorageConfig, uploadImageToCloudinary } from "@/lib/cloudinary";
import { isMediaExtensionAllowed, MEDIA_ALWAYS_ALLOWED_EXTENSIONS } from "@/lib/media-upload-policy";
import { urlForMediaRow } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type MediaItem = {
  id: string;
  name: string;
  file_name: string;
  url: string;
  thumb_url: string;
  size: number;
  mime_type: string;
  created_at: string;
};

function isImage(ext: string) {
  return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext);
}

function mimeTypeForExt(ext: string) {
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

type MediaDbRow = {
  id: bigint;
  name: string;
  fileName: string;
  mimeType: string | null;
  size: bigint;
  disk: string;
  customProperties: unknown;
  createdAt: Date | null;
};

function rowToMediaItem(r: MediaDbRow): MediaItem {
  const { url, thumb } = urlForMediaRow({ disk: r.disk, fileName: r.fileName, customProperties: r.customProperties });
  return {
    id: r.id.toString(),
    name: r.name,
    file_name: r.fileName,
    url,
    thumb_url: thumb,
    size: Number(r.size),
    mime_type: r.mimeType ?? mimeTypeForExt(path.extname(r.fileName).toLowerCase()),
    created_at: (r.createdAt ?? new Date()).toISOString(),
  };
}

function jsonWithNoCache(body: unknown, init?: { status?: number }) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

function buildMediaOwnerFilter(companyId: bigint | null, actorId: bigint) {
  const ownerId = companyId ?? actorId;
  const ownedByTenant: Array<Record<string, unknown>> = [{ createdBy: ownerId }];
  if (companyId !== null) {
    ownedByTenant.push({
      AND: [
        { createdBy: null },
        { modelId: companyId },
        { modelType: "App\\Models\\User" },
      ],
    });
  }
  return { OR: ownedByTenant };
}

function buildDirectoryOwnerFilter(companyId: bigint | null, actorId: bigint) {
  return { createdBy: companyId ?? actorId };
}

function buildMediaListWhere(opts: {
  companyId: bigint | null;
  actorId: bigint;
  directoryId: string | null;
  search: string;
}) {
  const clauses: Record<string, unknown>[] = [buildMediaOwnerFilter(opts.companyId, opts.actorId)];
  if (opts.directoryId) {
    clauses.push({ directoryId: BigInt(opts.directoryId) });
  } else {
    clauses.push({ directoryId: null });
  }
  if (opts.search) {
    clauses.push({
      OR: [
        { name: { contains: opts.search, mode: "insensitive" } },
        { fileName: { contains: opts.search, mode: "insensitive" } },
      ],
    });
  }
  return clauses.length === 1 ? clauses[0]! : { AND: clauses };
}

export async function GET(req: NextRequest) {
  const blocked = await requireMediaRead(req);
  if (blocked) return blocked;

  const { actorId, companyId } = await getMediaActorFromRequest(req);
  if (!actorId) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const directoryId = req.nextUrl.searchParams.get("directory_id");
  const search = (req.nextUrl.searchParams.get("search") || "").trim();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1") || 1);
  const perPage = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("per_page") || "12") || 12));

  try {
    const dirOwnerFilter = buildDirectoryOwnerFilter(companyId, actorId);
    let currentDirectory: { id: string; name: string; slug: string; parent_id: string | null } | null = null;

    if (directoryId) {
      const dir = await prisma.mediaDirectory.findFirst({
        where: { id: BigInt(directoryId), ...dirOwnerFilter },
        select: { id: true, name: true, slug: true, parentId: true },
      });
      if (!dir) {
        return NextResponse.json({ ok: false, message: "Folder not found." }, { status: 404 });
      }
      currentDirectory = {
        id: dir.id.toString(),
        name: dir.name,
        slug: dir.slug,
        parent_id: dir.parentId ? dir.parentId.toString() : null,
      };
    }

    const where = buildMediaListWhere({ companyId, actorId, directoryId, search });

    const total = await prisma.media.count({ where });
    const skip = (page - 1) * perPage;
    const lastPage = Math.max(1, Math.ceil(total / perPage));

    const rows = await prisma.media.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        name: true,
        fileName: true,
        mimeType: true,
        size: true,
        disk: true,
        customProperties: true,
        createdAt: true,
      },
      skip,
      take: perPage,
    });

    const directories = directoryId
      ? []
      : await prisma.mediaDirectory.findMany({
          where: { parentId: null, ...dirOwnerFilter },
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true, parentId: true },
        });

    const sumAgg = await prisma.media.aggregate({ where, _sum: { size: true } });
    const images = await prisma.media.count({
      where: { AND: [where, { mimeType: { startsWith: "image/" } }] },
    });

    const items: MediaItem[] = rows.map((r) => rowToMediaItem(r));

    const from = total === 0 ? 0 : skip + 1;
    const to = total === 0 ? 0 : Math.min(total, skip + items.length);

    return jsonWithNoCache({
      ok: true,
      media: items,
      directories: directories.map((d) => ({
        id: d.id.toString(),
        name: d.name,
        slug: d.slug,
        parent_id: d.parentId ? d.parentId.toString() : null,
      })),
      current_directory: currentDirectory,
      stats: { files: total, totalSizeBytes: Number(sumAgg._sum.size ?? 0), images },
      pagination: { page, lastPage, perPage, total, from, to },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load media.";
    return jsonWithNoCache({ ok: false, message: msg }, { status: 500 });
  }
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];

function isImageFile(file: File): boolean {
  const ext = path.extname(file.name || "").toLowerCase();
  const mime = (file.type || "").toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext) || mime.startsWith("image/");
}

export async function POST(req: NextRequest) {
  const blocked = await requireMediaWrite(req);
  if (blocked) return blocked;

  const { actorId, companyId } = await getMediaActorFromRequest(req);
  if (!actorId) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  // Files are owned by the company (so staff uploads appear in the company library)
  const ownerId = companyId ?? actorId;

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, message: "Expected multipart/form-data" }, { status: 400 });
  }

  const form = await req.formData();
  const files = form.getAll("files[]");
  if (!files.length) return NextResponse.json({ ok: false, message: "No files provided." }, { status: 400 });
  const directoryIdRaw = form.get("directory_id");
  const directoryId = typeof directoryIdRaw === "string" && directoryIdRaw.trim() ? BigInt(directoryIdRaw.trim()) : null;

  if (!directoryId) {
    return NextResponse.json(
      { ok: false, message: "Create a folder first, then upload files into it." },
      { status: 400 },
    );
  }

  const dir = await prisma.mediaDirectory.findFirst({
    where: { id: directoryId, createdBy: ownerId },
    select: { id: true },
  });
  if (!dir) {
    return NextResponse.json({ ok: false, message: "Folder not found." }, { status: 404 });
  }

  const storage = await getStorageConfig();
  const useCloudinary = storage.storageType === "cloudinary" && storage.cloudinary != null;

  const baseDir = path.join(process.cwd(), "public", "uploads", "media");
  await mkdir(baseDir, { recursive: true });

  const saved: string[] = [];
  const createdMedia: MediaItem[] = [];

  for (const f of files) {
    if (!(f instanceof File)) continue;
    const bytes = await f.arrayBuffer();
    const buf = Buffer.from(bytes);
    const ext = path.extname(f.name || "").toLowerCase() || ".bin";
    const safeExt = ext.replace(/[^a-z0-9.]/gi, "") || ".bin";
    const extWithoutDot = safeExt.replace(/^\./, "") || "";
    const fileSize = f.size || buf.length;

    if (storage.maxUploadSizeBytes > 0 && fileSize > storage.maxUploadSizeBytes) {
      return NextResponse.json(
        { ok: false, message: `File "${f.name}" exceeds max upload size (${storage.maxUploadSizeBytes / 1024} KB).` },
        { status: 400 },
      );
    }
    if (storage.allowedExtensions.length > 0 && !isMediaExtensionAllowed(extWithoutDot, storage.allowedExtensions)) {
      const allowedList = [...new Set([...storage.allowedExtensions, ...MEDIA_ALWAYS_ALLOWED_EXTENSIONS])].join(", ");
      return NextResponse.json(
        { ok: false, message: `File type .${extWithoutDot} is not allowed. Allowed: ${allowedList}.` },
        { status: 400 },
      );
    }

    const filename = `media-${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`;
    const mimeType = f.type || mimeTypeForExt(safeExt);
    const name = path.parse(f.name || filename).name || filename;
    const size = BigInt(fileSize);

    let disk: "local" | "cloudinary" = "local";
    let customProperties: Record<string, string> = {};

    if (useCloudinary && isImageFile(f)) {
      try {
        const folder = storage.cloudinary!.folder || "media";
        const url = await uploadImageToCloudinary(buf, f.name || filename, { folder });
        disk = "cloudinary";
        customProperties = { cloudinary_url: url };
      } catch {
        // Fall back to local if Cloudinary upload fails
      }
    }

    if (disk === "local") {
      await writeFile(path.join(baseDir, filename), buf);
      saved.push(filename);
    } else {
      saved.push(filename);
    }

    let row: MediaDbRow;
    try {
      row = await prisma.media.create({
        data: {
          modelType: "App\\Models\\User",
          modelId: ownerId,
          uuid: crypto.randomUUID(),
          collectionName: "files",
          name,
          fileName: filename,
          mimeType,
          disk,
          conversionsDisk: null,
          size,
          manipulations: {},
          customProperties,
          generatedConversions: {},
          responsiveImages: {},
          orderColumn: null,
          directoryId: directoryId ?? null,
          creatorId: actorId,
          createdBy: ownerId,
          createdAt: new Date(),
          updatedAt: null,
        },
        select: {
          id: true,
          name: true,
          fileName: true,
          mimeType: true,
          size: true,
          disk: true,
          customProperties: true,
          createdAt: true,
        },
      });
    } catch (e: unknown) {
      if (disk === "local") {
        await unlink(path.join(baseDir, filename)).catch(() => null);
      }
      const msg = e instanceof Error ? e.message : "Could not save media record.";
      return NextResponse.json({ ok: false, message: msg }, { status: 500 });
    }

    createdMedia.push(rowToMediaItem(row));
  }

  return jsonWithNoCache({ ok: true, message: "Uploaded.", files: saved, media: createdMedia });
}

export async function DELETE(req: NextRequest) {
  const blocked = await requireMediaDelete(req);
  if (blocked) return blocked;

  const { actorId, companyId } = await getMediaActorFromRequest(req);
  if (!actorId) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  const bodyObj = (body && typeof body === "object" ? (body as Record<string, unknown>) : null) as any;
  const id = typeof bodyObj?.id === "string" ? bodyObj.id : "";
  if (!id) return NextResponse.json({ ok: false, message: "id is required" }, { status: 400 });

  const baseDir = path.join(process.cwd(), "public", "uploads", "media");
  try {
    if (/^\d+$/.test(id)) {
      const mediaId = BigInt(id);
      const row = await prisma.media.findUnique({
        where: { id: mediaId },
        select: { id: true, disk: true, fileName: true, createdBy: true },
      });
      if (row) {
        // Ensure the file belongs to this company (superadmin can delete anything)
        if (companyId !== null && row.createdBy !== null && row.createdBy !== companyId) {
          return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
        }
        if (row.disk !== "cloudinary") {
          const safe = path.basename(row.fileName);
          await unlink(path.join(baseDir, safe)).catch(() => null);
        }
        await prisma.media.delete({ where: { id: mediaId } }).catch(() => null);
        return NextResponse.json({ ok: true });
      }
    }

    // Fallback: treat as filename.
    const safe = path.basename(id);
    const full = path.join(baseDir, safe);
    await unlink(full);
    await prisma.media.deleteMany({ where: { fileName: safe } }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
