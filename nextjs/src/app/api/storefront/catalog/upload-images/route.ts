import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { getStorageConfig, uploadImageToCloudinary } from "@/lib/cloudinary";
import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import {
  STOREFRONT_EDITOR_IMAGE_MAX_BYTES,
  storefrontEditorRejectTooLargeMessage,
} from "@/lib/storefront/storefront-image-upload-limit";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];

function isImageFile(file: File): boolean {
  const ext = path.extname(file.name || "").toLowerCase();
  const mime = (file.type || "").toLowerCase();
  return IMAGE_EXT.includes(ext) || mime.startsWith("image/");
}

function mimeTypeForExt(ext: string) {
  switch (ext.toLowerCase()) {
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
    default:
      return "application/octet-stream";
  }
}

/** Multipart image upload for catalog (Shopify-style). Uses Settings → Storage (local / Cloudinary). */
export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.CATALOG_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, message: "Expected multipart/form-data." }, { status: 400 });
  }

  const form = await req.formData();
  let files = form.getAll("files[]").filter((x): x is File => x instanceof File);
  if (files.length === 0) {
    const one = form.get("file");
    if (one instanceof File) files = [one];
  }
  if (files.length === 0) {
    return NextResponse.json({ ok: false, message: "No image files provided." }, { status: 400 });
  }
  if (files.length > 24) {
    return NextResponse.json({ ok: false, message: "Too many files at once (max 24)." }, { status: 400 });
  }

  const storage = await getStorageConfig();
  /** Same effective cap as blog/theme editors: min(Settings → Storage, 4 MiB). */
  const storageCap =
    storage.maxUploadSizeBytes === 0 ? STOREFRONT_EDITOR_IMAGE_MAX_BYTES : storage.maxUploadSizeBytes;
  const effectiveMaxBytes = Math.min(storageCap, STOREFRONT_EDITOR_IMAGE_MAX_BYTES);
  const useCloudinary = storage.storageType === "cloudinary" && storage.cloudinary != null;

  const orgSeg = org.organizationId.toString();
  const relDir = `uploads/storefront-products/${orgSeg}`;
  const baseDir = path.join(process.cwd(), "public", relDir);
  await mkdir(baseDir, { recursive: true });

  const urls: string[] = [];

  for (const f of files) {
    if (!isImageFile(f)) {
      return NextResponse.json({ ok: false, message: `Not an image: ${f.name || "file"}` }, { status: 400 });
    }
    const hinted = typeof f.size === "number" ? f.size : 0;
    if (hinted > effectiveMaxBytes) {
      return NextResponse.json(
        { ok: false, message: storefrontEditorRejectTooLargeMessage(effectiveMaxBytes) },
        { status: 400 },
      );
    }
    const bytes = await f.arrayBuffer();
    const buf = Buffer.from(bytes);
    const fileSize = f.size || buf.length;
    if (fileSize > effectiveMaxBytes) {
      return NextResponse.json(
        { ok: false, message: storefrontEditorRejectTooLargeMessage(effectiveMaxBytes) },
        { status: 400 },
      );
    }
    const ext = path.extname(f.name || "").toLowerCase() || ".jpg";
    const safeExt = ext.replace(/[^a-z0-9.]/gi, "") || ".jpg";
    const extWithoutDot = safeExt.replace(/^\./, "") || "jpg";
    if (storage.allowedExtensions.length > 0 && !storage.allowedExtensions.includes(extWithoutDot)) {
      return NextResponse.json(
        { ok: false, message: `File type .${extWithoutDot} is not allowed for uploads.` },
        { status: 400 },
      );
    }

    const filename = `sf-${Date.now()}-${crypto.randomBytes(5).toString("hex")}${safeExt}`;
    const mimeFromFile = (f.type || "").trim();
    const mimeType = mimeFromFile || mimeTypeForExt(safeExt);
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json({ ok: false, message: "Only image uploads are allowed." }, { status: 400 });
    }

    if (useCloudinary) {
      try {
        const baseFolder = (storage.cloudinary!.folder || "media").replace(/\/$/, "");
        const folder = `${baseFolder}/storefront-products/${orgSeg}`;
        const url = await uploadImageToCloudinary(buf, f.name || filename, { folder });
        urls.push(url);
        continue;
      } catch {
        /* fall through to local */
      }
    }

    await writeFile(path.join(baseDir, filename), buf);
    urls.push(`/${relDir}/${filename}`);
  }

  return NextResponse.json({ ok: true, urls });
}
