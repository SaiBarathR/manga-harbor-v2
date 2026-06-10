import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { setupMocks } from "./fixtures";

test("downloads a chapter as an ordered CBZ", async ({ page }) => {
  await setupMocks(page);
  // Force the anchor-download fallback so Playwright can capture the file
  // (the File System Access API would otherwise open a native picker).
  await page.addInitScript(() => {
    // @ts-expect-error - removing the optional API
    delete window.showSaveFilePicker;
  });

  await page.goto("/manga/manga-1");
  // Volume 1 is expanded by default; download its first chapter.
  const downloadPromise = page.waitForEvent("download");
  await page.getByTitle("Download chapter").first().click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.cbz$/);

  const path = await download.path();
  const buf = readFileSync(path);
  // ZIP local-file header signature "PK".
  expect(buf[0]).toBe(0x50);
  expect(buf[1]).toBe(0x4b);

  const entries = Object.keys(unzipSync(new Uint8Array(buf))).sort();
  expect(entries).toEqual(["001.png", "002.png", "003.png"]);

  // The dock reflects completion.
  await expect(page.getByText(/saved/)).toBeVisible();
});
