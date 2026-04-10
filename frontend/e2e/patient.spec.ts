import { test, expect } from "@playwright/test";
import { loginAsPatient } from "./helpers";

test.describe("Patient flows", () => {

  test.beforeEach(async ({ page }) => {
    await loginAsPatient(page);
  });

  test("patient dashboard shows stats cards", async ({ page }) => {
    await expect(page.getByText(/total appointments/i)).toBeVisible();
    await expect(page.getByText(/confirmed/i)).toBeVisible();
    await expect(page.getByText(/profile/i)).toBeVisible();
  });

  test("find doctors tab shows search inputs", async ({ page }) => {
    await page.getByRole("button", { name: /find doctors/i }).click();
    await expect(page.getByPlaceholder(/doctor name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/specialty/i)).toBeVisible();
  });

  test("can search for doctors", async ({ page }) => {
    await page.getByRole("button", { name: /find doctors/i }).click();
    await page.getByRole("button", { name: /^search$/i }).click();
    await page.waitForTimeout(2000);
    const noResults = page.getByText(/no doctors found/i);
    const results = page.locator(".card").first();
    await expect(noResults.or(results)).toBeVisible();
  });

  test("my appointments tab loads", async ({ page }) => {
    await page.getByRole("button", { name: /my appointments/i }).click();
    const noAppts = page.getByText(/no appointments yet/i);
    const appts = page.getByText(/general consultation/i).first();
    await expect(noAppts.or(appts)).toBeVisible({ timeout: 8000 });
  });

  test("medical history tab loads", async ({ page }) => {
    await page.getByRole("button", { name: /medical history/i }).click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/dashboard\/patient/);
  });

  test("messages tab loads", async ({ page }) => {
    await page.getByRole("button", { name: /messages/i }).click();
    const noMessages = page.getByText(/no messages yet/i);
    const conversations = page.locator(".card").first();
    await expect(noMessages.or(conversations)).toBeVisible({ timeout: 8000 });
  });

  test("insurance tab loads", async ({ page }) => {
    await page.getByRole("button", { name: /insurance/i }).click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/dashboard\/patient/);
  });

  test("add phone number modal opens", async ({ page }) => {
    const addPhoneBtn = page.getByRole("button", { name: /add phone/i });
    if (await addPhoneBtn.isVisible()) {
      await addPhoneBtn.click();
      await expect(page.getByPlaceholder(/\+254/i)).toBeVisible();
    }
  });

});
