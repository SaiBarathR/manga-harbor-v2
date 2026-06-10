import { create } from "zustand";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { buildCbzBlob, pageEntryName, type CbzPage } from "@/lib/download/cbz";
import { saveBlob } from "@/lib/download/saver";
import { AbortError } from "@/lib/download/rate-limit";
import { pad, sanitizeFilename } from "@/lib/utils";
import { useSettings } from "./settings";
import { recordDownload } from "@/lib/db/library";

export type JobStatus =
  | "queued"
  | "active"
  | "paused"
  | "done"
  | "error"
  | "canceled";

export interface ChapterSource {
  id: string;
  chapter: string;
  group?: string | null;
}

export interface DownloadJob {
  id: string;
  mangaId: string;
  mangaTitle: string;
  coverUrl: string | null;
  kind: "chapter" | "volume";
  label: string;
  fileName: string;
  chapters: ChapterSource[];
  status: JobStatus;
  pagesDone: number;
  pagesTotal: number;
  bytes: number;
  error?: string;
}

const MAX_CONCURRENT_JOBS = 2;

// AbortControllers live outside the store (not serializable / not reactive).
const controllers = new Map<string, AbortController>();

interface QueueState {
  jobs: DownloadJob[];
  enqueueChapter: (input: {
    mangaId: string;
    mangaTitle: string;
    coverUrl?: string | null;
    chapterId: string;
    chapterNumber: string;
    group?: string | null;
  }) => void;
  enqueueVolume: (input: {
    mangaId: string;
    mangaTitle: string;
    coverUrl?: string | null;
    volume: string;
    chapters: ChapterSource[];
  }) => void;
  enqueueManga: (input: {
    mangaId: string;
    mangaTitle: string;
    coverUrl?: string | null;
    volumes: { volume: string; chapters: ChapterSource[] }[];
  }) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  cancel: (id: string) => void;
  remove: (id: string) => void;
  clearFinished: () => void;
}

function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function volumeLabel(volume: string): string {
  return volume === "none" ? "Un-volumed" : `Volume ${volume}`;
}

