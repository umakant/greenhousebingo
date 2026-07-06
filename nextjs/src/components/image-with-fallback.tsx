"use client";

import * as React from "react";
import { getImagePath } from "@/utils/image-path";

type ImageWithFallbackProps = {
  paths: Array<string | null | undefined>;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
};

/** Try each path in order; render fallback when all fail or none are set. */
export function ImageWithFallback({
  paths,
  alt,
  className,
  fallback,
}: ImageWithFallbackProps) {
  const candidates = React.useMemo(
    () =>
      [...new Set(paths.map((p) => String(p ?? "").trim()).filter(Boolean))].map((p) =>
        getImagePath(p),
      ).filter(Boolean),
    [paths],
  );
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    setIndex(0);
  }, [candidates.join("|")]);

  if (index >= candidates.length) {
    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamic branding URLs (Cloudinary, uploads, legacy storage)
    <img
      src={candidates[index]}
      alt={alt}
      className={className}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
