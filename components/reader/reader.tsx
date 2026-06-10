"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Download,
  Loader2,
  Maximize2,
  ScrollText,
} from "lucide-react";
import { api, proxyUrl, queryKeys } from "@/lib/api";
import { useSettings } from "@/lib/store/settings";
import { useDownloadQueue } from "@/lib/store/download-queue";
import { flattenChapterRefs } from "@/lib/reader-nav";
import { recordRead } from "@/lib/db/library";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "paged" | "strip";
type Fit = "height" | "width";

export function Reader({ chapterId }: { chapterId: string }) {
  const router = useRouter();
  const dataSaver = useSettings((s) => s.dataSaver);
  const language = useSettings((s) => s.language);
  const enqueueChapter = useDownloadQueue((s) => s.enqueueChapter);

  const [mode, setMode] = useState<Mode>("paged");
  const [fit, setFit] = useState<Fit>("height");
  const [page, setPage] = useState(0);

  const chapterQ = useQuery({
    queryKey: queryKeys.chapter(chapterId),
    queryFn: ({ signal }) => api.chapter(chapterId, signal),
  });
  const imagesQ = useQuery({
    queryKey: queryKeys.chapterImages(chapterId),
    queryFn: ({ signal }) => api.chapterImages(chapterId, signal),
  });

  const mangaId = chapterQ.data?.mangaId ?? undefined;

  const mangaQ = useQuery({
    queryKey: mangaId ? queryKeys.manga(mangaId) : ["manga", "none"],
    queryFn: ({ signal }) => api.manga(mangaId!, signal),
    enabled: !!mangaId,
  });
  const aggQ = useQuery({
    queryKey: mangaId
      ? queryKeys.aggregate(mangaId, language)
      : ["aggregate", "none"],
    queryFn: ({ signal }) => api.aggregate(mangaId!, language, signal),
    enabled: !!mangaId,
  });

  const pages = useMemo(() => {
    const data = imagesQ.data;
    if (!data) return [];
    return dataSaver ? data.pagesDataSaver : data.pages;
  }, [imagesQ.data, dataSaver]);

  // Prev/next chapter from the flattened aggregate.
  const { prev, next } = useMemo(() => {
    const flat = flattenChapterRefs(aggQ.data ?? []);
    const idx = flat.findIndex(
      (c) => c.id === chapterId || c.others.includes(chapterId),
    );
    return {
      prev: idx > 0 ? flat[idx - 1] : undefined,
      next: idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : undefined,
    };
  }, [aggQ.data, chapterId]);

  // The reader is remounted per-chapter (keyed in the route), so page state
  // starts at 0 naturally; just scroll to the top on mount.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // Record reading progress (continue-reading) once metadata is known.
  useEffect(() => {
    const ch = chapterQ.data;
    if (!ch?.mangaId) return;
    void recordRead({
      mangaId: ch.mangaId,
      mangaTitle: ch.mangaTitle ?? mangaQ.data?.title ?? "Unknown",
      coverUrl: mangaQ.data?.coverThumbUrl ?? mangaQ.data?.coverUrl ?? null,
      chapterId,
      chapterNumber: ch.chapter,
      at: Date.now(),
    });
  }, [chapterQ.data, mangaQ.data, chapterId]);

  const total = pages.length;

  const nextPage = useCallback(() => {
    setPage((p) => {
      if (p < total - 1) return p + 1;
      if (next) router.push(`/read/${next.id}`);
      return p;
    });
  }, [total, next, router]);

  const prevPage = useCallback(() => {
    setPage((p) => {
      if (p > 0) return p - 1;
      if (prev) router.push(`/read/${prev.id}`);
      return p;
    });
  }, [prev, router]);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case "ArrowRight":
        case " ":
          if (mode === "paged") {
            e.preventDefault();
            nextPage();
          }
          break;
        case "ArrowLeft":
          if (mode === "paged") {
            e.preventDefault();
            prevPage();
          }
          break;
        case "f":
          setFit((f) => (f === "height" ? "width" : "height"));
          break;
        case "m":
          setMode((m) => (m === "paged" ? "strip" : "paged"));
          break;
        case "Escape":
          if (mangaId) router.push(`/manga/${mangaId}`);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, nextPage, prevPage, mangaId, router]);

  const loading = chapterQ.isLoading || imagesQ.isLoading;
  const errored = chapterQ.isError || imagesQ.isError;

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <ReaderToolbar
        mangaId={mangaId}
        mangaTitle={chapterQ.data?.mangaTitle}
        chapterNumber={chapterQ.data?.chapter}
        chapterTitle={chapterQ.data?.title}
        page={page}
        total={total}
        mode={mode}
        fit={fit}
        onToggleMode={() => setMode((m) => (m === "paged" ? "strip" : "paged"))}
        onToggleFit={() => setFit((f) => (f === "height" ? "width" : "height"))}
        prevId={prev?.id}
        nextId={next?.id}
        onDownload={
          chapterQ.data?.mangaId && chapterQ.data.chapter
            ? () =>
                enqueueChapter({
                  mangaId: chapterQ.data!.mangaId!,
                  mangaTitle: chapterQ.data!.mangaTitle ?? "Manga",
                  coverUrl: mangaQ.data?.coverThumbUrl ?? null,
                  chapterId,
                  chapterNumber: chapterQ.data!.chapter!,
                })
            : undefined
        }
      />

      {loading && (
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      )}

      {errored && (
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <p className="text-muted-foreground">Couldn’t load this chapter.</p>
          <Button variant="outline" onClick={() => imagesQ.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !errored && total > 0 && (
        <>
          {mode === "paged" ? (
            <PagedView
              pages={pages}
              page={page}
              fit={fit}
              onNext={nextPage}
              onPrev={prevPage}
            />
          ) : (
            <StripView pages={pages} fit={fit} />
          )}

          {/* Bottom chapter nav */}
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-8">
            <Button
              variant="outline"
              disabled={!prev}
              onClick={() => prev && router.push(`/read/${prev.id}`)}
            >
              <ChevronLeft /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {mode === "paged" ? `Page ${page + 1} / ${total}` : `${total} pages`}
            </span>
            <Button
              variant="outline"
              disabled={!next}
              onClick={() => next && router.push(`/read/${next.id}`)}
            >
              Next <ChevronRight />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ReaderToolbar(props: {
  mangaId?: string;
  mangaTitle?: string | null;
  chapterNumber?: string | null;
  chapterTitle?: string | null;
  page: number;
  total: number;
  mode: Mode;
  fit: Fit;
  onToggleMode: () => void;
  onToggleFit: () => void;
  prevId?: string;
  nextId?: string;
  onDownload?: () => void;
}) {
  return (
    <div className="sticky top-16 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-[1760px] items-center gap-3 px-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={props.mangaId ? `/manga/${props.mangaId}` : "/"}>
            <ArrowLeft /> Back
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {props.mangaTitle ?? "Loading…"}
            {props.chapterNumber && (
              <span className="text-muted-foreground">
                {" "}
                · Ch {props.chapterNumber}
              </span>
            )}
          </p>
        </div>
        {props.total > 0 && props.mode === "paged" && (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {props.page + 1}/{props.total}
          </span>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={props.onToggleFit}
            title="Fit width/height (f)"
          >
            <Maximize2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={props.onToggleMode}
            title="Toggle paged / long-strip (m)"
          >
            {props.mode === "paged" ? <ScrollText /> : <Columns2 />}
          </Button>
          {props.onDownload && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={props.onDownload}
              title="Download this chapter"
            >
              <Download />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PagedView({
  pages,
  page,
  fit,
  onNext,
  onPrev,
}: {
  pages: string[];
  page: number;
  fit: Fit;
  onNext: () => void;
  onPrev: () => void;
}) {
  const current = pages[page];
  return (
    <div className="relative flex min-h-[70vh] justify-center bg-black/20">
      {/* Click zones */}
      <button
        aria-label="Previous page"
        onClick={onPrev}
        className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-w-resize"
      />
      <button
        aria-label="Next page"
        onClick={onNext}
        className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-e-resize"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={current}
        src={proxyUrl(current)}
        alt={`Page ${page + 1}`}
        className={cn(
          "select-none object-contain",
          fit === "height"
            ? "max-h-[calc(100vh-7rem)] w-auto"
            : "w-full max-w-3xl",
        )}
      />
      {/* Preload the next two pages */}
      {[1, 2].map((d) =>
        pages[page + d] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`pre-${page + d}`}
            src={proxyUrl(pages[page + d])}
            alt=""
            className="hidden"
          />
        ) : null,
      )}
    </div>
  );
}

function StripView({ pages, fit }: { pages: string[]; fit: Fit }) {
  return (
    <div className="mx-auto flex flex-col items-center">
      {pages.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={proxyUrl(url)}
          alt={`Page ${i + 1}`}
          loading={i < 2 ? "eager" : "lazy"}
          decoding="async"
          className={cn(
            "w-full object-contain",
            fit === "width" ? "max-w-3xl" : "max-w-2xl",
          )}
        />
      ))}
    </div>
  );
}
