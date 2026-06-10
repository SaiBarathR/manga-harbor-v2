import { describe, expect, it } from "vitest";
import { buildPageUrls } from "./images";
import type { ChapterImages } from "./types";

const images: ChapterImages = {
  chapterId: "ch-1",
  baseUrl: "https://cdn123.mangadex.network",
  hash: "abchash",
  data: ["1-aaa.png", "2-bbb.png"],
  dataSaver: ["1-aaa.jpg", "2-bbb.jpg"],
};

describe("buildPageUrls", () => {
  it("builds original-quality urls", () => {
    expect(buildPageUrls(images, false)).toEqual([
      "https://cdn123.mangadex.network/data/abchash/1-aaa.png",
      "https://cdn123.mangadex.network/data/abchash/2-bbb.png",
    ]);
  });

  it("builds data-saver urls", () => {
    expect(buildPageUrls(images, true)).toEqual([
      "https://cdn123.mangadex.network/data-saver/abchash/1-aaa.jpg",
      "https://cdn123.mangadex.network/data-saver/abchash/2-bbb.jpg",
    ]);
  });
});
