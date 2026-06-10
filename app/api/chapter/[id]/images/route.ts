import { NextResponse } from "next/server";
import { buildPageUrls, getChapterImages } from "@/lib/mangadex/images";
import { MangaDexError } from "@/lib/mangadex/client";

export const dynamic = "force-dynamic";

/**
 * Returns freshly-built page URLs for a chapter. These point at the @Home CDN
 * and expire (~15 min), so clients must call this right before reading or
 * downloading — never cache the result long-term.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const images = await getChapterImages(id);
    return NextResponse.json({
      chapterId: id,
      pages: buildPageUrls(images, false),
      pagesDataSaver: buildPageUrls(images, true),
    });
  } catch (err) {
    const status = err instanceof MangaDexError ? err.status : 502;
    return NextResponse.json(
      { error: "Failed to fetch chapter images" },
      { status: status === 429 ? 429 : 502 },
    );
  }
}
