"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import MediaPicker from "@/components/MediaPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_BINGO_ROUNDS,
  DEFAULT_EVENT_FAQS,
  LMS_EVENT_BINGO_DIFFICULTIES,
  type LmsEventBingoRound,
  type LmsEventFaq,
} from "@/lib/lms-events/event-detail-content";
import type { LmsEventCreateWizardInput } from "@/lib/lms-events/schemas";

type PatchFn = (partial: Partial<LmsEventCreateWizardInput>) => void;

export function LmsEventPublicPageFields({
  values,
  onPatch,
}: {
  values: LmsEventCreateWizardInput;
  onPatch: PatchFn;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Hero banner, intro heading, and sections shown on the public event landing page.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ev-region">Region tag</Label>
          <Input
            id="ev-region"
            value={values.regionTag ?? ""}
            onChange={(e) => onPatch({ regionTag: e.target.value })}
            placeholder="TX, CO, FL…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-card-fee">Card processing fee (%)</Label>
          <Input
            id="ev-card-fee"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={values.cardFeePercent ?? ""}
            onChange={(e) => onPatch({ cardFeePercent: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ev-hero-tagline">Hero tagline</Label>
        <Input
          id="ev-hero-tagline"
          value={values.heroTagline ?? ""}
          onChange={(e) => onPatch({ heroTagline: e.target.value })}
          placeholder="Everyone Leaves With a Plant. Guaranteed."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ev-desc-title">Intro heading</Label>
        <Input
          id="ev-desc-title"
          value={values.descriptionTitle ?? ""}
          onChange={(e) => onPatch({ descriptionTitle: e.target.value })}
          placeholder="You're Invited to Plant Bingo at…"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ev-age-policy">Age policy text</Label>
        <Textarea
          id="ev-age-policy"
          rows={2}
          value={values.agePolicyText ?? ""}
          onChange={(e) => onPatch({ agePolicyText: e.target.value })}
          placeholder="21+ only. Valid ID required at the door."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ev-included">What&apos;s included (one item per line)</Label>
        <Textarea
          id="ev-included"
          rows={6}
          value={values.whatsIncludedText ?? ""}
          onChange={(e) => onPatch({ whatsIncludedText: e.target.value })}
          placeholder={DEFAULT_BINGO_ROUNDS.length ? "Bingo cards included with ticket" : ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ev-checkin">Check-in steps (one step per line)</Label>
        <Textarea
          id="ev-checkin"
          rows={5}
          value={values.checkInStepsText ?? ""}
          onChange={(e) => onPatch({ checkInStepsText: e.target.value })}
        />
      </div>
    </div>
  );
}

export function LmsEventHostSponsorFields({
  values,
  onPatch,
}: {
  values: LmsEventCreateWizardInput;
  onPatch: PatchFn;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
        <p className="text-sm font-medium">Meet your host</p>
        <div className="space-y-2">
          <Label htmlFor="ev-host-name">Host name</Label>
          <Input
            id="ev-host-name"
            value={values.hostName ?? ""}
            onChange={(e) => onPatch({ hostName: e.target.value })}
            placeholder="Jordan Reyes"
          />
          <p className="text-xs text-muted-foreground">
            Defaults to the assigned instructor name when left blank on the public page.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-host-bio">Host bio</Label>
          <Textarea
            id="ev-host-bio"
            rows={4}
            value={values.hostBio ?? ""}
            onChange={(e) => onPatch({ hostBio: e.target.value })}
          />
        </div>
        <MediaPicker
          id="ev-host-image"
          label="Host photo"
          value={values.hostImageUrl ?? ""}
          onChange={(v) => onPatch({ hostImageUrl: typeof v === "string" ? v : v[0] ?? "" })}
          placeholder="Select host headshot…"
        />
      </div>

      <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
        <p className="text-sm font-medium">Sponsor / partner</p>
        <div className="space-y-2">
          <Label htmlFor="ev-sponsor-name">Sponsor name</Label>
          <Input
            id="ev-sponsor-name"
            value={values.sponsorName ?? ""}
            onChange={(e) => onPatch({ sponsorName: e.target.value })}
            placeholder="North Haven Gardens"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-sponsor-address">Sponsor address</Label>
          <Input
            id="ev-sponsor-address"
            value={values.sponsorAddress ?? ""}
            onChange={(e) => onPatch({ sponsorAddress: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-sponsor-phone">Sponsor phone</Label>
          <Input
            id="ev-sponsor-phone"
            value={values.sponsorPhone ?? ""}
            onChange={(e) => onPatch({ sponsorPhone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-sponsor-perk">Sponsor perk / offer</Label>
          <Textarea
            id="ev-sponsor-perk"
            rows={2}
            value={values.sponsorPerk ?? ""}
            onChange={(e) => onPatch({ sponsorPerk: e.target.value })}
            placeholder="Every attendee gets a discount card…"
          />
        </div>
      </div>
    </div>
  );
}

function BingoRoundsEditor({
  rounds,
  onChange,
}: {
  rounds: LmsEventBingoRound[];
  onChange: (rounds: LmsEventBingoRound[]) => void;
}) {
  function patchAt(index: number, patch: Partial<LmsEventBingoRound>) {
    onChange(rounds.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRound() {
    const nextNumber = rounds.length + 1;
    onChange([
      ...rounds,
      {
        roundNumber: nextNumber,
        name: `Round ${nextNumber}`,
        pattern: "Any line",
        difficulty: "Easy",
        prize: "Houseplant",
      },
    ]);
  }

  return (
    <div className="space-y-3">
      {rounds.map((round, index) => (
        <div key={`round-${round.roundNumber}-${index}`} className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Round {round.roundNumber}</p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onChange(rounds.filter((_, i) => i !== index).map((r, i) => ({ ...r, roundNumber: i + 1 })))}
              disabled={rounds.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={round.name} onChange={(e) => patchAt(index, { name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prize</Label>
              <Input value={round.prize} onChange={(e) => patchAt(index, { prize: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Pattern</Label>
            <Input value={round.pattern} onChange={(e) => patchAt(index, { pattern: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Difficulty</Label>
            <Select value={round.difficulty} onValueChange={(v) => patchAt(index, { difficulty: v as LmsEventBingoRound["difficulty"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LMS_EVENT_BINGO_DIFFICULTIES.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRound}>
        <Plus className="mr-2 h-4 w-4" />
        Add round
      </Button>
    </div>
  );
}

function FaqEditor({ faqs, onChange }: { faqs: LmsEventFaq[]; onChange: (faqs: LmsEventFaq[]) => void }) {
  function patchAt(index: number, patch: Partial<LmsEventFaq>) {
    onChange(faqs.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <div key={`faq-${index}`} className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">FAQ {index + 1}</p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onChange(faqs.filter((_, i) => i !== index))}
              disabled={faqs.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Question</Label>
            <Input value={faq.question} onChange={(e) => patchAt(index, { question: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Answer</Label>
            <Textarea rows={3} value={faq.answer} onChange={(e) => patchAt(index, { answer: e.target.value })} />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...faqs, { question: "New question", answer: "Answer…" }])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add FAQ
      </Button>
    </div>
  );
}

export function LmsEventGamesFaqFields({
  values,
  onPatch,
}: {
  values: LmsEventCreateWizardInput;
  onPatch: PatchFn;
}) {
  const rounds = values.bingoRounds?.length ? values.bingoRounds : [...DEFAULT_BINGO_ROUNDS];
  const faqs = values.faqs?.length ? values.faqs : [...DEFAULT_EVENT_FAQS];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-medium">Bingo rounds</p>
        <p className="text-sm text-muted-foreground">Game rounds shown in the &quot;10 Rounds&quot; section on the event page.</p>
        <BingoRoundsEditor rounds={rounds} onChange={(bingoRounds) => onPatch({ bingoRounds })} />
      </div>
      <div className="space-y-3">
        <p className="text-sm font-medium">FAQs</p>
        <p className="text-sm text-muted-foreground">Accordion questions at the bottom of the event page.</p>
        <FaqEditor faqs={faqs} onChange={(faqs) => onPatch({ faqs })} />
      </div>
    </div>
  );
}
