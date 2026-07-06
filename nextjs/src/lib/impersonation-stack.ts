/** Comma-separated stack of user ids to restore when leaving nested impersonation. */

export const IMPERSONATOR_STACK_COOKIE = "pf_impersonator_stack";
export const IMPERSONATOR_LEGACY_COOKIE = "pf_impersonator_id";
export const IMPERSONATE_RETURN_COOKIE = "pf_impersonate_return";

export function parseImpersonatorStack(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));
}

export function serializeImpersonatorStack(stack: string[]): string {
  return stack.filter((s) => /^\d+$/.test(s)).join(",");
}

/** Push the current session user onto the stack before switching to another user. */
export function pushImpersonatorStack(
  stackRaw: string | undefined | null,
  legacyImpersonatorId: string | undefined | null,
  currentUserId: string | undefined | null,
): string {
  const stack = parseImpersonatorStack(stackRaw);
  if (legacyImpersonatorId?.trim() && stack.length === 0) {
    stack.push(legacyImpersonatorId.trim());
  }
  const cur = currentUserId?.trim();
  if (cur && /^\d+$/.test(cur) && stack[stack.length - 1] !== cur) {
    stack.push(cur);
  }
  return serializeImpersonatorStack(stack);
}

export function popImpersonatorStack(stackRaw: string | undefined | null): {
  restoreUserId: string | null;
  remainingStack: string;
} {
  const stack = parseImpersonatorStack(stackRaw);
  if (stack.length === 0) {
    return { restoreUserId: null, remainingStack: "" };
  }
  const restoreUserId = stack.pop()!;
  return { restoreUserId, remainingStack: serializeImpersonatorStack(stack) };
}

export function isImpersonationActive(
  stackRaw: string | undefined | null,
  legacyImpersonatorId: string | undefined | null,
  currentUserId?: string | undefined | null,
): boolean {
  const stack = parseImpersonatorStack(stackRaw);
  const legacy = legacyImpersonatorId?.trim() || null;
  const cur = currentUserId?.trim() || null;

  if (stack.length === 0 && !legacy) return false;
  if (!cur) return stack.length > 0 || Boolean(legacy);

  // Stale cookies can leave the impersonator stack set while the session already
  // matches the impersonator account (common after an incomplete leave).
  if (legacy && cur !== legacy) return true;

  if (stack.length > 0) {
    return !stack.includes(cur);
  }

  return false;
}
