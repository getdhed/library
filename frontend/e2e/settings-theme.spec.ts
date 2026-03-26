import { expect, test } from "@playwright/test";
import { loginAsAdminViaApi } from "./support/app";

test("theme switch updates localStorage and persists after reload", async ({
  page,
  request,
}) => {
  await loginAsAdminViaApi(page, request);
  await page.goto("/settings");

  await test.step("switch to dark theme", async () => {
    await page.getByRole("button", { name: "Тёмная тема" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  await test.step("verify storage value and persistence", async () => {
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem("library-theme")))
      .toBe("dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
