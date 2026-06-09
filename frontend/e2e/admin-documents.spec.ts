import { expect, test } from "@playwright/test";
import {
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  apiLogin,
  ensureDocumentExists,
  loginAsAdminViaApi,
} from "./support/app";

test("admin can edit and soft-delete a document", async ({ page, request }) => {
  const originalTitle = `E2E Document to Edit ${Date.now()}`;
  const editedTitle = `${originalTitle} (Edited)`;

  await test.step("ensure document exists via API", async () => {
    const adminToken = await apiLogin(request, ADMIN_USERNAME, ADMIN_PASSWORD);
    await ensureDocumentExists(request, adminToken, originalTitle);
  });

  await test.step("login and navigate to admin documents", async () => {
    await loginAsAdminViaApi(page, request);
    await page.goto("/admin/documents");
    
    // Search for our document
    await page.getByPlaceholder("Поиск по названию").fill(originalTitle);
    await expect(page.locator("table")).toContainText(originalTitle);
  });

  await test.step("edit document", async () => {
    // Click edit button (pencil icon)
    await page.getByRole("button", { name: "Редактировать" }).first().click();
    
    // Verify modal is open
    await expect(page.getByRole("heading", { name: "Редактировать документ" })).toBeVisible();
    
    // Change title
    await page.getByPlaceholder("Название документа").fill(editedTitle);
    await page.locator('form button[type="submit"]').click();
    
    // Verify toast or updated table
    await expect(page.locator("table")).toContainText(editedTitle);
  });

  await test.step("verify document in public catalog", async () => {
    await page.goto(`/search?q=${encodeURIComponent(editedTitle)}`);
    await expect(page.locator("article").filter({ hasText: editedTitle })).toBeVisible();
  });

  await test.step("soft-delete the document", async () => {
    await page.goto("/admin/documents");
    await page.getByPlaceholder("Поиск по названию").fill(editedTitle);
    await expect(page.locator("table")).toContainText(editedTitle);

    // Now delete it
    // Wait for prompt and accept
    page.once("dialog", (dialog) => dialog.accept());
    const row = page.locator("tr", { hasText: editedTitle });
    await row.getByRole("button", { name: "Удалить" }).click();
    
    // Verify toast or updated table to reflect the deletion
    await expect(page.locator("table")).not.toContainText(editedTitle);
  });

  await test.step("verify deleted document is gone from public catalog", async () => {
    await page.goto(`/search?q=${encodeURIComponent(editedTitle)}`);
    // Check that the exact deleted document link is NOT in the search results
    await expect(page.getByRole("link", { name: editedTitle, exact: true })).toHaveCount(0);
  });
});
