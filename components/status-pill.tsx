import { cn } from "@/lib/utils";
import type { MangaStatus } from "@/lib/mangadex/types";

const STATUS_COLOR: Record<MangaStatus, string> = {
  ongoing: "bg-status-ongoing",
  completed: "bg-status-completed",
  hiatus: "bg-status-hiatus",
  cancelled: "bg-status-cancelled",
};

export function StatusPill({
  status,
  year,
  className,
}: {
  status: MangaStatus | null;
  year?: number | null;
  className?: string;
}) {
  if (!status) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2/70 px-2 py-0.5 text-xs font-medium capitalize",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_COLOR[status])} />
      {year ? `${year} · ` : ""}
      {status}
    </span>
  );
}
