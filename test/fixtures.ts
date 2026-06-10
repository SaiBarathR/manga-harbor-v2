import type { MdEntity } from "@/lib/mangadex/types";

export const mangaEntity: MdEntity = {
  id: "manga-1",
  type: "manga",
  attributes: {
    title: { en: "Test Manga" },
    altTitles: [{ ja: "テスト" }, { en: "Alt Title" }],
    description: { en: "A test description." },
    status: "ongoing",
    year: 2019,
    contentRating: "safe",
    originalLanguage: "ja",
    publicationDemographic: "shounen",
    links: { al: "123" },
    availableTranslatedLanguages: ["en", "es"],
    tags: [
      {
        id: "tag-action",
        type: "tag",
        attributes: { name: { en: "Action" }, group: "genre" },
      },
      {
        id: "tag-drama",
        type: "tag",
        attributes: { name: { en: "Drama" }, group: "genre" },
      },
    ],
  },
  relationships: [
    {
      id: "cover-1",
      type: "cover_art",
      attributes: { fileName: "cover.jpg" },
    },
    { id: "author-1", type: "author", attributes: { name: "Jane Doe" } },
    { id: "artist-1", type: "artist", attributes: { name: "John Roe" } },
  ],
};

/** A manga whose title has no English entry — exercises altTitle fallback. */
export const mangaEntityNoEnTitle: MdEntity = {
  id: "manga-2",
  type: "manga",
  attributes: {
    title: { ja: "日本語" },
    altTitles: [{ ja: "別名" }, { en: "English Alt" }],
    description: {},
    status: "completed",
    tags: [],
  },
  relationships: [],
};

export const statsResponse = {
  result: "ok",
  statistics: {
    "manga-1": { rating: { average: 8.1, bayesian: 7.9 }, follows: 12345 },
  },
};

export const listResponse = {
  result: "ok",
  response: "collection",
  data: [mangaEntity],
  limit: 24,
  offset: 0,
  total: 1,
};

export const aggregateResponse = {
  result: "ok",
  volumes: {
    "1": {
      volume: "1",
      count: 2,
      chapters: {
        "2": { chapter: "2", id: "ch-2", others: [], count: 1 },
        "1": { chapter: "1", id: "ch-1", others: ["ch-1b"], count: 2 },
      },
    },
    none: {
      volume: "none",
      count: 1,
      chapters: {
        "0": { chapter: "0", id: "ch-0", others: [], count: 1 },
      },
    },
  },
};

export const atHomeResponse = {
  result: "ok",
  baseUrl: "https://cdn123.mangadex.network",
  chapter: {
    hash: "abchash",
    data: ["1-aaa.png", "2-bbb.png"],
    dataSaver: ["1-aaa.jpg", "2-bbb.jpg"],
  },
};

export const chapterEntity = {
  result: "ok",
  data: {
    id: "ch-1",
    type: "chapter",
    attributes: {
      chapter: "1",
      volume: "1",
      title: "The Beginning",
      pages: 2,
      translatedLanguage: "en",
    },
    relationships: [
      { id: "manga-1", type: "manga", attributes: { title: { en: "Test Manga" } } },
      {
        id: "grp-1",
        type: "scanlation_group",
        attributes: { name: "Test Scans" },
      },
    ],
  },
};

export const tagsResponse = {
  result: "ok",
  data: [
    {
      id: "tag-action",
      type: "tag",
      attributes: { name: { en: "Action" }, group: "genre" },
    },
    {
      id: "tag-romance",
      type: "tag",
      attributes: { name: { en: "Romance" }, group: "genre" },
    },
  ],
};
