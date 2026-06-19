import type { NextConfig } from "next";

// All MangaDex images (covers and chapter pages) are served through our own
// /api/image proxy via plain <img>, never next/image — so no remotePatterns
// are needed here. The proxy sets the mandatory MangaDex User-Agent, which the
// browser can't.
const nextConfig: NextConfig = {};

export default nextConfig;
