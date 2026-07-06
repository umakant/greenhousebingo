/**
 * Single project under a company: PATCH (update), DELETE.
 * Auth: superadmin + manage-users (same as list/create).
 */
import { NextRequest, NextResponse } from "next/server";
import { Decimal } from "@prisma/client/runtime/library";

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

async function loadOwnedProject(companyId: bigint, projectId: bigint) {
  return prisma.project.findFirst({
    where: { id: projectId, createdBy: companyId },
    select: { id: true },
  });
}

const STATUS_ALLOWED = ["Not Started", "Ongoing", "Completed", "Cancelled"] as const;

type StatusAllowed = (typeof STATUS_ALLOWED)[number];

function validateProjectPayload(body: Record<string, unknown>): {
  ok: true;
  data: {
    name: string;
    status: StatusAllowed;
    startDate: Date;
    endDate: Date | null;
    budget: Decimal | null;
    description: string | null;
  };
} | { ok: false; response: NextResponse } {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Validation failed", details: { name: ["The name field is required."] } },
        { status: 422 },
      ),
    };
  }

  const status =
    typeof body.status === "string" && STATUS_ALLOWED.includes(body.status as StatusAllowed)
      ? (body.status as StatusAllowed)
      : null;
  if (!status) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Validation failed",
          details: {
            status: [
              "The status field is required and must be one of: Not Started, Ongoing, Completed, Cancelled.",
            ],
          },
        },
        { status: 422 },
      ),
    };
  }

  if (!body.start_date) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Validation failed", details: { start_date: ["The start date field is required."] } },
        { status: 422 },
      ),
    };
  }
  const startDate = new Date(String(body.start_date));
  if (Number.isNaN(startDate.getTime())) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Validation failed", details: { start_date: ["The start date must be a valid date."] } },
        { status: 422 },
      ),
    };
  }

  let endDate: Date | null = null;
  if (body.end_date) {
    endDate = new Date(String(body.end_date));
    if (Number.isNaN(endDate.getTime())) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Validation failed", details: { end_date: ["The end date must be a valid date."] } },
          { status: 422 },
        ),
      };
    }
    if (endDate < startDate) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "Validation failed",
            details: { end_date: ["The end date must be after or equal to start date."] },
          },
          { status: 422 },
        ),
      };
    }
  }

  let budget: Decimal | null = null;
  if (body.budget != null && body.budget !== "") {
    const n = Number(body.budget);
    if (Number.isNaN(n) || n < 0) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Validation failed", details: { budget: ["The budget must be a number >= 0."] } },
          { status: 422 },
        ),
      };
    }
    budget = new Decimal(n);
  }

  const description = typeof body.description === "string" ? body.description : null;

  return {
    ok: true,
    data: { name, status, startDate, endDate, budget, description },
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; projectId: string }> },
) {
  if (!requireSuperadminManageUsers(req)) return forbidden();

  const { id, projectId } = await params;
  const companyIdNum = parseInt(id, 10);
  const projectIdNum = parseInt(projectId, 10);
  if (Number.isNaN(companyIdNum) || Number.isNaN(projectIdNum)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const companyBig = BigInt(companyIdNum);
  const projectBig = BigInt(projectIdNum);

  const company = await prisma.user.findFirst({
    where: { id: companyBig, type: { in: ["company", "company_admin"] } },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const existing = await loadOwnedProject(companyBig, projectBig);
  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validateProjectPayload(body);
  if (!parsed.ok) return parsed.response;

  const updated = await prisma.project.update({
    where: { id: projectBig },
    data: {
      name: parsed.data.name,
      status: parsed.data.status,
      description: parsed.data.description,
      budget: parsed.data.budget,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    project: {
      id: updated.id.toString(),
      name: updated.name,
      status: updated.status,
      start_date: updated.startDate ? updated.startDate.toISOString().slice(0, 10) : null,
      end_date: updated.endDate ? updated.endDate.toISOString().slice(0, 10) : null,
      budget: updated.budget != null ? updated.budget.toString() : null,
      description: updated.description,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; projectId: string }> },
) {
  if (!requireSuperadminManageUsers(req)) return forbidden();

  const { id, projectId } = await params;
  const companyIdNum = parseInt(id, 10);
  const projectIdNum = parseInt(projectId, 10);
  if (Number.isNaN(companyIdNum) || Number.isNaN(projectIdNum)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const companyBig = BigInt(companyIdNum);
  const projectBig = BigInt(projectIdNum);

  const company = await prisma.user.findFirst({
    where: { id: companyBig, type: { in: ["company", "company_admin"] } },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const existing = await loadOwnedProject(companyBig, projectBig);
  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await prisma.project.delete({ where: { id: projectBig } });

  return NextResponse.json({ ok: true });
}
