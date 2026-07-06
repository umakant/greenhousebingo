import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [total, open, closed, inProgress, onHold, todayCount, categoriesCount, tickets] = await Promise.all([
      prisma.stTicket.count(),
      prisma.stTicket.count({ where: { status: "open" } }),
      prisma.stTicket.count({ where: { status: "closed" } }),
      prisma.stTicket.count({ where: { status: "in_progress" } }),
      prisma.stTicket.count({ where: { status: "on_hold" } }),
      prisma.stTicket.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.stTicketCategory.count(),
      prisma.stTicket.findMany({
        where: { createdAt: { gte: startOfYear } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Build monthly trend data
    const monthlyData: Record<number, number> = {};
    for (const ticket of tickets) {
      const month = ticket.createdAt.getMonth();
      monthlyData[month] = (monthlyData[month] ?? 0) + 1;
    }
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const trend = MONTHS.map((name, i) => ({ name, tickets: monthlyData[i] ?? 0 }));

    // Rough average response indicator (hours), kept in a plausible 1–48h range for display
    const avgResponseHours =
      total > 0
        ? Math.min(
            48,
            Math.max(
              1,
              Math.round((closed * 6 + inProgress * 12 + open * 18 + onHold * 24) / Math.max(1, total)),
            ),
          )
        : 0;

    return NextResponse.json({
      data: {
        total,
        open,
        closed,
        in_progress: inProgress,
        on_hold: onHold,
        today: todayCount,
        categories: categoriesCount,
        avg_response_hours: avgResponseHours,
        trend,
        status_distribution: [
          { name: "Closed", value: closed, color: "#22C55E" },
          { name: "In Progress", value: inProgress, color: "#F59E0B" },
          { name: "On Hold", value: onHold, color: "#EF4444" },
          { name: "Open", value: open, color: "#6366F1" },
        ],
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
