import { describe, expect, it } from "vitest";
import { formatBytes, formatCount, pad, sanitizeFilename } from "./utils";

describe("formatBytes", () => {
  it("formats across units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("formatCount", () => {
  it("compacts large numbers", () => {
    expect(formatCount(null)).toBe("—");
    expect(formatCount(999)).toBe("999");
    expect(formatCount(12345)).toBe("12.3K");
    expect(formatCount(2_500_000)).toBe("2.5M");
  });
});

describe("sanitizeFilename", () => {
  it("removes path separators and reserved characters", () => {
    expect(sanitizeFilename('a/b\\c:d*e?"<>|')).not.toMatch(/[/\\:*?"<>|]/);
    expect(sanitizeFilename("  spaced   out  ")).toBe("spaced out");
    expect(sanitizeFilename("")).toBe("untitled");
  });
});

describe("pad", () => {
  it("zero-pads for lexical sorting and keeps decimals", () => {
    expect(pad(1)).toBe("0001");
    expect(pad("10")).toBe("0010");
    expect(pad("10.5")).toBe("0010.5");
  });
});
