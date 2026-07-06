import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext, logProjectActivity } from "@/lib/project-operations-api";
import {
  formDataToSowRecord,
  mergeSowFormData,
  parseFormDataJson,
} from "@/lib/project-sow-form";
import { loadSowFormForEmployee } from "@/lib/project-sow-load";
import { serializeSowRow } from "@/lib/project-sow";
import { loadStaffByUser } from "@/lib/project-sow-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId: userIdParam } = await ctx.params;
  const projectId = BigInt(id);
  const userId = BigInt(userIdParam);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const loaded = await loadSowFormForEmployee({
    projectId,
    userId,
    companyId: auth.companyId,
  });
  if ("error" in loaded) return NextResponse.json({ error: loaded.error }, { status: loaded.status });

  const { staff, projectCtx, sow, form, row } = loaded;

  return NextResponse.json({
    data: {
      user_id: Number(userId),
      name: staff.name,
      email: staff.email,
      roles: [...staff.roles],
      assignments: staff.assignments,
      sow,
      form,
      is_saved: !!row,
    },
    project: projectCtx,
  });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId: userIdParam } = await ctx.params;
  const projectId = BigInt(id);
  const userId = BigInt(userIdParam);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const staffMap = await loadStaffByUser(projectId);
  const staff = staffMap.get(userId);
  if (!staff) return NextResponse.json({ error: "Employee not assigned to this project" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const form = body.form && typeof body.form === "object" ? (body.form as Record<string, unknown>) : null;
  if (!form) return NextResponse.json({ error: "form required" }, { status: 400 });

  const synced = formDataToSowRecord(form as Parameters<typeof formDataToSowRecord>[0]);
  const status = typeof body.status === "string" ? body.status : "draft";
  const signByDate = synced.sign_by_date ? new Date(`${synced.sign_by_date}T12:00:00`) : null;

  const data = {
    partnerName: synced.partner_name,
    locations: synced.locations,
    scheduleDetails: synced.schedule_details,
    totalRate: synced.total_rate,
    perDiem: synced.per_diem,
    dressCode: synced.dress_code,
    policies: synced.policies,
    travelNotes: synced.travel_notes,
    payrollNotes: synced.payroll_notes,
    signByDate: signByDate && !Number.isNaN(signByDate.getTime()) ? signByDate : null,
    status: ["draft", "sent", "signed"].includes(status) ? status : "draft",
    formData: form as Prisma.InputJsonValue,
    updatedAt: new Date(),
  };

  const row = await prisma.projectStaffSow.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, ...data },
    update: data,
  });

  const perDiem = typeof form.per_diem === "string" ? form.per_diem.trim() : "";
  const dressCode = typeof form.dress_code === "string" ? form.dress_code.trim() : "";
  if (perDiem || dressCode) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(perDiem ? { sowPerDiem: perDiem } : {}),
        ...(dressCode ? { sowDressCode: dressCode } : {}),
        updatedAt: new Date(),
      },
    });
  }

  await logProjectActivity(
    projectId,
    auth.actor.id,
    auth.actor.type ?? "user",
    "sow_update",
    `Updated Scope of Work for ${staff.name}`,
  );

  return NextResponse.json({
    data: {
      sow: serializeSowRow(row),
      form: mergeSowFormData(parseFormDataJson(row.formData), form as Parameters<typeof mergeSowFormData>[1]),
    },
  });
}
