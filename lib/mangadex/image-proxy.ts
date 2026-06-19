/**
 * Host allowlist for the image proxy. We only ever proxy MangaDex-owned image
 * hosts: the cover/upload CDN and the MangaDex@Home delivery nodes. Anything
 * else is rejected to prevent the proxy becoming an open SSRF relay.
 */
export function isAllowedImageUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return (
    host === "uploads.mangadex.org" ||
    host === "mangadex.org" ||
    host.endsWith(".mangadex.network")
  );
}

/**
 * Anti-hotlinking guard. The proxy exists to serve *this app's own* pages, not
 * to be embedded by arbitrary third-party sites as a free MangaDex image relay
 * (MangaDex asks consumers to proxy their *own* users' requests). We compare the
 * request's Origin — or its Referer when Origin is absent — against the host the
 * request was made to. Requests carrying neither header are allowed: browsers
 * strip the Referer under strict referrer policies, and rejecting those would
 * break legitimate same-origin loads. A present-but-mismatched origin is the
 * cross-site embed we want to block.
 */
export function isAllowedReferrer(
  selfHost: string,
  origin: string | null,
  referer: string | null,
): boolean {
  const source = origin ?? referer;
  if (!source) return true;
  try {
    return new URL(source).host === selfHost;
  } catch {
    return false;
  }
}

/**
 * Images served from MangaDex@Home nodes (non-mangadex.org hosts) must be
 * reported back for network-health tracking. mangadex.org-owned hosts are
 * exempt.
 */
export function shouldReport(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return host.endsWith(".mangadex.network");
  } catch {
    return false;
  }
}

interface ReportInput {
  url: string;
  success: boolean;
  bytes: number;
  durationMs: number;
  cached: boolean;
}

/** Fire-and-forget the required MangaDex@Home delivery report. */
export function reportImage(input: ReportInput): void {
  if (!shouldReport(input.url)) return;
  void fetch("https://api.mangadex.network/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: input.url,
      success: input.success,
      bytes: input.bytes,
      duration: input.durationMs,
      cached: input.cached,
    }),
  }).catch(() => {
    // Reporting is best-effort; never let it break image delivery.
  });
}
