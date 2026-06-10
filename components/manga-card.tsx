import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Cover } from "./cover";
import { RatingBadge } from "./rating-badge";
import { StatusPill } from "./status-pill";
import { Skeleton } from "./ui/skeleton";
import { formatCount } from "@/lib/utils";
import type { MangaSummary } from "@/lib/mangadex/types";

export function MangaCard({
  manga,
  priority = false,
  fill = false,
}: {
  manga: MangaSummary;
  priority?: boolean;
  /** When true, fills its grid cell instead of using a fixed rail width. */
  fill?: boolean;
}) {
  return (
    <Link
      href={`/manga/${manga.id}`}
      className={
        fill
          ? "group block w-full"
          : "group block w-[160px] shrink-0 sm:w-[180px]"
      }
    >
      <div className="relative overflow-hidden rounded-xl border border-border/60 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-glow">
        <Cover
          src={manga.coverThumbUrl ?? manga.coverUrl}
          alt={manga.title}
          rounded="rounded-none"
          priority={priority}
        />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute left-2 top-2 flex gap-1">
          <RatingBadge rating={manga.rating} />
        </div>
        <div className="absolute inset-x-0 bottom-0 translate-y-2 p-2.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/90 px-2 py-1 text-xs font-medium text-primary-foreground">
            <BookOpen className="size-3" /> Open
          </span>
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground/90 transition-colors group-hover:text-foreground">
          {manga.title}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <StatusPill status={manga.status} />
          {manga.follows != null && <span>{formatCount(manga.follows)} ★</span>}
        </div>
      </div>
    </Link>
  );
}

export function MangaCardSkeleton({ fill = false }: { fill?: boolean }) {
  return (
    <div className={fill ? "w-full" : "w-[160px] shrink-0 sm:w-[180px]"}>
      <Skeleton className="aspect-[2/3] w-full rounded-xl" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <Skeleton className="mt-1.5 h-3 w-1/2" />
    </div>
  );
}
