import "server-only";

import { getSuperadminId } from "@/lib/settings-service";
import { sendTemplatedEmail } from "@/lib/send-templated-email";

export async function sendMarketplaceVendorInviteEmail(opts: {
  to: string;
  vendorName: string;
  loginEmail: string;
  temporaryPassword: string | null;
}): Promise<{ ok: boolean; message?: string }> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:5000").replace(
    /\/$/,
    "",
  );
  const loginUrl = `${baseUrl}/login`;
  const supportEmail = process.env.SUPPORT_EMAIL ?? "support@paperflight.com";

  const superadminId = await getSuperadminId();

  const result = await sendTemplatedEmail({
    templateName: "marketplace-vendor-invite",
    mailTo: [opts.to],
    ownerId: superadminId,
    smtpOwnerId: superadminId,
    variables: {
      vendor_name: opts.vendorName,
      login_email: opts.loginEmail,
      login_url: loginUrl,
      temporary_password: opts.temporaryPassword ?? "",
      support_email: supportEmail,
    },
  });

  if (result.is_success) return { ok: true };
  const err = result.error;
  return { ok: false, message: typeof err === "string" && err.trim() ? err : "Email failed" };
}
