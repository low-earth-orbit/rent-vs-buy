import { test, expect } from "@playwright/test";

test("loads the calculator and renders the net worth chart", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Is it better to rent or buy?" }),
  ).toBeVisible();

  // The chart is rendered client-side after the Monte Carlo worker responds.
  await expect(
    page.getByRole("img", { name: /net worth projection chart/i }),
  ).toBeVisible();
});
