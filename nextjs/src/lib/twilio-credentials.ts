/**
 * Twilio SMS credentials for server routes (e.g. HRM employee OTP).
 *
 * Environment variables (recommended for production / local dev):
 *   TWILIO_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_PHONE_NUMBER  (E.164, e.g. +13217102191)
 *
 * When all three are set, they take precedence over Settings → Twilio SMS (`wa_settings`).
 *
 * Twilio error 20003 / HTTP 401 "Authenticate": Account SID or Auth Token is wrong,
 * expired, or for a different account. Regenerate the Auth Token in Twilio Console,
 * update env on the server (no quotes/spaces), then restart PM2 with `update-env`.
 */

export type TwilioCredentials = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

function cleanEnv(v: string | undefined): string {
  if (v == null) return "";
  return String(v).replace(/\r/g, "").trim().replace(/^["']|["']$/g, "");
}

export function getTwilioFromEnv(): TwilioCredentials {
  const accountSid = cleanEnv(process.env.TWILIO_SID ?? process.env.TWILIO_ACCOUNT_SID);
  const authToken = cleanEnv(process.env.TWILIO_AUTH_TOKEN);
  const fromNumber = cleanEnv(process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM_NUMBER);
  return { accountSid, authToken, fromNumber };
}

export function isTwilioConfigComplete(c: TwilioCredentials): boolean {
  return !!(c.accountSid && c.authToken && c.fromNumber);
}
