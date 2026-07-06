import "server-only";

import { prisma } from "@/lib/prisma";

export async function recalcEmReportTotal(reportId: bigint): Promise<void> {
  const lines = await prisma.emExpenseLine.findMany({
    where: { reportId },
    select: { amount: true, amountUsd: true },
  });
  let total = 0;
  for (const l of lines) {
    total += Number(l.amountUsd ?? l.amount);
  }
  await prisma.emExpenseReport.update({
    where: { id: reportId },
    data: { totalAmount: total },
  });
}
