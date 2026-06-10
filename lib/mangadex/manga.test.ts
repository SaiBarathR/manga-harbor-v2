import { describe, expect, it } from "vitest";
import { mangaEntity, mangaEntityNoEnTitle } from "@/test/fixtures";
import {
  localized,
  mapMangaDetail,
  mapMangaSummary,
  pickTitle,
} from "./manga";

describe("localized", () => {
  it("prefers english, falls back to first value", () => {
    expect(localized({ en: "hi", ja: "やあ" })).toBe("hi");
    expect(localized({ ja: "やあ" })).toBe("やあ");
    expect(localized(null)).toBeNull();
  });
});

describe("pickTitle", () => {
  it("uses title.en when present", () => {
    expect(pickTitle(mangaEntity.attributes)).toBe("Test Manga");
  });
  it("falls back to an english alt-title", () => {
    expect(pickTitle(mangaEntityNoEnTitle.attributes)).toBe("English Alt");
  });
});

describe("mapMangaSummary", () => {
  it("builds cover urls and merges stats", () => {
    const stats = { rating: { bayesian: 7.9 }, follows: 12345 };
    const s = mapMangaSummary(mangaEntity, stats);
    expect(s.coverUrl).toBe(
      "https://uploads.mangadex.org/covers/manga-1/cover.jpg",
    );
    expect(s.coverThumbUrl).toBe(
      "https://uploads.mangadex.org/covers/manga-1/cover.jpg.512.jpg",
    );
    expect(s.rating).toBe(7.9);
    expect(s.follows).toBe(12345);
    expect(s.tags).toEqual(["Action", "Drama"]);
    expect(s.status).toBe("ongoing");
  });

  it("degrades gracefully with no cover or stats", () => {
    const s = mapMangaSummary(mangaEntityNoEnTitle);
    expect(s.coverUrl).toBeNull();
    expect(s.rating).toBeNull();
    expect(s.follows).toBeNull();
  });
});

describe("mapMangaDetail", () => {
  it("extracts authors, artists and tag groups", () => {
    const d = mapMangaDetail(mangaEntity);
    expect(d.authors).toEqual(["Jane Doe"]);
    expect(d.artists).toEqual(["John Roe"]);
    expect(d.tagGroups).toEqual([{ group: "genre", tags: ["Action", "Drama"] }]);
    expect(d.availableLanguages).toEqual(["en", "es"]);
    expect(d.demographic).toBe("shounen");
  });
});
