import { describe, expect, it } from "vitest";
import { RateLimiter, buildUrl } from "./client";

describe("buildUrl", () => {
  it("expands array params to repeated key[] pairs", () => {
    const url = buildUrl("/manga", {
      title: "naruto",
      limit: 24,
      contentRating: ["safe", "suggestive"],
    });
    expect(url).toContain("https://api.mangadex.org/manga?");
    expect(url).toContain("title=naruto");
    expect(url).toContain("limit=24");
    expect(url).toContain("contentRating%5B%5D=safe");
    expect(url).toContain("contentRating%5B%5D=suggestive");
  });

  it("omits undefined params", () => {
    const url = buildUrl("/manga", { title: undefined, limit: 10 });
    expect(url).not.toContain("title");
    expect(url).toContain("limit=10");
  });
});

describe("RateLimiter", () => {
  it("enforces minimum spacing between starts", async () => {
    const limiter = new RateLimiter(50, 1);
    const starts: number[] = [];
    await Promise.all(
      [0, 1, 2].map(() =>
        limiter.schedule(async () => {
          starts.push(Date.now());
        }),
      ),
    );
    expect(starts).toHaveLength(3);
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(40);
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(40);
  });

  it("caps concurrency", async () => {
    const limiter = new RateLimiter(0, 2);
    let active = 0;
    let maxActive = 0;
    await Promise.all(
      Array.from({ length: 6 }, () =>
        limiter.schedule(async () => {
          active++;
          maxActive = Math.max(maxActive, active);
          await new Promise((r) => setTimeout(r, 30));
          active--;
        }),
      ),
    );
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
