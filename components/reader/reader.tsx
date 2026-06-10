"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowLeftRight,
  Book,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns2,
  Download,
  Expand,
  ImageOff,
  Keyboard,
  Loader2,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  MoveVertical,
  Scaling,
  ScrollText,
  Settings2,
  X,
} from "lucide-react";
import { api, proxyUrl, queryKeys } from "@/lib/api";
import { useSettings } from "@/lib/store/settings";
import {
  useReaderSettings,
  type ReaderDirection,
  type ReaderFit,
  type ReaderMode,
} from "@/lib/store/reader";
import { useDownloadQueue } from "@/lib/store/download-queue";
import { flattenChapterRefs } from "@/lib/reader-nav";
import { buildSpreads, spreadIndexForPage } from "@/lib/reader-spreads";
import { recordRead } from "@/lib/db/library";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PagedView, StripView } from "./views";
import { cn } from "@/lib/utils";

const FIT_CYCLE: ReaderFit[] = ["contain", "width", "height", "original"];
const MODE_CYCLE: ReaderMode[] = ["single", "double", "strip"];

const FIT_ICON: Record<ReaderFit, ReactNode> = {
  contain: <Scaling />,
  width: <MoveHorizontal />,
  height: <MoveVertical />,
  original: <Expand />,
};
const MODE_ICON: Record<ReaderMode, ReactNode> = {
  single: <Book />,
  double: <Columns2 />,
  strip: <ScrollText />,
};

