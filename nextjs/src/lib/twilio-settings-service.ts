import "server-only";

import { prisma } from "@/lib/prisma";
import {
  getTwilioFromEnv,
  isTwilioConfigComplete,
  type TwilioCredentials,
} from "@/lib/twilio-credentials";

export const TWILIO_WA_KEYS = {
  provider: "provider",
  accountSid: "account_sid",
  authToken: "auth_token",
  fromNumber: "from_number",
} as const;

export type TwilioWaSettings = TwilioCredentials & {
  provider: string;
};

export async function loadTwilioWaSettings(): Promise<TwilioWaSettings> {
  const rows = await prisma.waSetting.findMany({
    where: {
      key: {
        in: [
          TWILIO_WA_KEYS.provider,
          TWILIO_WA_KEYS.accountSid,
          TWILIO_WA_KEYS.authToken,
          TWILIO_WA_KEYS.fromNumber,
        ],
      },
    },
    select: { key: true, value: true },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
  return {
    provider: map[TWILIO_WA_KEYS.provider]?.trim() || "twilio",
    accountSid: map[TWILIO_WA_KEYS.accountSid]?.trim() ?? "",
    authToken: map[TWILIO_WA_KEYS.authToken]?.trim() ?? "",
    fromNumber: map[TWILIO_WA_KEYS.fromNumber]?.trim() ?? "",
  };
}

export async function saveTwilioWaSettings(input: {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  provider?: string;
}): Promise<void> {
  const items: { key: string; value: string }[] = [
    { key: TWILIO_WA_KEYS.provider, value: (input.provider ?? "twilio").trim() || "twilio" },
    { key: TWILIO_WA_KEYS.accountSid, value: input.accountSid.trim() },
    { key: TWILIO_WA_KEYS.authToken, value: input.authToken.trim() },
    { key: TWILIO_WA_KEYS.fromNumber, value: input.fromNumber.trim() },
  ];
  for (const item of items) {
    await prisma.waSetting.upsert({
      where: { key: item.key },
      update: { value: item.value, updatedAt: new Date() },
      create: { key: item.key, value: item.value },
    });
  }
}

/** Env vars win when complete; otherwise Settings → Twilio SMS (`wa_settings`). */
export async function resolveTwilioCredentials(): Promise<TwilioCredentials> {
  const fromEnv = getTwilioFromEnv();
  if (isTwilioConfigComplete(fromEnv)) return fromEnv;
  const fromDb = await loadTwilioWaSettings();
  return {
    accountSid: fromDb.accountSid,
    authToken: fromDb.authToken,
    fromNumber: fromDb.fromNumber,
  };
}
