function signingSecret(): string {
  return (
    process.env.COMPANY_SITE_ACCESS_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "dev-company-site-access-secret"
  );
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function createCompanySiteAccessToken(
  companySlug: string,
  ownerId: bigint,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${companySlug}:${ownerId.toString()}`),
  );
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyCompanySiteAccessToken(
  token: string,
  companySlug: string,
  ownerId: bigint,
): Promise<boolean> {
  const expected = await createCompanySiteAccessToken(companySlug, ownerId);
  try {
    const a = new TextEncoder().encode(token);
    const b = new TextEncoder().encode(expected);
    return timingSafeEqualBytes(a, b);
  } catch {
    return false;
  }
}
