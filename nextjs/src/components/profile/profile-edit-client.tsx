"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CreditCard, FolderOpen, Save, UserCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhone, normalizeMobileForStorage } from "@/lib/phone";
import type { TenantBillingPanelPageData } from "@/lib/settings-page-data";
import { ProfileSubscriptionSection } from "@/components/profile/profile-subscription-section";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";


export type ProfileInitial = {
  name: string;
  email: string;
  mobileNo: string;
  avatar: string;
  slug: string;
  type: string | null;
};

function avatarUrl(avatar: string): string | null {
  if (!avatar?.trim()) return null;
  const a = avatar.trim();
  if (a.startsWith("http://") || a.startsWith("https://")) return a;
  return a.startsWith("/") ? a : `/${a}`;
}

export default function ProfileEditClient({
  initial,
  canEditProfile,
  canChangePassword,
  subscriptionBilling,
  canManagePlans,
}: {
  initial: ProfileInitial;
  canEditProfile: boolean;
  canChangePassword: boolean;
  subscriptionBilling: TenantBillingPanelPageData | null;
  canManagePlans: boolean;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(initial.name);
  const [email, setEmail] = React.useState(initial.email);
  const [mobileNo, setMobileNo] = React.useState(() => formatPhone(initial.mobileNo));
  const [slug, setSlug] = React.useState(initial.slug);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(avatarUrl(initial.avatar));
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);

  const [savingProfile, setSavingProfile] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [avatarBroken, setAvatarBroken] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"profile" | "subscription">("profile");

  const isCompany = (initial.type ?? "").toLowerCase() === "company";

  React.useEffect(() => {
    setAvatarBroken(false);
  }, [initial.avatar]);

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
    setAvatarFile(f);
    setAvatarBroken(false);
    e.target.value = "";
  }

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!canEditProfile) return;
    setSavingProfile(true);
    try {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("email", email);
      fd.set("mobile_no", normalizeMobileForStorage(mobileNo) ?? "");
      if (isCompany) fd.set("slug", slug);
      if (avatarFile) fd.set("avatar", avatarFile);

      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        body: fd,
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; user?: ProfileInitial };
      if (!res.ok || !json?.ok) {
        toast.error(json?.message || t("Update failed"));
        return;
      }
      toast.success(json.message || t("Profile updated successfully"));
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (json.user) {
        setName(json.user.name);
        setEmail(json.user.email);
        setMobileNo(formatPhone(json.user.mobileNo ?? ""));
        if (isCompany) setSlug(json.user.slug ?? "");
        if (json.user.avatar) setAvatarPreview(avatarUrl(json.user.avatar));
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("pf:avatar-updated", { detail: { url: json.user?.avatar ?? "" } }),
        );
      }
      router.refresh();
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!canChangePassword) return;
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !json?.ok) {
        toast.error(json?.message || t("Failed to change password"));
        return;
      }
      toast.success(json.message || t("Password changed successfully"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <aside className="shrink-0 md:w-64">
        <div className="md:sticky md:top-4">
          <div className="md:hidden -mx-1 px-1">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                type="button"
                size="sm"
                variant={activeTab === "profile" ? "default" : "outline"}
                onClick={() => setActiveTab("profile")}
              >
                <UserCircle2 className="mr-2 h-4 w-4" />
                {t("Profile")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeTab === "subscription" ? "default" : "outline"}
                onClick={() => setActiveTab("subscription")}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {t("Subscription")}
              </Button>
            </div>
          </div>
          <ScrollArea className="hidden md:block h-[min(70vh,calc(100vh-8rem))]">
            <div className="space-y-1 pr-4">
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "h-auto min-h-10 w-full justify-start py-2 text-left",
                  activeTab === "profile" && "bg-muted font-semibold",
                )}
                onClick={() => setActiveTab("profile")}
              >
                <UserCircle2 className="mr-2 h-4 w-4 shrink-0" />
                {t("Profile")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "h-auto min-h-10 w-full justify-start py-2 text-left",
                  activeTab === "subscription" && "bg-muted font-semibold",
                )}
                onClick={() => setActiveTab("subscription")}
              >
                <CreditCard className="mr-2 h-4 w-4 shrink-0" />
                {t("Subscription")}
              </Button>
            </div>
          </ScrollArea>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        {activeTab === "profile" ? (
          <div className="grid gap-6 lg:grid-cols-2">
      <Card className="rounded-xl border border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t("Profile Information")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("Details about your personal information.")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitProfile} className="space-y-6">
            <div>
              <Label>{t("Avatar")}</Label>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center mt-3">
                <div className="h-24 w-24 shrink-0 rounded-lg border-2 border-border overflow-hidden bg-muted/30 flex items-center justify-center">
                  {avatarPreview && !avatarBroken ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={() => setAvatarBroken(true)}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground text-center px-2">{t("No Image")}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    onChange={onAvatarChange}
                    disabled={!canEditProfile}
                    className="sr-only"
                    id="profile-avatar-input"
                  />
                  <div className="inline-flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9"
                      disabled={!canEditProfile}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FolderOpen className="mr-1 h-3 w-3" />
                      {t("Browse")}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("Upload a profile picture. Recommended size: 200x200px")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-name">
                {t("Name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                disabled={!canEditProfile}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">
                {t("Email")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                disabled={!canEditProfile}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-mobile">{t("Mobile Number")}</Label>
              <Input
                id="profile-mobile"
                type="tel"
                inputMode="numeric"
                value={mobileNo}
                onChange={(e) => setMobileNo(formatPhone(e.target.value))}
                placeholder="(000) 000-0000"
                autoComplete="tel"
                disabled={!canEditProfile}
              />
              <p className="text-xs text-muted-foreground">{t("Format: (000) 000-0000")}</p>
            </div>

            {isCompany ? (
              <div className="space-y-2">
                <Label htmlFor="profile-slug">{t("URL Slug")}</Label>
                <Input
                  id="profile-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-business"
                  autoComplete="off"
                  disabled={!canEditProfile}
                />
              </div>
            ) : null}

            {canEditProfile ? (
              <div className="flex justify-end pt-1">
                <Button type="submit" variant="outline" size="sm" className="h-9" disabled={savingProfile}>
                  <Save className="mr-1 h-3 w-3" />
                  {savingProfile ? t("Saving...") : t("Save Changes")}
                </Button>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t("Change Password")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("Details about your account password change.")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="current-pw">
                {t("Current Password")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="current-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("Enter current password")}
                autoComplete="current-password"
                required
                disabled={!canChangePassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">
                {t("New Password")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("Enter new password")}
                autoComplete="new-password"
                required
                disabled={!canChangePassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">
                {t("Confirm Password")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("Confirm new password")}
                autoComplete="new-password"
                required
                disabled={!canChangePassword}
              />
            </div>
            {canChangePassword ? (
              <div className="flex justify-end pt-1">
                <Button type="submit" variant="outline" size="sm" className="h-9" disabled={savingPassword}>
                  <Save className="mr-1 h-3 w-3" />
                  {savingPassword ? t("Saving...") : t("Save Changes")}
                </Button>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>
          </div>
        ) : (
          <ProfileSubscriptionSection billing={subscriptionBilling} canManagePlans={canManagePlans} />
        )}
      </div>
    </div>
  );
}
