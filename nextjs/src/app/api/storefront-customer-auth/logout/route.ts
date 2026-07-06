import { NextResponse, type NextRequest } from "next/server";

import { STOREFRONT_CUSTOMER_SESSION_COOKIE } from "@/lib/storefront-customer-constants";
import {
  clearStorefrontCustomerSessionCookie,
  destroyStorefrontCustomerSessionByToken,
} from "@/lib/storefront-customer-session";

export async function POST(req: NextRequest) {
  const raw = req.cookies.get(STOREFRONT_CUSTOMER_SESSION_COOKIE)?.value;
  await destroyStorefrontCustomerSessionByToken(raw);
  const res = NextResponse.json({ ok: true });
  clearStorefrontCustomerSessionCookie(req, res);
  return res;
}
