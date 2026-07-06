/**
 * Company documents — Media rows owned by the tenant (created_by = company).
 * Auth: superadmin + manage-users (same as company contacts).
 */
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function requireSuperadminManageUsers(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return false;
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  return hasPermission(perms, "manage-users");
}

function jsonObject(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object") return {};
  if (Array.isArray(v)) return {};
  return v as Record<string, unknown>;
}

function urlForMediaRow(row: { disk: string; fileName: string; customProperties: unknown }) {
  if (row.disk === "cloudinary") {
    const cp = jsonObject(row.customProperties);
    const url = typeof cp.cloudinary_url === "string" ? cp.cloudinary_url : "";
    if (url) return { url, thumb: url };
  }
  const url = `/uploads/media/${row.fileName}`;
  return { url, thumb: url };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireSuperadminManageUsers(req)) return forbidden();

  const { id } = await params;
  const companyId = parseInt(id, 10);
  if (Number.isNaN(companyId))
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });

  const company = await prisma.user.findFirst({
    where: { id: BigInt(companyId), type: { in: ["company", "company_admin"] } },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const tenantId = BigInt(companyId);

  const rows = await prisma.media.findMany({
    where: { createdBy: tenantId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 500,
    select: {
      id: true,
      name: true,
      fileName: true,
      mimeType: true,
      size: true,
      disk: true,
      customProperties: true,
      collectionName: true,
      createdAt: true,
    },
  });

  const documents = rows.map((r) => {
    const { url } = urlForMediaRow({
      disk: r.disk,
      fileName: r.fileName,
      customProperties: r.customProperties,
    });

    return {
      id: r.id.toString(),
      name: r.name,
      file_name: r.fileName,
      collection_name: r.collectionName,
      mime_type: r.mimeType ?? "application/octet-stream",
      size: Number(r.size),
      url,
      created_at: (r.createdAt ?? new Date()).toISOString(),
    };
  });

  return NextResponse.json({ documents });
}
