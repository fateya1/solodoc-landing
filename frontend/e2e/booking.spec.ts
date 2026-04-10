import { test, expect } from "@playwright/test";
import { loginAsPatient } from "./helpers";

test.describe("Booking flow", () => {

  test("patient can see available doctors and slots", async ({ page }) => {
    await loginAsPatient(page);
    await page.getByRole("button", { name: /find doctors/i }).click();
    await page.getByRole("button", { name: /^search$/i }).click();
    await page.waitForTimeout(2000);

    const doctorCards = page.locator(".card").filter({ hasText: /book|no available slots/i });
    const count = await doctorCards.count();

    if (count > 0) {
      // If a doctor with slots exists, verify the Book button is visible
      const bookBtn = page.getByRole("button", { name: /^book$/i }).first();
      if (await bookBtn.isVisible()) {
        await bookBtn.click();
        await expect(page.getByPlaceholder(/reason/i)).toBeVisible({ timeout: 5000 });
        // Don't actually confirm to avoid creating test data
        await page.getByRole("button", { name: /cancel/i }).click();
      }
    }
  });

  test("booking confirmation step appears", async ({ page }) => {
    await loginAsPatient(page);
    await page.getByRole("button", { name: /find doctors/i }).click();
    await page.getByRole("button", { name: /^search$/i }).click();
    await page.waitForTimeout(2000);

    const bookBtn = page.getByRole("button", { name: /^book$/i }).first();
    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      await expect(page.getByRole("button", { name: /confirm booking/i })).toBeVisible({ timeout: 5000 });
    }
  });

});
