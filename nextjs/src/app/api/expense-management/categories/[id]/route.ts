import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { loadEmActorFromEmail, resolveEmOrganizationId } from "@/lib/em-tenant";
import {
  prismaExpenseCategoryTableMissingResponse,
  requireEmExpenseCategoryDelegate,
} from "@/lib/require-prisma-em-expense-category";

export const dynamic = "force-dynamic";

function canMutateCategories(perms: string[], role: string | undefined): boolean {
  if (perms.includes("*")) return true;
  if (role === "superadmin") return true;
  return hasPermission(perms, "manage-expense-management");
}

async function resolveOrganizationId(req: NextRequest): Promise<{ ok: false; res: NextResponse } | { ok: true; id: bigint }> {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = email ? await loadEmActorFromEmail(email) : null;
  if (!actor) {
    return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const isSuperadmin = (actor.type ?? "").toLowerCase().includes("superadmin");
  const companyIdRaw = (req.nextUrl.searchParams.get("company_id") ?? "").trim();
  let organizationId = resolveEmOrganizationId(actor);
  if (isSuperadmin && companyIdRaw && /^\d+$/.test(companyIdRaw)) {
    organizationId = BigInt(companyIdRaw);
  }
  return { ok: true, id: organizationId };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  const perms = await getPermissionsFromRequest(req);
  if (!canMutateCategories(perms, role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await resolveOrganizationId(req);
  if (!org.ok) return org.res;

  const prismaCat = requireEmExpenseCategoryDelegate();
  if (!prismaCat.ok) return prismaCat.response;
  const db = prismaCat.emExpenseCategory;

  const { id: idRaw } = await params;
  if (!/^\d+$/.test(idRaw)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const id = BigInt(idRaw);

  const body = (await req.json().catch(() => null)) as { name?: string; description?: string | null } | null;

  try {
    const existing = await db.findFirst({
      where: { id, organizationId: org.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const name =
      body?.name !== undefined ? String(body.name).trim() : existing.name;
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    if (name.length > 255) {
      return NextResponse.json({ error: "name too long" }, { status: 400 });
    }

    let description = existing.description;
    if (body?.description !== undefined) {
      const desc = String(body.description ?? "").trim();
      description = desc.length > 2000 ? desc.slice(0, 2000) : desc || null;
    }

    const updated = await db.update({
      where: { id },
      data: { name, description, updatedAt: new Date() },
    });
    return NextResponse.json({
      data: {
        id: updated.id.toString(),
        name: updated.name,
        description: updated.description,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (e: unknown) {
    const missing = prismaExpenseCategoryTableMissingResponse(e);
    if (missing) return missing;
    const code = typeof e === "object" && e && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "A category with this name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  const perms = await getPermissionsFromRequest(req);
  if (!canMutateCategories(perms, role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await resolveOrganizationId(req);
  if (!org.ok) return org.res;

  const prismaCat = requireEmExpenseCategoryDelegate();
  if (!prismaCat.ok) return prismaCat.response;
  const db = prismaCat.emExpenseCategory;

  const { id: idRaw } = await params;
  if (!/^\d+$/.test(idRaw)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const id = BigInt(idRaw);

  try {
    const existing = await db.findFirst({
      where: { id, organizationId: org.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const inUse = await prisma.emExpenseLine.count({
      where: { organizationId: org.id, category: existing.name },
    });
    if (inUse > 0) {
      return NextResponse.json(
        { error: "This category is used on expense lines. Reassign or remove those lines first." },
        { status: 400 },
      );
    }

    await db.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return prismaExpenseCategoryTableMissingResponse(e) ?? NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
