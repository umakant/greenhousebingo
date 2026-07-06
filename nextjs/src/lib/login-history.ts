import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

export function getClientIp(req: NextRequest): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first.slice(0, 45);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 45);
  return "";
}

/**
 * Best-effort audit row for staff login via `/api/auth/login`. Does not throw.
 */
export async function recordStaffLoginSuccess(userId: bigint, req: NextRequest): Promise<void> {
  try {
    const ip = getClientIp(req);
    const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 2000);
    const now = new Date();
    await prisma.loginHistory.create({
      data: {
        userId,
        ip: ip || null,
        date: now,
        type: "login",
        details: { user_agent: userAgent, success: true },
      },
    });
  } catch (e) {
    console.warn("[login-history] Failed to record login:", e);
  }
}
