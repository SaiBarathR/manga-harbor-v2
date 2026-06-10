import { describe, expect, it } from "vitest";
import { flattenChapterRefs } from "./reader-nav";

describe("flattenChapterRefs", () => {
  it("flattens volumes into reading order", () => {
    const volumes = [
      {
        volume: "1",
        chapters: [
          { id: "a", chapter: "1", others: [] },
          { id: "b", chapter: "2", others: [] },
        ],
      },
      { volume: "2", chapters: [{ id: "c", chapter: "3", others: [] }] },
    ];
    expect(flattenChapterRefs(volumes).map((c) => c.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("handles empty volumes", () => {
    expect(flattenChapterRefs([])).toEqual([]);
  });
});
