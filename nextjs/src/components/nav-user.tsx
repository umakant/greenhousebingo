"use client";

import Link from "next/link";
import { ArrowLeftRight, BadgeCheck, Gift, LogOut, User as UserIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { SensitiveOtpDialog, SwitchCompanyDialog, type SensitiveProfileAction } from "@/components/nav-user-sensitive";
import { getImagePath } from "@/utils/image-path";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/admin-t";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavUserProps = {
  user: {
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
  };
  inHeader?: boolean;
  canManageProfile?: boolean;
  /** Superadmin with impersonate-users: show Switch company (OTP + picker). */
  canSwitchCompany?: boolean;
  /** After marketplace OTP, navigate here (e.g. settings vs public catalog). */
  marketplaceHref?: string;
};


export function NavUser({
  user,
  canManageProfile = true,
  canSwitchCompany = false,
  marketplaceHref = "/marketplace",
}: NavUserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [otpOpen, setOtpOpen] = React.useState(false);
  const [otpAction, setOtpAction] = React.useState<SensitiveProfileAction | null>(null);
  const [switchOpen, setSwitchOpen] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(() =>
    user.avatarUrl?.trim() ? getImagePath(user.avatarUrl.trim()) : null,
  );

  React.useEffect(() => {
    let cancelled = false;
    const loadAvatar = () => {
      fetch("/api/auth/me", { credentials: "same-origin" })
        .then((r) => r.json())
        .then((j: { avatar?: string | null }) => {
          if (cancelled) return;
          const raw = j?.avatar?.trim();
          setAvatarUrl(raw ? getImagePath(raw) : null);
        })
        .catch(() => {});
    };
    loadAvatar();
    const onSettingsUpdated = () => loadAvatar();
    window.addEventListener("pf:app-settings-updated", onSettingsUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("pf:app-settings-updated", onSettingsUpdated);
    };
  }, [pathname]);

  React.useEffect(() => {
    function onAvatarUpdated(e: Event) {
      const ce = e as CustomEvent<{ url?: string }>;
      const raw = ce.detail?.url?.trim();
      setAvatarUrl(raw ? getImagePath(raw) : null);
    }
    window.addEventListener("pf:avatar-updated", onAvatarUpdated);
    return () => window.removeEventListener("pf:avatar-updated", onAvatarUpdated);
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // If request fails, still try to navigate away.
    } finally {
      router.push("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  function openSensitiveAction(action: SensitiveProfileAction) {
    setOtpAction(action);
    setOtpOpen(true);
  }

  return (
    <div className="flex items-center gap-2">
      <SensitiveOtpDialog
        open={otpOpen}
        onOpenChange={(o) => {
          setOtpOpen(o);
          if (!o) setOtpAction(null);
        }}
        action={otpAction}
        userEmail={user.email}
        onVerified={(done) => {
          if (done === "switch_company") setSwitchOpen(true);
          else {
            router.push(marketplaceHref);
            router.refresh();
          }
        }}
      />
      <SwitchCompanyDialog open={switchOpen} onOpenChange={setSwitchOpen} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-8 px-3 rounded-md">
            <Avatar className="h-8 w-8 rounded-full">
              {avatarUrl ? (
                <AvatarImage key={avatarUrl} src={avatarUrl} alt={user.name} className="object-contain p-0.5" />
              ) : null}
              <AvatarFallback className="bg-muted rounded-full">
                {user.name?.charAt(0)?.toUpperCase() || <UserIcon className="h-4 w-4 text-muted-foreground" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {canManageProfile ? (
              <DropdownMenuItem asChild>
                <Link href="/profile/edit">
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  {t("Edit Profile")}
                </Link>
              </DropdownMenuItem>
            ) : null}
            {canSwitchCompany ? (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  openSensitiveAction("switch_company");
                }}
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                {t("Switch company")}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                openSensitiveAction("marketplace");
              }}
            >
              <Gift className="mr-2 h-4 w-4" />
              {t("Marketplace")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={loggingOut}
            onSelect={(e) => {
              e.preventDefault();
              void logout();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {loggingOut ? t("Logging out...") : t("Log out")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

