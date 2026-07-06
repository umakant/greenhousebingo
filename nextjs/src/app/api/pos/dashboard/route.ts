import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Same shape as a successful dashboard payload — used when Prisma/DB is out of sync (e.g. missing columns). */
function emptyPosDashboardResponse() {
  const last10DaysSales = Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (9 - i));
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { date: label, total: 0 };
  });
  return {
    stats: {
      total_products: 0,
      total_customers: 0,
      total_vendors: 0,
      total_sales: 0,
      total_revenue: 0,
      today_revenue: 0,
      avg_transaction: 0,
      unique_customers: 0,
      total_expenses: 0,
      total_purchases: 0,
    },
    last10DaysSales,
    recentSales: [],
    topProducts: [],
    outOfStockProductsList: [],
  };
}

export async function GET() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawCid = store.get("pf_cid")?.value ?? store.get("pf_uid")?.value;
  let createdBy: bigint | undefined;
  if (rawCid) {
    try {
      createdBy = BigInt(rawCid);
    } catch {
      /* ignore */
    }
  }
  const where = createdBy ? { createdBy } : {};

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  try {
    const [
      totalProducts,
      totalCustomers,
      totalVendors,
      allSales,
      todaySales,
      allSaleItems,
      recentSalesRaw,
      outOfStockProducts,
      totalExpensesAgg,
      totalPurchasesAgg,
    ] = await Promise.all([
      prisma.posProduct.count({ where }),
      prisma.posCustomer.count({ where }),
      prisma.posVendor.count({ where }),
      prisma.posSale.findMany({ where: { ...where, status: "completed" }, select: { total: true, date: true, customerId: true } }),
      prisma.posSale.findMany({ where: { ...where, status: "completed", date: { gte: todayStart, lte: todayEnd } }, select: { total: true } }),
      prisma.posSaleItem.findMany({
        where: { sale: { ...where, status: "completed" } },
        select: { productId: true, name: true, qty: true, subtotal: true },
      }),
      prisma.posSale.findMany({
        where: { ...where, status: "completed" },
        include: { customer: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 8,
      }),
      prisma.posProduct.findMany({ where: { ...where, stock: { lte: 0 } }, select: { id: true, name: true, stock: true }, take: 10 }),
      prisma.posExpense.aggregate({ where, _sum: { amount: true } }),
      prisma.posPurchase.aggregate({ where, _sum: { total: true } }),
    ]);

    const totalRevenue = allSales.reduce((sum, s) => sum + Number(s.total), 0);
    const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
    const uniqueCustomers = new Set(allSales.filter((s) => s.customerId).map((s) => s.customerId!.toString())).size;
    const avgTransaction = allSales.length > 0 ? totalRevenue / allSales.length : 0;

    const salesByDate: Record<string, number> = {};
    for (const s of allSales) {
      const dateKey = new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      salesByDate[dateKey] = (salesByDate[dateKey] ?? 0) + Number(s.total);
    }
    const last10DaysSales = Array.from({ length: 10 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (9 - i));
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { date: label, total: salesByDate[label] ?? 0 };
    });

    const productRevMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const item of allSaleItems) {
      const key = item.productId ? item.productId.toString() : item.name;
      if (!productRevMap[key]) productRevMap[key] = { name: item.name, qty: 0, revenue: 0 };
      productRevMap[key].qty += Number(item.qty);
      productRevMap[key].revenue += Number(item.subtotal);
    }
    const topProducts = Object.values(productRevMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((p) => ({ name: p.name, total_quantity: p.qty, total_revenue: p.revenue }));

    const recentSales = recentSalesRaw.map((s) => ({
      id: Number(s.id),
      sale_number: s.number,
      total_amount: Number(s.total),
      payment_method: s.paymentMethod,
      created_at: s.date.toISOString(),
      customer: s.customer ? { name: s.customer.name } : undefined,
    }));

    const outOfStockList = outOfStockProducts.map((p) => ({
      product_name: p.name,
      sku: `PROD-${String(p.id).padStart(4, "0")}`,
      warehouse_name: "Main Store",
      stock: Number(p.stock),
    }));

    return NextResponse.json({
      stats: {
        total_products: totalProducts,
        total_customers: totalCustomers,
        total_vendors: totalVendors,
        total_sales: allSales.length,
        total_revenue: totalRevenue,
        today_revenue: todayRevenue,
        avg_transaction: avgTransaction,
        unique_customers: uniqueCustomers,
        total_expenses: Number(totalExpensesAgg._sum.amount ?? 0),
        total_purchases: Number(totalPurchasesAgg._sum.total ?? 0),
      },
      last10DaysSales,
      recentSales,
      topProducts,
      outOfStockProductsList: outOfStockList,
    });
  } catch (e) {
    console.error("[pos/dashboard] degraded response (DB schema mismatch vs Prisma, e.g. pos_products.organization_id):", e);
    return NextResponse.json(emptyPosDashboardResponse());
  }
}
