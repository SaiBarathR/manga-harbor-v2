import { NextResponse } from "next/server";
import { getTags } from "@/lib/mangadex/tags";

// Tags rarely change; allow Next to cache this GET for a day.
export const revalidate = 86400;

export async function GET() {
  try {
    const tags = await getTags();
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 502 });
  }
}
