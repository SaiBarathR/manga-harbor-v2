import { NextRequest, NextResponse } from "next/server";
import { getAggregate } from "@/lib/mangadex/chapter";
import { MangaDexError } from "@/lib/mangadex/client";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const language = request.nextUrl.searchParams.get("lang") ?? "en";
  try {
    const volumes = await getAggregate(id, language);
    return NextResponse.json({ volumes });
  } catch (err) {
    const status = err instanceof MangaDexError ? err.status : 502;
    return NextResponse.json(
      { error: "Failed to fetch chapter list" },
      { status: status === 429 ? 429 : 502 },
    );
  }
}
