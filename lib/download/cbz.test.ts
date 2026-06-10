import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCbzBlob, pageEntryName } from "./cbz";

describe("pageEntryName", () => {
  it("zero-pads index and preserves the image extension", () => {
    expect(pageEntryName(0, "https://x/1-aaa.png")).toBe("001.png");
    expect(pageEntryName(9, "https://x/10-bbb.jpg?token=1")).toBe("010.jpg");
  });
  it("supports a chapter-folder prefix and defaults extension", () => {
    expect(pageEntryName(0, "https://x/file", "Chapter 0003/")).toBe(
      "Chapter 0003/001.jpg",
    );
  });
});

describe("buildCbzBlob", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
            status: 200,
            headers: { "content-type": "image/png" },
          }),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("packs pages into a valid (PK) zip and reports progress to the end", async () => {
    const pages = [
      { name: "001.png", url: "https://uploads.mangadex.org/a.png" },
      { name: "002.png", url: "https://uploads.mangadex.org/b.png" },
      { name: "003.png", url: "https://uploads.mangadex.org/c.png" },
    ];
    const progress: number[] = [];
    const blob = await buildCbzBlob(pages, {
      concurrency: 2,
      onProgress: (done) => progress.push(done),
    });

    const head = new Uint8Array(await blob.arrayBuffer()).slice(0, 2);
    expect(String.fromCharCode(...head)).toBe("PK"); // ZIP local-file signature
    expect(blob.size).toBeGreaterThan(0);
    expect(progress.at(-1)).toBe(3);
  });
});
