"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProfilePayload = {
  displayName: string | null;
  headline: string | null;
  bio: string | null;
  avatarUrl: string | null;
  expertise: unknown;
};

export function LmsInstructorProfileForm() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [displayName, setDisplayName] = React.useState("");
  const [headline, setHeadline] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [expertiseText, setExpertiseText] = React.useState("");
  const [accountAvatar, setAccountAvatar] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/lms/instructor-profile", { credentials: "same-origin", cache: "no-store" });
        const json = (await res.json()) as {
          ok?: boolean;
          profile?: ProfilePayload | null;
          user?: { avatar?: string | null } | null;
          message?: string;
        };
        if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Failed to load profile.");
        if (cancelled) return;
        const p = json.profile;
        setDisplayName(p?.displayName ?? "");
        setHeadline(p?.headline ?? "");
        setBio(p?.bio ?? "");
        setAvatarUrl(p?.avatarUrl ?? "");
        const exp = p?.expertise;
        setExpertiseText(Array.isArray(exp) ? exp.join(", ") : "");
        setAccountAvatar(json.user?.avatar ?? null);
      } catch (e: unknown) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const expertise = expertiseText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/lms/instructor-profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
          expertise,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Save failed.");
      toast.success("Profile saved.");
      void fetch("/api/auth/me", { credentials: "same-origin" }).catch(() => null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading profile…</div>;
  }

  return (
    <form onSubmit={onSave} className="max-w-xl space-y-4 rounded-lg border border-border/80 bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Instructor profile</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Linked to your user account. Avatar URL is used on instructor cards; if empty, your account avatar can be shown
          in the UI.
        </p>
        {accountAvatar ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Account avatar: <span className="font-mono">{accountAvatar}</span>
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="lms-display-name">Display name</Label>
        <Input
          id="lms-display-name"
          value={displayName}
          onChange={(ev) => setDisplayName(ev.target.value)}
          placeholder="Name shown to learners"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lms-headline">Headline</Label>
        <Input
          id="lms-headline"
          value={headline}
          onChange={(ev) => setHeadline(ev.target.value)}
          placeholder="Short title, e.g. Senior Lecturer"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lms-bio">Bio</Label>
        <Textarea id="lms-bio" value={bio} onChange={(ev) => setBio(ev.target.value)} rows={5} placeholder="About you…" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lms-avatar">Avatar image URL</Label>
        <Input
          id="lms-avatar"
          value={avatarUrl}
          onChange={(ev) => setAvatarUrl(ev.target.value)}
          placeholder="https://…"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lms-expertise">Expertise (comma-separated)</Label>
        <Input
          id="lms-expertise"
          value={expertiseText}
          onChange={(ev) => setExpertiseText(ev.target.value)}
          placeholder="e.g. Python, Curriculum design, Live workshops"
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
