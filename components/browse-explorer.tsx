"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { api, queryKeys, type BrowseParams } from "@/lib/api";
import { useSettings } from "@/lib/store/settings";
import { MangaCard, MangaCardSkeleton } from "./manga-card";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const ORDERS: { key: NonNullable<BrowseParams["order"]>; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "latest", label: "Latest" },
  { key: "rating", label: "Top Rated" },
];

const PAGE = 24;

export function BrowseExplorer() {
  const [order, setOrder] = useState<NonNullable<BrowseParams["order"]>>(
    "popular",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const contentRating = useSettings((s) => s.contentRating);

  const { data: tags } = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: ({ signal }) => api.tags(signal),
    staleTime: Infinity,
  });

  const genres = useMemo(
    () => (tags ?? []).filter((t) => t.group === "genre"),
    [tags],
  );

  const includedTags = useMemo(() => [...selected], [selected]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["explore", order, includedTags, contentRating],
    queryFn: ({ pageParam, signal }) =>
      api.browse(
        { order, includedTags, contentRating, limit: PAGE, offset: pageParam },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <SlidersHorizontal className="size-4 text-primary" />
          Browse the catalogue
        </h2>
        <div className="flex gap-1 rounded-lg border border-border bg-surface/50 p-1">
          {ORDERS.map((o) => (
            <button
              key={o.key}
              onClick={() => setOrder(o.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                order === o.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <button
              key={g.id}
              onClick={() => toggle(g.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                selected.has(g.id)
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-surface/40 text-muted-foreground hover:border-ring/40 hover:text-foreground",
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => (
              <MangaCardSkeleton key={i} fill />
            ))
          : items.map((m) => <MangaCard key={m.id} manga={m} fill />)}
      </div>

      {!isLoading && items.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No manga match these filters.
        </p>
      )}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </section>
  );
}
