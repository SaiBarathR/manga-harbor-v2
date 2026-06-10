"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  useDownloadQueue,
  type DownloadJob,
} from "@/lib/store/download-queue";
import { Cover } from "./cover";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { formatBytes, cn } from "@/lib/utils";

export function DownloadDock() {
  const jobs = useDownloadQueue((s) => s.jobs);
  const clearFinished = useDownloadQueue((s) => s.clearFinished);
  const [open, setOpen] = useState(true);

  const active = jobs.filter(
    (j) => j.status === "active" || j.status === "queued",
  ).length;

  // Downloads live in memory — warn before a reload/close drops in-flight ones.
  useEffect(() => {
    if (active === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);

  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(92vw,380px)]">
      <div className="glass overflow-hidden rounded-xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Download className="size-4 text-primary" />
            Downloads
            {active > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 text-xs text-primary">
                {active}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={clearFinished}
              title="Clear finished"
            >
              <Trash2 className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen((o) => !o)}
              title={open ? "Collapse" : "Expand"}
            >
              {open ? <ChevronDown /> : <ChevronUp />}
            </Button>
          </div>
        </div>

        {open && (
          <ul className="max-h-[60vh] divide-y divide-border/40 overflow-y-auto">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function JobRow({ job }: { job: DownloadJob }) {
  const { pause, resume, cancel, remove } = useDownloadQueue.getState();
  const pct =
    job.pagesTotal > 0
      ? Math.round((job.pagesDone / job.pagesTotal) * 100)
      : 0;

  return (
    <li className="flex gap-3 p-3">
      <div className="w-10 shrink-0">
        <Cover src={job.coverUrl} alt="" rounded="rounded-md" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{job.mangaTitle}</p>
        <p className="truncate text-xs text-muted-foreground">{job.label}</p>

        <div className="mt-1.5">
          {job.status === "active" && (
            <>
              <Progress
                value={pct}
                indeterminate={job.pagesTotal === 0}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {job.pagesTotal > 0
                  ? `${job.pagesDone}/${job.pagesTotal} pages · ${formatBytes(job.bytes)}`
                  : "Preparing…"}
              </p>
            </>
          )}
          {job.status === "queued" && (
            <p className="text-[11px] text-muted-foreground">Queued</p>
          )}
          {job.status === "paused" && (
            <p className="text-[11px] text-muted-foreground">Paused</p>
          )}
          {job.status === "done" && (
            <p className="flex items-center gap-1 text-[11px] text-status-completed">
              <Check className="size-3" /> {formatBytes(job.bytes)} · saved
            </p>
          )}
          {job.status === "error" && (
            <p
              className="flex items-center gap-1 truncate text-[11px] text-destructive"
              title={job.error}
            >
              <AlertCircle className="size-3" /> {job.error ?? "Failed"}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        <JobControls
          status={job.status}
          onPause={() => pause(job.id)}
          onResume={() => resume(job.id)}
          onCancel={() => cancel(job.id)}
          onRemove={() => remove(job.id)}
        />
      </div>
    </li>
  );
}

function JobControls({
  status,
  onPause,
  onResume,
  onCancel,
  onRemove,
}: {
  status: DownloadJob["status"];
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const iconBtn = (
    onClick: () => void,
    icon: React.ReactNode,
    title: string,
    danger = false,
  ) => (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      title={title}
      className={cn(danger && "hover:text-destructive")}
    >
      {icon}
    </Button>
  );

  if (status === "active")
    return (
      <>
        {iconBtn(onPause, <Pause className="size-3.5" />, "Pause")}
        {iconBtn(onCancel, <X className="size-3.5" />, "Cancel", true)}
      </>
    );
  if (status === "queued")
    return iconBtn(onCancel, <X className="size-3.5" />, "Cancel", true);
  if (status === "paused")
    return (
      <>
        {iconBtn(onResume, <Play className="size-3.5" />, "Resume")}
        {iconBtn(onRemove, <Trash2 className="size-3.5" />, "Remove", true)}
      </>
    );
  if (status === "error")
    return (
      <>
        {iconBtn(onResume, <RotateCcw className="size-3.5" />, "Retry")}
        {iconBtn(onRemove, <Trash2 className="size-3.5" />, "Remove", true)}
      </>
    );
  // done / canceled
  return iconBtn(onRemove, <Trash2 className="size-3.5" />, "Remove", true);
}
