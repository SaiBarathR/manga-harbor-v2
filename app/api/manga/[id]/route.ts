import { NextResponse } from "next/server";
import { getMangaById } from "@/lib/mangadex/manga";
import { MangaDexError } from "@/lib/mangadex/client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const manga = await getMangaById(id);
    return NextResponse.json(manga);
  } catch (err) {
    const status = err instanceof MangaDexError ? err.status : 502;
    return NextResponse.json(
      { error: "Failed to fetch manga" },
      { status: status === 404 ? 404 : status === 429 ? 429 : 502 },
    );
  }
}
