import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

import { NextResponse, type NextRequest } from "next/server";

import { getPermissionsFromCookieValue } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB per file

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

async function getProjectForCompany(projectId: bigint, companyId: bigint) {
  return prisma.project.findFirst({
    where: { id: projectId, createdBy: companyId },
    select: { id: true },
  });
}

function canViewProject(perms: string[]) {
  return perms.includes("*") || perms.includes("view-project") || perms.includes("manage-project") || perms.includes("manage-project-dashboard");
}

function canManageProject(perms: string[]) {
  return (
    perms.includes("*") ||
    perms.includes("manage-project") ||
    perms.includes("manage-project-dashboard") ||
    perms.includes("edit-project")
  );
}

/** GET — list files for project */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!canViewProject(perms)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const projectId = BigInt(id);
  const companyId = getCompanyId(actor);
  const project = await getProjectForCompany(projectId, companyId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const docType = req.nextUrl.searchParams.get("doc_type");
  const where: {
    projectId: bigint;
    docType?: string | { not: string };
    OR?: Array<{ docType: null } | { docType: { not: string } }>;
  } = { projectId };
  if (docType === "risk") where.docType = "risk";
  else if (docType === "document") {
    where.OR = [{ docType: null }, { docType: { not: "risk" } }];
  }

  const rows = await prisma.projectFile.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    data: rows.map((f) => ({
      id: Number(f.id),
      file_name: f.fileName,
      file_path: f.filePath,
      title: f.title ?? f.fileName,
      category: f.category ?? null,
      doc_type: f.docType ?? null,
      created_at: f.createdAt.toISOString(),
    })),
  });
}

function safeBaseName(name: string): string {
  const base = path.basename(name || "upload").replace(/[^a-zA-Z0-9._\- ()]+/g, "_");
  return base.slice(0, 180) || "upload.bin";
}

/** POST — multipart upload */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!canManageProject(perms)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const projectId = BigInt(id);
  const companyId = getCompanyId(actor);
  const project = await getProjectForCompany(projectId, companyId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    return NextResponse.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB)` }, { status: 400 });
  }

  const originalName = safeBaseName(file.name || "upload");
  const ext = path.extname(originalName) || ".bin";
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const storedName = `${stamp}${ext}`;
  const relDir = path.join("uploads", "projects", id);
  const absDir = path.join(process.cwd(), "public", relDir);
  await mkdir(absDir, { recursive: true });
  const absFile = path.join(absDir, storedName);
  await writeFile(absFile, buf);

  const publicPath = `/${relDir.replace(/\\/g, "/")}/${storedName}`;

  const titleField = form.get("title");
  const categoryField = form.get("category");
  const docTypeField = form.get("doc_type");
  const title = typeof titleField === "string" && titleField.trim() ? titleField.trim() : originalName;
  const category = typeof categoryField === "string" && categoryField.trim() ? categoryField.trim() : null;
  const docType = typeof docTypeField === "string" && docTypeField.trim() ? docTypeField.trim() : "document";

  const row = await prisma.projectFile.create({
    data: {
      projectId,
      fileName: originalName,
      filePath: publicPath,
      title,
      category,
      docType,
    },
  });

  return NextResponse.json({
    ok: true,
    file: {
      id: Number(row.id),
      file_name: row.fileName,
      file_path: row.filePath,
      title: row.title,
      category: row.category,
      doc_type: row.docType,
      created_at: row.createdAt.toISOString(),
    },
  });
}

/** DELETE — ?file_id= */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!canManageProject(perms)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const projectId = BigInt(id);
  const companyId = getCompanyId(actor);
  const project = await getProjectForCompany(projectId, companyId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fileId = new URL(req.url).searchParams.get("file_id");
  if (!fileId || !/^\d+$/.test(fileId)) {
    return NextResponse.json({ error: "file_id required" }, { status: 400 });
  }

  const row = await prisma.projectFile.findFirst({
    where: { id: BigInt(fileId), projectId },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.projectFile.delete({ where: { id: row.id } });

  try {
    const rel = row.filePath.replace(/^\//, "");
    const diskPath = path.join(process.cwd(), "public", rel);
    await unlink(diskPath);
  } catch {
    // file missing on disk — still removed from DB
  }

  return NextResponse.json({ ok: true });
}
