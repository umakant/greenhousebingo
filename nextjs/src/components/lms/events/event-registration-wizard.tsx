"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  lmsEventRegistrationStepConfirmSchema,
  lmsEventRegistrationStepTicketSchema,
  type LmsEventRegistrationWizardInput,
} from "@/lib/lms-events/schemas";
import type { LmsEventTicket } from "@/lib/lms-events/types";

const STEPS = ["Confirm attendee", "Select ticket", "Review"] as const;

export function TicketSelector(props: {
  tickets: LmsEventTicket[];
  value: string;
  onChange: (ticketId: string) => void;
}) {
  const { tickets, value, onChange } = props;

  if (tickets.length === 0) {
    return <p className="text-sm text-muted-foreground">No tickets available for this event.</p>;
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => {
        const selected = value === ticket.id;
        const soldOut = ticket.ticketStatus === "sold_out";
        return (
          <button
            key={ticket.id}
            type="button"
            disabled={soldOut}
            onClick={() => onChange(ticket.id)}
            className={cn(
              "w-full rounded-lg border p-4 text-left transition-colors",
              selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
              soldOut && "cursor-not-allowed opacity-60",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{ticket.name}</p>
                {ticket.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
                ) : null}
              </div>
              <p className="shrink-0 font-semibold">
                {ticket.isFree
                  ? "Free"
                  : new Intl.NumberFormat(undefined, { style: "currency", currency: ticket.currency }).format(
                      ticket.price,
                    )}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function EventRegistrationWizard(props: {
  tickets: LmsEventTicket[];
  requirements?: string | null;
  onComplete: (data: LmsEventRegistrationWizardInput) => void | Promise<void>;
  submitting?: boolean;
}) {
  const [step, setStep] = React.useState(0);
  const [ticketId, setTicketId] = React.useState("");

  const form = useForm<LmsEventRegistrationWizardInput>({
    resolver: zodResolver(
      lmsEventRegistrationStepConfirmSchema.merge(lmsEventRegistrationStepTicketSchema),
    ),
    defaultValues: {
      attendeeName: "",
      attendeeEmail: "",
      acceptRequirements: false,
      ticketId: "",
    },
  });

  async function nextStep() {
    if (step === 0) {
      const ok = await form.trigger(["attendeeName", "attendeeEmail", "acceptRequirements"]);
      if (!ok) return;
      setStep(1);
      return;
    }
    if (step === 1) {
      form.setValue("ticketId", ticketId, { shouldValidate: true });
      const ok = await form.trigger("ticketId");
      if (!ok) return;
      setStep(2);
    }
  }

  async function submit() {
    form.setValue("ticketId", ticketId);
    const ok = await form.trigger();
    if (!ok) return;
    await props.onComplete(form.getValues());
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={cn(
              "rounded-full px-3 py-1",
              i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="attendeeName">Full name</Label>
            <Input id="attendeeName" {...form.register("attendeeName")} />
            {form.formState.errors.attendeeName ? (
              <p className="text-xs text-destructive">{form.formState.errors.attendeeName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="attendeeEmail">Email</Label>
            <Input id="attendeeEmail" type="email" {...form.register("attendeeEmail")} />
            {form.formState.errors.attendeeEmail ? (
              <p className="text-xs text-destructive">{form.formState.errors.attendeeEmail.message}</p>
            ) : null}
          </div>
          {props.requirements ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">{props.requirements}</div>
          ) : null}
          <div className="flex items-start gap-2">
            <Checkbox
              id="acceptRequirements"
              checked={form.watch("acceptRequirements")}
              onCheckedChange={(v) => form.setValue("acceptRequirements", v === true, { shouldValidate: true })}
            />
            <Label htmlFor="acceptRequirements" className="text-sm leading-snug">
              I confirm I meet the event requirements
            </Label>
          </div>
          {form.formState.errors.acceptRequirements ? (
            <p className="text-xs text-destructive">{form.formState.errors.acceptRequirements.message}</p>
          ) : null}
        </div>
      ) : null}

      {step === 1 ? (
        <TicketSelector tickets={props.tickets} value={ticketId} onChange={setTicketId} />
      ) : null}

      {step === 2 ? (
        <div className="rounded-lg border p-4 text-sm space-y-2">
          <p>
            <span className="text-muted-foreground">Name:</span> {form.watch("attendeeName")}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {form.watch("attendeeEmail")}
          </p>
          <p>
            <span className="text-muted-foreground">Ticket:</span>{" "}
            {props.tickets.find((t) => t.id === ticketId)?.name ?? "—"}
          </p>
        </div>
      ) : null}

      <div className="flex justify-between gap-2">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Back
        </Button>
        {step < 2 ? (
          <Button type="button" onClick={() => void nextStep()}>
            Continue
          </Button>
        ) : (
          <Button type="button" disabled={props.submitting} onClick={() => void submit()}>
            {props.submitting ? "Submitting…" : "Confirm registration"}
          </Button>
        )}
      </div>
    </div>
  );
}
