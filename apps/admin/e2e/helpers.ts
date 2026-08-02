import type { Page } from "@playwright/test";

/**
 * Shared survey-journey helpers. The /survey page renders a static intro
 * header above the client-side questions; the first question (A01) is
 * already visible. Radio-name matching must use exact:true because
 * "No" is a substring of "Prefer not to say".
 */

/** Answer the A01 adult gate and A02 safety gate with "Yes". */
export async function startSurvey(page: Page): Promise<void> {
  await page.goto("/survey");
  await page.getByRole("radio", { name: "Yes", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: "Yes", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();
}

/**
 * Click Next through every remaining question. All questions after A02 are
 * skippable EXCEPT H01 (the follow-up gate, required). When H01 appears,
 * answer "No, I just wanted to share" so native form validation does not
 * block navigation. Stops when the Submit button is visible.
 */
export async function advanceToSubmit(page: Page): Promise<void> {
  for (let i = 0; i < 45; i++) {
    const submit = page.getByRole("button", { name: "Submit" });
    if (await submit.isVisible().catch(() => false)) return;

    const h01 = page.getByText(/Would you like IRAAC to follow up/);
    if (await h01.isVisible().catch(() => false)) {
      await page
        .getByRole("radio", { name: "No, I just wanted to share", exact: true })
        .click();
    }

    const next = page.getByRole("button", { name: "Next" });
    if (!(await next.isVisible().catch(() => false))) return;
    await next.click();
  }
}
