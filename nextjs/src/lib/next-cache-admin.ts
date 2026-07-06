import fs from "node:fs/promises";
import path from "node:path";

import { revalidatePath, revalidateTag } from "next/cache";

import { SITE_SEO_CACHE_TAG } from "@/lib/site-seo";

export async function dirSizeBytes(absDir: string): Promise<number> {
  try {
    const entries = await fs.readdir(absDir, { withFileTypes: true });
    let total = 0;
    for (const ent of entries) {
      const p = path.join(absDir, ent.name);
      if (ent.isDirectory()) total += await dirSizeBytes(p);
      else if (ent.isFile()) {
        const st = await fs.stat(p);
        total += st.size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export function bytesToMbString(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (!Number.isFinite(mb)) return "0.00";
  return mb.toFixed(2);
}

/** Size of `.next/cache` in MB as a string (e.g. `"0.55"`). */
export async function getNextCacheSizeMbString(): Promise<string> {
  const cacheDir = path.join(process.cwd(), ".next", "cache");
  return bytesToMbString(await dirSizeBytes(cacheDir));
}

/**
 * Remove Next.js filesystem cache (fetch / ISR store under `.next/cache`).
 * May no-op on read-only deployments (e.g. some serverless hosts); pair with {@link revalidateNextDataCache}.
 */
export async function clearNextFilesystemCache(): Promise<void> {
  const cacheDir = path.join(process.cwd(), ".next", "cache");
  try {
    await fs.rm(cacheDir, { recursive: true, force: true });
  } catch {
    // Ignore (permission, read-only FS, missing dir).
  }
}

/**
 * Invalidate in-memory / Data Cache entries so pages pick up fresh data without a full redeploy.
 * Safe on Vercel and other hosts where deleting `.next/cache` on disk is not possible.
 */
export function revalidateNextDataCache(): void {
  try {
    revalidatePath("/", "layout");
    revalidatePath("/settings");
    revalidateTag(SITE_SEO_CACHE_TAG, { expire: 0 });
  } catch {
    // revalidatePath can throw in unsupported contexts
  }
}
