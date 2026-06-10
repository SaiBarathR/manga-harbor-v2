import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cover art is rendered via next/image directly from the MangaDex CDN.
    // Chapter pages are served through our own /api/image proxy (plain <img>),
    // so they don't need a remote pattern here.
    remotePatterns: [
      { protocol: "https", hostname: "uploads.mangadex.org" },
      { protocol: "https", hostname: "mangadex.org" },
    ],
  },
};

export default nextConfig;
