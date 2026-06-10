import { NextRequest, NextResponse } from "next/server";
import { fetchMangaList, type MangaListOptions } from "@/lib/mangadex/manga";
import { MangaDexError } from "@/lib/mangadex/client";
import {
  CONTENT_RATINGS,
  DEFAULT_CONTENT_RATINGS,
  type ContentRating,
} from "@/lib/mangadex/types";

export const dynamic = "force-dynamic";

const ORDERS: Record<string, Record<string, "asc" | "desc">> = {
  popular: { followedCount: "desc" },
  latest: { latestUploadedChapter: "desc" },
  rating: { rating: "desc" },
  relevance: { relevance: "desc" },
};

function csv(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const title = sp.get("q") ?? undefined;

  const ratingsParam = csv(sp.get("contentRating")) as
    | ContentRating[]
    | undefined;
  const contentRating = ratingsParam?.filter((r) =>
    CONTENT_RATINGS.includes(r),
  );

  const orderKey = sp.get("order") ?? (title ? "relevance" : "popular");

  const opts: MangaListOptions = {
    title,
    limit: Math.min(Number(sp.get("limit")) || 24, 100),
    offset: Number(sp.get("offset")) || 0,
    contentRating:
      contentRating && contentRating.length
        ? contentRating
        : DEFAULT_CONTENT_RATINGS,
    includedTags: csv(sp.get("includedTags")),
    excludedTags: csv(sp.get("excludedTags")),
    status: csv(sp.get("status")),
    order: ORDERS[orderKey] ?? ORDERS.popular,
  };

  try {
    const result = await fetchMangaList(opts);
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof MangaDexError ? err.status : 502;
    return NextResponse.json(
      { error: "Failed to fetch manga list" },
      { status: status === 429 ? 429 : 502 },
    );
  }
}
