import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getHrmActor,
  checkPerm,
  getCompanyId,
  forbidden,
  unauthorized,
  serverError,
  jsonR,
} from "@/lib/hrm-auth";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import {
  consumeOtpChannelVerified,
  isOtpChannelVerified,
} from "@/lib/otp-store";
import { normalizeEmailForOtp, normalizePhoneForOtp } from "@/lib/hrm-otp-normalize";
import { createEmployeePortalUser } from "@/lib/hrm-create-employee-portal-user";
import { sendWelcomeEmail } from "@/lib/send-welcome-email";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ser(r: any) {
  return {
    ...r,
    id: r.id?.toString(),
    userId: r.userId != null ? r.userId.toString() : null,
    departmentId: r.departmentId?.toString() ?? null,
    designationId: r.designationId?.toString() ?? null,
    branchId: r.branchId?.toString() ?? null,
    shiftId: r.shiftId?.toString() ?? null,
    managerId: r.managerId?.toString() ?? null,
    department: r.department ? { ...r.department, id: r.department.id.toString() } : null,
    designation: r.designation ? { ...r.designation, id: r.designation.id.toString() } : null,
    branch: r.branch ? { ...r.branch, id: r.branch.id.toString() } : null,
  };
}

function parseOptionalBigIntParam(value: string | null, label: string): bigint | null {
  if (value == null || value.trim() === "") return null;
  try {
    return BigInt(value.trim());
  } catch {
    throw new Error(`Invalid ${label}`);
  }
}

