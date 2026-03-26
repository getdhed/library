import { expect, type APIRequestContext, type Page } from "@playwright/test";

const TOKEN_STORAGE_KEY = "library-token";

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@library.local";
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin12345";
export const E2E_API_URL = process.env.E2E_API_URL ?? "http://localhost:8080/api";

type AuthPayload = {
  token: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    role: "user" | "admin";
  };
};

type Department = {
  id: number;
  facultyId: number;
  name: string;
  slug: string;
};

type PagedDocuments = {
  items: Array<{ id: number; title: string }>;
};

export function buildUniqueEmail(prefix: string) {
  const value = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  return `${prefix}-${value}@e2e.local`;
}

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.locator("form").first().locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);
}

export async function loginAsAdmin(page: Page) {
  await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

export async function loginViaApiAndStoreSession(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string
) {
  const token = await apiLogin(request, email, password);
  await page.addInitScript(
    ([storageKey, storageValue]) => {
      window.localStorage.setItem(storageKey, storageValue);
    },
    [TOKEN_STORAGE_KEY, token]
  );
  return token;
}

export async function loginAsAdminViaApi(
  page: Page,
  request: APIRequestContext
) {
  return loginViaApiAndStoreSession(page, request, ADMIN_EMAIL, ADMIN_PASSWORD);
}

export async function openAccountMenu(page: Page) {
  const trigger = page.locator('[aria-label="Открыть меню аккаунта"]:visible').first();
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole("menu", { name: "Меню аккаунта" })).toBeVisible();
}

export async function chooseMuiOptionByIndex(
  page: Page,
  label: string,
  optionIndex: number
) {
  await page.getByLabel(label).click();
  const listbox = page.getByRole("listbox").last();
  const options = listbox.getByRole("option");
  const count = await options.count();
  expect(
    count,
    `not enough options in select "${label}", expected index ${optionIndex}`
  ).toBeGreaterThan(optionIndex);
  await options.nth(optionIndex).click();
}

export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string
) {
  const response = await request.post(`${E2E_API_URL}/auth/login`, {
    data: { email, password },
  });
  expect(response.ok(), `login failed with status ${response.status()}`).toBeTruthy();
  const payload = (await response.json()) as AuthPayload;
  return payload.token;
}

function createMinimalPdfBuffer(text: string) {
  const safeText = text.replace(/[()\\]/g, "");
  const content = `BT /F1 18 Tf 72 720 Td (${safeText}) Tj ET`;
  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
    `4 0 obj\n<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "utf8");
}

export function createPdfUploadPayload(title: string) {
  return {
    name: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
    mimeType: "application/pdf",
    buffer: createMinimalPdfBuffer(title),
  };
}

export async function ensureDocumentExists(
  request: APIRequestContext,
  token: string,
  title: string
) {
  const headers = { Authorization: `Bearer ${token}` };
  const existing = await request.get(
    `${E2E_API_URL}/admin/documents?q=${encodeURIComponent(title)}&page=1&pageSize=10`,
    { headers }
  );
  expect(existing.ok(), `list documents failed with status ${existing.status()}`).toBeTruthy();
  const existingPayload = (await existing.json()) as PagedDocuments;
  const existingItem = existingPayload.items.find((item) => item.title === title);
  if (existingItem) {
    return existingItem.id;
  }

  const departmentsResponse = await request.get(`${E2E_API_URL}/admin/departments`, {
    headers,
  });
  expect(
    departmentsResponse.ok(),
    `list departments failed with status ${departmentsResponse.status()}`
  ).toBeTruthy();
  const departmentsPayload = (await departmentsResponse.json()) as {
    items: Department[];
  };
  expect(
    departmentsPayload.items.length,
    "no departments available for e2e setup"
  ).toBeGreaterThan(0);

  const departmentId = departmentsPayload.items[0].id;

  const createResponse = await request.post(`${E2E_API_URL}/admin/documents`, {
    headers,
    multipart: {
      title,
      author: "E2E Bot",
      year: String(new Date().getFullYear()),
      type: "Учебник",
      description: "Автоматически создано e2e тестом.",
      departmentId: String(departmentId),
      tags: "e2e,playwright",
      isVisible: "true",
      file: createPdfUploadPayload(title),
    },
  });

  expect(
    createResponse.ok(),
    `create document failed with status ${createResponse.status()}`
  ).toBeTruthy();

  const created = (await createResponse.json()) as { id: number };
  return created.id;
}
