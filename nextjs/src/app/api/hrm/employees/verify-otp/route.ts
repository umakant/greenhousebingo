import { type NextRequest, NextResponse } from "next/server";
import { getCompanyId, getHrmActor, checkPerm, forbidden, unauthorized } from "@/lib/hrm-auth";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { markOtpChannelVerified, verifyOtp } from "@/lib/otp-store";
import { normalizeEmailForOtp, normalizePhoneForOtp } from "@/lib/hrm-otp-normalize";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  /** Match client `can()`: users with `manage-hrm` may OTP; require create/edit or manage-employees. */
  if (
    !checkPerm(perms, "manage-hrm", "manage-employees", "create-employees", "edit-employees")
  ) {
    return forbidden();
  }
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);

  const body = await req.json().catch(() => null);
  const type: string = body?.type ?? "";
  const raw: string = (body?.value ?? "").trim();
  const otp = String(body?.otp ?? "").trim();

  if (type !== "email" && type !== "phone") {
    return NextResponse.json({ error: "type must be email or phone" }, { status: 400 });
  }
  if (!raw || !otp) {
    return NextResponse.json({ error: "value and otp are required" }, { status: 400 });
  }

  const valueNorm = type === "email" ? normalizeEmailForOtp(raw) : normalizePhoneForOtp(raw);

  if (type === "email") {
    const [existingUser, existingEmployee] = await Promise.all([
      prisma.user.findFirst({
        where: { email: { equals: valueNorm, mode: "insensitive" } },
        select: { id: true },
      }),
      prisma.hrmEmployee.findFirst({
        where: {
          createdBy: companyId,
          email: { equals: valueNorm, mode: "insensitive" },
        },
        select: { id: true },
      }),
    ]);
    if (existingUser || existingEmployee) {
      return NextResponse.json(
        { ok: false, error: "A user with this email already exists." },
        { status: 400 },
      );
    }
  }

  const key = `${type}:${valueNorm}`;
  const valid = verifyOtp(key, otp);

  if (!valid) {
    return NextResponse.json({ ok: false, error: "Invalid or expired OTP" }, { status: 400 });
  }

  markOtpChannelVerified(key);
  return NextResponse.json({ ok: true });
}
