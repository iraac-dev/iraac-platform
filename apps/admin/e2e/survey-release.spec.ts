import { test, expect } from "@playwright/test";
import { advanceToSubmit, startSurvey } from "./helpers";

/**
 * Draft/inactive release behaviour: when the survey release is not active,
 * the API returns 503 with 'Survey is not accepting responses right now'.
 * The client must surface that message to the respondent in a [role=alert],
 * not crash and not show a false success.
 */
test("draft release surfaces the not-accepting-responses alert", async ({ page }) => {
  await page.route("**/api/survey/submit", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        status: "unavailable",
        reason: "Survey is not accepting responses right now",
      }),
    });
  });

  await startSurvey(page);
  await advanceToSubmit(page);
  await page.getByRole("button", { name: "Submit" }).click();

  const alert = page.getByRole("alert").filter({ hasText: "Survey is not accepting responses right now" });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Survey is not accepting responses right now");
});
