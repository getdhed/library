import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
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
        uploaderName: "Администратор",
        uploaderEmail: "admin@example.com",
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
const updateDocumentMock = vi.fn(() => Promise.resolve({ id: 1 }));

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

function renderPage() {
  return render(
    <AuthContext.Provider
      value={{
        token: "token",
        user: { id: 1, fullName: "Admin", email: "admin@example.com", role: "admin", createdAt: new Date().toISOString() },
        ready: true,
        login: async () => undefined,
        register: async () => undefined,
        logout: () => undefined,
      }}
    >
      <MemoryRouter>
        <AdminDocumentsPage />
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

  it("does not submit approve without all required catalog fields", async () => {
    renderPage();

    expect(await screen.findByText("Legacy Notes")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Принять" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Одобрить заявку" }));

    expect(
      await screen.findByText(/Заполните обязательные поля: описание\./)
    ).toBeInTheDocument();
    expect(approveSubmissionMock).not.toHaveBeenCalled();
  });

  it("shows import sources and queues pdfs from folder into moderation", async () => {
    renderPage();

    expect(await screen.findByText("Inbox Draft")).toBeInTheDocument();

    expect(screen.getAllByText("Import-папка").length).toBeGreaterThan(0);
    expect(
      screen.queryByPlaceholderText("Автор по умолчанию")
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Забрать PDF из папки в очередь" })
    );

    await waitFor(() => {
      expect(queueImportFolderSubmissionsMock).toHaveBeenCalledWith("token");
    });

    expect(
      await screen.findByText("Добавлено в очередь: 2")
    ).toBeInTheDocument();
    expect(screen.getByText(/broken\.pdf: invalid pdf header/)).toBeInTheDocument();
  });

  it("keeps manual admin create as direct document creation and requires a file", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Добавить документ", level: 2 })
    ).toBeInTheDocument();

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

    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));

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

    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));

    await waitFor(() => {
      expect(createDocumentMock).toHaveBeenCalledTimes(1);
    });
  });
});
