import type { RecordWinnerInput, RecordWinnerValidation } from "@/lib/event-platform/bingo-rounds/bingo-round-types";

type ValidateContext = {
  round: {
    id: bigint;
    eventId: bigint;
    status: string;
    assignedPrize: string;
    roundNumber: number;
  };
  registration: {
    id: bigint;
    eventId: bigint;
    bookingStatus: string;
    checkedInAt: Date | null;
    attendeeName: string;
  } | null;
  existingWinners: Array<{
    id: bigint;
    registrationId: bigint;
    winningCardNumber: string;
    invalidated: boolean;
    roundInstanceId: bigint;
    prizeLabel: string;
    roundStatus: string;
  }>;
  input: RecordWinnerInput;
};

export function validateRecordWinner(ctx: ValidateContext): RecordWinnerValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ctx.registration) {
    errors.push("Registration not found for this event.");
  } else if (ctx.registration.eventId !== ctx.round.eventId) {
    errors.push("Registration does not belong to this event.");
  } else if (["cancelled", "refunded"].includes(ctx.registration.bookingStatus)) {
    errors.push("Attendee registration is not eligible (cancelled or refunded).");
  } else if (!ctx.registration.checkedInAt) {
    warnings.push("Attendee has not checked in yet.");
  }

  if (ctx.round.status === "completed") {
    errors.push("This game round is already completed.");
  }
  if (ctx.round.status === "cancelled") {
    errors.push("This game round was cancelled.");
  }

  const cardNum = ctx.input.winningCardNumber.trim();
  if (!cardNum) {
    errors.push("Winning card number is required.");
  }

  const activeWinners = ctx.existingWinners.filter((w) => !w.invalidated);
  const duplicateCard = activeWinners.find(
    (w) => w.winningCardNumber.toLowerCase() === cardNum.toLowerCase(),
  );
  if (duplicateCard) {
    errors.push("This card number has already been recorded as a winner for this event.");
  }

  if (ctx.registration) {
    const priorWins = activeWinners.filter((w) => w.registrationId === ctx.registration!.id);
    if (priorWins.length > 0) {
      warnings.push("This attendee has already won a round at this event (repeat winner).");
    }
  }

  const prizeTaken = activeWinners.find(
    (w) =>
      w.roundInstanceId !== ctx.round.id &&
      w.roundStatus === "completed" &&
      w.prizeLabel.toLowerCase() === ctx.input.prizeLabel.trim().toLowerCase(),
  );
  if (prizeTaken) {
    warnings.push("This prize may already have been awarded in another completed round.");
  }

  return { ok: errors.length === 0, errors, warnings };
}
