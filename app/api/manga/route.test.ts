import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { server } from "@/test/msw/server";
import { listResponse, statsResponse } from "@/test/fixtures";
import { GET } from "./route";

describe("GET /api/manga", () => {
  it("excludes pornographic content by default and maps results", async () => {
    let capturedUrl = "";
    server.use(
      http.get("https://api.mangadex.org/manga", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(listResponse);
      }),
      http.get("https://api.mangadex.org/statistics/manga", () =>
        HttpResponse.json(statsResponse),
      ),
    );

    const req = new NextRequest("http://localhost/api/manga?q=test");
    const res = await GET(req);
    expect(res.status).toBe(200);

    // Default content-rating set must exclude pornographic.
    expect(capturedUrl).toContain("contentRating%5B%5D=safe");
    expect(capturedUrl).toContain("contentRating%5B%5D=suggestive");
    expect(capturedUrl).toContain("contentRating%5B%5D=erotica");
    expect(capturedUrl).not.toContain("pornographic");
    // Title search implies relevance ordering.
    expect(capturedUrl).toContain("order%5Brelevance%5D=desc");

    const body = await res.json();
    expect(body.items[0]).toMatchObject({ id: "manga-1", title: "Test Manga" });
    expect(body.total).toBe(1);
  });

  it("honors an explicit content-rating override", async () => {
    let capturedUrl = "";
    server.use(
      http.get("https://api.mangadex.org/manga", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(listResponse);
      }),
    );
    const req = new NextRequest(
      "http://localhost/api/manga?q=x&contentRating=safe",
    );
    await GET(req);
    expect(capturedUrl).toContain("contentRating%5B%5D=safe");
    expect(capturedUrl).not.toContain("suggestive");
  });
});
