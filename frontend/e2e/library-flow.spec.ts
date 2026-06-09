import { expect, test } from "@playwright/test";
import {
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  apiLogin,
  buildUniqueUsername,
  ensureDocumentExists,
} from "./support/app";

test("registered user can find document and add it to favorites", async ({
  page,
  request,
}) => {
  const title = "E2E Search Favorite Document";
  const adminToken = await apiLogin(request, ADMIN_USERNAME, ADMIN_PASSWORD);
  await ensureDocumentExists(request, adminToken, title);

  const userUsername = buildUniqueUsername("reader");
  const userPassword = "reader12345";

  await test.step("register user in UI", async () => {
    await page.goto("/register");
    await page.getByLabel("Имя (как к вам обращаться)").fill("E2E Reader");
    await page.getByLabel("Логин").fill(userUsername);
    await page.getByLabel("Пароль").fill(userPassword);
    await page.locator("form").first().locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/$/);
  });

  await test.step("find target document and add to favorites", async () => {
    await page.goto(`/search?q=${encodeURIComponent("E2E Search Favorite")}`);
    const documentCard = page.locator("article").filter({ hasText: title }).first();
    await expect(documentCard).toBeVisible();

    await documentCard.getByLabel("Добавить в избранное").click();
  });

  await test.step("verify item in favorites", async () => {
    await page.goto("/favorites");
    const favoriteCard = page.locator("article").filter({ hasText: title }).first();
    await expect(favoriteCard).toBeVisible();
  });

  await test.step("open item details page", async () => {
    await page.getByRole("link", { name: title }).first().click();
    await expect(page).toHaveURL(/\/documents\/\d+/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });
});
