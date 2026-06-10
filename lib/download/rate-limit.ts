import { sleep } from "@/lib/utils";

/**
 * Bounded-concurrency runner for client-side image fetches. Replaces the old
 * server's broken throttle: a real semaphore that never exceeds `max` in-flight.
 */
export function createLimiter(max: number) {
  let active = 0;
  const waiters: (() => void)[] = [];

  return function run<T>(fn: () => Promise<T>): Promise<T> {
    const exec = async (): Promise<T> => {
      active++;
      try {
        return await fn();
      } finally {
        active--;
        waiters.shift()?.();
      }
    };
    if (active < max) return exec();
    return new Promise<void>((resolve) => waiters.push(resolve)).then(exec);
  };
}

export class AbortError extends Error {
  constructor() {
    super("Aborted");
    this.name = "AbortError";
  }
}

/**
 * Fetch with retry + backoff. Honors `Retry-After` on 429 and backs off on any
 * non-OK response (the proxy surfaces upstream failures as 5xx).
 */
export async function fetchWithRetry(
  url: string,
  { signal, retries = 3 }: { signal?: AbortSignal; retries?: number } = {},
): Promise<Response> {
  let attempt = 0;
  for (;;) {
    if (signal?.aborted) throw new AbortError();
    const res = await fetch(url, { signal });
    if (res.ok) return res;

    if (attempt < retries) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs =
        res.status === 429 && Number.isFinite(retryAfter)
          ? retryAfter * 1000
          : Math.min(2 ** attempt * 500, 6000);
      await sleep(waitMs);
      attempt++;
      continue;
    }
    return res; // give up — caller treats non-ok as failure
  }
}
