import { describe, expect, it } from "vitest";
import {
  isAllowedImageUrl,
  isAllowedReferrer,
  shouldReport,
} from "./image-proxy";

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

describe("isAllowedReferrer", () => {
  it("allows requests whose Origin/Referer matches the host", () => {
    expect(isAllowedReferrer("harbor.app", "https://harbor.app", null)).toBe(
      true,
    );
    expect(
      isAllowedReferrer("harbor.app", null, "https://harbor.app/manga/x"),
    ).toBe(true);
  });

  it("allows requests with no Origin or Referer (stripped by policy)", () => {
    expect(isAllowedReferrer("harbor.app", null, null)).toBe(true);
  });

  it("rejects cross-site embeds and malformed sources", () => {
    expect(
      isAllowedReferrer("harbor.app", "https://evil.com", null),
    ).toBe(false);
    expect(
      isAllowedReferrer("harbor.app", null, "https://evil.com/hotlink"),
    ).toBe(false);
    expect(isAllowedReferrer("harbor.app", "not a url", null)).toBe(false);
  });

  it("prefers Origin over Referer when both are present", () => {
    expect(
      isAllowedReferrer(
        "harbor.app",
        "https://evil.com",
        "https://harbor.app/manga/x",
      ),
    ).toBe(false);
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
