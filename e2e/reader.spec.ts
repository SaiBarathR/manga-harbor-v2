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
});
