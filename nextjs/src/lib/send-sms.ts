import "server-only";

import twilio from "twilio";

import { phoneToE164Sms } from "@/lib/hrm-otp-normalize";
import { resolveTwilioCredentials } from "@/lib/twilio-settings-service";

export type SendSmsResult = { ok: true } | { ok: false; error: string };

/** Send SMS via Twilio (env vars or Settings → Twilio SMS). */
export async function sendSms(toPhone: string, body: string): Promise<SendSmsResult> {
  const { accountSid, authToken, fromNumber } = await resolveTwilioCredentials();
  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: "SMS not configured (Twilio)." };
  }
  const toE164 = phoneToE164Sms(toPhone);
  if (!toE164) {
    return { ok: false, error: "Invalid phone number." };
  }
  try {
    const client = twilio(accountSid, authToken);
    const from = fromNumber.startsWith("+") ? fromNumber : `+${fromNumber.replace(/\D/g, "")}`;
    await client.messages.create({ body: body.slice(0, 1600), from, to: toE164 });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to send SMS";
    return { ok: false, error: msg };
  }
}

export function sendSmsAsync(toPhone: string, body: string): void {
  void sendSms(toPhone, body).catch(() => undefined);
}
