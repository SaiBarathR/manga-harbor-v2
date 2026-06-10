"use client";

import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { api, queryKeys, type BrowseParams } from "@/lib/api";
import { MangaCard, MangaCardSkeleton } from "./manga-card";
import { Button } from "./ui/button";

export function Rail({
  title,
  icon,
  params,
  priority = false,
}: {
  title: string;
  icon?: React.ReactNode;
  params: BrowseParams;
  priority?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.browse(params),
    queryFn: ({ signal }) => api.browse(params, signal),
  });

  function scroll(dir: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          {icon}
          {title}
        </h2>
        <div className="hidden gap-1 sm:flex">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Scroll left"
            onClick={() => scroll(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Scroll right"
            onClick={() => scroll(1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/50 px-4 py-6 text-sm text-muted-foreground">
          <AlertCircle className="size-4 text-destructive" />
          Couldn’t load this row.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div
          ref={scroller}
          className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <MangaCardSkeleton key={i} />
              ))
            : data?.items.map((m) => (
                <MangaCard key={m.id} manga={m} priority={priority} />
              ))}
        </div>
      )}
    </section>
  );
}
