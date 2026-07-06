import type { NextRequest } from "next/server";
import { handleImpersonatePortalPost } from "@/lib/impersonate-portal";

export async function POST(req: NextRequest) {
  return handleImpersonatePortalPost(req);
}