export function Reader({ chapterId }: { chapterId: string }) {
  const router = useRouter();
  const dataSaver = useSettings((s) => s.dataSaver);
  const language = useSettings((s) => s.language);
  const enqueueChapter = useDownloadQueue((s) => s.enqueueChapter);

  const mode = useReaderSettings((s) => s.mode);
  const direction = useReaderSettings((s) => s.direction);
  const fit = useReaderSettings((s) => s.fit);
  const gap = useReaderSettings((s) => s.gap);
  const doubleCover = useReaderSettings((s) => s.doubleCover);
  const update = useReaderSettings((s) => s.update);

  // ---- Data ---------------------------------------------------------------
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
  const total = pages.length;

  // Flattened chapter list for prev/next + the chapter jump menu.
  const chapters = useMemo(
    () => flattenChapterRefs(aggQ.data ?? []),
    [aggQ.data],
  );
  const currentIndex = useMemo(
    () =>
      chapters.findIndex(
        (c) => c.id === chapterId || c.others.includes(chapterId),
      ),
    [chapters, chapterId],
  );
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : undefined;
  const nextChapter =
    currentIndex >= 0 && currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : undefined;
  const currentChapterRefId =
    currentIndex >= 0 ? chapters[currentIndex].id : chapterId;

  // ---- Page / spread state ------------------------------------------------
  const [page, setPage] = useState(0);
  const spreads = useMemo(
    () => buildSpreads(total, mode, doubleCover),
    [total, mode, doubleCover],
  );
  const currentSpreadIndex = spreadIndexForPage(spreads, page);
  const currentSpread = spreads[currentSpreadIndex] ?? [0];
  const paged = mode !== "strip";

  // ---- Paged image load tracking ------------------------------------------
  // The current spread's images report load/error via event callbacks; the
  // counters reset whenever the spread (or retry nonce) changes, using the
  // "remember the previous key" render pattern instead of an effect.
  const [retryNonce, setRetryNonce] = useState(0);
  const spreadKey = `${currentSpread.join("-")}:${retryNonce}`;
  const [trackedSpread, setTrackedSpread] = useState(spreadKey);
  const [loadedCount, setLoadedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  if (paged && trackedSpread !== spreadKey) {
    setTrackedSpread(spreadKey);
    setLoadedCount(0);
    setErrorCount(0);
  }
  const pageReady = loadedCount + errorCount >= currentSpread.length;
  const pageError = pageReady && errorCount > 0;
  const handleImgLoad = useCallback(() => setLoadedCount((n) => n + 1), []);
  const handleImgError = useCallback(() => setErrorCount((n) => n + 1), []);

  // ---- Refs / UI state ----------------------------------------------------
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageEls = useRef<(HTMLElement | null)[]>([]);
  const hideTimer = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const [uiVisible, setUiVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const controlsVisible = uiVisible || settingsOpen;

  const { isFullscreen, toggleFullscreen, fsSupported } = useFullscreen(rootRef);

  const registerRef = useCallback((index: number, el: HTMLElement | null) => {
    pageEls.current[index] = el;
  }, []);

  // ---- UI auto-hide -------------------------------------------------------
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setUiVisible(false);
    }, 3000);
  }, []);

  const showUi = useCallback(() => {
    setUiVisible(true);
    if (!settingsOpen) scheduleHide();
  }, [scheduleHide, settingsOpen]);

  const toggleUi = useCallback(() => {
    setUiVisible((v) => {
      const next = !v;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (next && !settingsOpen) scheduleHide();
      return next;
    });
  }, [scheduleHide, settingsOpen]);

  const openSettings = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setUiVisible(true);
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    showUi();
  }, [showUi]);

  // ---- Navigation ---------------------------------------------------------
  const goToPage = useCallback(
    (p: number) => {
      const clamped = Math.max(0, Math.min(total - 1, p));
      setPage(clamped);
      if (mode === "strip") {
        pageEls.current[clamped]?.scrollIntoView({ block: "start" });
      } else {
        viewportRef.current?.scrollTo({ top: 0 });
      }
    },
    [total, mode],
  );

  const goNext = useCallback(() => {
    const ni = currentSpreadIndex + 1;
    if (ni < spreads.length) goToPage(spreads[ni][0]);
    else if (nextChapter) router.push(`/read/${nextChapter.id}`);
  }, [currentSpreadIndex, spreads, nextChapter, goToPage, router]);

  const goPrev = useCallback(() => {
    const pi = currentSpreadIndex - 1;
    if (pi >= 0) goToPage(spreads[pi][0]);
    else if (prevChapter) router.push(`/read/${prevChapter.id}`);
  }, [currentSpreadIndex, spreads, prevChapter, goToPage, router]);

  // Logical prev/next mapped to a physical side, honoring reading direction.
  const goLeft = useCallback(
    () => (direction === "rtl" ? goNext() : goPrev()),
    [direction, goNext, goPrev],
  );
  const goRight = useCallback(
    () => (direction === "rtl" ? goPrev() : goNext()),
    [direction, goNext, goPrev],
  );

  // ---- Pointer / touch interaction ---------------------------------------
  const onViewportClick = useCallback(
    (e: React.MouseEvent) => {
      if (suppressClick.current) {
        suppressClick.current = false;
        return;
      }
      if (mode === "strip") {
        toggleUi();
        return;
      }
      const x = e.clientX / window.innerWidth;
      if (x < 0.33) goLeft();
      else if (x > 0.66) goRight();
      else toggleUi();
    },
    [mode, toggleUi, goLeft, goRight],
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (mode === "strip" || !start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        suppressClick.current = true;
        if (dx < 0) goRight();
        else goLeft();
      }
    },
    [mode, goLeft, goRight],
  );

  // ---- Effects ------------------------------------------------------------
  // Lock background scroll while the immersive reader is mounted.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Sync scroll position when the layout mode changes.
  useEffect(() => {
    if (mode === "strip") {
      const id = window.setTimeout(
        () => pageEls.current[page]?.scrollIntoView({ block: "start" }),
        60,
      );
      return () => clearTimeout(id);
    }
    viewportRef.current?.scrollTo({ top: 0 });
    // Only react to mode switches; `page` is read intentionally as a snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Strip mode: track the page nearest the viewport center for the counter.
  useEffect(() => {
    if (mode !== "strip" || total === 0) return;
    const root = viewportRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.page);
            if (!Number.isNaN(idx)) setPage(idx);
          }
        }
      },
      { root, rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    pageEls.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [mode, total]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement
      )
        return;
      switch (e.key) {
        case "ArrowRight":
          if (mode !== "strip") {
            e.preventDefault();
            goRight();
          }
          break;
        case "ArrowLeft":
          if (mode !== "strip") {
            e.preventDefault();
            goLeft();
          }
          break;
        case " ":
        case "PageDown":
          e.preventDefault();
          if (mode === "strip")
            viewportRef.current?.scrollBy({
              top: window.innerHeight * 0.85,
              behavior: "smooth",
            });
          else goNext();
          break;
        case "PageUp":
          e.preventDefault();
          if (mode === "strip")
            viewportRef.current?.scrollBy({
              top: -window.innerHeight * 0.85,
              behavior: "smooth",
            });
          else goPrev();
          break;
        case "Home":
          e.preventDefault();
          goToPage(0);
          break;
        case "End":
          e.preventDefault();
          goToPage(total - 1);
          break;
        case "f":
        case "F":
          update({ fit: FIT_CYCLE[(FIT_CYCLE.indexOf(fit) + 1) % FIT_CYCLE.length] });
          break;
        case "m":
        case "M":
          update({
            mode: MODE_CYCLE[(MODE_CYCLE.indexOf(mode) + 1) % MODE_CYCLE.length],
          });
          break;
        case "d":
        case "D":
          if (mode !== "strip")
            update({ direction: direction === "ltr" ? "rtl" : "ltr" });
          break;
        case "Escape":
          if (isFullscreen) return; // browser handles exiting fullscreen
          if (settingsOpen) {
            setSettingsOpen(false);
            return;
          }
          if (mangaId) router.push(`/manga/${mangaId}`);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    mode,
    direction,
    fit,
    goLeft,
    goRight,
    goNext,
    goPrev,
    goToPage,
    total,
    update,
    isFullscreen,
    settingsOpen,
    mangaId,
    router,
  ]);

  // Record reading progress once metadata is known.
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

  // ---- Derived render flags ----------------------------------------------
  const loadingData = chapterQ.isLoading || imagesQ.isLoading;
  const dataError = chapterQ.isError || imagesQ.isError;

  const onDownload =
    chapterQ.data?.mangaId && chapterQ.data.chapter
      ? () =>
          enqueueChapter({
            mangaId: chapterQ.data!.mangaId!,
            mangaTitle: chapterQ.data!.mangaTitle ?? "Manga",
            coverUrl: mangaQ.data?.coverThumbUrl ?? null,
            chapterId,
            chapterNumber: chapterQ.data!.chapter!,
          })
      : undefined;

  return (
    <div
      ref={rootRef}
      onMouseMove={showUi}
      className="fixed inset-0 z-50 h-[100dvh] select-none overflow-hidden bg-background text-foreground"
    >
      {/* Reading viewport */}
      <div
        ref={viewportRef}
        onClick={onViewportClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={cn(
          "absolute inset-0 overscroll-contain",
          paged ? "flex overflow-auto" : "overflow-x-hidden overflow-y-auto",
        )}
      >
        {loadingData ? (
          <Centered>
            <Loader2 className="size-9 animate-spin text-primary" />
          </Centered>
        ) : dataError ? (
          <Centered>
            <div className="flex flex-col items-center gap-3 text-center">
              <ImageOff className="size-8 text-muted-foreground" />
              <p className="text-muted-foreground">Couldn’t load this chapter.</p>
              <Button
                variant="outline"
                onClick={() => {
                  chapterQ.refetch();
                  imagesQ.refetch();
                }}
              >
                Retry
              </Button>
            </div>
          </Centered>
        ) : total === 0 ? (
          <Centered>
            <p className="text-muted-foreground">No pages in this chapter.</p>
          </Centered>
        ) : paged ? (
          <PagedView
            spread={currentSpread}
            pages={pages}
            fit={fit}
            direction={direction}
            nonce={retryNonce}
            onLoad={handleImgLoad}
            onError={handleImgError}
          />
        ) : (
          <StripView
            pages={pages}
            fit={fit}
            gap={gap}
            registerRef={registerRef}
          />
        )}
      </div>

      {/* Paged-mode overlays (page-level loading / error) */}
      {paged && !loadingData && !dataError && total > 0 && !pageReady && (
        <Centered className="pointer-events-none z-10">
          <Loader2 className="size-9 animate-spin text-primary" />
        </Centered>
      )}
      {paged && !loadingData && !dataError && pageError && (
        <Centered className="z-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <ImageOff className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">Couldn’t load this page.</p>
            <Button variant="outline" onClick={() => setRetryNonce((n) => n + 1)}>
              Retry
            </Button>
          </div>
        </Centered>
      )}

      {/* Preload upcoming pages in paged mode */}
      {paged && total > 0 && (
        <div className="hidden" aria-hidden>
          {[1, 2, 3].map((d) => {
            const p = currentSpread[currentSpread.length - 1] + d;
            return pages[p] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p} src={proxyUrl(pages[p])} alt="" />
            ) : null;
          })}
        </div>
      )}

      {/* Top bar */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-30 transition-transform duration-300",
          controlsVisible ? "translate-y-0" : "-translate-y-full",
        )}
      >
        <div className="flex h-14 items-center gap-1.5 bg-gradient-to-b from-background/95 via-background/80 to-transparent px-2 backdrop-blur-sm sm:px-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={mangaId ? `/manga/${mangaId}` : "/"}>
              <ArrowLeft />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">
              {chapterQ.data?.mangaTitle ?? "Loading…"}
              {chapterQ.data?.chapter && (
                <span className="text-muted-foreground">
                  {" · Ch "}
                  {chapterQ.data.chapter}
                </span>
              )}
            </p>
            {chapterQ.data?.title && (
              <p className="truncate text-xs text-muted-foreground leading-tight">
                {chapterQ.data.title}
              </p>
            )}
          </div>

          <div className="hidden items-center gap-0.5 sm:flex">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                update({
                  fit: FIT_CYCLE[(FIT_CYCLE.indexOf(fit) + 1) % FIT_CYCLE.length],
                })
              }
              title={`Fit: ${fit} (f)`}
            >
              {FIT_ICON[fit]}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                update({
                  mode: MODE_CYCLE[
                    (MODE_CYCLE.indexOf(mode) + 1) % MODE_CYCLE.length
                  ],
                })
              }
              title={`Layout: ${mode} (m)`}
            >
              {MODE_ICON[mode]}
            </Button>
            {paged && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  update({ direction: direction === "ltr" ? "rtl" : "ltr" })
                }
                title={`Direction: ${direction === "rtl" ? "right to left" : "left to right"} (d)`}
              >
                <ArrowLeftRight />
              </Button>
            )}
          </div>

          {fsSupported && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleFullscreen}
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 /> : <Maximize2 />}
            </Button>
          )}
          {onDownload && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDownload}
              title="Download chapter"
            >
              <Download />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={openSettings}
            title="Reader settings"
          >
            <Settings2 />
          </Button>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 transition-transform duration-300",
          controlsVisible ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex flex-col gap-2 bg-gradient-to-t from-background/95 via-background/80 to-transparent px-2 pb-3 pt-8 sm:px-4">
          {paged && total > 1 && (
            <input
              type="range"
              min={0}
              max={total - 1}
              value={page}
              dir={direction === "rtl" ? "rtl" : "ltr"}
              onChange={(e) => goToPage(Number(e.target.value))}
              aria-label="Page slider"
              className="reader-range w-full"
            />
          )}
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={!prevChapter}
              onClick={() => prevChapter && router.push(`/read/${prevChapter.id}`)}
              title="Previous chapter"
            >
              <ChevronsLeft />
              <span className="hidden sm:inline">Prev</span>
            </Button>
            {paged && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous page"
                onClick={goPrev}
              >
                <ChevronLeft />
              </Button>
            )}

            <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
              {chapters.length > 0 && (
                <select
                  value={currentChapterRefId}
                  onChange={(e) => router.push(`/read/${e.target.value}`)}
                  aria-label="Jump to chapter"
                  className="max-w-[40%] truncate rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.chapter === "none" ? "Oneshot" : `Chapter ${c.chapter}`}
                    </option>
                  ))}
                </select>
              )}
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {paged ? `Page ${page + 1} / ${total}` : `${total} pages`}
              </span>
            </div>

            {paged && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next page"
                onClick={goNext}
              >
                <ChevronRight />
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              disabled={!nextChapter}
              onClick={() => nextChapter && router.push(`/read/${nextChapter.id}`)}
              title="Next chapter"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={closeSettings}
        mode={mode}
        direction={direction}
        fit={fit}
        gap={gap}
        doubleCover={doubleCover}
        update={update}
      />
    </div>
  );
}

