import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { getSettingsForOwner } from "@/lib/settings-service";
import { isCompanyEmailNotificationEnabled, sendTemplatedEmailAsync } from "@/lib/send-templated-email";

async function nextTicketId(): Promise<bigint> {
  const agg = await prisma.helpdeskTicket.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function makeTicketCode(): Promise<string> {
  // Match Laravel: 8-digit unique ticket code.
  for (let i = 0; i < 20; i++) {
    const code = String(Math.floor(10_000_000 + Math.random() * 90_000_000));
    const exists = await prisma.helpdeskTicket.findFirst({ where: { ticketId: code }, select: { id: true } }).catch(() => null);
    if (!exists) return code;
  }
  // Fallback: still numeric, but include time suffix.
  return `${String(Date.now()).slice(-8)}`;
}

export async function GET(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-helpdesk-tickets")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const title = (url.searchParams.get("title") ?? url.searchParams.get("search") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();
  const priority = (url.searchParams.get("priority") ?? "").trim();
  const categoryIdRaw = (url.searchParams.get("category_id") ?? "").trim();
  const companyIdRaw = (url.searchParams.get("company_id") ?? "").trim();
  const pageRaw = (url.searchParams.get("page") ?? "1").trim();
  const perPageRaw = (url.searchParams.get("per_page") ?? "10").trim();
  const sort = (url.searchParams.get("sort") ?? "").trim();
  const direction = ((url.searchParams.get("direction") ?? "asc").trim().toLowerCase() === "desc" ? "desc" : "asc") as "asc" | "desc";

  const perPage = Math.min(100, Math.max(1, parseInt(perPageRaw, 10) || 10));
  const page = Math.max(1, parseInt(pageRaw, 10) || 1);
  const skip = (page - 1) * perPage;

  const actorEmail = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = actorEmail
    ? await prisma.user.findFirst({
        where: { email: actorEmail },
        select: { id: true, type: true, createdBy: true, creatorId: true },
      })
    : null;

  function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null; creatorId: bigint | null } | null): bigint {
    if (!a) return -1n;
    if (a.type === "company") return a.id;
    return a.createdBy ?? a.creatorId ?? a.id;
  }
  const companyId = getCompanyId(actor);

  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (categoryIdRaw) where.categoryId = BigInt(categoryIdRaw);

  // Match Laravel: superadmin can filter by company_id.
  if (companyIdRaw && actor?.type === "superadmin") where.createdBy = BigInt(companyIdRaw);

  // Match Laravel: manage-any = all tickets; manage-own = tickets where created_by = creatorId() (company id for company users).
  if (!perms.includes("*") && !hasPermission(perms, "manage-any-helpdesk-tickets")) {
    if (hasPermission(perms, "manage-own-helpdesk-tickets")) {
      where.createdBy = companyId;
    } else {
      where.createdBy = -1n;
    }
  }

  if (title) {
    where.OR = [
      { ticketId: { contains: title, mode: "insensitive" as const } },
      { title: { contains: title, mode: "insensitive" as const } },
    ];
  }

  const orderBy = (() => {
    const allowed: Record<string, any> = {
      ticket_id: { ticketId: direction },
      title: { title: direction },
      status: { status: direction },
      priority: { priority: direction },
      created_at: { createdAt: direction },
    };
    if (sort && allowed[sort]) return allowed[sort];
    return { createdAt: "desc" as const };
  })();

  const [total, rows] = await Promise.all([
    prisma.helpdeskTicket.count({ where }).catch(() => 0),
    prisma.helpdeskTicket.findMany({
    where,
      orderBy,
      skip,
      take: perPage,
      select: {
        id: true,
        ticketId: true,
        title: true,
        status: true,
        priority: true,
        description: true,
        categoryId: true,
        createdBy: true,
        createdAt: true,
      },
    }),
  ]);

  const categoryIds = Array.from(new Set(rows.map((r) => (r.categoryId ? r.categoryId.toString() : null)).filter(Boolean))) as string[];
  const creatorIds = Array.from(new Set(rows.map((r) => (r.createdBy ? r.createdBy.toString() : null)).filter(Boolean))) as string[];

  const [categories, creators, companies] = await Promise.all([
    prisma.helpdeskCategory
      .findMany({
        where: categoryIds.length ? { id: { in: categoryIds.map((s) => BigInt(s)) } } : undefined,
        select: { id: true, name: true },
      })
      .catch(() => []),
    prisma.user
      .findMany({
        where: creatorIds.length ? { id: { in: creatorIds.map((s) => BigInt(s)) } } : undefined,
        select: { id: true, name: true, type: true },
      })
      .catch(() => []),
    actor?.type === "superadmin"
      ? prisma.user.findMany({ where: { type: "company" }, select: { id: true, name: true }, orderBy: { name: "asc" } }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const categoriesById = new Map(categories.map((c) => [c.id.toString(), { id: c.id.toString(), name: c.name }]));
  const creatorsById = new Map(
    creators.map((u) => [
      u.id.toString(),
      {
        id: u.id.toString(),
        name: u.name ?? "",
        type: u.type ?? null,
      },
    ]),
  );

  return NextResponse.json({
    ok: true,
    tickets: {
      data: rows.map((t) => ({
        id: t.id.toString(),
        ticket_id: t.ticketId,
        title: t.title,
        status: t.status,
        priority: t.priority,
        description: t.description,
        category_id: t.categoryId?.toString?.() ?? "",
        category: t.categoryId ? categoriesById.get(t.categoryId.toString()) ?? null : null,
        creator: t.createdBy ? creatorsById.get(t.createdBy.toString()) ?? null : null,
        created_at: t.createdAt?.toISOString?.() ?? null,
      })),
      meta: {
        total,
        per_page: perPage,
        current_page: page,
        last_page: Math.max(1, Math.ceil(total / perPage)),
      },
    },
    categories: (await prisma.helpdeskCategory
      .findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      .catch(() => [])).map((c) => ({ id: c.id.toString(), name: c.name })),
    companies: companies.map((c) => ({ id: c.id.toString(), name: c.name ?? "" })),
  });
}

export async function POST(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "create-helpdesk-tickets")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { [k: string]: unknown } | null;
  const title = String((body as any)?.title ?? "").trim();
  const description = String((body as any)?.description ?? "").trim();
  const priority = String((body as any)?.priority ?? "medium").trim() || "medium";
  const categoryIdRaw = (body as any)?.category_id ?? (body as any)?.categoryId;
  const companyIdRaw = (body as any)?.company_id ?? (body as any)?.companyId;

  if (!title) return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });
  if (!description) return NextResponse.json({ ok: false, message: "Description is required." }, { status: 400 });

  const actorEmail = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = actorEmail
    ? await prisma.user.findFirst({
        where: { email: actorEmail },
        select: { id: true, type: true, createdBy: true, creatorId: true, email: true },
      })
    : null;

  function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null; creatorId: bigint | null; email?: string | null } | null): bigint | null {
    if (!a) return null;
    if (a.type === "company") return a.id;
    return a.createdBy ?? a.creatorId ?? a.id;
  }
  const companyId = getCompanyId(actor);

  let createdBy: bigint | null = companyId;
  if (actor?.type === "superadmin" && companyIdRaw != null && String(companyIdRaw).trim()) {
    createdBy = BigInt(String(companyIdRaw).trim());
  }

  const ticket = await prisma.helpdeskTicket.create({
    data: {
      id: await nextTicketId(),
      ticketId: await makeTicketCode(),
      title,
      description,
      status: "open",
      priority,
      categoryId: categoryIdRaw != null && String(categoryIdRaw).trim() ? BigInt(String(categoryIdRaw).trim()) : null,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    select: { id: true, ticketId: true, title: true },
  });

  if (createdBy) {
    const settings = await getSettingsForOwner(createdBy);
    if (isCompanyEmailNotificationEnabled(settings, "New Helpdesk Ticket")) {
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
      const ticketUrl = baseUrl ? `${baseUrl}/helpdesk-tickets/${ticket.id}` : "-";
      const creatorEmail = actor?.email?.trim();
      if (creatorEmail) {
        sendTemplatedEmailAsync({
          templateName: "New Helpdesk Ticket",
          mailTo: [creatorEmail],
          ownerId: createdBy,
          variables: {
            ticket_name: title,
            ticket_id: ticket.ticketId,
            ticket_url: ticketUrl ? `<a href="${ticketUrl}" target="_blank">${ticketUrl}</a>` : "-",
          },
        });
      }
    }
  }

  return NextResponse.json({ ok: true, id: ticket.id.toString() }, { status: 201 });
}

