import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext, logProjectActivity } from "@/lib/project-operations-api";
import { loadStaffByUser } from "@/lib/project-sow-server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

function safeBaseName(name: string): string {
  const base = path.basename(name || "upload").replace(/[^a-zA-Z0-9._\- ()]+/g, "_");
  return base.slice(0, 180) || "upload.bin";
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId: userIdParam } = await ctx.params;
  const projectId = BigInt(id);
  const userId = BigInt(userIdParam);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const staffMap = await loadStaffByUser(projectId);
  const staff = staffMap.get(userId);
  if (!staff) return NextResponse.json({ error: "Employee not assigned to this project" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  const originalName = safeBaseName(file.name || "signed-sow.pdf");
  const ext = path.extname(originalName).toLowerCase();
  if (ext !== ".pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }

  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const storedName = `${stamp}${ext}`;
  const relDir = path.join("uploads", "projects", id, "sow");
  const absDir = path.join(process.cwd(), "public", relDir);
  await mkdir(absDir, { recursive: true });
  await writeFile(path.join(absDir, storedName), buf);

  const publicPath = `/${relDir.replace(/\\/g, "/")}/${storedName}`;
  const now = new Date();

  const row = await prisma.projectStaffSow.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: {
      projectId,
      userId,
      status: "signed",
      signedAt: now,
      signedFilePath: publicPath,
    },
    update: {
      status: "signed",
      signedAt: now,
      signedFilePath: publicPath,
      updatedAt: now,
    },
  });

  await logProjectActivity(
    projectId,
    auth.actor.id,
    auth.actor.type ?? "user",
    "sow_signed",
    `Uploaded signed Scope of Work for ${staff.name}`,
  );

  return NextResponse.json({
    ok: true,
    signed_file_path: row.signedFilePath,
    signed_at: row.signedAt?.toISOString() ?? null,
    status: row.status,
  });
}
