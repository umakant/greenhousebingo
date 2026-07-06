import { prisma } from "@/lib/prisma";
import { formatCrmLeadFullName } from "@/lib/crm-lead-name";
import { FALLBACK_CURRENCIES_FOR_SETTINGS } from "@/lib/settings-page-data";

export type SalesProposalLeadOption = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
};

export type SalesProposalDealOption = {
  id: string;
  name: string;
  lead_id: string | null;
  status: string;
};

export type SalesProposalCurrencyOption = {
  code: string;
  name: string;
  symbol: string;
  is_default: boolean;
};

export type SalesProposalTaxOption = {
  id: string;
  name: string;
  rate: number;
  type: string;
};

export type SalesProposalUnitOption = {
  id: string;
  name: string;
  short_name: string;
};

export type SalesProposalProductOption = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit_id: string | null;
  unit_name: string | null;
  tax_id: string | null;
  tax_rate: number;
  sku: string | null;
};

export type SalesProposalProjectOption = {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
};

export type SalesProposalServiceOption = {
  id: string;
  name: string;
  description: string | null;
  rate: number;
  unit_id: string | null;
  unit_name: string | null;
  tax_id: string | null;
  tax_rate: number;
  code: string | null;
};

export type SalesProposalFormOptions = {
  leads: SalesProposalLeadOption[];
  deals: SalesProposalDealOption[];
  projects: SalesProposalProjectOption[];
  currencies: SalesProposalCurrencyOption[];
  taxes: SalesProposalTaxOption[];
  units: SalesProposalUnitOption[];
  products: SalesProposalProductOption[];
  services: SalesProposalServiceOption[];
};

function decimalToNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v !== null && "toNumber" in v) {
    return (v as { toNumber: () => number }).toNumber();
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function listCurrencies(): Promise<SalesProposalCurrencyOption[]> {
  try {
    const rows = await prisma.currency.findMany({
      select: { code: true, name: true, symbol: true, isDefault: true },
      orderBy: { code: "asc" },
    });
    if (rows.length === 0) {
      return FALLBACK_CURRENCIES_FOR_SETTINGS.map((c) => ({
        code: c.code,
        name: c.name,
        symbol: c.symbol,
        is_default: c.is_default,
      }));
    }
    return rows.map((c) => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol ?? "",
      is_default: c.isDefault,
    }));
  } catch {
    return FALLBACK_CURRENCIES_FOR_SETTINGS.map((c) => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      is_default: c.is_default,
    }));
  }
}

export async function listSalesProposalFormOptions(companyId: bigint): Promise<SalesProposalFormOptions> {
  const [leadRows, dealRows, projectRows, currencyRows, taxRows, unitRows, productRows, serviceRows] = await Promise.all([
    prisma.crmLead.findMany({
      where: { createdBy: companyId },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        company: true,
        email: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 500,
    }),
    prisma.crmDeal.findMany({
      where: { createdBy: companyId },
      select: {
        id: true,
        name: true,
        leadId: true,
        status: true,
      },
      orderBy: { name: "asc" },
      take: 500,
    }),
    prisma.project
      .findMany({
        where: { createdBy: companyId },
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { name: "asc" },
        take: 500,
      })
      .catch(() => []),
    listCurrencies(),
    prisma.posTax
      .findMany({
        where: { OR: [{ createdBy: companyId }, { createdBy: null }] },
        select: { id: true, name: true, rate: true, type: true },
        orderBy: { name: "asc" },
        take: 100,
      })
      .catch(() => []),
    prisma.posUnit
      .findMany({
        where: { OR: [{ createdBy: companyId }, { createdBy: null }] },
        select: { id: true, name: true, shortName: true },
        orderBy: { name: "asc" },
        take: 100,
      })
      .catch(() => []),
    prisma.posProduct
      .findMany({
        where: {
          isActive: true,
          OR: [
            { organizationId: companyId },
            { createdBy: companyId },
            { organizationId: null, createdBy: companyId },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          sku: true,
          unitId: true,
          taxId: true,
          unit: { select: { name: true, shortName: true } },
          tax: { select: { rate: true } },
        },
        orderBy: { name: "asc" },
        take: 500,
      })
      .catch(() => []),
    prisma.posService
      .findMany({
        where: {
          isActive: true,
          OR: [
            { organizationId: companyId },
            { createdBy: companyId },
            { organizationId: null, createdBy: companyId },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          rate: true,
          code: true,
          unitId: true,
          taxId: true,
          unit: { select: { name: true, shortName: true } },
          tax: { select: { rate: true } },
        },
        orderBy: { name: "asc" },
        take: 500,
      })
      .catch(() => []),
  ]);

  const defaultUnits: SalesProposalUnitOption[] =
    unitRows.length > 0
      ? unitRows.map((u) => ({
          id: u.id.toString(),
          name: u.name,
          short_name: u.shortName,
        }))
      : [{ id: "pcs", name: "Pieces", short_name: "Pcs" }];

  return {
    leads: leadRows.map((l) => {
      const fullName = l.name?.trim() || formatCrmLeadFullName(l.firstName, l.lastName);
      return {
        id: l.id.toString(),
        name: fullName === "—" ? l.firstName : fullName,
        company: l.company,
        email: l.email,
      };
    }),
    deals: dealRows.map((d) => ({
      id: d.id.toString(),
      name: d.name,
      lead_id: d.leadId != null ? d.leadId.toString() : null,
      status: d.status,
    })),
    projects: projectRows.map((p) => ({
      id: p.id.toString(),
      name: p.name,
      status: p.status,
      start_date: p.startDate?.toISOString?.()?.slice(0, 10) ?? null,
      end_date: p.endDate?.toISOString?.()?.slice(0, 10) ?? null,
    })),
    currencies: currencyRows,
    taxes: taxRows.map((t) => ({
      id: t.id.toString(),
      name: t.name,
      rate: decimalToNumber(t.rate),
      type: t.type,
    })),
    units: defaultUnits,
    products: productRows.map((p) => ({
      id: p.id.toString(),
      name: p.name,
      description: p.description,
      price: decimalToNumber(p.price),
      unit_id: p.unitId?.toString() ?? null,
      unit_name: p.unit?.shortName ?? p.unit?.name ?? null,
      tax_id: p.taxId?.toString() ?? null,
      tax_rate: p.tax ? decimalToNumber(p.tax.rate) : 0,
      sku: p.sku,
    })),
    services: serviceRows.map((s) => ({
      id: s.id.toString(),
      name: s.name,
      description: s.description,
      rate: decimalToNumber(s.rate),
      unit_id: s.unitId?.toString() ?? null,
      unit_name: s.unit?.shortName ?? s.unit?.name ?? null,
      tax_id: s.taxId?.toString() ?? null,
      tax_rate: s.tax ? decimalToNumber(s.tax.rate) : 0,
      code: s.code,
    })),
  };
}
