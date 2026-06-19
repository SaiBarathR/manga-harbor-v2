import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { server } from "@/test/msw/server";
import { GET } from "./route";

describe("GET /api/image", () => {
  it("rejects a missing url", async () => {
    const res = await GET(new NextRequest("http://localhost/api/image"));
    expect(res.status).toBe(403);
  });

  it("rejects non-MangaDex hosts", async () => {
    const res = await GET(
      new NextRequest(
        "http://localhost/api/image?url=" +
          encodeURIComponent("https://evil.com/x.png"),
      ),
    );
    expect(res.status).toBe(403);
  });

  it("rejects cross-site embeds via a foreign Referer", async () => {
    const res = await GET(
      new NextRequest(
        "http://localhost/api/image?url=" +
          encodeURIComponent("https://cdn1.mangadex.network/data/h/1.png"),
        { headers: { referer: "https://evil.com/hotlink" } },
      ),
    );
    expect(res.status).toBe(403);
  });

  it("proxies an allowed host and sets cache headers", async () => {
    server.use(
      http.get("https://cdn1.mangadex.network/data/h/1.png", () =>
        HttpResponse.arrayBuffer(new Uint8Array([1, 2, 3]).buffer, {
          headers: { "Content-Type": "image/png", "Content-Length": "3" },
        }),
      ),
    );
    const res = await GET(
      new NextRequest(
        "http://localhost/api/image?url=" +
          encodeURIComponent("https://cdn1.mangadex.network/data/h/1.png"),
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("immutable");
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(buf)).toEqual([1, 2, 3]);
  });
});
