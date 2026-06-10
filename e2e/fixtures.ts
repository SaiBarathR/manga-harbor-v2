import type { Page } from "@playwright/test";

// 1×1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMCAQDJZ7QrAAAAAElFTkSuQmCC",
  "base64",
);

const summary = {
  id: "manga-1",
  title: "Test Manga",
  coverUrl: "https://uploads.mangadex.org/covers/manga-1/c.jpg",
  coverThumbUrl: "https://uploads.mangadex.org/covers/manga-1/c.jpg.512.jpg",
  status: "ongoing",
  year: 2020,
  contentRating: "safe",
  tags: ["Action"],
  rating: 8.5,
  follows: 12345,
  description: "A test manga used for end-to-end tests.",
};

const detail = {
  ...summary,
  altTitles: ["別タイトル"],
  authors: ["Author One"],
  artists: ["Artist One"],
  tagGroups: [{ group: "genre", tags: ["Action", "Drama"] }],
  originalLanguage: "ja",
  demographic: "shounen",
  links: {},
  availableLanguages: ["en"],
};

const volumes = [
  {
    volume: "1",
    chapters: [
      { id: "ch-1", chapter: "1", others: [] },
      { id: "ch-2", chapter: "2", others: [] },
    ],
  },
];

const chapterMeta = {
  id: "ch-1",
  mangaId: "manga-1",
  mangaTitle: "Test Manga",
  chapter: "1",
  volume: "1",
  title: "The Start",
  pages: 3,
  translatedLanguage: "en",
  scanlationGroup: "Test Scans",
};

const chapterImages = {
  chapterId: "ch-1",
  pages: [
    "https://cdn.mangadex.network/data/hash/1-a.png",
    "https://cdn.mangadex.network/data/hash/2-b.png",
    "https://cdn.mangadex.network/data/hash/3-c.png",
  ],
  pagesDataSaver: [
    "https://cdn.mangadex.network/data-saver/hash/1-a.png",
    "https://cdn.mangadex.network/data-saver/hash/2-b.png",
    "https://cdn.mangadex.network/data-saver/hash/3-c.png",
  ],
};

const tags = [
  { id: "t-action", name: "Action", group: "genre" },
  { id: "t-romance", name: "Romance", group: "genre" },
];

/** Intercept the app's own /api/* routes so E2E runs deterministically offline. */
export async function setupMocks(page: Page) {
  const json = (body: unknown) => ({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

  await page.route(/\/api\/image\?/, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PNG }),
  );
  await page.route(/\/api\/tags/, (route) => route.fulfill(json({ tags })));
  await page.route(/\/api\/manga\/[^/?]+\/aggregate/, (route) =>
    route.fulfill(json({ volumes })),
  );
  await page.route(/\/api\/manga\?/, (route) =>
    route.fulfill(
      json({ items: [summary], total: 1, limit: 24, offset: 0 }),
    ),
  );
  await page.route(/\/api\/manga\/[^/?]+(\?.*)?$/, (route) =>
    route.fulfill(json(detail)),
  );
  await page.route(/\/api\/chapter\/[^/?]+\/images/, (route) =>
    route.fulfill(json(chapterImages)),
  );
  await page.route(/\/api\/chapter\/[^/?]+(\?.*)?$/, (route) =>
    route.fulfill(json(chapterMeta)),
  );
}
