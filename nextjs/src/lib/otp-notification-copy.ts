import "server-only";

import { getPlatformAppName } from "@/lib/settings-service";

const OTP_EXPIRY_LABEL = "10 minutes";

/** SMS body for OTP codes (Twilio). */
export async function buildOtpSmsBody(otp: string, purpose?: string): Promise<string> {
  const appName = await getPlatformAppName();
  const purposePart = purpose ? `${purpose} ` : "";
  return `Your ${appName} ${purposePart}verification code is: ${otp}. It expires in ${OTP_EXPIRY_LABEL}.`;
}

export async function buildOtpEmailSubject(purpose?: string): Promise<string> {
  const appName = await getPlatformAppName();
  if (purpose?.trim()) return `Your ${appName} ${purpose.trim()} verification code`;
  return `Your ${appName} verification code`;
}

export async function buildOtpEmailContent(
  otp: string,
  extraNote?: string,
): Promise<{ text: string; html: string }> {
  const appName = await getPlatformAppName();
  const noteText = extraNote ? `\n\n${extraNote}` : "";
  const noteHtml = extraNote ? `<p>${extraNote}</p>` : "";
  return {
    text: `Your ${appName} verification code is: ${otp}\n\nThis code expires in ${OTP_EXPIRY_LABEL}.${noteText}`,
    html: `<p>Your ${appName} verification code is:</p><h2 style="letter-spacing:4px">${otp}</h2><p>This code expires in ${OTP_EXPIRY_LABEL}.</p>${noteHtml}`,
  };
}
