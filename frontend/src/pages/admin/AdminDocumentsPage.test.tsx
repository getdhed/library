import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../auth/AuthContext";
import AdminDocumentsPage from "./AdminDocumentsPage";

const approveSubmissionMock = vi.fn(() => Promise.resolve({ id: 1 }));
const createDocumentMock = vi.fn(() => Promise.resolve({ id: 1 }));
const deleteDocumentMock = vi.fn(() => Promise.resolve());
const getAdminDepartmentsMock = vi.fn(() =>
  Promise.resolve({
    items: [
      {
        id: 10,
        facultyId: 1,
        name: "Кафедра информационных систем",
        slug: "information-systems",
        faculty: "ФКТИ",
      },
    ],
  })
);
const getAdminDocumentsMock = vi.fn(() =>
  Promise.resolve({
    items: [
      {
        id: 5,
        title: "Документ каталога",
        author: "Иванов",
        year: 2026,
        type: "Методичка",
        description: "Описание документа",
        fileName: "catalog.pdf",
        fileSizeBytes: 1024,
        mimeType: "application/pdf",
        isVisible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        departmentId: 10,
        department: "Кафедра информационных систем",
        facultyId: 1,
        faculty: "ФКТИ",
        tags: ["tag"],
        isFavorite: false,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
  })
);
const getAdminFacultiesMock = vi.fn(() =>
  Promise.resolve({
    items: [{ id: 1, name: "ФКТИ", slug: "fkti" }],
  })
);
const getAdminSubmissionsMock = vi.fn(() =>
  Promise.resolve({
    items: [
      {
        id: 7,
        userId: 2,
        title: "Legacy Notes",
        author: "Иванов",
        departmentId: 10,
        department: "Кафедра информационных систем",
        facultyId: 1,
        faculty: "ФКТИ",
        source: "user_upload",
        status: "pending",
        fileName: "legacy.pdf",
        fileSizeBytes: 1024,
        mimeType: "application/pdf",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploaderName: "Студент",
        uploaderEmail: "student@example.com",
      },
      {
        id: 8,
        userId: 1,
        title: "Inbox Draft",
        source: "admin_import",
        status: "pending",
        fileName: "inbox.pdf",
        fileSizeBytes: 2048,
        mimeType: "application/pdf",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploaderName: "Системный импорт",
        uploaderEmail: "import@example.com",
      },
    ],
  })
);
const queueImportFolderSubmissionsMock = vi.fn(() =>
  Promise.resolve({
    queued: 2,
    errors: [{ fileName: "broken.pdf", error: "invalid pdf header" }],
  })
);
const rejectSubmissionMock = vi.fn(() => Promise.resolve({}));
const submissionFileUrlMock = vi.fn(
  (id: number) => `/api/submissions/${id}/file`
);
const updateDocumentMock = vi.fn(() => Promise.resolve({ id: 5 }));

vi.mock("../../api/library", () => ({
  approveSubmission: (...args: unknown[]) => approveSubmissionMock(...args),
  createDocument: (...args: unknown[]) => createDocumentMock(...args),
  deleteDocument: (...args: unknown[]) => deleteDocumentMock(...args),
  getAdminDepartments: (...args: unknown[]) => getAdminDepartmentsMock(...args),
  getAdminDocuments: (...args: unknown[]) => getAdminDocumentsMock(...args),
  getAdminFaculties: (...args: unknown[]) => getAdminFacultiesMock(...args),
  getAdminSubmissions: (...args: unknown[]) => getAdminSubmissionsMock(...args),
  queueImportFolderSubmissions: (...args: unknown[]) =>
    queueImportFolderSubmissionsMock(...args),
  rejectSubmission: (...args: unknown[]) => rejectSubmissionMock(...args),
  submissionFileUrl: (...args: unknown[]) => submissionFileUrlMock(...args),
  updateDocument: (...args: unknown[]) => updateDocumentMock(...args),
}));

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

function renderPage(route = "/admin/documents") {
  return render(
    <AuthContext.Provider
      value={{
        token: "token",
        user: {
          id: 1,
          fullName: "Admin",
          email: "admin@example.com",
          role: "admin",
          createdAt: new Date().toISOString(),
        },
        ready: true,
        login: async () => undefined,
        register: async () => undefined,
        logout: () => undefined,
      }}
    >
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            path="/admin/documents"
            element={
              <>
                <AdminDocumentsPage />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("AdminDocumentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("opens moderation by default without drawer and syncs tab to query params", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Очередь модерации", level: 2 })
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Заявка не выбрана")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/admin/documents?tab=moderation"
    );
  });

  it("switches tabs and closes an opened drawer", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Очередь модерации", level: 2 })
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Оформить" })[0]);
    expect(
      await screen.findByRole("dialog", { name: "Одобрить заявку" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Каталог" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Документы каталога", level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/admin/documents?tab=catalog"
    );
  });

  it("opens moderation drawer and does not submit approve without all required fields", async () => {
    renderPage();

    expect(await screen.findByText("Legacy Notes")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Оформить" })[0]);
    expect(
      await screen.findByRole("dialog", { name: "Одобрить заявку" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Одобрить заявку" }));

    expect(
      await screen.findByText(/Заполните обязательные поля: описание\./)
    ).toBeInTheDocument();
    expect(approveSubmissionMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Отменить" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens catalog drawer for edit and closes it after successful save", async () => {
    renderPage("/admin/documents?tab=catalog");

    expect(
      await screen.findByRole("heading", { name: "Документы каталога", level: 2 })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Редактировать" }));

    expect(
      await screen.findByRole("dialog", { name: "Редактировать документ" })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Описание *"), {
      target: { value: "Обновленное описание" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => {
      expect(updateDocumentMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("keeps manual admin create inside upload tab and requires a file", async () => {
    renderPage("/admin/documents?tab=upload");

    expect(
      await screen.findByRole("heading", { name: "Добавить документ вручную", level: 2 })
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Название *"), {
      target: { value: "Новая методичка" },
    });
    fireEvent.change(screen.getByLabelText("Автор *"), {
      target: { value: "Иванов" },
    });
    fireEvent.change(screen.getByLabelText("Год *"), {
      target: { value: "2026" },
    });
    fireEvent.change(screen.getByLabelText("Тип *"), {
      target: { value: "Методичка" },
    });
    fireEvent.change(screen.getByLabelText("Факультет"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Кафедра *"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Описание *"), {
      target: { value: "Описание документа" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Создать документ" }));

    expect(
      await screen.findByText(/Заполните обязательные поля: PDF-файл\./)
    ).toBeInTheDocument();
    expect(createDocumentMock).not.toHaveBeenCalled();

    const file = new File(["%PDF-1.4"], "manual.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(screen.getByLabelText("PDF-файл *"), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole("button", { name: "Создать документ" }));

    await waitFor(() => {
      expect(createDocumentMock).toHaveBeenCalledTimes(1);
    });
  });

  it("shows import queue controls only on upload tab", async () => {
    renderPage("/admin/documents?tab=upload");

    expect(
      await screen.findByRole("heading", { name: "Папка автоматического импорта", level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText(/backend\/storage\/import/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Проверить папку сейчас" })
    );

    await waitFor(() => {
      expect(queueImportFolderSubmissionsMock).toHaveBeenCalledWith("token");
    });

    expect(
      await screen.findByText("Добавлено в очередь: 2")
    ).toBeInTheDocument();
    expect(screen.getByText(/broken\.pdf: invalid pdf header/)).toBeInTheDocument();
  });
});
