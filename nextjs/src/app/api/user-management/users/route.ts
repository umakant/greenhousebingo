import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LARAVEL_USER_MORPH_TYPE } from "@/lib/laravel-user-model-type";
import { getHrmActor, getCompanyId, jsonR, serverError, unauthorized, forbidden, getHrmPerms, checkPerm } from "@/lib/hrm-auth";
import bcrypt from "bcryptjs";
import { combineDisplayName } from "@/lib/display-name";
import { sendWelcomeEmail } from "@/lib/send-welcome-email";

export const dynamic = "force-dynamic";

function serUser(u: any, roles: { id: string; name: string; label: string }[]) {
  return {
    id: u.id.toString(),
    name: u.name ?? "",
    email: u.email ?? "",
    type: u.type ?? "staff",
    avatar: u.avatar ?? null,
    status: u.isActive === false ? "inactive" : "active",
    roles,
  };
}

export async function GET(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-user")) return forbidden();
  const companyId = getCompanyId(actor);

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, parseInt(url.searchParams.get("per_page") ?? "10") || 10);
  const search = (url.searchParams.get("search") ?? "").trim();

  const where: any = { createdBy: companyId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, type: true, avatar: true, isActive: true },
    }),
  ]);

  if (users.length === 0) return jsonR({ data: [], total, page, per_page: perPage });

  const userIds = users.map((u) => u.id);
  const roleRows = await prisma.$queryRaw<{ model_id: bigint; role_id: bigint; name: string; label: string }[]>`
    SELECT mhr.model_id, r.id as role_id, r.name, r.label
    FROM model_has_roles mhr
    JOIN roles r ON r.id = mhr.role_id
    WHERE mhr.model_id = ANY(${userIds}::bigint[])
  `;
  const rolesMap = new Map<string, { id: string; name: string; label: string }[]>();
  for (const row of roleRows) {
    const key = row.model_id.toString();
    if (!rolesMap.has(key)) rolesMap.set(key, []);
    rolesMap.get(key)!.push({ id: row.role_id.toString(), name: row.name, label: row.label });
  }

  const data = users.map((u) => serUser(u, rolesMap.get(u.id.toString()) ?? []));
  return jsonR({ data, total, page, per_page: perPage });
}

export async function POST(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-user")) return forbidden();
  const companyId = getCompanyId(actor);

  try {
    const body = await req.json();
    const firstName = String(body.first_name ?? "").trim();
    const lastName = String(body.last_name ?? "").trim();
    const name =
      (body.name ?? "").trim() || combineDisplayName(firstName, lastName);
    const email = (body.email ?? "").trim().toLowerCase();
    const password = (body.password ?? "").trim();
    const roleId = body.roleId ? BigInt(body.roleId) : null;
    const sendWelcome = body.send_welcome_email !== false;

    if ((!name && !firstName) || !email || !password) {
      return NextResponse.json({ error: "First name, email, and password are required" }, { status: 422 });
    }
    if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 422 });

    const exists = await prisma.user.findFirst({ where: { email } });
    if (exists) return NextResponse.json({ error: "A user with this email already exists" }, { status: 422 });

    const maxId = await prisma.$queryRaw<{ max: bigint | null }[]>`SELECT MAX(id) as max FROM users`;
    const nextId = (maxId[0]?.max ?? BigInt(0)) + BigInt(1);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        id: nextId,
        name,
        email,
        password: hashed,
        type: "staff",
        isActive: true,
        isEnableLogin: true,
        createdBy: companyId,
      },
    });

    const assignedRoles: { id: string; name: string; label: string }[] = [];
    if (roleId) {
      const role = await prisma.role.findFirst({ where: { id: roleId } });
      if (role) {
        await prisma.modelHasRole
          .create({
            data: {
              roleId: role.id,
              modelId: user.id,
              modelType: LARAVEL_USER_MORPH_TYPE,
            },
          })
          .catch(() => null);
        assignedRoles.push({
          id: role.id.toString(),
          name: role.name,
          label: role.label,
        });
      }
    }

    let welcomeEmailSent = false;
    let welcomeEmailError: string | undefined;
    if (sendWelcome) {
      const company = await prisma.user.findUnique({
        where: { id: companyId },
        select: { name: true },
      });
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim() || req.nextUrl.origin;
      const welcomeResult = await sendWelcomeEmail({
        to: email,
        name,
        email,
        password,
        appUrl,
        companyName: company?.name ?? undefined,
        companyId,
      });
      welcomeEmailSent = welcomeResult.ok;
      welcomeEmailError = welcomeResult.error;
      if (!welcomeResult.ok && welcomeResult.error) {
        console.warn("[UserManagement] Welcome email not sent:", welcomeResult.error);
      }
    }

    return jsonR(
      {
        data: serUser(user, assignedRoles),
        welcome_email_sent: welcomeEmailSent,
        ...(welcomeEmailError && { welcome_email_error: welcomeEmailError }),
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
