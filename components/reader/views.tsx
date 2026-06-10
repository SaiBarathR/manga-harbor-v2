"use client";

import { useState } from "react";
import { ImageOff, Loader2, RotateCw } from "lucide-react";
import { proxyUrl } from "@/lib/api";
import type { ReaderDirection, ReaderFit } from "@/lib/store/reader";
import { cn } from "@/lib/utils";

function src(url: string, nonce: number): string {
  return proxyUrl(url) + (nonce ? `&r=${nonce}` : "");
}

/** Tailwind sizing for a single page in paged (single/double) mode. */
function pagedImgClass(fit: ReaderFit, double: boolean): string {
  if (double) {
    switch (fit) {
      case "width":
        return "w-[50vw] h-auto";
      case "original":
        return "w-auto h-auto max-w-none";
      default:
        // Two pages share the viewport height; width follows aspect ratio.
        return "h-full max-h-full w-auto";
    }
  }
  switch (fit) {
    case "width":
      return "w-full h-auto";
    case "height":
      return "h-full w-auto max-w-none";
    case "original":
      return "w-auto h-auto max-w-none";
    case "contain":
    default:
      return "max-h-full max-w-full w-auto h-auto";
  }
}

/** Tailwind sizing for one panel in webtoon (strip) mode. */
function stripImgClass(fit: ReaderFit): string {
  switch (fit) {
    case "width":
    case "original":
      return "w-full";
    case "height":
      return "w-full max-w-[680px]";
    case "contain":
    default:
      return "w-full max-w-[860px]";
  }
}

/**
 * Current spread, rendered as direct flex child(ren) of the scroll viewport so
 * that `margin:auto` centering keeps tall/wide pages fully scrollable. Load
 * progress is reported up via the `onLoad`/`onError` event callbacks; the
 * parent owns the spinner/error overlay so it stays centered in the viewport.
 */
export function PagedView({
  spread,
  pages,
  fit,
  direction,
  nonce,
  onLoad,
  onError,
}: {
  spread: number[];
  pages: string[];
  fit: ReaderFit;
  direction: ReaderDirection;
  /** Bumped to force a fresh load (retry). */
  nonce: number;
  onLoad: () => void;
  onError: () => void;
}) {
  if (spread.length <= 1) {
    const p = spread[0] ?? 0;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={`${p}-${nonce}`}
        src={src(pages[p], nonce)}
        alt={`Page ${p + 1}`}
        decoding="async"
        onLoad={onLoad}
        onError={onError}
        className={cn(
          "m-auto block select-none object-contain",
          pagedImgClass(fit, false),
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "m-auto flex",
        // In RTL the lower page number sits on the right.
        direction === "rtl" ? "flex-row-reverse" : "flex-row",
        fit === "width" ? "w-full items-start" : "h-full items-stretch",
      )}
    >
      {spread.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${p}-${nonce}`}
          src={src(pages[p], nonce)}
          alt={`Page ${p + 1}`}
          decoding="async"
          onLoad={onLoad}
          onError={onError}
          className={cn(
            "block select-none object-contain",
            pagedImgClass(fit, true),
          )}
        />
      ))}
    </div>
  );
}

/** One self-contained panel in webtoon mode: placeholder, lazy load, retry. */
function StripImage({
  url,
  index,
  fit,
  gap,
  eager,
  registerRef,
}: {
  url: string;
  index: number;
  fit: ReaderFit;
  gap: boolean;
  eager: boolean;
  registerRef: (index: number, el: HTMLElement | null) => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);

  return (
    <div
      ref={(el) => registerRef(index, el)}
      data-page={index}
      className={cn("relative w-full", stripImgClass(fit), gap && "mb-2 sm:mb-3")}
    >
      {status !== "ready" && (
        <div className="grid min-h-[70vh] w-full place-items-center bg-surface/30">
          {status === "loading" ? (
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <ImageOff className="size-6" />
              <span>Page {index + 1} failed to load</span>
              <button
                onClick={() => {
                  setStatus("loading");
                  setAttempt((a) => a + 1);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-foreground transition-colors hover:bg-surface"
              >
                <RotateCw className="size-3.5" /> Retry
              </button>
            </div>
          )}
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={attempt}
        src={src(url, attempt)}
        alt={`Page ${index + 1}`}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
        className={cn(
          "block w-full select-none",
          status === "ready" ? "opacity-100" : "absolute inset-0 opacity-0",
        )}
      />
    </div>
  );
}

export function StripView({
  pages,
  fit,
  gap,
  registerRef,
}: {
  pages: string[];
  fit: ReaderFit;
  gap: boolean;
  registerRef: (index: number, el: HTMLElement | null) => void;
}) {
  return (
    <div className="mx-auto flex w-full flex-col items-center pb-24">
      {pages.map((url, i) => (
        <StripImage
          key={url}
          url={url}
          index={i}
          fit={fit}
          gap={gap}
          eager={i < 2}
          registerRef={registerRef}
        />
      ))}
    </div>
  );
}
