import { test, expect } from "@playwright/test";
import { setupMocks } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await setupMocks(page);
});

test("reader loads pages and paginates", async ({ page }) => {
  await page.goto("/read/ch-1");
  await expect(page.getByText("Page 1 / 3")).toBeVisible();

  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Page 2 / 3")).toBeVisible();

  await page.getByRole("button", { name: "Previous page" }).click();
  await expect(page.getByText("Page 1 / 3")).toBeVisible();
});

test("reader switches layout modes via settings", async ({ page }) => {
  await page.goto("/read/ch-1");
  await expect(page.getByText("Page 1 / 3")).toBeVisible();

  await page.getByTitle("Reader settings").click();
  await expect(
    page.getByRole("heading", { name: "Reader settings" }),
  ).toBeVisible();

  // Webtoon (continuous strip) shows a total-pages indicator.
  await page.getByRole("button", { name: "Webtoon" }).click();
  await expect(page.getByText("3 pages")).toBeVisible();

  // Direction control is hidden in webtoon, shown again in paged modes.
  await expect(page.getByRole("button", { name: "R → L" })).toHaveCount(0);
  await page.getByRole("button", { name: "Single" }).click();
  await expect(page.getByText("Page 1 / 3")).toBeVisible();
  await expect(page.getByRole("button", { name: "R → L" })).toBeVisible();
});

test("reader paginates by spread in double-page mode", async ({ page }) => {
  await page.goto("/read/ch-1");
  await expect(page.getByText("Page 1 / 3")).toBeVisible();

  await page.getByTitle("Reader settings").click();
  await page.getByRole("button", { name: "Double" }).click();
  await page.getByRole("button", { name: "Close settings" }).click();

  // Cover is alone, then pages 2 & 3 form one spread.
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Page 2 / 3")).toBeVisible();
});

test("reader keyboard shortcut flips reading direction", async ({ page }) => {
  await page.goto("/read/ch-1");
  await expect(page.getByText("Page 1 / 3")).toBeVisible();

  await page.keyboard.press("d");
  await page.getByTitle("Reader settings").click();
  // The RTL segment is now the active (primary) one.
  await expect(page.getByRole("button", { name: "R → L" })).toBeVisible();
});
