import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      totalAssets,
      totalAssignments,
      activeAssignments,
      totalMaintenance,
      scheduledMaintenance,
      totalBorrowRent,
      activeBorrowRent,
      totalPayments,
      categories,
    ] = await Promise.all([
      prisma.asset.count(),
      prisma.assetAssignment.count(),
      prisma.assetAssignment.count({ where: { status: "active" } }),
      prisma.assetMaintenance.count(),
      prisma.assetMaintenance.count({ where: { status: "Scheduled" } }),
      prisma.assetBorrowRent.count(),
      prisma.assetBorrowRent.count({ where: { status: "approved" } }),
      prisma.assetBorrowPayment.aggregate({ _sum: { paymentAmount: true } }),
      prisma.assetCategory.findMany({
        include: { _count: { select: { assets: true } } },
        orderBy: { name: "asc" },
        take: 10,
      }),
    ]);

    const recentAssets = await prisma.asset.findMany({
      include: {
        category: { select: { name: true } },
        location: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const recentMaintenance = await prisma.assetMaintenance.findMany({
      include: { asset: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return jsonR({
      stats: {
        totalAssets,
        totalAssignments,
        activeAssignments,
        totalMaintenance,
        scheduledMaintenance,
        totalBorrowRent,
        activeBorrowRent,
        totalPaymentsReceived: parseFloat(totalPayments._sum.paymentAmount?.toString() ?? "0"),
      },
      categories: categories.map((c) => ({ name: c.name, count: c._count.assets })),
      recentAssets,
      recentMaintenance,
    });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
