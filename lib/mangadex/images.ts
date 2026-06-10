import { mdGetAtHome } from "./client";
import type { ChapterImages } from "./types";

interface AtHomeResponse {
  result: string;
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
}

/**
 * Fetch MangaDex@Home delivery metadata for a chapter. The `baseUrl` is only
 * valid for ~15 minutes, so call this immediately before reading/downloading.
 */
export async function getChapterImages(
  chapterId: string,
): Promise<ChapterImages> {
  const res = await mdGetAtHome<AtHomeResponse>(chapterId);
  return {
    chapterId,
    baseUrl: res.baseUrl,
    hash: res.chapter.hash,
    data: res.chapter.data,
    dataSaver: res.chapter.dataSaver,
  };
}

/**
 * Build full page URLs from at-home metadata.
 * Pattern: {baseUrl}/{data|data-saver}/{hash}/{filename}
 */
export function buildPageUrls(
  images: ChapterImages,
  dataSaver = false,
): string[] {
  const quality = dataSaver ? "data-saver" : "data";
  const files = dataSaver ? images.dataSaver : images.data;
  return files.map(
    (file) => `${images.baseUrl}/${quality}/${images.hash}/${file}`,
  );
}
