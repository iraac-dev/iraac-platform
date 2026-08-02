import { test, expect } from "@playwright/test";

/**
 * Terminal pathways: A01 No / A02 person / A02 immediate help all stop the
 * questionnaire immediately and show the human help screen (the stop renders
 * on the same screen — there is no Next button to click afterwards).
 * A02 skip-personal hides the personal section (B04) while keeping the
 * non-personal questions (B01).
 */
test.describe("survey terminal stops", () => {
  test("A01 No shows the stop screen", async ({ page }) => {
    await page.goto("/survey");
    await page.getByRole("radio", { name: "No", exact: true }).click();

    await expect(page.getByRole("heading", { name: "We have stopped the questions" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Call 13YARN/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Contact IRAAC" })).toBeVisible();
  });

  test("A02 person pathway shows the stop screen", async ({ page }) => {
    await page.goto("/survey");
    await page.getByRole("radio", { name: "Yes", exact: true }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("radio", { name: "I would rather speak with a person", exact: true }).click();

    await expect(page.getByRole("heading", { name: "We have stopped the questions" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Call 13YARN/ })).toBeVisible();
  });

  test("A02 immediate help shows the stop screen", async ({ page }) => {
    await page.goto("/survey");
    await page.getByRole("radio", { name: "Yes", exact: true }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("radio", { name: "I need immediate help", exact: true }).click();

    await expect(page.getByRole("heading", { name: "We have stopped the questions" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Call 13YARN/ })).toBeVisible();
  });

  test("A02 skip personal questions hides B04 but keeps B01", async ({ page }) => {
    await page.goto("/survey");
    await page.getByRole("radio", { name: "Yes", exact: true }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("radio", { name: "I would like to skip personal questions", exact: true }).click();
    await page.getByRole("button", { name: "Next" }).click();

    // A03/A04 are next; B01 (non-personal) follows them.
    for (let i = 0; i < 4; i++) {
      const b01 = page.getByText(/What suburb, town or community do you live in/);
      if (await b01.isVisible().catch(() => false)) break;
      const next = page.getByRole("button", { name: "Next" });
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click();
    }
    await expect(page.getByText(/What suburb, town or community do you live in/)).toBeVisible();

    // Advance a few steps to prove B04 never appears.
    for (let i = 0; i < 4; i++) {
      await expect(page.getByText(/How do you describe your gender/)).toHaveCount(0);
      const next = page.getByRole("button", { name: "Next" });
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click();
    }
    await expect(page.getByText(/How do you describe your gender/)).toHaveCount(0);
  });
});
