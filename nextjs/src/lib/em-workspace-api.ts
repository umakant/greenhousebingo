import { NextResponse, type NextRequest } from "next/server";

import { hasPermission } from "@/lib/authz";
import { isEmPortalSubmitter } from "@/lib/em-portal-scope";
import { loadEmActorFromEmail, resolveEmOrganizationId, type EmActor } from "@/lib/em-tenant";
import { prisma } from "@/lib/prisma";
import type { EmWorkspaceContextDto } from "@/lib/em-workspace-types";

export type { EmWorkspaceContextDto } from "@/lib/em-workspace-types";

export const EM_WORKSPACE_READ_PERMS = [
  "manage-expense-management",
  "manage-expense-management-dashboard",
  "manage-expense-analytics",
  "manage-expense-reports",
  "manage-expense-entries",
  "manage-expense-receipts",
] as const;

export const EM_WORKSPACE_DEFAULT_CONTEXT: EmWorkspaceContextDto = {
  jsrNumber: "JSR-US0100060765-001",
  aarStartDate: "2026-03-20",
  aarEndDate: "2026-03-26",
  matterNumber: "815343-",
  requestingDirector: "Michele Ariano",
  clientName: "Johnson & Johnson",
  requestingDepartment: "New York (00229)",
  receivingDepartment: "Protection - ST(00439)",
  aarLocation: "404 S. Figueroa Street, Los Angeles, California, 90071, United States",
  billingPocName: "Sena Heller",
  billingPocEmail: "gheller3@its.jnj.com",
  clientPocName: null,
  legacyClientId: "815343",
  d365ClientId: "US01C000511",
  operationStartDate: "2026-03-20",
  operationEndDate: "2026-03-26",
  tsheetsBased: false,
  aarRequired: false,
  costTransferMode: "default",
  costTransferDefaultRate: 60,
  costTransferCustomRate: 65,
  secondaryMatterNumber: null,
};

