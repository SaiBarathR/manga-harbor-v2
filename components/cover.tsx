"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { proxyUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Cover / page image rendered through the /api/image proxy so the mandatory
 * MangaDex User-Agent is always set (browsers can't set it themselves).
 */
export function Cover({
  src,
  alt,
  className,
  rounded = "rounded-lg",
  priority = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  rounded?: string;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div
      className={cn(
        "relative aspect-[2/3] overflow-hidden bg-surface-2",
        rounded,
        className,
      )}
    >
      {!errored && src ? (
        // Proxied through /api/image (sets the mandatory UA); next/image can't.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxyUrl(src)}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            "size-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground/50">
          <ImageOff className="size-8" />
        </div>
      )}
      {!loaded && !errored && (
        <div className="absolute inset-0 animate-pulse bg-surface-2" />
      )}
    </div>
  );
}
