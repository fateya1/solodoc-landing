import { test, expect } from "@playwright/test";
import { loginAsPatient, loginAsDoctor, TEST_PATIENT, TEST_DOCTOR } from "./helpers";

test.describe("Auth flows", () => {

  test("login page loads", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test("wrong password shows error", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder(/email/i).fill(TEST_PATIENT.email);
    await page.getByPlaceholder(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong|failed/i)).toBeVisible({ timeout: 8000 });
  });

  test("patient login redirects to patient dashboard", async ({ page }) => {
    await loginAsPatient(page);
    await expect(page).toHaveURL(/dashboard\/patient/);
  });

  test("doctor login redirects to doctor dashboard", async ({ page }) => {
    await loginAsDoctor(page);
    await expect(page).toHaveURL(/dashboard\/doctor/);
  });

  test("patient logout redirects to login", async ({ page }) => {
    await loginAsPatient(page);
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/auth\/login/);
  });

  test("unauthenticated access to patient dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard/patient");
    await expect(page).toHaveURL(/auth\/login/);
  });

  test("unauthenticated access to doctor dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard/doctor");
    await expect(page).toHaveURL(/auth\/login/);
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.getByPlaceholder(/full name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test("forgot password page loads", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

});
