import { test, expect } from "@playwright/test";
import { advanceToSubmit, startSurvey } from "./helpers";

/**
 * Mobile journey: an anonymous respondent completes the whole survey on a
 * phone-sized viewport. All API interaction is mocked — no database needed.
 */
test("mobile anonymous journey completes", async ({ page }) => {
  await page.route("**/api/survey/submit", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        status: "completed",
        sessionId: "11111111-1111-1111-1111-111111111111",
        completionRef: "HYS-TEST-1",
        releaseHash: "test",
      }),
    });
  });

  await startSurvey(page);

  // Progress bar is part of the live form — assert it before submitting.
  const progress = page.getByRole("progressbar");
  await expect(progress).toHaveAttribute("aria-valuenow", /\d+/);
  await expect(progress).toHaveAttribute("aria-valuemax", /\d+/);

  await advanceToSubmit(page);
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByRole("heading", { name: "Thank you for sharing" })).toBeVisible();
  await expect(page.getByText("HYS-TEST-1")).toBeVisible();
});
