import { Page } from "@playwright/test";

export const TEST_PATIENT = {
  email: "e2e.patient@solodoc.test",
  password: "E2eTest@1234",
  name: "Test Patient",
};

export const TEST_DOCTOR = {
  email: "e2e.doctor@solodoc.test",
  password: "E2eTest@1234",
  name: "Test Doctor",
};

export async function loginAsPatient(page: Page) {
  await page.goto("/auth/login");
  await page.getByPlaceholder(/email/i).fill(TEST_PATIENT.email);
  await page.getByPlaceholder(/password/i).fill(TEST_PATIENT.password);
  await page.getByRole("button", { name: /sign in|login/i }).click();
  await page.waitForURL("**/dashboard/patient");
}

export async function loginAsDoctor(page: Page) {
  await page.goto("/auth/login");
  await page.getByPlaceholder(/email/i).fill(TEST_DOCTOR.email);
  await page.getByPlaceholder(/password/i).fill(TEST_DOCTOR.password);
  await page.getByRole("button", { name: /sign in|login/i }).click();
  await page.waitForURL("**/dashboard/doctor");
}
