"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Download, Users, AlertCircle, ExternalLink } from "lucide-react";
import { api, proxyUrl, queryKeys } from "@/lib/api";
import { useSettings } from "@/lib/store/settings";
import { useDownloadQueue } from "@/lib/store/download-queue";
import { Cover } from "./cover";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { StatusPill } from "./status-pill";
import { RatingBadge } from "./rating-badge";
import { FavoriteButton } from "./favorite-button";
import { ChapterAccordion } from "./chapter-accordion";
import { Switch } from "./ui/switch";
import { formatCount } from "@/lib/utils";

export function MangaDetailView({ id }: { id: string }) {
  const language = useSettings((s) => s.language);
  const enqueueManga = useDownloadQueue((s) => s.enqueueManga);

  const [allGroups, setAllGroups] = useState(false);

  const mangaQ = useQuery({
    queryKey: queryKeys.manga(id),
    queryFn: ({ signal }) => api.manga(id, signal),
  });
  // One source at a time: the compact aggregate (one entry per chapter) or the
  // full feed (every scanlation group's release).
  const chaptersQ = useQuery({
    queryKey: allGroups
      ? queryKeys.feed(id, language)
      : queryKeys.aggregate(id, language),
    queryFn: ({ signal }) =>
      allGroups
        ? api.feed(id, language, signal)
        : api.aggregate(id, language, signal),
  });

  const manga = mangaQ.data;
  const volumes = useMemo(() => chaptersQ.data ?? [], [chaptersQ.data]);

  const firstChapterId = useMemo(
    () => volumes[0]?.chapters[0]?.id,
    [volumes],
  );

  if (mangaQ.isError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-32 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <h1 className="text-lg font-semibold">Couldn’t load this manga</h1>
        <Button variant="outline" onClick={() => mangaQ.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Cinematic backdrop */}
      <div className="relative">
        {manga?.coverUrl && (
          <div className="absolute inset-0 -z-10 h-[420px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proxyUrl(manga.coverUrl)}
              alt=""
              className="size-full scale-110 object-cover opacity-30 blur-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
          </div>
        )}

        <div className="mx-auto max-w-[1760px] px-4 pt-8 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
            <div className="mx-auto w-44 shrink-0 sm:mx-0">
              {manga ? (
                <Cover
                  src={manga.coverUrl}
                  alt={manga.title}
                  className="shadow-2xl ring-1 ring-border"
                  priority
                />
              ) : (
                <Skeleton className="aspect-[2/3] w-44 rounded-lg" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              {manga ? (
                <>
                  <div>
                    <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                      {manga.title}
                    </h1>
                    {manga.altTitles[0] && manga.altTitles[0] !== manga.title && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {manga.altTitles[0]}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={manga.status} year={manga.year} />
                    {manga.rating != null && (
                      <RatingBadge rating={manga.rating} />
                    )}
                    {manga.follows != null && (
                      <Badge variant="muted">
                        <Users className="size-3" />
                        {formatCount(manga.follows)}
                      </Badge>
                    )}
                    {manga.demographic && (
                      <Badge variant="outline" className="capitalize">
                        {manga.demographic}
                      </Badge>
                    )}
                    {manga.contentRating &&
                      manga.contentRating !== "safe" && (
                        <Badge variant="primary" className="capitalize">
                          {manga.contentRating}
                        </Badge>
                      )}
                  </div>

                  {(manga.authors.length > 0 || manga.artists.length > 0) && (
                    <p className="text-sm text-muted-foreground">
                      {[...new Set([...manga.authors, ...manga.artists])].join(
                        ", ",
                      )}
                    </p>
                  )}

                  <Description text={manga.description} />

                  <div className="flex flex-wrap gap-1.5">
                    {manga.tagGroups
                      .flatMap((g) => g.tags)
                      .slice(0, 10)
                      .map((t) => (
                        <Badge key={t} variant="default">
                          {t}
                        </Badge>
                      ))}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      onClick={() =>
                        enqueueManga({
                          mangaId: manga.id,
                          mangaTitle: manga.title,
                          coverUrl: manga.coverThumbUrl ?? manga.coverUrl,
                          volumes: volumes.map((v) => ({
                            volume: v.volume,
                            chapters: v.chapters.map((c) => ({
                              id: c.id,
                              chapter: c.chapter,
                              group: c.group,
                            })),
                          })),
                        })
                      }
                      disabled={volumes.length === 0}
                    >
                      <Download /> Download all
                    </Button>
                    {firstChapterId && (
                      <Button asChild variant="secondary">
                        <Link href={`/read/${firstChapterId}`}>
                          <BookOpen /> Start reading
                        </Link>
                      </Button>
                    )}
                    <FavoriteButton manga={manga} />
                    <Button asChild variant="ghost">
                      <a
                        href={`https://mangadex.org/title/${manga.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink /> View on MangaDex
                      </a>
                    </Button>
                  </div>
                </>
              ) : (
                <DetailSkeleton />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chapters */}
      <div className="mx-auto max-w-[1760px] px-4 pb-24 pt-10 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Chapters</h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={allGroups} onCheckedChange={setAllGroups} />
            All groups
            <span className="hidden text-xs text-muted-foreground/70 sm:inline">
              (every scanlation group)
            </span>
          </label>
        </div>
        {chaptersQ.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          manga && (
            <ChapterAccordion
              mangaId={manga.id}
              mangaTitle={manga.title}
              coverUrl={manga.coverThumbUrl ?? manga.coverUrl}
              volumes={volumes}
            />
          )
        )}
      </div>
    </div>
  );
}

function Description({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
      <p className={open ? "whitespace-pre-line" : "line-clamp-3 whitespace-pre-line"}>
        {text}
      </p>
      {text.length > 200 && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-1 text-xs font-medium text-primary hover:underline"
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-20 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}
