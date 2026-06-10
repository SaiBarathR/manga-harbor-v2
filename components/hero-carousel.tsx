"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { api, proxyUrl, queryKeys, type BrowseParams } from "@/lib/api";
import { RatingBadge } from "./rating-badge";
import { StatusPill } from "./status-pill";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

// Shares the exact same query as the "Popular Now" rail so React Query serves
// both from a single fetch; we just feature the first few entries here.
const PARAMS: BrowseParams = { order: "popular", limit: 20 };
const FEATURED = 6;
const ROTATE_MS = 7000;

export function HeroCarousel() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.browse(PARAMS),
    queryFn: ({ signal }) => api.browse(PARAMS, signal),
  });

  const slides = (data?.items ?? []).slice(0, FEATURED);
  const count = slides.length;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  // Auto-advance; the interval re-arms whenever `index` changes so a manual
  // nudge still gets a full dwell before the next slide.
  useEffect(() => {
    if (paused || count <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(id);
  }, [index, paused, count]);

  if (isError) return null; // a dead billboard is worse than none; rails remain
  if (isLoading || count === 0) return <HeroCarouselSkeleton />;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured manga"
      className="group relative h-[440px] overflow-hidden bg-surface/30 sm:h-[480px] lg:h-[520px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((m, i) => {
        const active = i === index;
        return (
          <Link
            key={m.id}
            href={`/manga/${m.id}`}
            aria-hidden={!active}
            tabIndex={active ? 0 : -1}
            aria-label={`Open ${m.title}`}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-out",
              active ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {/* Blurred, darkened cover fills the wide billboard */}
            {m.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proxyUrl(m.coverUrl)}
                alt=""
                aria-hidden
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="absolute inset-0 size-full scale-110 object-cover blur-2xl brightness-[0.55] saturate-150"
              />
            )}
            {/* Legibility gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

            <div className="relative flex h-full items-center gap-8 px-6 sm:px-10 lg:px-14">
              {/* Sharp portrait cover (hidden on small screens) */}
              {m.coverUrl && (
                <div className="hidden shrink-0 overflow-hidden rounded-xl border border-border/60 shadow-glow sm:block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proxyUrl(m.coverThumbUrl ?? m.coverUrl)}
                    alt={m.title}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-[300px] w-[200px] object-cover lg:h-[360px] lg:w-[240px]"
                  />
                </div>
              )}

              {/* Text block */}
              <div className="min-w-0 max-w-xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                  <span className="size-1.5 rounded-full bg-primary" />
                  Featured · #{i + 1} Popular
                </div>
                <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  {m.title}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <RatingBadge rating={m.rating} />
                  <StatusPill status={m.status} year={m.year} />
                  {m.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-border bg-surface-2/70 px-2 py-0.5 font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                {m.description && (
                  <p className="mt-4 line-clamp-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                    {m.description}
                  </p>
                )}
                <span className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[0_4px_24px_-6px_var(--color-primary)] transition-all group-hover:brightness-110">
                  <BookOpen className="size-4" /> Read now
                </span>
              </div>
            </div>
          </Link>
        );
      })}

      {/* Prev / next arrows — surface on hover, like a streaming billboard */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/60 text-foreground opacity-0 backdrop-blur-md transition-all hover:bg-background/90 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 group-hover:opacity-100"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/60 text-foreground opacity-0 backdrop-blur-md transition-all hover:bg-background/90 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 group-hover:opacity-100"
          >
            <ChevronRight className="size-5" />
          </button>

          {/* Progress dots */}
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {slides.map((m, i) => (
              <button
                key={m.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index
                    ? "w-7 bg-primary"
                    : "w-1.5 bg-foreground/40 hover:bg-foreground/70",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function HeroCarouselSkeleton() {
  return (
    <div className="h-[440px] overflow-hidden sm:h-[480px] lg:h-[520px]">
      <div className="flex h-full items-center gap-8 px-6 sm:px-10 lg:px-14">
        <Skeleton className="hidden h-[300px] w-[200px] rounded-xl sm:block lg:h-[360px] lg:w-[240px]" />
        <div className="max-w-xl space-y-4">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-12 w-80 max-w-full" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-16 w-full max-w-lg" />
          <Skeleton className="h-11 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
