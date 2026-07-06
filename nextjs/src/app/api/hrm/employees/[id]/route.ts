import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { provisionEmployeePortalAccess } from "@/lib/hrm-create-employee-portal-user";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = await getPermissionsFromRequest(req);
  if (!checkPerm(perms, "manage-hrm", "manage-employees", "view-employees")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const row = await prisma.hrmEmployee.findFirst({
      where: { id: BigInt(id), createdBy: getCompanyId(actor) },
      include: { department: true, designation: true, branch: true, shift: true },
    });
    if (!row) return notFound();
    return jsonR({ data: row });
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = await getPermissionsFromRequest(req);
  if (!checkPerm(perms, "manage-hrm", "manage-employees", "edit-employees")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  try {
    const existing = await prisma.hrmEmployee.findFirst({ where: { id: BigInt(id), createdBy: getCompanyId(actor) } });
    if (!existing) return notFound();
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (body?.first_name) data.firstName = body.first_name;
    if (body?.last_name !== undefined) data.lastName = body.last_name;
    if (body?.email !== undefined) data.email = body.email;
    if (body?.phone !== undefined) data.phone = body.phone;
    if (body?.gender !== undefined) data.gender = body.gender;
    if (body?.address !== undefined) data.address = body.address;
    if (body?.city !== undefined) data.city = body.city;
    if (body?.country !== undefined) data.country = body.country;
    if (body?.department_id !== undefined) data.departmentId = body.department_id ? BigInt(body.department_id) : null;
    if (body?.designation_id !== undefined) data.designationId = body.designation_id ? BigInt(body.designation_id) : null;
    if (body?.branch_id !== undefined) data.branchId = body.branch_id ? BigInt(body.branch_id) : null;
    if (body?.shift_id !== undefined) data.shiftId = body.shift_id ? BigInt(body.shift_id) : null;
    if (body?.status !== undefined) data.status = body.status;
    if (body?.employee_type !== undefined) data.employeeType = body.employee_type;
    if (body?.work_type !== undefined) data.workType = body.work_type;
    if (body?.joining_date !== undefined) data.joiningDate = body.joining_date ? new Date(body.joining_date) : null;
    if (body?.leaving_date !== undefined) data.leavingDate = body.leaving_date ? new Date(body.leaving_date) : null;
    if (body?.basic_salary !== undefined) data.basicSalary = body.basic_salary;
    if (body?.notes !== undefined) data.notes = body.notes;
    const updated = await prisma.hrmEmployee.update({ where: { id: BigInt(id) }, data });

    let portalPassword: string | undefined;
    let welcomeSent: boolean | undefined;
    let welcomeError: string | undefined;
    let portalMessage: string | undefined;

    if (body?.create_portal_access === true && !existing.userId) {
      const emailAfter = (body?.email !== undefined ? String(body.email) : existing.email ?? "")
        .trim()
        .toLowerCase();
      if (!emailAfter) {
        return NextResponse.json(
          { error: "Email is required to create portal login." },
          { status: 400 },
        );
      }
      const provision = await provisionEmployeePortalAccess({
        employeeId: BigInt(id),
        companyId: getCompanyId(actor),
        sendWelcomeEmail: body?.send_welcome_email !== false,
      });
      if (!provision.ok) {
        return NextResponse.json({ error: provision.error }, { status: 400 });
      }
      portalPassword = provision.plainPassword ?? undefined;
      portalMessage = provision.alreadyHadLogin
        ? "Portal access updated."
        : "Portal login created.";
      if (provision.plainPassword && body?.send_welcome_email === false) {
        welcomeSent = false;
      }
    } else if (body?.create_portal_access === true && existing.userId) {
      const provision = await provisionEmployeePortalAccess({
        employeeId: BigInt(id),
        companyId: getCompanyId(actor),
        sendWelcomeEmail: false,
      });
      if (provision.ok) {
        portalMessage = "Portal permissions refreshed.";
      }
    }

    const fresh = await prisma.hrmEmployee.findUnique({
      where: { id: BigInt(id) },
      include: { department: true, designation: true, branch: true, shift: true },
    });

    return jsonR({
      data: fresh ?? updated,
      portal_password: portalPassword,
      welcome_email_sent: welcomeSent,
      welcome_email_error: welcomeError,
      portal_message: portalMessage,
    });
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = await getPermissionsFromRequest(req);
  if (!checkPerm(perms, "manage-hrm", "manage-employees", "delete-employees")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.hrmEmployee.findFirst({ where: { id: BigInt(id), createdBy: getCompanyId(actor) } });
    if (!existing) return notFound();
    await prisma.hrmEmployee.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return serverError();
  }
}
