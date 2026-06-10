import type {
  ChapterMeta,
  MangaDetail,
  MangaSummary,
  Paginated,
  Tag,
  VolumeView,
} from "@/lib/mangadex/types";

/** Build the same-origin proxy URL for a remote MangaDex image. */
export function proxyUrl(remoteUrl: string): string {
  return `/api/image?url=${encodeURIComponent(remoteUrl)}`;
}

async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export interface BrowseParams {
  q?: string;
  order?: "popular" | "latest" | "rating" | "relevance";
  limit?: number;
  offset?: number;
  includedTags?: string[];
  excludedTags?: string[];
  status?: string[];
  contentRating?: string[];
}

function browseQuery(params: BrowseParams): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.order) sp.set("order", params.order);
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  if (params.includedTags?.length)
    sp.set("includedTags", params.includedTags.join(","));
  if (params.excludedTags?.length)
    sp.set("excludedTags", params.excludedTags.join(","));
  if (params.status?.length) sp.set("status", params.status.join(","));
  if (params.contentRating?.length)
    sp.set("contentRating", params.contentRating.join(","));
  return sp.toString();
}

export const api = {
  browse: (params: BrowseParams, signal?: AbortSignal) =>
    getJSON<Paginated<MangaSummary>>(`/api/manga?${browseQuery(params)}`, signal),

  manga: (id: string, signal?: AbortSignal) =>
    getJSON<MangaDetail>(`/api/manga/${id}`, signal),

  aggregate: (id: string, lang = "en", signal?: AbortSignal) =>
    getJSON<{ volumes: VolumeView[] }>(
      `/api/manga/${id}/aggregate?lang=${lang}`,
      signal,
    ).then((r) => r.volumes),

  feed: (id: string, lang = "en", signal?: AbortSignal) =>
    getJSON<{ volumes: VolumeView[] }>(
      `/api/manga/${id}/feed?lang=${lang}`,
      signal,
    ).then((r) => r.volumes),

  chapter: (id: string, signal?: AbortSignal) =>
    getJSON<ChapterMeta>(`/api/chapter/${id}`, signal),

  chapterImages: (id: string, signal?: AbortSignal) =>
    getJSON<{ chapterId: string; pages: string[]; pagesDataSaver: string[] }>(
      `/api/chapter/${id}/images`,
      signal,
    ),

  tags: (signal?: AbortSignal) =>
    getJSON<{ tags: Tag[] }>(`/api/tags`, signal).then((r) => r.tags),
};

export const queryKeys = {
  browse: (params: BrowseParams) => ["browse", params] as const,
  manga: (id: string) => ["manga", id] as const,
  aggregate: (id: string, lang: string) => ["aggregate", id, lang] as const,
  feed: (id: string, lang: string) => ["feed", id, lang] as const,
  chapter: (id: string) => ["chapter", id] as const,
  chapterImages: (id: string) => ["chapterImages", id] as const,
  tags: () => ["tags"] as const,
};
