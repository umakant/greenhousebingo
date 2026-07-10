"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";

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
import type { LmsEventCreateWizardInput } from "@/lib/lms-events/schemas";
import { DEFAULT_BINGO_ROUNDS } from "@/lib/lms-events/event-detail-content";
import type { EventBingoGameDto } from "@/lib/event-platform/bingo-games/bingo-game-types";
import {
  bingoGamesToRounds,
  orderBingoGamesByIds,
} from "@/lib/event-platform/bingo-games/bingo-game-types";
import type { EventBingoFaqDto } from "@/lib/event-platform/bingo-faqs/bingo-faq-types";
import {
  bingoFaqsToEventFaqs,
  orderBingoFaqsByIds,
} from "@/lib/event-platform/bingo-faqs/bingo-faq-types";
import type { EventHostDto } from "@/lib/event-platform/hosts/host-types";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";
import type { EventSponsorDto } from "@/lib/event-platform/sponsors/sponsor-types";
import { cn } from "@/lib/utils";

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
  const [hosts, setHosts] = React.useState<EventHostDto[]>([]);
  const [sponsors, setSponsors] = React.useState<EventSponsorDto[]>([]);
  const [hostsLoading, setHostsLoading] = React.useState(false);
  const [sponsorsLoading, setSponsorsLoading] = React.useState(false);
  const [selectedHostId, setSelectedHostId] = React.useState("");
  const [selectedSponsorId, setSelectedSponsorId] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setHostsLoading(true);
      try {
        const res = await fetch("/api/lms/admin/hosts", { credentials: "include", cache: "no-store" });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: EventHostDto[] } | null;
        if (!cancelled && res.ok && data?.ok && Array.isArray(data.items)) {
          setHosts(data.items);
        }
      } finally {
        if (!cancelled) setHostsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setSponsorsLoading(true);
      try {
        const res = await fetch("/api/lms/admin/sponsors", { credentials: "include", cache: "no-store" });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: EventSponsorDto[] } | null;
        if (!cancelled && res.ok && data?.ok && Array.isArray(data.items)) {
          setSponsors(data.items);
        }
      } finally {
        if (!cancelled) setSponsorsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!values.hostName?.trim() || hosts.length === 0) return;
    const match = hosts.find((h) => h.displayName.trim().toLowerCase() === values.hostName?.trim().toLowerCase());
    if (match) setSelectedHostId(match.id);
  }, [values.hostName, hosts]);

  React.useEffect(() => {
    if (!values.sponsorName?.trim() || sponsors.length === 0) return;
    const match = sponsors.find((s) => s.name.trim().toLowerCase() === values.sponsorName?.trim().toLowerCase());
    if (match) setSelectedSponsorId(match.id);
  }, [values.sponsorName, sponsors]);

  function applyHost(host: EventHostDto) {
    onPatch({
      hostName: host.displayName,
      hostBio: host.bio ?? "",
      hostImageUrl: host.imageUrl ?? "",
    });
  }

  function applySponsor(sponsor: EventSponsorDto) {
    onPatch({
      sponsorName: sponsor.name,
      sponsorAddress: sponsor.address ?? "",
      sponsorPhone: sponsor.phone ?? "",
      sponsorPerk: sponsor.perk ?? "",
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
        <p className="text-sm font-medium">Meet your host</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Host</Label>
            <a
              href={EVENT_PLATFORM_PATHS.hosts}
              className="text-xs text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Manage hosts
            </a>
          </div>
          <Select
            value={selectedHostId || undefined}
            onValueChange={(hostId) => {
              setSelectedHostId(hostId);
              const host = hosts.find((h) => h.id === hostId);
              if (host) applyHost(host);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={hostsLoading ? "Loading hosts…" : "Select a saved host"} />
            </SelectTrigger>
            <SelectContent>
              {hosts.map((host) => (
                <SelectItem key={host.id} value={host.id}>
                  {host.displayName}
                  {host.email ? ` — ${host.email}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Auto-fills host bio and photo from your host directory. You can still edit the fields below.
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
          <div className="flex items-center justify-between gap-2">
            <Label>Sponsor</Label>
            <a
              href={EVENT_PLATFORM_PATHS.sponsors}
              className="text-xs text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Manage sponsors
            </a>
          </div>
          <Select
            value={selectedSponsorId || undefined}
            onValueChange={(sponsorId) => {
              setSelectedSponsorId(sponsorId);
              const sponsor = sponsors.find((s) => s.id === sponsorId);
              if (sponsor) applySponsor(sponsor);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={sponsorsLoading ? "Loading sponsors…" : "Select a saved sponsor"} />
            </SelectTrigger>
            <SelectContent>
              {sponsors.map((sponsor) => (
                <SelectItem key={sponsor.id} value={sponsor.id}>
                  {sponsor.name}
                  {sponsor.address ? ` — ${sponsor.address}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Auto-fills sponsor address, phone, and perk from your sponsor directory.
          </p>
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

function BingoGamePicker({
  values,
  onPatch,
}: {
  values: LmsEventCreateWizardInput;
  onPatch: PatchFn;
}) {
  const [games, setGames] = React.useState<EventBingoGameDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const selectedIds = values.bingoGameIds ?? [];

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/lms/admin/bingo-games", { credentials: "include", cache: "no-store" });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: EventBingoGameDto[] } | null;
        if (!cancelled && res.ok && data?.ok && Array.isArray(data.items)) {
          setGames(data.items);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (selectedIds.length > 0 || games.length === 0) return;
    const matched = games
      .filter((game) =>
        (values.bingoRounds ?? []).some(
          (round) =>
            round.name.trim().toLowerCase() === game.name.trim().toLowerCase() &&
            round.pattern.trim().toLowerCase() === game.pattern.trim().toLowerCase(),
        ),
      )
      .map((g) => g.id);
    if (matched.length === 0) return;
    const selectedGames = orderBingoGamesByIds(games, matched);
    onPatch({
      bingoGameIds: matched,
      bingoRounds: bingoGamesToRounds(selectedGames),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate legacy rounds once when games load
  }, [games, selectedIds.length, values.bingoRounds]);

  function applySelection(nextIds: string[]) {
    const selectedGames = orderBingoGamesByIds(games, nextIds);
    onPatch({
      bingoGameIds: nextIds,
      bingoRounds: bingoGamesToRounds(selectedGames),
    });
  }

  function toggleGame(gameId: string) {
    const nextIds = selectedIds.includes(gameId)
      ? selectedIds.filter((id) => id !== gameId)
      : [...selectedIds, gameId];
    applySelection(nextIds);
  }

  const selectedGames = orderBingoGamesByIds(games, selectedIds);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Select which games from your library appear on this event&apos;s public page.
        </p>
        <a
          href={EVENT_PLATFORM_PATHS.bingoGames}
          className="text-xs text-primary hover:underline shrink-0"
          target="_blank"
          rel="noreferrer"
        >
          Manage bingo games
        </a>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading bingo games…</p>
      ) : games.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No bingo games in your library yet.{" "}
          <a href={EVENT_PLATFORM_PATHS.bingoGames} className="text-primary hover:underline" target="_blank" rel="noreferrer">
            Add games
          </a>{" "}
          first, then select them here.
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((game) => {
            const checked = selectedIds.includes(game.id);
            return (
              <label
                key={game.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  checked ? "border-primary/40 bg-primary/5" : "bg-muted/20 hover:bg-muted/30",
                )}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggleGame(game.id)} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{game.name}</p>
                  <p className="text-xs text-muted-foreground">{game.pattern}</p>
                  <p className="mt-1 text-xs">
                    Prize: {game.prize} · {game.difficulty}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {selectedGames.length > 0 ? (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">Selected for this event ({selectedGames.length})</p>
          <ol className="space-y-2">
            {selectedGames.map((game, index) => (
              <li key={game.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <span className="font-medium">
                    Round {index + 1}: {game.name}
                  </span>
                  <p className="text-xs text-muted-foreground">{game.pattern}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => toggleGame(game.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function FaqPicker({
  values,
  onPatch,
}: {
  values: LmsEventCreateWizardInput;
  onPatch: PatchFn;
}) {
  const [faqs, setFaqs] = React.useState<EventBingoFaqDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const selectedIds = values.faqIds ?? [];

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/lms/admin/event-faqs", { credentials: "include", cache: "no-store" });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: EventBingoFaqDto[] } | null;
        if (!cancelled && res.ok && data?.ok && Array.isArray(data.items)) {
          setFaqs(data.items);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (selectedIds.length > 0 || faqs.length === 0) return;
    const legacyFaqs = values.faqs ?? [];
    if (legacyFaqs.length === 0) return;
    const matched = faqs
      .filter((faq) =>
        legacyFaqs.some(
          (row) =>
            row.question.trim().toLowerCase() === faq.question.trim().toLowerCase() &&
            row.answer.trim().toLowerCase() === faq.answer.trim().toLowerCase(),
        ),
      )
      .map((f) => f.id);
    if (matched.length === 0) return;
    const selectedFaqs = orderBingoFaqsByIds(faqs, matched);
    onPatch({
      faqIds: matched,
      faqs: bingoFaqsToEventFaqs(selectedFaqs),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate legacy inline FAQs once when library loads
  }, [faqs, selectedIds.length, values.faqs]);

  function applySelection(nextIds: string[]) {
    const selectedFaqs = orderBingoFaqsByIds(faqs, nextIds);
    onPatch({
      faqIds: nextIds,
      faqs: bingoFaqsToEventFaqs(selectedFaqs),
    });
  }

  function toggleFaq(faqId: string) {
    const nextIds = selectedIds.includes(faqId)
      ? selectedIds.filter((id) => id !== faqId)
      : [...selectedIds, faqId];
    applySelection(nextIds);
  }

  const selectedFaqs = orderBingoFaqsByIds(faqs, selectedIds);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Select which FAQs from your library appear on this event&apos;s public page.
        </p>
        <a
          href={EVENT_PLATFORM_PATHS.eventFaqs}
          className="text-xs text-primary hover:underline shrink-0"
          target="_blank"
          rel="noreferrer"
        >
          Manage event FAQs
        </a>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading FAQs…</p>
      ) : faqs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No FAQs in your library yet.{" "}
          <a href={EVENT_PLATFORM_PATHS.eventFaqs} className="text-primary hover:underline" target="_blank" rel="noreferrer">
            Add FAQs
          </a>{" "}
          first, then select them here.
        </div>
      ) : (
        <div className="space-y-2">
          {faqs.map((faq) => {
            const checked = selectedIds.includes(faq.id);
            return (
              <label
                key={faq.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  checked ? "border-primary/40 bg-primary/5" : "bg-muted/20 hover:bg-muted/30",
                )}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggleFaq(faq.id)} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{faq.question}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{faq.answer}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {selectedFaqs.length > 0 ? (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">Selected for this event ({selectedFaqs.length})</p>
          <ol className="space-y-2">
            {selectedFaqs.map((faq, index) => (
              <li key={faq.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <span className="font-medium">
                    {index + 1}. {faq.question}
                  </span>
                  <p className="text-xs text-muted-foreground line-clamp-2">{faq.answer}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => toggleFaq(faq.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

export function LmsEventGamesFields({
  values,
  onPatch,
}: {
  values: LmsEventCreateWizardInput;
  onPatch: PatchFn;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Bingo games</p>
      <p className="text-sm text-muted-foreground">
        Games shown in the rounds section on the public event page.
      </p>
      <BingoGamePicker values={values} onPatch={onPatch} />
    </div>
  );
}

export function LmsEventFaqFields({
  values,
  onPatch,
}: {
  values: LmsEventCreateWizardInput;
  onPatch: PatchFn;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">FAQs</p>
      <p className="text-sm text-muted-foreground">Accordion questions at the bottom of the event page.</p>
      <FaqPicker values={values} onPatch={onPatch} />
    </div>
  );
}
