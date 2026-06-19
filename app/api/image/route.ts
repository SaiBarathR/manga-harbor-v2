import { NextRequest } from "next/server";
import {
  isAllowedImageUrl,
  reportImage,
} from "@/lib/mangadex/image-proxy";

export const dynamic = "force-dynamic";
// Streaming proxy can outlast the platform default on slow @Home nodes; give it
// headroom (Vercel Hobby allows up to 60s). Single images normally finish in <2s.
export const maxDuration = 30;

const USER_AGENT =
  process.env.MANGADEX_USER_AGENT ??
  "MangaHarbor/1.0 (+https://github.com/manga-harbor; self-hosted reader)";

/**
 * Streaming image proxy. Used both to display chapter pages/covers and to fetch
 * image bytes for the client-side CBZ (browsers can't set the mandatory
 * User-Agent, so the proxy adds it). Pipes the upstream body straight through —
 * no buffering to disk or memory.
 */
export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");
  if (!target || !isAllowedImageUrl(target)) {
    return new Response("Forbidden image host", { status: 403 });
  }

  const start = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
  } catch {
    reportImage({
      url: target,
      success: false,
      bytes: 0,
      durationMs: Date.now() - start,
      cached: false,
    });
    return new Response("Upstream fetch failed", { status: 502 });
  }

  const bytes = Number(upstream.headers.get("content-length")) || 0;
  reportImage({
    url: target,
    success: upstream.ok,
    bytes,
    durationMs: Date.now() - start,
    cached: upstream.headers.get("x-cache")?.toUpperCase().includes("HIT") ?? false,
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream error", { status: 502 });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") ?? "image/jpeg",
  );
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  // Page images are immutable per chapter hash — cache aggressively.
  headers.set("Cache-Control", "public, max-age=86400, immutable");

  return new Response(upstream.body, { status: 200, headers });
}
