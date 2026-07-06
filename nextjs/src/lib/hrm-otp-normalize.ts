/** Normalize contact values so OTP send/verify use the same Map key. */
export function normalizeEmailForOtp(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhoneForOtp(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** E.164 for Twilio SMS; assumes US if 10 digits. */
export function phoneToE164Sms(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  if (digits.trim().startsWith("+")) return `+${d}`;
  return `+${d}`;
}
