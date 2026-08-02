import { test, expect } from "@playwright/test";
import { advanceToSubmit, startSurvey } from "./helpers";

/**
 * Duplicate handling: a second submit for the same client token returns
 * status 'duplicate' (HTTP 200, not an error). The UI must treat it as a
 * successful completion, never as a failure.
 */
test("duplicate submission is treated as a completed, not an error", async ({ page }) => {
  let submitCount = 0;
  await page.route("**/api/survey/submit", async (route) => {
    submitCount += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        status: "duplicate",
        reason: "Duplicate submit; one completion already exists",
        sessionId: "11111111-1111-1111-1111-111111111111",
      }),
    });
  });

  await startSurvey(page);
  await advanceToSubmit(page);
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByRole("heading", { name: "Thank you for sharing" })).toBeVisible();
  expect(submitCount).toBe(1);
});
