"use client";

import Link from "next/link";
import { BookOpen, Check, Download, Loader2 } from "lucide-react";
import {
  useDownloadQueue,
  type DownloadJob,
  type JobStatus,
} from "@/lib/store/download-queue";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import type { VolumeView } from "@/lib/mangadex/types";

function findStatus(
  jobs: DownloadJob[],
  mangaId: string,
  label: string,
): JobStatus | undefined {
  const job = jobs.find(
    (j) => j.mangaId === mangaId && j.label === label && j.status !== "canceled",
  );
  return job?.status;
}

function DownloadAction({
  status,
  onClick,
  label,
  size = "sm",
}: {
  status: JobStatus | undefined;
  onClick: () => void;
  label: string;
  size?: "sm" | "default";
}) {
  const busy = status === "active" || status === "queued";
  const done = status === "done";
  return (
    <Button
      variant={done ? "ghost" : "outline"}
      size={size}
      onClick={onClick}
      disabled={busy}
      title={label}
    >
      {busy ? (
        <Loader2 className="animate-spin" />
      ) : done ? (
        <Check className="text-status-completed" />
      ) : (
        <Download />
      )}
      {size === "default" && (busy ? "Queued" : done ? "Downloaded" : label)}
    </Button>
  );
}

export function ChapterAccordion({
  mangaId,
  mangaTitle,
  coverUrl,
  volumes,
}: {
  mangaId: string;
  mangaTitle: string;
  coverUrl: string | null;
  volumes: VolumeView[];
}) {
  const jobs = useDownloadQueue((s) => s.jobs);
  const enqueueChapter = useDownloadQueue((s) => s.enqueueChapter);
  const enqueueVolume = useDownloadQueue((s) => s.enqueueVolume);

  if (volumes.length === 0) {
    return (
      <p className="rounded-xl border border-border/60 bg-surface/40 px-4 py-8 text-center text-sm text-muted-foreground">
        No English chapters are available for this title.
      </p>
    );
  }

  return (
    <Accordion
      type="multiple"
      defaultValue={[volumes[0]?.volume]}
      className="space-y-2"
    >
      {volumes.map((vol) => {
        const volLabel =
          vol.volume === "none" ? "Un-volumed" : `Volume ${vol.volume}`;
        const volStatus = findStatus(jobs, mangaId, volLabel);
        return (
          <AccordionItem key={vol.volume} value={vol.volume}>
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                {volLabel}
                <Badge variant="muted">{vol.chapters.length} ch</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-1">
              <div className="mb-2 flex justify-end">
                <DownloadAction
                  size="default"
                  status={volStatus}
                  label="Download volume"
                  onClick={() =>
                    enqueueVolume({
                      mangaId,
                      mangaTitle,
                      coverUrl,
                      volume: vol.volume,
                      chapters: vol.chapters.map((c) => ({
                        id: c.id,
                        chapter: c.chapter,
                        group: c.group,
                      })),
                    })
                  }
                />
              </div>
              <ul className="divide-y divide-border/40">
                {vol.chapters.map((ch) => {
                  const chLabel = `Chapter ${ch.chapter}${ch.group ? ` · ${ch.group}` : ""}`;
                  const chStatus = findStatus(jobs, mangaId, chLabel);
                  return (
                    <li
                      key={ch.id}
                      className="flex items-center justify-between gap-2 py-1.5"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm">
                        <span className="shrink-0">
                          {ch.chapter === "none"
                            ? "Oneshot"
                            : `Chapter ${ch.chapter}`}
                        </span>
                        {ch.group && (
                          <Badge variant="muted" className="truncate">
                            {ch.group}
                          </Badge>
                        )}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/read/${ch.id}`}>
                            <BookOpen /> Read
                          </Link>
                        </Button>
                        <DownloadAction
                          status={chStatus}
                          label="Download chapter"
                          onClick={() =>
                            enqueueChapter({
                              mangaId,
                              mangaTitle,
                              coverUrl,
                              chapterId: ch.id,
                              chapterNumber: ch.chapter,
                              group: ch.group,
                            })
                          }
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
