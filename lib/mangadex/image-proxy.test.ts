import { describe, expect, it } from "vitest";
import { isAllowedImageUrl, shouldReport } from "./image-proxy";

describe("isAllowedImageUrl", () => {
  it("allows MangaDex-owned hosts over https", () => {
    expect(
      isAllowedImageUrl("https://uploads.mangadex.org/covers/x/y.jpg"),
    ).toBe(true);
    expect(
      isAllowedImageUrl("https://cdn123.mangadex.network/data/h/1.png"),
    ).toBe(true);
  });

  it("rejects non-MangaDex hosts, http, and garbage", () => {
    expect(isAllowedImageUrl("https://evil.com/x.png")).toBe(false);
    expect(isAllowedImageUrl("http://uploads.mangadex.org/x.jpg")).toBe(false);
    expect(
      isAllowedImageUrl("https://uploads.mangadex.org.evil.com/x.jpg"),
    ).toBe(false);
    expect(isAllowedImageUrl("not a url")).toBe(false);
  });
});

describe("shouldReport", () => {
  it("reports only @Home network nodes", () => {
    expect(shouldReport("https://cdn1.mangadex.network/data/h/1.png")).toBe(
      true,
    );
    expect(shouldReport("https://uploads.mangadex.org/covers/x/y.jpg")).toBe(
      false,
    );
  });
});
