import { test, expect } from "@playwright/test";

/**
 * Required-question blocking: A01 (adult gate) is a required single choice.
 * Native form validation must stop navigation until it is answered.
 */
test("required question blocks Next until answered", async ({ page }) => {
  await page.goto("/survey");

  const a01 = page.getByText(/Are you 18 years or older/);
  await expect(a01).toBeVisible();

  // Click Next without answering — the browser blocks the submit.
  await page.getByRole("button", { name: "Next" }).click();
  await expect(a01).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeVisible();

  // Answer A01 and A02, then navigation is allowed.
  await page.getByRole("radio", { name: "Yes", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: "Yes", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByText(/How are you completing this survey today/)).toBeVisible();
});
