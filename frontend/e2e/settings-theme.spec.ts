import { expect, test } from "@playwright/test";
import { loginAsAdminViaApi } from "./support/app";

test("settings page loads and displays correct information", async ({
  page,
  request,
}) => {
  await loginAsAdminViaApi(page, request);
  await page.goto("/settings");

  await test.step("verify settings page opens", async () => {
    await expect(page.getByRole("heading", { name: "Настройки" })).toBeVisible();
    await expect(page.getByText("Оформление")).toBeVisible();
  });
});
