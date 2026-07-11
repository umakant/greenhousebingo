"use client";

import * as React from "react";
import { ExternalLink, Plus, X } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";

import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  addPickerRow,
  hostsFromIds,
  normalizePickerRows,
  removePickerRow,
  selectedPickerIds,
  setPickerRow,
  sponsorsFromIds,
} from "@/lib/event-platform/event-host-sponsor/event-host-sponsor-wizard";
import { cn } from "@/lib/utils";

type PatchFn = (partial: Partial<LmsEventCreateWizardInput>) => void;

function LibraryAdminLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "relative z-10 inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground no-underline hover:text-foreground",
        className,
      )}
    >
      <ExternalLink className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

function HostSponsorPickerRows({
  rows,
  loading,
  placeholder,
  options,
  isOptionDisabled,
  addLabel,
  onAddRow,
  onChangeRow,
  onRemoveRow,
}: {
  rows: string[];
  loading: boolean;
  placeholder: string;
  options: { id: string; label: string }[];
  isOptionDisabled: (rowIndex: number, optionId: string) => boolean;
  addLabel: string;
  onAddRow: () => void;
  onChangeRow: (index: number, value: string) => void;
  onRemoveRow: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      {rows.map((rowValue, index) => (
        <div key={`picker-row-${index}`} className="flex items-center gap-2">
          <Select
            value={rowValue || undefined}
            onValueChange={(value) => onChangeRow(index, value)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={loading ? "Loading…" : placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  disabled={isOptionDisabled(index, option.id)}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {rows.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemoveRow(index)}
              aria-label="Remove row"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-9 shrink-0" />
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onAddRow}>
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
}

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
  const [hostRows, setHostRows] = React.useState<string[]>(() => normalizePickerRows(values.hostIds));
  const [sponsorRows, setSponsorRows] = React.useState<string[]>(() => normalizePickerRows(values.sponsorIds));
  const hostHydratedRef = React.useRef(false);
  const sponsorHydratedRef = React.useRef(false);

  React.useEffect(() => {
    setHostRows(normalizePickerRows(values.hostIds));
    hostHydratedRef.current = Boolean(values.hostIds?.length);
  }, [values.hostIds]);

  React.useEffect(() => {
    setSponsorRows(normalizePickerRows(values.sponsorIds));
    sponsorHydratedRef.current = Boolean(values.sponsorIds?.length);
  }, [values.sponsorIds]);

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

  const syncHostsFromRows = React.useCallback(
    (rows: string[]) => {
      const ids = selectedPickerIds(rows);
      const roster = hostsFromIds(hosts, ids);
      const primary = roster[0];
      onPatch({
        hostIds: ids,
        hosts: roster,
        hostName: primary?.name ?? "",
        hostBio: primary?.bio ?? "",
        hostImageUrl: primary?.imageUrl ?? "",
        instructorName: primary?.name ?? "",
      });
    },
    [hosts, onPatch],
  );

  const syncSponsorsFromRows = React.useCallback(
    (rows: string[]) => {
      const ids = selectedPickerIds(rows);
      const roster = sponsorsFromIds(sponsors, ids);
      const primary = roster[0];
      onPatch({
        sponsorIds: ids,
        sponsors: roster,
        sponsorName: primary?.name ?? "",
        sponsorAddress: primary?.address ?? "",
        sponsorPhone: primary?.phone ?? "",
        sponsorPerk: primary?.perk ?? "",
      });
    },
    [onPatch, sponsors],
  );

  React.useEffect(() => {
    if (hostHydratedRef.current || !values.hostName?.trim() || hosts.length === 0) return;
    const match = hosts.find((h) => h.displayName.trim().toLowerCase() === values.hostName?.trim().toLowerCase());
    if (!match) return;
    const rows = [match.id];
    hostHydratedRef.current = true;
    setHostRows(rows);
    syncHostsFromRows(rows);
  }, [values.hostName, hosts, syncHostsFromRows]);

  React.useEffect(() => {
    if (sponsorHydratedRef.current || !values.sponsorName?.trim() || sponsors.length === 0) return;
    const match = sponsors.find((s) => s.name.trim().toLowerCase() === values.sponsorName?.trim().toLowerCase());
    if (!match) return;
    const rows = [match.id];
    sponsorHydratedRef.current = true;
    setSponsorRows(rows);
    syncSponsorsFromRows(rows);
  }, [values.sponsorName, sponsors, syncSponsorsFromRows]);

  const selectedHostIds = selectedPickerIds(hostRows);
  const selectedSponsorIds = selectedPickerIds(sponsorRows);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
        <p className="text-sm font-medium">Meet your host</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>{selectedHostIds.length > 1 ? "Hosts" : "Host"}</Label>
            <LibraryAdminLink href={EVENT_PLATFORM_PATHS.hosts} label="Manage hosts" />
          </div>
          <HostSponsorPickerRows
            rows={hostRows}
            loading={hostsLoading}
            placeholder="Select a saved host"
            options={hosts.map((host) => ({
              id: host.id,
              label: `${host.displayName}${host.email ? ` — ${host.email}` : ""}`,
            }))}
            isOptionDisabled={(rowIndex, optionId) =>
              hostRows.some((id, i) => i !== rowIndex && id === optionId)
            }
            addLabel="Add host"
            onAddRow={() => setHostRows((rows) => addPickerRow(selectedPickerIds(rows)))}
            onChangeRow={(index, hostId) => {
              const nextRows = setPickerRow(hostRows, index, hostId);
              setHostRows(nextRows);
              syncHostsFromRows(nextRows);
            }}
            onRemoveRow={(index) => {
              const nextRows = removePickerRow(hostRows, index);
              setHostRows(nextRows);
              syncHostsFromRows(nextRows);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Host bio and photo are pulled from your host directory when the event is saved.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
        <p className="text-sm font-medium">Sponsor / partner</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>{selectedSponsorIds.length > 1 ? "Sponsors" : "Sponsor"}</Label>
            <LibraryAdminLink href={EVENT_PLATFORM_PATHS.sponsors} label="Manage sponsors" />
          </div>
          <HostSponsorPickerRows
            rows={sponsorRows}
            loading={sponsorsLoading}
            placeholder="Select a saved sponsor"
            options={sponsors.map((sponsor) => ({
              id: sponsor.id,
              label: `${sponsor.name}${sponsor.address ? ` — ${sponsor.address}` : ""}`,
            }))}
            isOptionDisabled={(rowIndex, optionId) =>
              sponsorRows.some((id, i) => i !== rowIndex && id === optionId)
            }
            addLabel="Add sponsor"
            onAddRow={() => setSponsorRows((rows) => addPickerRow(selectedPickerIds(rows)))}
            onChangeRow={(index, sponsorId) => {
              const nextRows = setPickerRow(sponsorRows, index, sponsorId);
              setSponsorRows(nextRows);
              syncSponsorsFromRows(nextRows);
            }}
            onRemoveRow={(index) => {
              const nextRows = removePickerRow(sponsorRows, index);
              setSponsorRows(nextRows);
              syncSponsorsFromRows(nextRows);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Sponsor address, phone, and perk are pulled from your sponsor directory when the event is saved.
          </p>
        </div>
      </div>
    </div>
  );
}

function BingoGamePatternImage(props: { imageUrl: string | null | undefined; name: string }) {
  if (props.imageUrl?.trim()) {
    return (
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={props.imageUrl} alt={`${props.name} pattern`} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed bg-muted/40 px-1 text-center text-[10px] leading-tight text-muted-foreground">
      No pattern image
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

  const loadGames = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lms/admin/bingo-games", { credentials: "include", cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: EventBingoGameDto[] } | null;
      if (res.ok && data?.ok && Array.isArray(data.items)) {
        setGames(data.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadGames();
  }, [loadGames]);

  React.useEffect(() => {
    const onFocus = () => void loadGames();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadGames]);

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
      <p className="text-sm text-muted-foreground">
        Select which games from your library appear on this event&apos;s public page.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading bingo games…</p>
      ) : games.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">No bingo games in your library yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((game) => {
            const checked = selectedIds.includes(game.id);
            return (
              <label
                key={game.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                  checked ? "border-primary/40 bg-primary/5" : "bg-muted/20 hover:bg-muted/30",
                )}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggleGame(game.id)} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{game.name}</p>
                  <p className="text-xs text-muted-foreground">{game.pattern}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{game.difficulty}</p>
                </div>
                <BingoGamePatternImage imageUrl={game.imageUrl} name={game.name} />
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
              <li key={game.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <BingoGamePatternImage imageUrl={game.imageUrl} name={game.name} />
                  <div className="min-w-0">
                    <span className="font-medium">
                      Round {index + 1}: {game.name}
                    </span>
                    <p className="text-xs text-muted-foreground">{game.pattern}</p>
                  </div>
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

  const loadFaqs = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lms/admin/event-faqs", { credentials: "include", cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: EventBingoFaqDto[] } | null;
      if (res.ok && data?.ok && Array.isArray(data.items)) {
        setFaqs(data.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadFaqs();
  }, [loadFaqs]);

  React.useEffect(() => {
    const onFocus = () => void loadFaqs();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadFaqs]);

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
      <p className="text-sm text-muted-foreground">
        Select which FAQs from your library appear on this event&apos;s public page.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading FAQs…</p>
      ) : faqs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">No FAQs in your library yet.</p>
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
