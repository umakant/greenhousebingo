import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext, logProjectActivity } from "@/lib/project-operations-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (req.nextUrl.searchParams.get("roster") === "1") {
    const vendors = await prisma.vendor.findMany({
      where: { createdBy: auth.companyId, status: "active" },
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true, name: true, email: true, phone: true },
    });
    return NextResponse.json({
      data: vendors.map((v) => ({
        id: Number(v.id),
        name: v.name,
        email: v.email,
        phone: v.phone,
      })),
    });
  }

  const rows = await prisma.projectVendorLink.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    data: rows.map((r) => ({
      id: Number(r.id),
      vendor_id: r.vendorId != null ? Number(r.vendorId) : null,
      name: r.name,
      email: r.email,
      phone: r.phone,
    })),
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const vendorId = body?.vendor_id != null ? Number(body.vendor_id) : null;

  let name = typeof body?.name === "string" ? body.name.trim() : "";
  let email = typeof body?.email === "string" ? body.email.trim() : null;
  let phone = typeof body?.phone === "string" ? body.phone.trim() : null;

  if (vendorId && Number.isFinite(vendorId)) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: BigInt(vendorId), createdBy: auth.companyId },
    });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    name = vendor.name;
    email = vendor.email;
    phone = vendor.phone;
  }

  if (!name) return NextResponse.json({ error: "name or vendor_id required" }, { status: 400 });

  const row = await prisma.projectVendorLink.create({
    data: {
      projectId,
      vendorId: vendorId && Number.isFinite(vendorId) ? BigInt(vendorId) : null,
      name,
      email,
      phone,
    },
  });

  await logProjectActivity(projectId, auth.actor.id, auth.actor.type ?? "user", "vendor_add", `Added vendor ${name}`);

  return NextResponse.json({
    data: {
      id: Number(row.id),
      vendor_id: row.vendorId != null ? Number(row.vendorId) : null,
      name: row.name,
      email: row.email,
      phone: row.phone,
    },
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const linkId = req.nextUrl.searchParams.get("id");
  if (!linkId) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.projectVendorLink.deleteMany({
    where: { id: BigInt(linkId), projectId },
  });
  return NextResponse.json({ ok: true });
}