export const useDownloadQueue = create<QueueState>((set, get) => {
  function patch(id: string, changes: Partial<DownloadJob>) {
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...changes } : j)),
    }));
  }

  function add(job: DownloadJob) {
    // Skip duplicates of in-flight/queued jobs for the same target.
    const dup = get().jobs.find(
      (j) =>
        j.mangaId === job.mangaId &&
        j.label === job.label &&
        (j.status === "queued" || j.status === "active"),
    );
    if (dup) return;
    set((s) => ({ jobs: [...s.jobs, job] }));
    pump();
  }

  function pump() {
    const jobs = get().jobs;
    const active = jobs.filter((j) => j.status === "active").length;
    if (active >= MAX_CONCURRENT_JOBS) return;
    const next = jobs.find((j) => j.status === "queued");
    if (!next) return;
    void runJob(next.id);
    // Try to fill remaining slots.
    if (active + 1 < MAX_CONCURRENT_JOBS) pump();
  }

  async function runJob(id: string) {
    const job = get().jobs.find((j) => j.id === id);
    if (!job || job.status !== "queued") return;

    const controller = new AbortController();
    controllers.set(id, controller);
    patch(id, { status: "active", pagesDone: 0, bytes: 0, error: undefined });

    const { dataSaver, concurrency } = useSettings.getState();

    try {
      // Fetch fresh page URLs per chapter (the @Home baseUrl expires ~15 min).
      const pages: CbzPage[] = [];
      const multiChapter = job.chapters.length > 1;
      for (const ch of job.chapters) {
        if (controller.signal.aborted) throw new AbortError();
        const images = await api.chapterImages(ch.id, controller.signal);
        const urls = dataSaver ? images.pagesDataSaver : images.pages;
        const groupTag = ch.group ? ` (${sanitizeFilename(ch.group)})` : "";
        const prefix = multiChapter
          ? `Chapter ${pad(ch.chapter === "none" ? "0" : ch.chapter, 4)}${groupTag}/`
          : "";
        urls.forEach((url, i) => {
          pages.push({ name: pageEntryName(i, url, prefix), url });
        });
      }

      if (pages.length === 0) throw new Error("No pages found");
      patch(id, { pagesTotal: pages.length });

      const blob = await buildCbzBlob(pages, {
        concurrency,
        signal: controller.signal,
        onProgress: (done, total, bytes) =>
          patch(id, { pagesDone: done, pagesTotal: total, bytes }),
      });

      await saveBlob(blob, job.fileName);
      patch(id, { status: "done", bytes: blob.size });
      toast.success(`Downloaded ${job.mangaTitle} — ${job.label}`);
      void recordDownload({
        mangaId: job.mangaId,
        mangaTitle: job.mangaTitle,
        coverUrl: job.coverUrl,
        label: job.label,
        fileName: job.fileName,
        bytes: blob.size,
        at: Date.now(),
      });
    } catch (err) {
      if (err instanceof AbortError || controller.signal.aborted) {
        // Paused or canceled — status already set by the action; leave as is
        // unless it's still "active" (defensive).
        const cur = get().jobs.find((j) => j.id === id);
        if (cur?.status === "active") patch(id, { status: "canceled" });
      } else {
        patch(id, {
          status: "error",
          error: err instanceof Error ? err.message : "Download failed",
        });
        toast.error(`Failed: ${job.mangaTitle} — ${job.label}`);
      }
    } finally {
      controllers.delete(id);
      pump();
    }
  }

  return {
    jobs: [],

    enqueueChapter: ({
      mangaId,
      mangaTitle,
      coverUrl = null,
      chapterId,
      chapterNumber,
      group = null,
    }) => {
      const suffix = group ? ` · ${group}` : "";
      const label = `Chapter ${chapterNumber}${suffix}`;
      const fileGroup = group ? ` (${sanitizeFilename(group)})` : "";
      add({
        id: uid(),
        mangaId,
        mangaTitle,
        coverUrl,
        kind: "chapter",
        label,
        fileName: `${sanitizeFilename(mangaTitle)} - Ch ${chapterNumber}${fileGroup}.cbz`,
        chapters: [{ id: chapterId, chapter: chapterNumber, group }],
        status: "queued",
        pagesDone: 0,
        pagesTotal: 0,
        bytes: 0,
      });
    },

    enqueueVolume: ({ mangaId, mangaTitle, coverUrl = null, volume, chapters }) => {
      if (useSettings.getState().splitByChapter) {
        chapters.forEach((ch) =>
          get().enqueueChapter({
            mangaId,
            mangaTitle,
            coverUrl,
            chapterId: ch.id,
            chapterNumber: ch.chapter,
          }),
        );
        return;
      }
      const label = volumeLabel(volume);
      add({
        id: uid(),
        mangaId,
        mangaTitle,
        coverUrl,
        kind: "volume",
        label,
        fileName: `${sanitizeFilename(mangaTitle)} - ${label}.cbz`,
        chapters,
        status: "queued",
        pagesDone: 0,
        pagesTotal: 0,
        bytes: 0,
      });
    },

    enqueueManga: ({ mangaId, mangaTitle, coverUrl = null, volumes }) => {
      volumes.forEach((v) =>
        get().enqueueVolume({
          mangaId,
          mangaTitle,
          coverUrl,
          volume: v.volume,
          chapters: v.chapters,
        }),
      );
    },

    pause: (id) => {
      controllers.get(id)?.abort();
      patch(id, { status: "paused" });
    },

    resume: (id) => {
      patch(id, { status: "queued", pagesDone: 0, bytes: 0, error: undefined });
      pump();
    },

    cancel: (id) => {
      controllers.get(id)?.abort();
      patch(id, { status: "canceled" });
    },

    remove: (id) => {
      controllers.get(id)?.abort();
      controllers.delete(id);
      set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) }));
    },

    clearFinished: () =>
      set((s) => ({
        jobs: s.jobs.filter(
          (j) => !["done", "error", "canceled"].includes(j.status),
        ),
      })),
  };
});
