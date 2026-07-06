"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

import { NavUser } from "@/components/nav-user";
import { PF_STOREFRONT_ACCOUNT_SYNC_EVENT } from "@/components/storefront/public/storefront-account-sync";

type NavPayload = {
  ok?: boolean;
  customerAccountsEnabled?: boolean;
  href?: string | null;
  ariaLabel?: string | null;
};

type StaffAuth =
  | { status: "loading" }
  | { status: "anonymous" }
  | {
      status: "authenticated";
      name: string;
      email: string;
      role: string;
      avatarUrl: string | null;
      canManageProfile: boolean;
      canSwitchCompany: boolean;
      marketplaceHref: string;
    };

async function fetchAccountNav(): Promise<NavPayload | null> {
  try {
    const res = await fetch("/api/storefront/public/account-nav", { credentials: "include" });
    const data = (await res.json().catch(() => null)) as NavPayload | null;
    if (!data?.ok) return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchStaffSession(): Promise<StaffAuth> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    const j = (await res.json().catch(() => null)) as {
      isAuthenticated?: boolean;
      name?: string;
      email?: string;
      role?: string;
      avatar?: string | null;
      canManageProfile?: boolean;
      canSwitchCompany?: boolean;
      marketplaceHref?: string;
    } | null;
    if (!j?.isAuthenticated || !j.email) return { status: "anonymous" };
    return {
      status: "authenticated",
      name: (j.name?.trim() || j.email),
      email: j.email,
      role: j.role ?? "",
      avatarUrl: j.avatar ?? null,
      canManageProfile: Boolean(j.canManageProfile),
      canSwitchCompany: Boolean(j.canSwitchCompany),
      marketplaceHref: j.marketplaceHref || "/marketplace",
    };
  } catch {
    return { status: "anonymous" };
  }
}

function applyToAccountAnchors(payload: NavPayload): void {
  if (!payload.href?.trim()) return;
  const href = payload.href.trim();
  const label = (payload.ariaLabel?.trim() || "Account").trim();
  const anchors = document.querySelectorAll(
    ".pf-shopify-account-fallback a.account-button, a.pf-shopify-account-fallback.account-button, .pf-shopify-account-fallback.account-button",
  );
  anchors.forEach((el) => {
    if (!(el instanceof HTMLAnchorElement)) return;
    el.setAttribute("href", href);
    el.setAttribute("aria-label", label);
    if (label.toLowerCase() === "log in") {
      el.setAttribute("title", "Log in");
    } else {
      el.removeAttribute("title");
    }
  });
}

/**
 * Hydrates the theme account icon in two modes:
 *  1. Staff is logged in (pf_* cookies) → hide the icon and portal a NavUser dropdown in its place
 *     so the storefront shows the same Edit Profile / Switch company / Marketplace / Log out menu
 *     used in the admin header.
 *  2. No staff session → existing behaviour: rewrite the icon's href to the storefront customer
 *     dashboard or login depending on the sfc_session cookie.
 */
export function StorefrontAccountNavHydration() {
  const [staff, setStaff] = useState<StaffAuth>({ status: "loading" });
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchStaffSession().then((s) => {
      if (!cancelled) setStaff(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Customer-nav href rewrite — only when there's no staff session.
  useLayoutEffect(() => {
    if (staff.status !== "anonymous") return;

    const run = () => {
      void fetchAccountNav().then((payload) => {
        if (!payload) return;
        applyToAccountAnchors(payload);
      });
    };

    run();
    const tids = [80, 400, 1200, 2800].map((ms) => window.setTimeout(run, ms));
    window.addEventListener(PF_STOREFRONT_ACCOUNT_SYNC_EVENT, run);
    window.addEventListener("focus", run);
    return () => {
      tids.forEach((id) => window.clearTimeout(id));
      window.removeEventListener(PF_STOREFRONT_ACCOUNT_SYNC_EVENT, run);
      window.removeEventListener("focus", run);
    };
  }, [staff.status]);

  // Staff-mode: locate the account icon wrapper, hide its anchor, claim it as the portal target.
  useLayoutEffect(() => {
    if (staff.status !== "authenticated") return;

    const find = () => {
      document
        .querySelectorAll<HTMLElement>(
          ".pf-shopify-account-fallback.account-button, .pf-shopify-account-fallback a.account-button",
        )
        .forEach((el) => {
          el.style.display = "none";
        });
      const wrapper =
        document.querySelector("[data-pf-account-dock].pf-shopify-account-fallback") ??
        document.querySelector(".pf-shopify-account-fallback");
      if (wrapper && wrapper !== target) {
        setTarget(wrapper);
      }
    };

    find();
    const tids = [80, 400, 1200, 2800].map((ms) => window.setTimeout(find, ms));
    return () => tids.forEach((id) => window.clearTimeout(id));
  }, [staff.status, target]);

  if (staff.status === "authenticated" && target) {
    return createPortal(
      <span className="pf-staff-account-menu inline-flex items-center">
        <NavUser
          user={{
            name: staff.name,
            email: staff.email,
            role: staff.role,
            avatarUrl: staff.avatarUrl,
          }}
          canManageProfile={staff.canManageProfile}
          canSwitchCompany={staff.canSwitchCompany}
          marketplaceHref={staff.marketplaceHref}
        />
      </span>,
      target,
    );
  }

  return null;
}
