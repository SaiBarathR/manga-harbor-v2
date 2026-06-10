import { mdGet } from "./client";
import { localized, pickTitle } from "./manga";
import {
  CONTENT_RATINGS,
  type ChapterMeta,
  type ChapterRef,
  type MdEntity,
  type MdListResponse,
  type VolumeView,
} from "./types";

interface AggregateChapter {
  chapter: string;
  id: string;
  others?: string[];
  count?: number;
}
interface AggregateVolume {
  volume: string;
  count: number;
  chapters: Record<string, AggregateChapter>;
}
interface AggregateResponse {
  result: string;
  volumes: Record<string, AggregateVolume> | never[];
}

/** Numeric-aware comparator for volume/chapter labels ("none" sorts last). */
function compareLabels(a: string, b: string): number {
  if (a === "none") return 1;
  if (b === "none") return -1;
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (Number.isNaN(na) && Number.isNaN(nb)) return a.localeCompare(b);
  if (Number.isNaN(na)) return 1;
  if (Number.isNaN(nb)) return -1;
  return na - nb;
}

/**
 * Fetch the volume → chapter structure for a manga in one language.
 * Returns volumes ascending, chapters ascending. `volumes` can be `[]` when a
 * manga has no chapters, which we normalize to an empty array.
 */
export async function getAggregate(
  mangaId: string,
  language = "en",
): Promise<VolumeView[]> {
  const res = await mdGet<AggregateResponse>(`/manga/${mangaId}/aggregate`, {
    translatedLanguage: [language],
  });

  if (!res.volumes || Array.isArray(res.volumes)) return [];

  return Object.values(res.volumes)
    .map<VolumeView>((vol) => ({
      volume: vol.volume,
      chapters: Object.values(vol.chapters)
        .map<ChapterRef>((ch) => ({
          id: ch.id,
          chapter: ch.chapter,
          others: ch.others ?? [],
        }))
        .sort((a, b) => compareLabels(a.chapter, b.chapter)),
    }))
    .sort((a, b) => compareLabels(a.volume, b.volume));
}

/** Flatten an aggregate into an ordered list of chapters (for reader nav). */
export function flattenChapters(volumes: VolumeView[]): ChapterRef[] {
  return volumes.flatMap((v) => v.chapters);
}

/**
 * Fetch the full chapter feed for a manga in one language — every scanlation
 * group's release of every chapter (so groups that released different chapters
 * are all represented). Paginated; external/image-less chapters are skipped.
 */
export async function getFeed(
  mangaId: string,
  language = "en",
): Promise<VolumeView[]> {
  const limit = 500;
  let offset = 0;
  const releases: {
    id: string;
    volume: string;
    chapter: string;
    group: string | null;
    title: string | null;
  }[] = [];

  // MangaDex caps offset+limit at 10000; loop defensively up to that.
  for (let i = 0; i < 20; i++) {
    const res = await mdGet<MdListResponse>(`/manga/${mangaId}/feed`, {
      translatedLanguage: [language],
      contentRating: CONTENT_RATINGS,
      "order[volume]": "asc",
      "order[chapter]": "asc",
      includes: ["scanlation_group"],
      limit,
      offset,
    });

    for (const ch of res.data) {
      const a = ch.attributes;
      // Skip chapters hosted on external sites (no downloadable images).
      if (a.externalUrl || (a.pages as number) === 0) continue;
      const groupRel = ch.relationships?.find(
        (r) => r.type === "scanlation_group",
      );
      releases.push({
        id: ch.id,
        volume: (a.volume as string) || "none",
        chapter: (a.chapter as string) || "none",
        group:
          (groupRel?.attributes?.name as string) ??
          localized(groupRel?.attributes?.name) ??
          null,
        title: (a.title as string) || null,
      });
    }

    offset += limit;
    if (offset >= res.total || res.data.length === 0) break;
  }

  // Group releases by volume, preserving every group's version of a chapter.
  const byVolume = new Map<string, ChapterRef[]>();
  for (const r of releases) {
    const ref: ChapterRef = {
      id: r.id,
      chapter: r.chapter,
      others: [],
      group: r.group,
      title: r.title,
    };
    byVolume.set(r.volume, [...(byVolume.get(r.volume) ?? []), ref]);
  }

  return [...byVolume.entries()]
    .map<VolumeView>(([volume, chapters]) => ({
      volume,
      chapters: chapters.sort(
        (a, b) =>
          compareLabels(a.chapter, b.chapter) ||
          (a.group ?? "").localeCompare(b.group ?? ""),
      ),
    }))
    .sort((a, b) => compareLabels(a.volume, b.volume));
}

/** Fetch metadata for a single chapter (used by the reader). */
export async function getChapter(chapterId: string): Promise<ChapterMeta> {
  const res = await mdGet<{ data: MdEntity }>(`/chapter/${chapterId}`, {
    includes: ["scanlation_group", "manga"],
  });
  const ch = res.data;
  const a = ch.attributes;
  const mangaRel = ch.relationships?.find((r) => r.type === "manga");
  const groupRel = ch.relationships?.find((r) => r.type === "scanlation_group");

  return {
    id: ch.id,
    mangaId: mangaRel?.id ?? null,
    mangaTitle: mangaRel?.attributes
      ? pickTitle(mangaRel.attributes)
      : null,
    chapter: (a.chapter as string) ?? null,
    volume: (a.volume as string) ?? null,
    title: (a.title as string) || null,
    pages: (a.pages as number) ?? 0,
    translatedLanguage: (a.translatedLanguage as string) ?? null,
    scanlationGroup: groupRel
      ? localized(groupRel.attributes?.name) ??
        (groupRel.attributes?.name as string) ??
        null
      : null,
  };
}
