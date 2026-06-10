import { test, expect } from "@playwright/test";
import { setupMocks } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await setupMocks(page);
});

test("home shows discovery rails and manga cards", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Popular Now" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Test Manga/ }).first(),
  ).toBeVisible();
});

test("⌘K search finds a manga and navigates to its detail page", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Search manga/ }).click();
  await page.getByPlaceholder("Search for a manga…").fill("test");
  // Scope to the open command dialog so we don't match the cards behind it.
  await page.getByRole("dialog").getByText("Test Manga").click();
  await expect(page).toHaveURL(/\/manga\/manga-1/);
  await expect(
    page.getByRole("heading", { name: "Test Manga", level: 1 }),
  ).toBeVisible();
});
