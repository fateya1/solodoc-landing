import { test, expect } from "@playwright/test";
import { loginAsDoctor } from "./helpers";

test.describe("Doctor flows", () => {

  test.beforeEach(async ({ page }) => {
    await loginAsDoctor(page);
  });

  test("doctor dashboard shows stats cards", async ({ page }) => {
    await expect(page.getByText(/total appointments/i)).toBeVisible();
    await expect(page.getByText(/confirmed/i)).toBeVisible();
    await expect(page.getByText(/completed/i)).toBeVisible();
    await expect(page.getByText(/available slots/i)).toBeVisible();
  });

  test("doctor profile card is visible", async ({ page }) => {
    await expect(page.getByText(/general practice|specialist/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("appointments tab shows patient list", async ({ page }) => {
    await page.getByRole("button", { name: /appointments/i }).click();
    const noAppts = page.getByText(/no appointments yet/i);
    const appts = page.getByText(/patient appointments/i);
    await expect(noAppts.or(appts)).toBeVisible({ timeout: 8000 });
  });

  test("availability tab loads with add slot button", async ({ page }) => {
    await page.getByRole("button", { name: /availability/i }).click();
    await expect(page.getByRole("button", { name: /add slot/i })).toBeVisible({ timeout: 8000 });
  });

  test("add slot form opens", async ({ page }) => {
    await page.getByRole("button", { name: /availability/i }).click();
    await page.getByRole("button", { name: /add slot/i }).click();
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.locator('input[type="time"]')).toBeVisible();
  });

  test("analytics tab loads", async ({ page }) => {
    await page.getByRole("button", { name: /analytics/i }).click();
    await page.waitForTimeout(3000);
    const loading = page.locator(".animate-spin");
    const content = page.getByText(/this month|revenue/i).first();
    await expect(loading.or(content)).toBeVisible();
  });

  test("subscription tab loads", async ({ page }) => {
    await page.getByRole("button", { name: /subscription/i }).click();
    const noSub = page.getByText(/no active subscription/i);
    const sub = page.getByText(/plan|billing period/i).first();
    await expect(noSub.or(sub)).toBeVisible({ timeout: 8000 });
  });

  test("messages tab loads", async ({ page }) => {
    await page.getByRole("button", { name: /messages/i }).click();
    const noMessages = page.getByText(/no messages yet/i);
    const conversations = page.getByText(/patient messages/i);
    await expect(noMessages.or(conversations)).toBeVisible({ timeout: 8000 });
  });

  test("templates sub-tab is accessible", async ({ page }) => {
    await page.getByRole("button", { name: /availability/i }).click();
    await page.getByRole("button", { name: /templates/i }).click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/dashboard\/doctor/);
  });

});
