/**
 * Company documents — Media rows owned by the tenant (created_by = company).
 * Auth: superadmin + manage-users (same as company contacts).
 */
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  companyRouteForbidden,
  parseCompanyIdFromParam,
  requireSuperadminManageUsers,
  verifyCompanyTenant,
} from "@/lib/company-route-auth";

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
  if (!(await requireSuperadminManageUsers(req))) return companyRouteForbidden();

  const { id } = await params;
  const companyId = parseCompanyIdFromParam(id);
  if (companyId == null) {
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  }

  const company = await verifyCompanyTenant(companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const tenantId = companyId;

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
