import { prisma } from "@/lib/prisma";

export type SaasAuditEventType =
  | "addon_toggle"
  | "storefront_access_denied"
  | "storefront_api_denied"
  /** Bucket for granular storefront actions; details live in `metadata.storefrontEvent`. */
  | "storefront_event"
  | "lms_access"
  | "lms_access_denied"
  | "lms_org_toggle";

export async function writeSaasAuditLog(opts: {
  eventType: SaasAuditEventType | string;
  module?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await prisma.saasAuditLog.create({
      data: {
        eventType: opts.eventType,
        module: opts.module ?? null,
        actorEmail: opts.actorEmail ?? null,
        actorRole: opts.actorRole ?? null,
        path: opts.path ?? null,
        metadata: opts.metadata === null || opts.metadata === undefined ? undefined : (opts.metadata as object),
      },
    });
  } catch (e) {
    console.error("[saas-audit-log] write failed:", e);
  }
}
