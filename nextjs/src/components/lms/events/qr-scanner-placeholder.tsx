"use client";

import * as React from "react";
import { Camera, CameraOff, Loader2, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Minimal shape of the native BarcodeDetector API (not in the TS DOM lib). */
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

type QRScannerProps = {
  /** Called with the decoded QR string each time a code is read. */
  onScan?: (value: string) => void;
  /** Disable starting the camera (e.g. no check-in permission). */
  disabled?: boolean;
};

/**
 * Live QR check-in scanner. When `onScan` is provided it activates the device
 * camera and decodes QR codes via the native BarcodeDetector API. Without
 * `onScan` (or when the API/camera is unavailable) it renders a static prompt
 * so the manual check-in fields below remain the source of truth.
 */
export function QRScannerPlaceholder(props: QRScannerProps) {
  const interactive = typeof props.onScan === "function";

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const detectorRef = React.useRef<BarcodeDetectorLike | null>(null);
  const intervalRef = React.useRef<number | null>(null);
  const busyRef = React.useRef(false);
  const lastHitRef = React.useRef<{ value: string; at: number } | null>(null);

  const [active, setActive] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "BarcodeDetector" in window &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  const stop = React.useCallback(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    busyRef.current = false;
    setActive(false);
  }, []);

  React.useEffect(() => () => stop(), [stop]);

  const tick = React.useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || busyRef.current || video.readyState < 2) return;
    busyRef.current = true;
    detector
      .detect(video)
      .then((codes) => {
        const raw = codes[0]?.rawValue?.trim();
        if (!raw) return;
        const now = Date.now();
        const last = lastHitRef.current;
        // Debounce repeated reads of the same code within a short window.
        if (last && last.value === raw && now - last.at < 2500) return;
        lastHitRef.current = { value: raw, at: now };
        props.onScan?.(raw);
      })
      .catch(() => undefined)
      .finally(() => {
        busyRef.current = false;
      });
  }, [props]);

  async function start() {
    setError(null);
    if (!supported) {
      setError(
        "Live camera scanning isn't supported in this browser. Use the token field or search below.",
      );
      return;
    }
    setStarting(true);
    try {
      const Ctor = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
      detectorRef.current = new Ctor({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      intervalRef.current = window.setInterval(tick, 250);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Camera permission denied. Allow camera access or use manual check-in below.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No camera found on this device. Use manual check-in below.");
      } else {
        setError("Could not start the camera. Use manual check-in below.");
      }
      stop();
    } finally {
      setStarting(false);
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScanLine className="h-5 w-5" aria-hidden />
          QR scanner
        </CardTitle>
        {interactive && active ? (
          <Button type="button" size="sm" variant="ghost" onClick={stop}>
            <CameraOff className="mr-1.5 h-4 w-4" aria-hidden />
            Stop
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="relative flex aspect-video flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-green-300 bg-green-50/60 p-6 text-center">
          {/* Video is always mounted so the ref is available before play(). */}
          <video
            ref={videoRef}
            className={active ? "absolute inset-0 h-full w-full object-cover" : "hidden"}
            muted
            playsInline
          />
          {active ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-40 w-40 rounded-lg border-2 border-green-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          ) : (
            <>
              <ScanLine className="mb-3 h-12 w-12 text-green-500" aria-hidden />
              <p className="text-sm font-medium">Ready to scan</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                {interactive
                  ? "Start the camera to scan a ticket QR code, or use manual check-in below."
                  : "Place QR code in front of the camera, or use manual check-in below."}
              </p>
              {interactive ? (
                <Button
                  type="button"
                  size="sm"
                  className="mt-4 bg-green-600 hover:bg-green-700"
                  disabled={props.disabled || starting}
                  onClick={() => void start()}
                >
                  {starting ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Camera className="mr-1.5 h-4 w-4" aria-hidden />
                  )}
                  Start camera scan
                </Button>
              ) : null}
            </>
          )}
        </div>
        {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
        {active ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Point the camera at a ticket QR code — check-in happens automatically.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
