import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "sales";
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(new Date().setDate(1));
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

  if (type === "sales") {
    const rows = await prisma.posSale.findMany({ where: { date: { gte: from, lte: to } }, include: { customer: true, branch: true }, orderBy: { date: "desc" }, take: 500 });
    const total = rows.reduce((s, r) => s + Number(r.total), 0);
    return posOk(ser({ rows, summary: { total, count: rows.length } }));
  }
  if (type === "purchases") {
    const rows = await prisma.posPurchase.findMany({ where: { date: { gte: from, lte: to } }, include: { vendor: true, branch: true }, orderBy: { date: "desc" }, take: 500 });
    const total = rows.reduce((s, r) => s + Number(r.total), 0);
    return posOk(ser({ rows, summary: { total, count: rows.length } }));
  }
  if (type === "expenses") {
    const rows = await prisma.posExpense.findMany({ where: { date: { gte: from, lte: to } }, include: { category: true }, orderBy: { date: "desc" }, take: 500 });
    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    return posOk(ser({ rows, summary: { total, count: rows.length } }));
  }
  if (type === "inventory") {
    const rows = await prisma.posProduct.findMany({ include: { category: true, brand: true, unit: true }, orderBy: { name: "asc" }, take: 500 });
    const totalValue = rows.reduce((s, r) => s + Number(r.price) * r.stock, 0);
    return posOk(ser({ rows, summary: { totalValue, count: rows.length, lowStock: rows.filter(r => r.stock <= r.stockAlert).length } }));
  }
  if (type === "tax") {
    const sales = await prisma.posSale.findMany({ where: { date: { gte: from, lte: to } }, orderBy: { date: "desc" }, take: 500 });
    const totalTax = sales.reduce((s, r) => s + Number(r.taxAmount), 0);
    return posOk(ser({ rows: sales, summary: { totalTax, count: sales.length } }));
  }
  if (type === "customers") {
    const customers = await prisma.posCustomer.findMany({ include: { sales: true }, orderBy: { name: "asc" }, take: 200 });
    return posOk(ser({ rows: customers.map(c => ({ ...c, totalPurchased: c.sales.reduce((s, sl) => s + Number(sl.total), 0), orderCount: c.sales.length })), summary: { count: customers.length } }));
  }
  if (type === "vendors") {
    const vendors = await prisma.posVendor.findMany({ include: { purchases: true }, orderBy: { name: "asc" }, take: 200 });
    return posOk(ser({ rows: vendors.map(v => ({ ...v, totalPurchased: v.purchases.reduce((s, p) => s + Number(p.total), 0), orderCount: v.purchases.length })), summary: { count: vendors.length } }));
  }
  if (type === "profit-loss") {
    const sales = await prisma.posSale.findMany({ where: { date: { gte: from, lte: to } } });
    const purchases = await prisma.posPurchase.findMany({ where: { date: { gte: from, lte: to } } });
    const expenses = await prisma.posExpense.findMany({ where: { date: { gte: from, lte: to } } });
    const revenue = sales.reduce((s, r) => s + Number(r.total), 0);
    const cogs = purchases.reduce((s, r) => s + Number(r.total), 0);
    const exp = expenses.reduce((s, r) => s + Number(r.amount), 0);
    return posOk(ser({ revenue, cogs, expenses: exp, grossProfit: revenue - cogs, netProfit: revenue - cogs - exp }));
  }
  return posOk(ser({ rows: [], summary: {} }));
}
