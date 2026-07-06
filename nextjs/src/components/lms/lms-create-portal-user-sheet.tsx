"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { t } from "@/lib/admin-t";


type LmsCreatePortalUserSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "student" | "instructor";
  onCreated: () => void;
};

export function LmsCreatePortalUserSheet({
  open,
  onOpenChange,
  kind,
  onCreated,
}: LmsCreatePortalUserSheetProps) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [headline, setHeadline] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setHeadline("");
  }, [open]);

  async function save() {
    if (!firstName.trim() || !email.trim()) {
      toast.error(t("First name and email are required"));
      return;
    }
    if (password.trim() && password.trim().length < 6) {
      toast.error(t("Password must be at least 6 characters"));
      return;
    }

    setSaving(true);
    try {
      const url =
        kind === "student" ? "/api/lms/student-accounts" : "/api/lms/instructor-accounts";
      const body: Record<string, unknown> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        send_welcome_email: true,
      };
      if (password.trim()) body.password = password.trim();
      if (kind === "instructor" && headline.trim()) body.headline = headline.trim();

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        welcome_email_sent?: boolean;
        welcome_email_error?: string;
      } | null;

      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? t("Failed to create account"));
        return;
      }

      if (data.welcome_email_sent === false && data.welcome_email_error) {
        toast.warning(
          `${kind === "student" ? t("Student") : t("Instructor")} ${t("created, but welcome email could not be sent:")} ${data.welcome_email_error}`,
        );
      } else {
        toast.success(
          kind === "student"
            ? t("Student account created. Welcome email sent.")
            : t("Instructor account created. Welcome email sent."),
        );
      }
      onOpenChange(false);
      onCreated();
    } catch {
      toast.error(t("Network error"));
    } finally {
      setSaving(false);
    }
  }

  const title = kind === "student" ? t("Create student") : t("Create instructor");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 px-6 py-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  {t("First Name")} <span className="text-red-500">*</span>
                </Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Last Name")}</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>
                {t("Email")} <span className="text-red-500">*</span>
              </Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Password")}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("Leave blank to auto-generate")}
              />
              <p className="text-xs text-muted-foreground">
                {t("Welcome email includes login details (New User template).")}
              </p>
            </div>
            {kind === "instructor" ? (
              <div className="space-y-1.5">
                <Label>{t("Headline")}</Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder={t("Optional instructor headline")}
                />
              </div>
            ) : null}
          </div>
        </ScrollArea>
        <SheetFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("Cancel")}
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? t("Saving…") : t("Save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
