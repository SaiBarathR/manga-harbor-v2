import { downloadZip } from "client-zip";
import { proxyUrl } from "@/lib/api";
import { pad } from "@/lib/utils";
import { AbortError, createLimiter, fetchWithRetry } from "./rate-limit";

export interface CbzPage {
  /** Zip entry path, e.g. "001.jpg" or "Chapter 0003/001.jpg". */
  name: string;
  /** Remote MangaDex image URL (fetched through the proxy). */
  url: string;
}

export interface BuildCbzOptions {
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number, bytes: number) => void;
}

/** Derive a zero-padded entry name preserving the image extension. */
export function pageEntryName(index: number, url: string, prefix = ""): string {
  const file = url.split(/[?#]/)[0].split("/").pop() ?? "";
  const ext = file.includes(".")
    ? (file.split(".").pop() as string).toLowerCase()
    : "jpg";
  return `${prefix}${pad(index + 1, 3)}.${ext}`;
}

/**
 * Fetch every page (bounded concurrency, through the proxy) and pack them into
 * a single CBZ Blob. CBZ entries are stored uncompressed (client-zip default),
 * which is correct for already-compressed manga images. All work happens in the
 * browser — the server never stores the archive.
 */
export async function buildCbzBlob(
  pages: CbzPage[],
  opts: BuildCbzOptions = {},
): Promise<Blob> {
  const { concurrency = 4, signal, onProgress } = opts;
  const run = createLimiter(concurrency);
  const blobs = new Array<Blob>(pages.length);
  let done = 0;
  let bytes = 0;

  await Promise.all(
    pages.map((page, i) =>
      run(async () => {
        if (signal?.aborted) throw new AbortError();
        const res = await fetchWithRetry(proxyUrl(page.url), { signal });
        if (!res.ok) {
          throw new Error(`Failed to fetch page ${i + 1} (HTTP ${res.status})`);
        }
        const blob = await res.blob();
        blobs[i] = blob;
        done++;
        bytes += blob.size;
        onProgress?.(done, pages.length, bytes);
      }),
    ),
  );

  if (signal?.aborted) throw new AbortError();

  const files = pages.map((page, i) => ({ name: page.name, input: blobs[i] }));
  return downloadZip(files).blob();
}
