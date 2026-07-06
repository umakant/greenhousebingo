export type OwnershipValidationResult = {
  isValid: boolean;
  currentAssignedOwnership: number;
  requestedOwnership: number;
  totalAfterChange: number;
  availableOwnership: number;
  conflictMessage: string | null;
  fieldErrors: string[];
};

const MAX_OWNERSHIP = 100;

export function roundOwnership(value: number): number {
  return Math.round(value * 100) / 100;
}

export function validateOwnershipPercentInputs(
  currentOwnership: number,
  minimumOwnership: number,
): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(currentOwnership)) {
    errors.push("Current ownership is required.");
  } else if (currentOwnership < 0 || currentOwnership > MAX_OWNERSHIP) {
    errors.push("Current ownership must be between 0 and 100.");
  }
  if (!Number.isFinite(minimumOwnership)) {
    errors.push("Minimum ownership is required.");
  } else if (minimumOwnership < 0 || minimumOwnership > MAX_OWNERSHIP) {
    errors.push("Minimum ownership must be between 0 and 100.");
  }
  if (
    Number.isFinite(currentOwnership) &&
    Number.isFinite(minimumOwnership) &&
    minimumOwnership > currentOwnership
  ) {
    errors.push("Minimum ownership cannot be greater than current ownership.");
  }
  return errors;
}

/** Pure validation for add/edit holder against existing holders (percentages as numbers). */
export function validateOwnershipChange(
  existingHolders: Array<{ id: string; currentOwnershipPercent: number }>,
  holderId: string | null | undefined,
  requestedCurrentOwnership: number,
  requestedMinimumOwnership: number,
): OwnershipValidationResult {
  const fieldErrors = validateOwnershipPercentInputs(
    requestedCurrentOwnership,
    requestedMinimumOwnership,
  );

  const others = existingHolders.filter((h) => !holderId || h.id !== holderId);
  const currentAssignedOwnership = roundOwnership(
    others.reduce((sum, h) => sum + h.currentOwnershipPercent, 0),
  );
  const requestedOwnership = roundOwnership(requestedCurrentOwnership);
  const totalAfterChange = roundOwnership(currentAssignedOwnership + requestedOwnership);
  const availableOwnership = roundOwnership(Math.max(0, MAX_OWNERSHIP - currentAssignedOwnership));

  let conflictMessage: string | null = null;
  if (totalAfterChange > MAX_OWNERSHIP) {
    conflictMessage = `Ownership cannot exceed 100%. Total would become ${totalAfterChange}%.`;
  }

  const isValid = fieldErrors.length === 0 && totalAfterChange <= MAX_OWNERSHIP;

  return {
    isValid,
    currentAssignedOwnership,
    requestedOwnership,
    totalAfterChange,
    availableOwnership,
    conflictMessage,
    fieldErrors,
  };
}
