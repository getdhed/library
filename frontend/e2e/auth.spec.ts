import { expect, test } from "@playwright/test";
import { loginAsAdmin, openAccountMenu } from "./support/app";

test("admin can login and logout from account menu", async ({ page }) => {
  await test.step("login via UI", async () => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("main")).toBeVisible();
  });

  await test.step("logout from account menu", async () => {
    await openAccountMenu(page);
    await page.getByRole("button", { name: "Выйти" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("form")).toBeVisible();
  });
});