export async function GET(req: NextRequest) {
  try {
    const perms = await getPermissionsFromRequest(req);
    if (!checkPerm(perms, "manage-hrm", "manage-employees", "view-employees")) return forbidden();
    const actor = await getHrmActor(req);
    if (!actor) return unauthorized();
    const companyId = getCompanyId(actor);
    const { searchParams: s } = new URL(req.url);
    const search = s.get("search") ?? "";
    const deptId = parseOptionalBigIntParam(s.get("department_id"), "department_id");
    const branchParam = parseOptionalBigIntParam(s.get("branch_id"), "branch_id");
    const status = s.get("status");
    const page = Math.max(1, Number(s.get("page") ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15)));
    const skip = (page - 1) * perPage;
    const where: Record<string, unknown> = { createdBy: companyId };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
      ];
    }
    if (deptId != null) where.departmentId = deptId;
    if (branchParam != null) where.branchId = branchParam;
    if (status) where.status = status;
    const sort = (s.get("sort") ?? "created_at").trim();
    const direction = s.get("direction") === "asc" ? "asc" : "desc";
    let orderBy: Prisma.HrmEmployeeOrderByWithRelationInput;
    switch (sort) {
      case "first_name":
        orderBy = { firstName: direction };
        break;
      case "joining_date":
        orderBy = { joiningDate: direction };
        break;
      case "status":
        orderBy = { status: direction };
        break;
      case "employee_id":
        orderBy = { employeeId: direction };
        break;
      default:
        orderBy = { createdAt: direction };
    }
    const [rows, total] = await Promise.all([
      prisma.hrmEmployee.findMany({
        where,
        include: {
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
        },
        orderBy,
        skip,
        take: perPage,
      }),
      prisma.hrmEmployee.count({ where }),
    ]);
    return jsonR({
      data: rows.map(ser),
      total,
      page,
      per_page: perPage,
      last_page: Math.ceil(total / perPage) || 1,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("Invalid ")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[GET /api/hrm/employees]", e);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!checkPerm(perms, "manage-hrm", "manage-employees", "create-employees")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);

  const body = await req.json().catch(() => null);
  if (!body?.first_name) return NextResponse.json({ error: "first_name required" }, { status: 400 });

  const emailRaw = body.email != null ? String(body.email).trim() : "";
  const phoneRaw = body.phone != null ? String(body.phone).trim() : "";

  const phoneKey = `phone:${normalizePhoneForOtp(phoneRaw)}`;
  const emailKey = `email:${normalizeEmailForOtp(emailRaw)}`;

  if (phoneRaw && !isOtpChannelVerified(phoneKey)) {
    return NextResponse.json(
      { error: "Verify the phone number with OTP before saving." },
      { status: 400 },
    );
  }
  if (emailRaw && !isOtpChannelVerified(emailKey)) {
    return NextResponse.json(
      { error: "Verify the email address with OTP before saving." },
      { status: 400 },
    );
  }

  const createPortal =
    body.create_portal_access !== false && emailRaw.length > 0;

  if (createPortal && !emailRaw) {
    return NextResponse.json(
      { error: "Email is required to create portal access." },
      { status: 400 },
    );
  }

  const firstName = String(body.first_name).trim();
  const lastName = body.last_name != null ? String(body.last_name).trim() : "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  try {
    const row = await prisma.hrmEmployee.create({
      data: {
        firstName,
        lastName: lastName || null,
        email: emailRaw || null,
        phone: phoneRaw || null,
        employeeId:
          body.employee_id != null && String(body.employee_id).trim()
            ? String(body.employee_id).trim()
            : null,
        gender: body.gender ?? null,
        address: body.address ?? null,
        city: body.city ?? null,
        country: body.country ?? null,
        departmentId: body.department_id ? BigInt(body.department_id) : null,
        designationId: body.designation_id ? BigInt(body.designation_id) : null,
        branchId: body.branch_id ? BigInt(body.branch_id) : null,
        shiftId: body.shift_id ? BigInt(body.shift_id) : null,
        status: body.status ?? "active",
        employeeType: body.employee_type ?? null,
        workType: body.work_type ?? null,
        joiningDate: body.joining_date ? new Date(body.joining_date) : null,
        basicSalary: body.basic_salary ?? null,
        bankName: body.bank_name ?? null,
        bankAccountNumber: body.bank_account_number ?? null,
        emergencyName: body.emergency_name ?? null,
        emergencyPhone: body.emergency_phone ?? null,
        notes: body.notes ?? null,
        createdBy: companyId,
      },
    });

    let portalPassword: string | null = null;
    let welcomeSent = false;
    let welcomeError: string | undefined;

    if (createPortal && emailRaw) {
      const userResult = await createEmployeePortalUser({
        name: fullName,
        email: emailRaw,
        companyId,
      });

      if (!userResult.ok) {
        await prisma.hrmEmployee.delete({ where: { id: row.id } });
        return NextResponse.json({ error: userResult.error }, { status: 400 });
      }

      portalPassword = userResult.plainPassword;

      await prisma.hrmEmployee.update({
        where: { id: row.id },
        data: { userId: userResult.userId },
      });

      const company = await prisma.user.findUnique({
        where: { id: companyId },
        select: { name: true },
      });
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();

      const welcome = await sendWelcomeEmail({
        to: emailRaw,
        name: fullName,
        email: emailRaw,
        password: userResult.plainPassword,
        appUrl: appUrl || undefined,
        companyName: company?.name ?? undefined,
        companyId,
      });
      welcomeSent = welcome.ok;
      welcomeError = welcome.error;

      if (phoneRaw) consumeOtpChannelVerified(phoneKey);
      if (emailRaw) consumeOtpChannelVerified(emailKey);
    } else {
      if (phoneRaw) consumeOtpChannelVerified(phoneKey);
      if (emailRaw) consumeOtpChannelVerified(emailKey);
    }

    const out = await prisma.hrmEmployee.findUnique({
      where: { id: row.id },
      include: {
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    return jsonR(
      {
        data: ser(out),
        portal_password: portalPassword ?? undefined,
        welcome_email_sent: welcomeSent,
        welcome_email_error: welcomeError,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[POST /api/hrm/employees]", e);
    return serverError();
  }
}
