import { expect, test } from "@playwright/test";
import {
  buildUniqueUsername,
  createPdfUploadPayload,
  loginAsAdminViaApi,
} from "./support/app";

test("user can submit a document and admin can approve it", async ({
  page,
  request,
}) => {
  const userUsername = buildUniqueUsername("submitter");
  const userPassword = "password123";
  const docTitle = `E2E Submission ${Date.now()}`;
  const file = createPdfUploadPayload(docTitle);

  await test.step("register a new user", async () => {
    await page.goto("/register");
    await page.getByLabel("Имя (как к вам обращаться)").fill("E2E Submitter");
    await page.getByLabel("Логин").fill(userUsername);
    await page.getByLabel("Пароль").fill(userPassword);
    await page.locator("form").first().locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/$/);
  });

  await test.step("submit a document", async () => {
    await page.goto("/submit");
    // Upload file
    await page.locator('input[type="file"][accept=".pdf,application/pdf"]').setInputFiles(file);

    // After uploading the file, the rest of the form appears
    await expect(page.getByLabel("Название")).toHaveValue(docTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")); // it gets auto-filled
    await page.getByLabel("Название").fill(docTitle);
    await page.getByPlaceholder("ФИО автора").fill("E2E Submitter");
    await page.getByLabel("Год").fill(String(new Date().getFullYear()));
    
    // Select Type
    await page.getByLabel("Тип документа").click();
    await page.getByRole("option", { name: "Учебник" }).click();

    await page.getByLabel("Аннотация").fill("This is an E2E submission test.");
    await page.getByLabel("Комментарий для модератора").fill("Please review ASAP.");

    await page.getByRole("button", { name: "Отправить на проверку" }).click();
    await expect(page).toHaveURL(/\/account\/pdfs/);
    
    // Verify it's in the list
    await expect(page.getByText(docTitle)).toBeVisible();
    await expect(page.getByText("В обработке").first()).toBeVisible();
  });

  await test.step("admin approves the document", async () => {
    // Login as admin via API
    await loginAsAdminViaApi(page, request);
    
    // Go to admin submissions
    await page.goto("/admin/moderation");
    
    // Find our submission
    const submissionCard = page.locator("tr").filter({ hasText: docTitle }).first();
    await expect(submissionCard).toBeVisible();
    
    // Click review
    await submissionCard.getByRole("button", { name: "Рассмотреть" }).click();
    await expect(page.getByRole("heading", { name: "Одобрить заявку" })).toBeVisible();
    
    // Approve it
    await page.locator('form button[type="submit"]').click();
    
    // Wait for redirect back
    await expect(page).toHaveURL(/\/admin\/moderation/);
    await expect(page.locator("tr").filter({ hasText: docTitle })).not.toBeVisible();
  });

  await test.step("verify document is in the catalog", async () => {
    await page.goto(`/search?q=${encodeURIComponent(docTitle)}`);
    await expect(page.locator("article").filter({ hasText: docTitle })).toBeVisible();
  });
});
