import "server-only";

import crypto from "node:crypto";

import { getSettingsForOwner, getSuperadminId } from "@/lib/settings-service";

export type CloudinaryCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
};

export type StorageConfig = {
  storageType: "local" | "aws_s3" | "wasabi" | "cloudinary";
  cloudinary: CloudinaryCredentials | null;
  /** Max upload size in bytes (from Settings > Storage). 0 = no limit. */
  maxUploadSizeBytes: number;
  /** Allowed file extensions (lowercase, without dot). Empty = allow all. */
  allowedExtensions: string[];
};

/** Get current storage type and provider credentials from Settings > Storage. */
export async function getStorageConfig(): Promise<StorageConfig> {
  const superadminId = await getSuperadminId();
  const settings = await getSettingsForOwner(superadminId);
  const storageType = (settings.storageType ?? "local").toLowerCase() as StorageConfig["storageType"];
  const maxKb = Math.max(0, parseInt(String(settings.maxUploadSize ?? "0"), 10) || 0);
  const allowedFileTypes = (settings.allowedFileTypes ?? "").trim();
  const allowedExtensions = allowedFileTypes
    ? allowedFileTypes.split(",").map((t) => t.trim().toLowerCase().replace(/^\./, "")).filter(Boolean)
    : [];

  let cloudinary: CloudinaryCredentials | null = null;
  if (storageType === "cloudinary") {
    cloudinary = await getCloudinaryCredentials();
  }

  return {
    storageType: storageType === "aws_s3" || storageType === "wasabi" ? storageType : storageType === "cloudinary" ? "cloudinary" : "local",
    cloudinary,
    maxUploadSizeBytes: maxKb > 0 ? maxKb * 1024 : 0,
    allowedExtensions,
  };
}

export async function getCloudinaryCredentials(): Promise<CloudinaryCredentials | null> {
  const superadminId = await getSuperadminId();
  const settings = await getSettingsForOwner(superadminId);
  const cloudName = (settings.cloudinaryCloudName ?? "").trim();
  const apiKey = (settings.cloudinaryApiKey ?? "").trim();
  const apiSecret = (settings.cloudinaryApiSecret ?? "").trim();
  const folder = (settings.cloudinaryFolder ?? "logos").trim() || "logos";
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret, folder };
}

/**
 * Generate Cloudinary upload signature for the given params.
 * Params must be sorted by key and joined as key=value&...
 */
function signParams(params: Record<string, string>, apiSecret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(sorted + apiSecret).digest("hex");
}

/**
 * Upload an image buffer to Cloudinary. Returns the secure URL on success.
 * Uses superadmin Cloudinary settings from the DB.
 */
export async function uploadImageToCloudinary(
  buffer: Buffer,
  originalName: string,
  options?: { folder?: string },
): Promise<string> {
  const creds = await getCloudinaryCredentials();
  if (!creds) throw new Error("Cloudinary is not configured. Set Cloud Name, API Key, and API Secret in Settings > Storage.");

  const folder = options?.folder ?? creds.folder;
  const timestamp = Math.round(Date.now() / 1000).toString();

  const params: Record<string, string> = { folder, timestamp };
  const signature = signParams(params, creds.apiSecret);

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), originalName || "logo.png");
  form.append("api_key", creds.apiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);
  form.append("folder", folder);

  const url = `https://api.cloudinary.com/v1_1/${creds.cloudName}/image/upload`;
  const res = await fetch(url, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { secure_url?: string; url?: string };
  const secureUrl = data.secure_url ?? data.url;
  if (!secureUrl) throw new Error("Cloudinary did not return a URL.");
  return secureUrl;
}
