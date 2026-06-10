// ---------------------------------------------------------------------------
// View models — the shapes our UI and download engine consume. Raw MangaDex
// responses are mapped into these in manga.ts / chapter.ts / images.ts.
// ---------------------------------------------------------------------------

export type MangaStatus = "ongoing" | "completed" | "hiatus" | "cancelled";

export type ContentRating = "safe" | "suggestive" | "erotica" | "pornographic";

export const CONTENT_RATINGS: ContentRating[] = [
  "safe",
  "suggestive",
  "erotica",
  "pornographic",
];

/** Content ratings requested by default — excludes `pornographic`. */
export const DEFAULT_CONTENT_RATINGS: ContentRating[] = [
  "safe",
  "suggestive",
  "erotica",
];

export interface MangaSummary {
  id: string;
  title: string;
  coverUrl: string | null;
  coverThumbUrl: string | null;
  status: MangaStatus | null;
  year: number | null;
  contentRating: ContentRating | null;
  tags: string[];
  rating: number | null; // bayesian average, 0–10
  follows: number | null;
  description: string | null;
}

export interface MangaDetail extends MangaSummary {
  altTitles: string[];
  authors: string[];
  artists: string[];
  tagGroups: { group: string; tags: string[] }[];
  originalLanguage: string | null;
  demographic: string | null;
  links: Record<string, string>;
  availableLanguages: string[];
}

export interface ChapterRef {
  id: string;
  chapter: string; // "1", "10.5", or "none"
  others: string[]; // alternate chapter ids for the same chapter number
  group?: string | null; // scanlation group (only set in "all groups" feed mode)
  title?: string | null;
}

export interface VolumeView {
  volume: string; // "1", "2", … or "none"
  chapters: ChapterRef[];
}

export interface ChapterMeta {
  id: string;
  mangaId: string | null;
  mangaTitle: string | null;
  chapter: string | null;
  volume: string | null;
  title: string | null;
  pages: number;
  translatedLanguage: string | null;
  scanlationGroup: string | null;
}

export interface ChapterImages {
  chapterId: string;
  baseUrl: string;
  hash: string;
  data: string[]; // original quality filenames
  dataSaver: string[]; // compressed filenames
}

export interface Tag {
  id: string;
  name: string;
  group: string; // "genre" | "theme" | "format" | "content"
}

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------------------------------------------------------------------
// Minimal raw DTO types (only the fields we read).
// ---------------------------------------------------------------------------

export interface MdRelationship {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
}

export interface MdEntity {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: MdRelationship[];
}

export interface MdListResponse {
  result: string;
  data: MdEntity[];
  limit: number;
  offset: number;
  total: number;
}

export interface MdEntityResponse {
  result: string;
  data: MdEntity;
}
