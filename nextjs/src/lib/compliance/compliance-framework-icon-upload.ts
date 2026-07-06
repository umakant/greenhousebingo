import "server-only";

import crypto from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { getStorageConfig, uploadImageToCloudinary } from "@/lib/cloudinary";
import {
  complianceFrameworkIconServeUrl,
  isAllowedComplianceFrameworkIconName,
} from "@/lib/compliance/compliance-framework-icon-url";

export { complianceFrameworkIconServeUrl, isAllowedComplianceFrameworkIconName } from "@/lib/compliance/compliance-framework-icon-url";

export const COMPLIANCE_FRAMEWORK_ICON_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

export function complianceFrameworkIconFileName(originalName: string): string {
  const ext = path.extname(originalName || "").toLowerCase();
  const safeExt = ALLOWED_EXT.has(ext) ? ext : ".png";
  return `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${safeExt}`;
}

export function complianceFrameworkIconLocalDir(): string {
  const root = (process.env.LOCAL_UPLOADS_ROOT ?? path.join(process.cwd(), "public")).trim();
  return path.join(root, "uploads", "compliance", "framework-icons");
}

export function complianceFrameworkIconPublicPath(fileName: string): string {
  return `/uploads/compliance/framework-icons/${fileName}`;
}

export async function saveComplianceFrameworkIconFile(
  file: File,
): Promise<{ url: string; storage: "cloudinary" | "local" }> {
  const ext = path.extname(file.name || "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("Unsupported file type. Use PNG, JPG, WEBP, GIF, or SVG.");
  }
  if (file.size <= 0 || file.size > COMPLIANCE_FRAMEWORK_ICON_MAX_BYTES) {
    throw new Error("File must be between 1 byte and 2MB.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const storage = await getStorageConfig();
  const useCloudinary = storage.storageType === "cloudinary" && storage.cloudinary != null;

  if (useCloudinary) {
    try {
      const baseFolder = (storage.cloudinary!.folder || "media").replace(/\/$/, "");
      const folder = `${baseFolder}/compliance/framework-icons`;
      const url = await uploadImageToCloudinary(bytes, file.name || "framework-icon.png", { folder });
      return { url, storage: "cloudinary" };
    } catch {
      /* fall through to local */
    }
  }

  const fileName = complianceFrameworkIconFileName(file.name || "icon.png");
  const outDir = complianceFrameworkIconLocalDir();
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, fileName), bytes);

  return {
    url: complianceFrameworkIconServeUrl(fileName),
    storage: "local",
  };
}
