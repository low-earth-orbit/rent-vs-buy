import { test, expect } from "@playwright/test";

test("hub landing page lists the available tools", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Personal Finance Tools" }),
  ).toBeVisible();

  // The rent-vs-buy tool is linked from the hub.
  await expect(page.getByRole("link", { name: /rent vs buy/i })).toBeVisible();
});

test("loads the calculator and renders the net worth chart", async ({
  page,
}) => {
  await page.goto("/rent-vs-buy");

  // A disclaimer modal opens on first visit; dismiss it before continuing.
  await page.getByRole("button", { name: "I understand" }).click();

  await expect(
    page.getByRole("heading", { name: "Is it better to rent or buy?" }),
  ).toBeVisible();

  // The chart is rendered client-side after the Monte Carlo worker responds.
  await expect(
    page.getByRole("img", { name: /net worth projection chart/i }),
  ).toBeVisible();
});
