import { afterEach, describe, expect, it, vi } from "vitest";
import { createLimiter, fetchWithRetry } from "./rate-limit";

describe("createLimiter", () => {
  it("never exceeds the configured concurrency", async () => {
    const run = createLimiter(2);
    let active = 0;
    let max = 0;
    await Promise.all(
      Array.from({ length: 8 }, () =>
        run(async () => {
          active++;
          max = Math.max(max, active);
          await new Promise((r) => setTimeout(r, 15));
          active--;
        }),
      ),
    );
    expect(max).toBeLessThanOrEqual(2);
  });

  it("runs every task and preserves results", async () => {
    const run = createLimiter(3);
    const out = await Promise.all(
      [1, 2, 3, 4, 5].map((n) => run(async () => n * 2)),
    );
    expect(out).toEqual([2, 4, 6, 8, 10]);
  });
});

describe("fetchWithRetry", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retries on 429 (honoring Retry-After) then succeeds", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        return calls === 1
          ? new Response("", { status: 429, headers: { "retry-after": "0" } })
          : new Response("ok", { status: 200 });
      }),
    );
    const res = await fetchWithRetry("https://x/img", { retries: 2 });
    expect(res.status).toBe(200);
    expect(calls).toBe(2);
  });

  it("gives up after exhausting retries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 502 })),
    );
    const res = await fetchWithRetry("https://x/img", { retries: 1 });
    expect(res.status).toBe(502);
  });
});
