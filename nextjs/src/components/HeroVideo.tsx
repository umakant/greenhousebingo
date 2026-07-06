"use client";

import { cn } from "@/lib/utils";

const HERO_VIDEO_SRC = "/videos/paperflight-hero.mp4";

type HeroVideoProps = {
  /** `background` fills the hero section; `inline` fits inside a content column. */
  variant?: "background" | "inline";
  className?: string;
};

export function HeroVideo({ variant = "inline", className }: HeroVideoProps) {
  return (
    <video
      className={cn(
        variant === "background"
          ? "absolute inset-0 h-full w-full object-cover"
          : "h-full w-full object-contain",
        className,
      )}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
    >
      <source src={HERO_VIDEO_SRC} type="video/mp4" />
    </video>
  );
}
