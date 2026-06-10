import { MANGADEX_UPLOADS, mdGet } from "./client";
import {
  type ContentRating,
  type MangaDetail,
  type MangaStatus,
  type MangaSummary,
  type MdEntity,
  type MdListResponse,
  type MdRelationship,
  type Paginated,
  DEFAULT_CONTENT_RATINGS,
} from "./types";

type LocalizedMap = Record<string, string>;

/** Pick a preferred-language string from a MangaDex localized map. */
export function localized(
  map: unknown,
  pref = "en",
): string | null {
  if (!map || typeof map !== "object") return null;
  const m = map as LocalizedMap;
  return m[pref] ?? Object.values(m)[0] ?? null;
}

/**
 * Resolve a display title: `title.en`, else an English alt-title, else the
 * first available value — mirroring the old server's getMangaName fallback.
 */
export function pickTitle(attributes: Record<string, unknown>): string {
  const title = attributes.title as LocalizedMap | undefined;
  if (title?.en) return title.en;

  const altTitles = (attributes.altTitles as LocalizedMap[]) ?? [];
  const altEn = altTitles.find((t) => t.en)?.en;
  if (altEn) return altEn;

  return localized(title) ?? altTitles.map((t) => Object.values(t)[0])[0] ?? "Untitled";
}

function relationship(entity: MdEntity, type: string): MdRelationship | undefined {
  return entity.relationships?.find((r) => r.type === type);
}

function coverUrls(entity: MdEntity): {
  coverUrl: string | null;
  coverThumbUrl: string | null;
} {
  const cover = relationship(entity, "cover_art");
  const fileName = cover?.attributes?.fileName as string | undefined;
  if (!fileName) return { coverUrl: null, coverThumbUrl: null };
  const base = `${MANGADEX_UPLOADS}/covers/${entity.id}/${fileName}`;
  return { coverUrl: base, coverThumbUrl: `${base}.512.jpg` };
}

function tagList(attributes: Record<string, unknown>): {
  flat: string[];
  groups: { group: string; tags: string[] }[];
} {
  const tags = (attributes.tags as MdEntity[]) ?? [];
  const byGroup = new Map<string, string[]>();
  const flat: string[] = [];
  for (const t of tags) {
    const name = localized(t.attributes?.name);
    if (!name) continue;
    flat.push(name);
    const group = (t.attributes?.group as string) ?? "other";
    byGroup.set(group, [...(byGroup.get(group) ?? []), name]);
  }
  return {
    flat,
    groups: [...byGroup.entries()].map(([group, tags]) => ({ group, tags })),
  };
}

interface Stats {
  rating?: { average?: number; bayesian?: number };
  follows?: number;
}
type StatsResponse = { statistics?: Record<string, Stats> };

function applyStats(summary: MangaSummary, stats?: Stats): MangaSummary {
  if (!stats) return summary;
  return {
    ...summary,
    rating: stats.rating?.bayesian ?? stats.rating?.average ?? summary.rating,
    follows: stats.follows ?? summary.follows,
  };
}

export function mapMangaSummary(entity: MdEntity, stats?: Stats): MangaSummary {
  const a = entity.attributes;
  const { flat } = tagList(a);
  const summary: MangaSummary = {
    id: entity.id,
    title: pickTitle(a),
    ...coverUrls(entity),
    status: (a.status as MangaStatus) ?? null,
    year: (a.year as number) ?? null,
    contentRating: (a.contentRating as ContentRating) ?? null,
    tags: flat,
    rating: null,
    follows: null,
    description: localized(a.description),
  };
  return applyStats(summary, stats);
}

export function mapMangaDetail(entity: MdEntity, stats?: Stats): MangaDetail {
  const a = entity.attributes;
  const { groups } = tagList(a);
  const authors = (entity.relationships ?? [])
    .filter((r) => r.type === "author")
    .map((r) => r.attributes?.name as string)
    .filter(Boolean);
  const artists = (entity.relationships ?? [])
    .filter((r) => r.type === "artist")
    .map((r) => r.attributes?.name as string)
    .filter(Boolean);

  const altTitles = ((a.altTitles as LocalizedMap[]) ?? [])
    .map((t) => Object.values(t)[0])
    .filter(Boolean);

  return {
    ...mapMangaSummary(entity, stats),
    altTitles,
    authors,
    artists,
    tagGroups: groups,
    originalLanguage: (a.originalLanguage as string) ?? null,
    demographic: (a.publicationDemographic as string) ?? null,
    links: (a.links as Record<string, string>) ?? {},
    availableLanguages: (a.availableTranslatedLanguages as string[]) ?? [],
  };
}

/** Fetch statistics for a set of manga ids, keyed by id. */
async function fetchStats(ids: string[]): Promise<Record<string, Stats>> {
  if (ids.length === 0) return {};
  try {
    const res = await mdGet<StatsResponse>("/statistics/manga", { manga: ids });
    return res.statistics ?? {};
  } catch {
    return {}; // stats are non-critical; degrade gracefully
  }
}

export interface MangaListOptions {
  title?: string;
  limit?: number;
  offset?: number;
  contentRating?: ContentRating[];
  includedTags?: string[];
  excludedTags?: string[];
  order?: Record<string, "asc" | "desc">;
  status?: string[];
}

/** Shared list fetch used by search & browse, with stats merged in. */
export async function fetchMangaList(
  opts: MangaListOptions,
): Promise<Paginated<MangaSummary>> {
  const params: Record<string, string | number | string[] | undefined> = {
    title: opts.title || undefined,
    limit: opts.limit ?? 24,
    offset: opts.offset ?? 0,
    contentRating: opts.contentRating ?? DEFAULT_CONTENT_RATINGS,
    includes: ["cover_art"],
    includedTags: opts.includedTags,
    excludedTags: opts.excludedTags,
    status: opts.status,
    hasAvailableChapters: "true",
  };
  // order[key]=value style params.
  if (opts.order) {
    for (const [key, value] of Object.entries(opts.order)) {
      params[`order[${key}]`] = value;
    }
  }

  const list = await mdGet<MdListResponse>("/manga", params);
  const ids = list.data.map((m) => m.id);
  const stats = await fetchStats(ids);

  return {
    items: list.data.map((m) => mapMangaSummary(m, stats[m.id])),
    total: list.total,
    limit: list.limit,
    offset: list.offset,
  };
}

export function searchManga(
  title: string,
  opts: Omit<MangaListOptions, "title"> = {},
): Promise<Paginated<MangaSummary>> {
  return fetchMangaList({ ...opts, title });
}

/** Fetch one manga with full detail + statistics. */
export async function getMangaById(id: string): Promise<MangaDetail> {
  const [entityRes, stats] = await Promise.all([
    mdGet<{ data: MdEntity }>(`/manga/${id}`, {
      includes: ["cover_art", "author", "artist"],
    }),
    fetchStats([id]),
  ]);
  return mapMangaDetail(entityRes.data, stats[id]);
}