function dateToIso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function parseDateInput(v: unknown): Date | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s.length === 10 ? `${s}T12:00:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function serializeWorkspaceContext(row: {
  jsrNumber: string | null;
  aarStartDate: Date | null;
  aarEndDate: Date | null;
  matterNumber: string | null;
  requestingDirector: string | null;
  clientName: string | null;
  requestingDepartment: string | null;
  receivingDepartment: string | null;
  aarLocation: string | null;
  billingPocName: string | null;
  billingPocEmail: string | null;
  clientPocName: string | null;
  legacyClientId: string | null;
  d365ClientId: string | null;
  operationStartDate: Date | null;
  operationEndDate: Date | null;
  tsheetsBased: boolean;
  aarRequired: boolean;
  costTransferMode: string;
  costTransferDefaultRate: { toNumber?: () => number } | number;
  costTransferCustomRate: { toNumber?: () => number } | number | null;
  secondaryMatterNumber: string | null;
}): EmWorkspaceContextDto {
  const num = (v: { toNumber?: () => number } | number | null | undefined) => {
    if (v == null) return null;
    if (typeof v === "number") return v;
    return typeof v.toNumber === "function" ? v.toNumber() : Number(v);
  };
  return {
    jsrNumber: row.jsrNumber,
    aarStartDate: dateToIso(row.aarStartDate),
    aarEndDate: dateToIso(row.aarEndDate),
    matterNumber: row.matterNumber,
    requestingDirector: row.requestingDirector,
    clientName: row.clientName,
    requestingDepartment: row.requestingDepartment,
    receivingDepartment: row.receivingDepartment,
    aarLocation: row.aarLocation,
    billingPocName: row.billingPocName,
    billingPocEmail: row.billingPocEmail,
    clientPocName: row.clientPocName,
    legacyClientId: row.legacyClientId,
    d365ClientId: row.d365ClientId,
    operationStartDate: dateToIso(row.operationStartDate),
    operationEndDate: dateToIso(row.operationEndDate),
    tsheetsBased: row.tsheetsBased,
    aarRequired: row.aarRequired,
    costTransferMode: row.costTransferMode === "custom" ? "custom" : "default",
    costTransferDefaultRate: num(row.costTransferDefaultRate) ?? 60,
    costTransferCustomRate: num(row.costTransferCustomRate),
    secondaryMatterNumber: row.secondaryMatterNumber,
  };
}

export function buildWorkspaceContextUpdate(body: Record<string, unknown>) {
  const data: Record<string, unknown> = { updatedAt: new Date() };
  const str = (k: string) => {
    if (body[k] === undefined) return;
    const v = String(body[k] ?? "").trim();
    data[camelToSnake(k)] = v || null;
  };
  const date = (k: string, field: string) => {
    if (body[k] === undefined) return;
    data[field] = parseDateInput(body[k]);
  };
  if (body.jsrNumber !== undefined) data.jsrNumber = String(body.jsrNumber ?? "").trim() || null;
  if (body.aarStartDate !== undefined) data.aarStartDate = parseDateInput(body.aarStartDate);
  if (body.aarEndDate !== undefined) data.aarEndDate = parseDateInput(body.aarEndDate);
  if (body.matterNumber !== undefined) data.matterNumber = String(body.matterNumber ?? "").trim() || null;
  if (body.requestingDirector !== undefined)
    data.requestingDirector = String(body.requestingDirector ?? "").trim() || null;
  if (body.clientName !== undefined) data.clientName = String(body.clientName ?? "").trim() || null;
  if (body.requestingDepartment !== undefined)
    data.requestingDepartment = String(body.requestingDepartment ?? "").trim() || null;
  if (body.receivingDepartment !== undefined)
    data.receivingDepartment = String(body.receivingDepartment ?? "").trim() || null;
  if (body.aarLocation !== undefined) data.aarLocation = String(body.aarLocation ?? "").trim() || null;
  if (body.billingPocName !== undefined) data.billingPocName = String(body.billingPocName ?? "").trim() || null;
  if (body.billingPocEmail !== undefined) data.billingPocEmail = String(body.billingPocEmail ?? "").trim() || null;
  if (body.clientPocName !== undefined) data.clientPocName = String(body.clientPocName ?? "").trim() || null;
  if (body.legacyClientId !== undefined) data.legacyClientId = String(body.legacyClientId ?? "").trim() || null;
  if (body.d365ClientId !== undefined) data.d365ClientId = String(body.d365ClientId ?? "").trim() || null;
  if (body.operationStartDate !== undefined) data.operationStartDate = parseDateInput(body.operationStartDate);
  if (body.operationEndDate !== undefined) data.operationEndDate = parseDateInput(body.operationEndDate);
  if (body.tsheetsBased !== undefined) data.tsheetsBased = Boolean(body.tsheetsBased);
  if (body.aarRequired !== undefined) data.aarRequired = Boolean(body.aarRequired);
  if (body.costTransferMode !== undefined) {
    data.costTransferMode = body.costTransferMode === "custom" ? "custom" : "default";
  }
  if (body.costTransferDefaultRate !== undefined) {
    data.costTransferDefaultRate = Number(body.costTransferDefaultRate) || 60;
  }
  if (body.costTransferCustomRate !== undefined) {
    const n = body.costTransferCustomRate == null || body.costTransferCustomRate === "" ? null : Number(body.costTransferCustomRate);
    data.costTransferCustomRate = n;
  }
  if (body.secondaryMatterNumber !== undefined)
    data.secondaryMatterNumber = String(body.secondaryMatterNumber ?? "").trim() || null;
  return data;
}

function camelToSnake(_k: string): string {
  return _k;
}

export function canReadEmWorkspace(perms: string[], role: string | undefined): boolean {
  if (perms.includes("*")) return true;
  if (role === "superadmin") return true;
  return EM_WORKSPACE_READ_PERMS.some((p) => hasPermission(perms, p));
}

export function canManageEmWorkspace(
  perms: string[],
  role: string | undefined,
  actor?: EmActor,
): boolean {
  if (perms.includes("*")) return true;
  if (role === "superadmin") return true;
  if (actor && isEmPortalSubmitter(actor)) return false;
  return hasPermission(perms, "manage-expense-management");
}

export async function resolveEmWorkspaceRequest(
  req: NextRequest,
): Promise<
  | { ok: false; res: NextResponse }
  | { ok: true; organizationId: bigint; actor: EmActor }
> {
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
  return { ok: true, organizationId, actor };
}

export function prismaTableMissingResponse(e: unknown, tableHint: string): NextResponse | null {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code?: string }).code) : "";
  if (code !== "P2021") return null;
  return NextResponse.json(
    { error: `${tableHint} Apply migrations: npm run db:migrate:deploy, then restart.` },
    { status: 503 },
  );
}

type CtxDelegate = (typeof prisma)["emWorkspaceContext"];

export function requireEmWorkspaceContextDelegate():
  | { ok: true; db: CtxDelegate }
  | { ok: false; response: NextResponse } {
  const db = (prisma as unknown as { emWorkspaceContext?: CtxDelegate }).emWorkspaceContext;
  if (!db) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Prisma client missing EmWorkspaceContext. Run npx prisma generate and restart." },
        { status: 503 },
      ),
    };
  }
  return { ok: true, db };
}

export async function getOrCreateWorkspaceContext(organizationId: bigint) {
  const del = requireEmWorkspaceContextDelegate();
  if (!del.ok) throw new Error("NO_DELEGATE");
  const db = del.db;

  let row = await db.findUnique({ where: { organizationId } });
  if (row) return row;

  const d = EM_WORKSPACE_DEFAULT_CONTEXT;
  row = await db.create({
    data: {
      organizationId,
      jsrNumber: d.jsrNumber,
      aarStartDate: parseDateInput(d.aarStartDate),
      aarEndDate: parseDateInput(d.aarEndDate),
      matterNumber: d.matterNumber,
      requestingDirector: d.requestingDirector,
      clientName: d.clientName,
      requestingDepartment: d.requestingDepartment,
      receivingDepartment: d.receivingDepartment,
      aarLocation: d.aarLocation,
      billingPocName: d.billingPocName,
      billingPocEmail: d.billingPocEmail,
      clientPocName: d.clientPocName,
      legacyClientId: d.legacyClientId,
      d365ClientId: d.d365ClientId,
      operationStartDate: parseDateInput(d.operationStartDate),
      operationEndDate: parseDateInput(d.operationEndDate),
      tsheetsBased: d.tsheetsBased,
      aarRequired: d.aarRequired,
      costTransferMode: d.costTransferMode,
      costTransferDefaultRate: d.costTransferDefaultRate,
      costTransferCustomRate: d.costTransferCustomRate,
      secondaryMatterNumber: d.secondaryMatterNumber,
    },
  });
  return row;
}

export async function ensureDefaultTimeEntries(organizationId: bigint) {
  const db = (prisma as unknown as { emTimeEntry?: (typeof prisma)["emTimeEntry"] }).emTimeEntry;
  if (!db) return;
  const n = await db.count({ where: { organizationId } });
  if (n > 0) return;

  const base = new Date("2026-03-20T12:00:00");
  const rows = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return {
      organizationId,
      employeeName: "Lynn Nicely",
      vendorName: "PTB/FTE",
      serviceLine: "Protection - Short term",
      clockInDate: d,
      durationHours: 8,
      billable: "Yes",
    };
  });
  await db.createMany({ data: rows });
}

/** Demo expense lines matching the AAR/BI PDF sample (first load only). */
export async function ensureDefaultExpenseLines(organizationId: bigint) {
  const n = await prisma.emExpenseLine.count({ where: { organizationId } });
  if (n > 0) return;

  const base = new Date("2026-03-20T12:00:00");
  const samples: Array<{ category: string; merchant: string; amount: number; note: string; dayOffset: number }> = [
    { category: "Meals", merchant: "PTB/FTE", amount: 45.5, note: "HMS", dayOffset: 0 },
    { category: "Travel", merchant: "PTB/FTE", amount: 320, note: "Flight", dayOffset: 1 },
    { category: "Transportation", merchant: "PTB/FTE", amount: 28.75, note: "Lyft", dayOffset: 2 },
    { category: "Other", merchant: "PTB/FTE", amount: 15, note: "Supplies", dayOffset: 3 },
    { category: "Mileage", merchant: "PTB/FTE", amount: 42, note: "Mileage reimbursement", dayOffset: 4 },
    { category: "Meals", merchant: "PTB/FTE", amount: 38.2, note: "Dinner", dayOffset: 5 },
    { category: "Transportation", merchant: "PTB/FTE", amount: 22, note: "Parking", dayOffset: 6 },
  ];

  await prisma.emExpenseLine.createMany({
    data: samples.map((s) => {
      const d = new Date(base);
      d.setDate(d.getDate() + s.dayOffset);
      return {
        organizationId,
        expenseDate: d,
        category: s.category,
        merchant: s.merchant,
        amount: s.amount,
        amountUsd: s.amount,
        currency: "USD",
        internalNote: s.note,
        billable: "Yes",
        status: "submitted",
      };
    }),
  });
}
