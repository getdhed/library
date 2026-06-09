import { expect, test } from "@playwright/test";
import {
  createPdfUploadPayload,
  loginAsAdminViaApi,
} from "./support/app";

test("admin can create document and find it in catalog", async ({
  page,
  request,
}) => {
  await loginAsAdminViaApi(page, request);

  const title = `E2E Admin Upload ${Date.now()}`;
  const file = createPdfUploadPayload(title);

  await test.step("open create modal and fill required fields", async () => {
    await page.goto("/admin/documents");
    
    // Click Добавить новый
    await page.getByRole("button", { name: "Добавить новый" }).click();
    
    // Verify modal is open
    await expect(page.getByRole("heading", { name: "Создать документ" })).toBeVisible();

    await page.locator('input[type="file"][accept=".pdf,application/pdf"]').setInputFiles(file);

    await page.getByLabel("Название").fill(title);
    await page.getByPlaceholder("ФИО автора").fill("E2E Admin");
    await page.getByLabel("Год", { exact: true }).fill(String(new Date().getFullYear()));
    
    // Select Type
    await page.locator("#admin-create-type").click();
    await page.getByRole("option", { name: "Учебник" }).click();

    await page.getByLabel("Аннотация").fill("Создано через e2e тест.");
  });

  await test.step("submit form", async () => {
    await page.getByRole("button", { name: "Создать" }).first().click();
    
    // Verify modal closes
    await expect(page.getByRole("heading", { name: "Создать документ" })).not.toBeVisible();
  });

  await test.step("find created item in public catalog", async () => {
    await page.goto(`/search?q=${encodeURIComponent(title)}`);
    await expect(page.locator("article").filter({ hasText: title })).toBeVisible();
  });
});
