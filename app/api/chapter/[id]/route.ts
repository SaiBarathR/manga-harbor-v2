import { NextResponse } from "next/server";
import { getChapter } from "@/lib/mangadex/chapter";
import { MangaDexError } from "@/lib/mangadex/client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const chapter = await getChapter(id);
    return NextResponse.json(chapter);
  } catch (err) {
    const status = err instanceof MangaDexError ? err.status : 502;
    return NextResponse.json(
      { error: "Failed to fetch chapter" },
      { status: status === 404 ? 404 : status === 429 ? 429 : 502 },
    );
  }
}
