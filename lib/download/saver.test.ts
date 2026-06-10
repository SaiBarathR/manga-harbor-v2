import { afterEach, describe, expect, it, vi } from "vitest";
import { saveBlob } from "./saver";

describe("saveBlob", () => {
  afterEach(() => vi.restoreAllMocks());

  it("falls back to an anchor download when File System Access API is absent", async () => {
    // jsdom has no showSaveFilePicker, so the anchor path is taken.
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    await saveBlob(new Blob(["data"]), "Test - Ch 1.cbz");

    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });
});
