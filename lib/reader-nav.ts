import type { ChapterRef, VolumeView } from "@/lib/mangadex/types";

/**
 * Flatten volumes into an ordered chapter list for reader prev/next nav.
 * Pure (no server deps) so it's safe to import into the client reader bundle.
 */
export function flattenChapterRefs(volumes: VolumeView[]): ChapterRef[] {
  return volumes.flatMap((v) => v.chapters);
}
