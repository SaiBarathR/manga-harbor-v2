import { describe, expect, it } from "vitest";
import { buildSpreads, spreadIndexForPage } from "./reader-spreads";

describe("buildSpreads", () => {
  it("returns one page per spread for single mode", () => {
    expect(buildSpreads(3, "single", true)).toEqual([[0], [1], [2]]);
  });

  it("returns one page per spread for strip mode", () => {
    expect(buildSpreads(2, "strip", false)).toEqual([[0], [1]]);
  });

  it("pairs pages in double mode with a standalone cover", () => {
    expect(buildSpreads(5, "double", true)).toEqual([[0], [1, 2], [3, 4]]);
  });

  it("pairs from the first page when cover offset is off", () => {
    expect(buildSpreads(4, "double", false)).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it("leaves a trailing odd page on its own", () => {
    expect(buildSpreads(4, "double", true)).toEqual([[0], [1, 2], [3]]);
  });

  it("handles zero pages", () => {
    expect(buildSpreads(0, "single", true)).toEqual([]);
  });
});

describe("spreadIndexForPage", () => {
  const spreads = [[0], [1, 2], [3, 4]];

  it("finds the spread containing a page", () => {
    expect(spreadIndexForPage(spreads, 0)).toBe(0);
    expect(spreadIndexForPage(spreads, 2)).toBe(1);
    expect(spreadIndexForPage(spreads, 4)).toBe(2);
  });

  it("falls back to 0 for an unknown page", () => {
    expect(spreadIndexForPage(spreads, 99)).toBe(0);
  });
});
