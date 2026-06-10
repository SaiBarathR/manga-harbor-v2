import { sleep } from "@/lib/utils";

export const MANGADEX_API = "https://api.mangadex.org";
export const MANGADEX_UPLOADS = "https://uploads.mangadex.org";

/**
 * MangaDex requires a descriptive, non-spoofed User-Agent on every request.
 * Browsers can't set this header, which is exactly why all MangaDex traffic
 * (including image bytes) is fetched server-side through these helpers.
 */
const USER_AGENT =
  process.env.MANGADEX_USER_AGENT ??
  "MangaHarbor/1.0 (+https://github.com/manga-harbor; self-hosted reader)";

export class MangaDexError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MangaDexError";
  }
}

interface Task {
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

/**
 * Schedules async work while enforcing both a minimum spacing between request
 * *starts* and a maximum number of in-flight requests. A 429 can push back the
 * whole queue via {@link blockUntil}. This is the real throttle the old Java
 * code never had.
 */
export class RateLimiter {
  private queue: Task[] = [];
  private active = 0;
  private lastStartAt = 0;
  private pumping = false;
  private blockedUntil = 0;

  constructor(
    private readonly minIntervalMs: number,
    private readonly maxConcurrent: number,
  ) {}

  schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      void this.pump();
    });
  }

  /** Pause dispatch until the given epoch-ms (used on 429 Retry-After). */
  blockUntil(epochMs: number) {
    this.blockedUntil = Math.max(this.blockedUntil, epochMs);
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (this.queue.length > 0 && this.active < this.maxConcurrent) {
        const now = Date.now();
        const wait = Math.max(
          this.blockedUntil - now,
          this.lastStartAt + this.minIntervalMs - now,
          0,
        );
        if (wait > 0) {
          await sleep(wait);
          continue;
        }
        const task = this.queue.shift()!;
        this.active++;
        this.lastStartAt = Date.now();
        void task
          .fn()
          .then(task.resolve, task.reject)
          .finally(() => {
            this.active--;
            void this.pump();
          });
      }
    } finally {
      this.pumping = false;
    }
  }
}

// Global gate keeps us comfortably under MangaDex's 5 req/s per-IP limit.
const globalLimiter = new RateLimiter(220, 4);
// /at-home/server is additionally capped at 40/min → ≥1.6s spacing, serial.
const atHomeLimiter = new RateLimiter(1600, 1);

const MAX_RETRIES = 4;

/**
 * Parse `X-RateLimit-Retry-After` (a UNIX timestamp in seconds) into epoch-ms.
 * Falls back to a `Retry-After` delta in seconds, then a default backoff.
 */
function retryAfterEpochMs(res: Response, attempt: number): number {
  const xReset = res.headers.get("x-ratelimit-retry-after");
  if (xReset) {
    const secs = Number(xReset);
    if (Number.isFinite(secs)) return secs * 1000;
  }
  const retryAfter = res.headers.get("retry-after");
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs)) return Date.now() + secs * 1000;
  }
  return Date.now() + Math.min(2 ** attempt * 500, 8000);
}

async function execute<T>(
  url: string,
  limiter: RateLimiter,
  init?: RequestInit,
): Promise<T> {
  let attempt = 0;
  // Loop handles 429 (rate limited) and transient 5xx with backoff.
  for (;;) {
    const res = await limiter.schedule(() =>
      fetch(url, {
        ...init,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          ...init?.headers,
        },
        cache: "no-store",
      }),
    );

    if (res.status === 429) {
      const until = retryAfterEpochMs(res, attempt);
      limiter.blockUntil(until);
      globalLimiter.blockUntil(until);
      if (attempt++ < MAX_RETRIES) continue;
      throw new MangaDexError("Rate limited by MangaDex", 429);
    }

    if (res.status >= 500 && attempt < MAX_RETRIES) {
      await sleep(Math.min(2 ** attempt * 400, 6000));
      attempt++;
      continue;
    }

    if (!res.ok) {
      throw new MangaDexError(
        `MangaDex request failed: ${res.status} ${res.statusText}`,
        res.status,
      );
    }

    return (await res.json()) as T;
  }
}

/** Build a MangaDex URL, expanding array params to repeated `key[]=` pairs. */
export function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | string[] | undefined>,
): string {
  const url = new URL(path.replace(/^\//, ""), MANGADEX_API + "/");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(`${key}[]`, String(v));
      } else {
        url.searchParams.append(key, String(value));
      }
    }
  }
  return url.toString();
}

/** GET a MangaDex API endpoint as JSON, throttled + retried. */
export function mdGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | string[] | undefined>,
): Promise<T> {
  return execute<T>(buildUrl(path, params), globalLimiter);
}

/**
 * GET the MangaDex@Home image server metadata for a chapter, throttled against
 * the stricter 40/min budget. The returned `baseUrl` expires in ~15 minutes, so
 * callers must fetch this just before downloading/reading — never persist it.
 */
export function mdGetAtHome<T>(chapterId: string): Promise<T> {
  return atHomeLimiter.schedule(() =>
    execute<T>(buildUrl(`/at-home/server/${chapterId}`), globalLimiter),
  );
}

export { globalLimiter as _globalLimiter };
