/**
 * Company projects — mirrors Laravel UserController::storeProject + list by user.
 * GET: list projects for company (created_by = company id)
 * POST: create project for company
 * Auth: cookie-based (same as /api/companies), not NextAuth.
 */
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { syncProjectToGantt } from "@/lib/gantt-project-sync";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function getActorId(req: NextRequest): Promise<bigint | null> {
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return null;
  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true },
  });
  return actor?.id ?? null;
}

function requireSuperadminManageUsers(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return false;
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  return hasPermission(perms, "manage-users");
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

  const rows = await prisma.project.findMany({
    where: { createdBy: BigInt(companyId) },
    orderBy: { id: "desc" },
  });

  const projects = rows.map((p: (typeof rows)[number]) => ({
    id: p.id.toString(),
    name: p.name,
    status: p.status,
    start_date: p.startDate ? p.startDate.toISOString().slice(0, 10) : null,
    end_date: p.endDate ? p.endDate.toISOString().slice(0, 10) : null,
    budget: p.budget != null ? p.budget.toString() : null,
    description: p.description,
    created_at: p.createdAt.toISOString(),
  }));

  return NextResponse.json({ projects });
}

export async function POST(
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

  const actorId = await getActorId(req);
  if (!actorId) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "Validation failed", details: { name: ["The name field is required."] } },
      { status: 422 }
    );
  }

  const statusAllowed = [
    "Not Started",
    "Ongoing",
    "Completed",
    "Cancelled",
  ] as const;
  const status =
    typeof body.status === "string" && statusAllowed.includes(body.status as (typeof statusAllowed)[number])
      ? body.status
      : null;
  if (!status) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: {
          status: [
            "The status field is required and must be one of: Not Started, Ongoing, Completed, Cancelled.",
          ],
        },
      },
      { status: 422 }
    );
  }

  if (!body.start_date) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: { start_date: ["The start date field is required."] },
      },
      { status: 422 }
    );
  }
  const startDate = new Date(String(body.start_date));
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: { start_date: ["The start date must be a valid date."] },
      },
      { status: 422 }
    );
  }

  let endDate: Date | null = null;
  if (body.end_date) {
    endDate = new Date(String(body.end_date));
    if (Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: { end_date: ["The end date must be a valid date."] },
        },
        { status: 422 }
      );
    }
    if (endDate < startDate) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: { end_date: ["The end date must be after or equal to start date."] },
        },
        { status: 422 }
      );
    }
  }

  let budget: import("@prisma/client/runtime/library").Decimal | null = null;
  if (body.budget != null && body.budget !== "") {
    const n = Number(body.budget);
    if (Number.isNaN(n) || n < 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: { budget: ["The budget must be a number >= 0."] },
        },
        { status: 422 }
      );
    }
    const { Decimal } = await import("@prisma/client/runtime/library");
    budget = new Decimal(n);
  }

  const description =
    typeof body.description === "string" ? body.description : null;

  const adminId = actorId;
  const companyBigInt = BigInt(companyId);

  const project = await prisma.project.create({
    data: {
      name,
      status,
      description,
      budget,
      startDate,
      endDate,
      creatorId: adminId,
      createdBy: companyBigInt,
    },
  });

  await syncProjectToGantt(project);

  return NextResponse.json({ project });
}
