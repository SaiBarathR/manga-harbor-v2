import { describe, expect, it } from "vitest";
import { flattenChapters, getAggregate } from "./chapter";

describe("getAggregate", () => {
  it("returns volumes ascending with chapters ascending, 'none' last", async () => {
    const volumes = await getAggregate("manga-1", "en");
    expect(volumes.map((v) => v.volume)).toEqual(["1", "none"]);

    const vol1 = volumes[0];
    expect(vol1.chapters.map((c) => c.chapter)).toEqual(["1", "2"]);
    expect(vol1.chapters[0]).toMatchObject({ id: "ch-1", others: ["ch-1b"] });
  });

  it("flattens chapters in reading order", async () => {
    const volumes = await getAggregate("manga-1", "en");
    expect(flattenChapters(volumes).map((c) => c.id)).toEqual([
      "ch-1",
      "ch-2",
      "ch-0",
    ]);
  });
});
