"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LogOut, Clock } from "lucide-react";
import { useTranslation } from "@/contexts/translation-context";

const INACTIVITY_MS = 10 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;
const WARN_AT_MS = INACTIVITY_MS - WARNING_BEFORE_MS;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "wheel",
] as const;

export default function AutoLogoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useTranslation();

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  /** Ref mirrors `showWarning` so activity handlers always see the current value (avoids stale closures on listeners registered once). */
  const showWarningRef = useRef(false);
  showWarningRef.current = showWarning;

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logoutAtRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const doLogout = useCallback(async () => {
    setShowWarning(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
    }
    router.push("/login");
    router.refresh();
  }, [router]);

  const clearAllTimers = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    warnTimerRef.current = null;
    logoutTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const startTimers = useCallback(() => {
    clearAllTimers();

    warnTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      logoutAtRef.current = Date.now() + WARNING_BEFORE_MS;
      setCountdown(Math.round(WARNING_BEFORE_MS / 1000));

      countdownRef.current = setInterval(() => {
        const target = logoutAtRef.current;
        if (!target) return;
        const remainingMs = Math.max(0, target - Date.now());
        const remainingSeconds = Math.round(remainingMs / 1000);

        setCountdown(remainingSeconds);

        if (remainingSeconds <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          logoutAtRef.current = null;
          doLogout();
        }
      }, 1000);

      // Failsafe logout in case interval is throttled or paused.
      logoutTimerRef.current = setTimeout(() => {
        doLogout();
      }, WARNING_BEFORE_MS + 1000);
    }, WARN_AT_MS);
  }, [clearAllTimers, doLogout]);

  /** Always call the latest `startTimers` without re-binding window listeners every render. */
  const startTimersRef = useRef(startTimers);
  startTimersRef.current = startTimers;

  const onActivityRef = useRef<() => void>(() => {});
  onActivityRef.current = () => {
    if (showWarningRef.current) return;
    const now = Date.now();
    if (now - lastActivityRef.current < 1000) return;
    lastActivityRef.current = now;
    startTimersRef.current();
  };

  const stayLoggedIn = useCallback(() => {
    setShowWarning(false);
    lastActivityRef.current = Date.now();
    clearAllTimers();
    logoutAtRef.current = null;
    startTimers();
  }, [clearAllTimers, startTimers]);

  useEffect(() => {
    startTimersRef.current();

    const onActivity = () => onActivityRef.current();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));

    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
    };
    // Mount once: `onActivity` calls latest logic via refs (fixes stuck countdown when stale listeners called `startTimers` during modal).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const countdownDisplay = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : `${seconds}s`;

  const pct = (countdown / 60) * 100;

  return (
    <>
      {children}

      <AlertDialog open={showWarning} onOpenChange={() => {}}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-3">
              <div className="relative flex items-center justify-center h-16 w-16">
                <svg className="absolute inset-0 h-16 w-16 -rotate-90" viewBox="0 0 56 56">
                  <circle
                    cx="28" cy="28" r="24"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="4"
                  />
                  <circle
                    cx="28" cy="28" r="24"
                    fill="none"
                    stroke={pct > 40 ? "hsl(var(--primary))" : pct > 15 ? "hsl(38 92% 50%)" : "hsl(var(--destructive))"}
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 24}`}
                    strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
                  />
                </svg>
                <span className="relative z-10 text-lg font-bold tabular-nums">{countdownDisplay}</span>
              </div>
            </div>
            <AlertDialogTitle className="text-center">
              {t("Session About to Expire")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {t("You have been inactive for a while. You will be automatically logged out in")} <strong>{countdownDisplay}</strong> {t("due to inactivity.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => doLogout()}
            >
              <LogOut className="h-4 w-4" />
              {t("Logout Now")}
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={stayLoggedIn}
            >
              <Clock className="h-4 w-4" />
              {t("Stay Logged In")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