function Centered({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 m-auto grid place-items-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings sheet
// ---------------------------------------------------------------------------

function SettingsPanel({
  open,
  onClose,
  mode,
  direction,
  fit,
  gap,
  doubleCover,
  update,
}: {
  open: boolean;
  onClose: () => void;
  mode: ReaderMode;
  direction: ReaderDirection;
  fit: ReaderFit;
  gap: boolean;
  doubleCover: boolean;
  update: (patch: Partial<{
    mode: ReaderMode;
    direction: ReaderDirection;
    fit: ReaderFit;
    gap: boolean;
    doubleCover: boolean;
  }>) => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 z-40 bg-black/50 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        aria-hidden={!open}
        className={cn(
          "absolute right-0 top-0 z-50 flex h-full w-[min(90vw,360px)] flex-col gap-6 overflow-y-auto border-l border-border bg-surface p-5 shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "pointer-events-none translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Reader settings</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close settings">
            <X />
          </Button>
        </div>

        <Field label="Layout">
          <Segmented
            value={mode}
            onChange={(m) => update({ mode: m })}
            options={[
              { value: "single", label: "Single", icon: <Book /> },
              { value: "double", label: "Double", icon: <Columns2 /> },
              { value: "strip", label: "Webtoon", icon: <ScrollText /> },
            ]}
          />
        </Field>

        {mode !== "strip" && (
          <Field label="Reading direction">
            <Segmented
              value={direction}
              onChange={(d) => update({ direction: d })}
              options={[
                { value: "ltr", label: "L → R" },
                { value: "rtl", label: "R → L" },
              ]}
            />
          </Field>
        )}

        <Field label="Image fit">
          <Segmented
            value={fit}
            onChange={(f) => update({ fit: f })}
            options={[
              { value: "contain", label: "Both", icon: <Scaling /> },
              { value: "width", label: "Width", icon: <MoveHorizontal /> },
              { value: "height", label: "Height", icon: <MoveVertical /> },
              { value: "original", label: "Full", icon: <Expand /> },
            ]}
          />
        </Field>

        {mode === "double" && (
          <ToggleRow
            label="Cover on its own page"
            description="Show the first page alone, then pair the rest."
            checked={doubleCover}
            onChange={(v) => update({ doubleCover: v })}
          />
        )}

        {mode === "strip" && (
          <ToggleRow
            label="Gap between pages"
            description="Add spacing between panels in webtoon mode."
            checked={gap}
            onChange={(v) => update({ gap: v })}
          />
        )}

        <div className="mt-auto rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Keyboard className="size-4" /> Shortcuts
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <Shortcut keys="← →" desc="Turn page" />
            <Shortcut keys="Space" desc="Next / scroll" />
            <Shortcut keys="f" desc="Cycle fit" />
            <Shortcut keys="m" desc="Cycle layout" />
            <Shortcut keys="d" desc="Flip direction" />
            <Shortcut keys="Esc" desc="Back to series" />
          </dl>
        </div>
      </aside>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-border bg-background/50 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors [&_svg]:size-4",
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function Shortcut({ keys, desc }: { keys: string; desc: string }) {
  return (
    <>
      <kbd className="justify-self-start rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
        {keys}
      </kbd>
      <span>{desc}</span>
    </>
  );
}

// ---------------------------------------------------------------------------
// Fullscreen
// ---------------------------------------------------------------------------

function subscribeFullscreen(cb: () => void) {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
}
const noopSubscribe = () => () => {};

function useFullscreen(ref: RefObject<HTMLElement | null>) {
  // useSyncExternalStore reads browser state without setState-in-effect and is
  // SSR-safe (server snapshot is `false`).
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => !!document.fullscreenElement,
    () => false,
  );
  const fsSupported = useSyncExternalStore(
    noopSubscribe,
    () => !!document.fullscreenEnabled,
    () => false,
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void ref.current?.requestFullscreen?.().catch(() => {});
  }, [ref]);

  return { isFullscreen, toggleFullscreen, fsSupported };
}
