import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

export function getBackupDir(): string {
  const env = process.env.DATABASE_BACKUP_DIR?.trim();
  if (env) return path.resolve(env);
  return path.join(process.cwd(), "storage", "database-backups");
}

/** Only allow backup SQL filenames under the backup dir (no path traversal). */
export function safeBackupFilename(name: string): string | null {
  const base = path.basename(name);
  if (!/^backup_[a-zA-Z0-9_.-]+\.sql$/.test(base)) return null;
  return base;
}

export type BackupListItem = {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  type: "Manual" | "Auto" | "Unknown";
};

export async function listBackups(): Promise<BackupListItem[]> {
  const dir = getBackupDir();
  await fs.mkdir(dir, { recursive: true });
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const items: BackupListItem[] = [];
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith(".sql")) continue;
    if (!safeBackupFilename(ent.name)) continue;
    const fp = `${dir}/${ent.name}`;
    const st = await fs.stat(/* turbopackIgnore: true */ fp);
    let type: BackupListItem["type"] = "Unknown";
    if (ent.name.includes("_manual")) type = "Manual";
    else if (ent.name.includes("_auto")) type = "Auto";
    items.push({
      filename: ent.name,
      sizeBytes: st.size,
      createdAt: st.mtime.toISOString(),
      type,
    });
  }
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items;
}

export function generateBackupFilename(kind: "manual" | "auto"): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `backup_${y}_${m}_${day}_${kind}_${hh}${mm}${ss}.sql`;
}

export async function runPgDumpToFile(outPath: string): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid DATABASE_URL");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("Only PostgreSQL is supported for backups in this environment");
  }

  const host = parsed.hostname;
  const port = parsed.port || "5432";
  const user = decodeURIComponent(parsed.username || "postgres");
  const password = decodeURIComponent(parsed.password || "");
  const database = parsed.pathname.replace(/^\//, "").split("?")[0];
  if (!database) throw new Error("DATABASE_URL is missing the database name");

  await new Promise<void>((resolve, reject) => {
    const env = { ...process.env, PGPASSWORD: password };
    const args = ["-h", host, "-p", port, "-U", user, "-F", "p", "-f", outPath, database];
    const child = spawn("pg_dump", args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => reject(err));
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `pg_dump exited with code ${code}`));
    });
  });
}
