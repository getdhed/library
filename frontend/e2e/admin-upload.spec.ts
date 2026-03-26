import { expect, test } from "@playwright/test";
import {
  chooseMuiOptionByIndex,
  createPdfUploadPayload,
  loginAsAdminViaApi,
} from "./support/app";

test("admin can create document in upload tab and find it in catalog", async ({
  page,
  request,
}) => {
  await loginAsAdminViaApi(page, request);

  const title = `E2E Admin Upload ${Date.now()}`;
  const file = createPdfUploadPayload(title);

  await test.step("open upload tab and fill required fields", async () => {
    await page.goto("/admin/documents?tab=upload");
    await expect(page.getByRole("tab", { name: "Загрузка" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await page.getByLabel("Название *").fill(title);
    await page.getByLabel("Автор *").fill("E2E Admin");
    await page.getByLabel("Год *").fill(String(new Date().getFullYear()));
    await page.getByLabel("Тип *").fill("Учебник");
    await page.getByLabel("Описание *").fill("Создано через e2e тест.");

    await chooseMuiOptionByIndex(page, "Факультет", 1);
    await chooseMuiOptionByIndex(page, "Кафедра *", 1);
    await page.locator('input[type="file"][aria-label="PDF-файл *"]').setInputFiles(file);
  });

  await test.step("submit form and verify reset", async () => {
    await page.getByRole("button", { name: "Создать документ" }).click();
    await expect(page.getByLabel("Название *")).toHaveValue("");
  });

  await test.step("find created item in catalog", async () => {
    await page.getByRole("tab", { name: "Каталог" }).click();
    await page.getByPlaceholder("Поиск по названию").fill(title);
    await expect(page.getByText(title)).toBeVisible();
  });
});
