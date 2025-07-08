import { test, expect } from "@playwright/test";

test.describe("Playwright Website Tests", () => {
  test("should have correct title", async ({ page }) => {
    await page.goto("https://playwright.dev/");

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Playwright/);
  });

  test("should have get started link", async ({ page }) => {
    await page.goto("https://playwright.dev/");

    // Click the get started link.
    await page.getByRole("link", { name: "Get started" }).click();

    // Expects the URL to contain intro.
    await expect(page).toHaveURL(/.*intro/);
  });

  test("should be able to search", async ({ page }) => {
    await page.goto("https://playwright.dev/");

    // Look for search functionality
    const searchButton = page.getByRole("button", { name: "Search" });
    if (await searchButton.isVisible()) {
      await searchButton.click();

      // Type in search
      await page.keyboard.type("testing");

      // Wait for search results
      await page.waitForTimeout(1000);

      // Verify we can see search results
      await expect(page).toHaveURL(/.*search/);
    }
  });

  test("should navigate to docs", async ({ page }) => {
    await page.goto("https://playwright.dev/");

    // Click on Docs link
    await page.getByRole("link", { name: "Docs" }).click();

    // Verify we're on the docs page
    await expect(page).toHaveURL(/.*docs/);

    // Verify the page loaded correctly
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should have responsive design", async ({ page }) => {
    await page.goto("https://playwright.dev/");

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    // Check that the page still loads correctly
    await expect(page.locator("body")).toBeVisible();

    // Check for mobile navigation if it exists
    const mobileNav = page.getByRole("button", { name: "Toggle navigation" });
    if (await mobileNav.isVisible()) {
      await mobileNav.click();
      await expect(page.locator("nav")).toBeVisible();
    }
  });
});
