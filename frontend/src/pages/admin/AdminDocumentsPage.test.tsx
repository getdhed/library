import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../auth/AuthContext";
import AdminDocumentsPage from "./AdminDocumentsPage";

const mocks = vi.hoisted(() => ({
  approveSubmissionMock: vi.fn(() => Promise.resolve({ id: 1 })),
  createDocumentMock: vi.fn(() => Promise.resolve({ id: 1 })),
  deleteDocumentMock: vi.fn(() => Promise.resolve()),
  getAdminDocumentsMock: vi.fn(() =>
    Promise.resolve({
      items: [
        {
          id: 5,
          title: "Документ каталога",
          titleTranslations: { English: "Catalog document" },
          author: "Иванов",
          year: 2026,
          type: "Методичка",
          description: "Описание документа",
          fileName: "catalog.pdf",
          fileSizeBytes: 1024,
          mimeType: "application/pdf",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ["tag"],
          isFavorite: false,
          isLocal: false,
          viewsCount: 0,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    })
  ),
  getAdminDocumentAuditMock: vi.fn(() => Promise.resolve({ items: [] })),
  getAdminSubmissionsMock: vi.fn(() =>
    Promise.resolve({
      items: [
        {
          id: 7,
          userId: 2,
          title: "Legacy Notes",
          author: "Иванов",
          source: "user_upload",
          status: "pending",
          fileName: "legacy.pdf",
          fileSizeBytes: 1024,
          mimeType: "application/pdf",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          uploaderName: "Студент",
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
        },
      ],
    })
  ),
  rejectSubmissionMock: vi.fn(() => Promise.resolve({})),
  submissionFileUrlMock: vi.fn((id: number) => `/api/submissions/${id}/file`),
  getDocumentTypesMock: vi.fn(() =>
    Promise.resolve({ items: ["Учебник", "Методичка", "Другое"] })
  ),
  getLanguagesMock: vi.fn(() => Promise.resolve({ items: [] })),
  updateDocumentMock: vi.fn((_token: string, _id: number, _formData: FormData) =>
    Promise.resolve({ id: 5 })
  ),
  documentFileUrlMock: vi.fn((id: number) => `/api/documents/${id}/file`),
  documentCoverUrlMock: vi.fn((id: number) => `/api/documents/${id}/cover`),
  getAdminStatsMock: vi.fn(() => Promise.resolve({ documentsCount: 0 })),
}));

vi.mock("../../api/library", () => ({
  approveSubmission: mocks.approveSubmissionMock,
  createDocument: mocks.createDocumentMock,
  deleteDocument: mocks.deleteDocumentMock,
  getAdminDocumentAudit: mocks.getAdminDocumentAuditMock,
  getAdminDocuments: mocks.getAdminDocumentsMock,
  getAdminSubmissions: mocks.getAdminSubmissionsMock,
  getDocumentTypes: mocks.getDocumentTypesMock,
  getLanguages: mocks.getLanguagesMock,
  rejectSubmission: mocks.rejectSubmissionMock,
  submissionFileUrl: mocks.submissionFileUrlMock,
  documentFileUrl: mocks.documentFileUrlMock,
  documentCoverUrl: mocks.documentCoverUrlMock,
  updateDocument: mocks.updateDocumentMock,
  getAdminStats: mocks.getAdminStatsMock,
}));

// Export mocks for tests to use
const {
  approveSubmissionMock,
  createDocumentMock,
  updateDocumentMock,
  getAdminDocumentsMock,
} = mocks;

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
          fullName: "Admin", username: "mockuser",
          
          role: "admin",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          <Route path="/submissions/:id/read" element={<div>Reader page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

async function selectMuiOption(combobox: HTMLElement, optionIndex: number) {
  fireEvent.mouseDown(combobox);
  const listbox = await screen.findByRole("listbox");
  const options = within(listbox).getAllByRole("option");
  fireEvent.click(options[optionIndex]);
}

describe("AdminDocumentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders catalog by default", async () => {
    renderPage();
    expect(await screen.findByText("Панель администратора")).toBeInTheDocument();
  });

  it("opens catalog drawer and saves edited document", async () => {
    renderPage("/admin/documents");

    await screen.findByRole("button", { name: "Редактировать" });
    fireEvent.click(screen.getByRole("button", { name: "Редактировать" }));
    expect(await screen.findByText("Редактировать документ")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Аннотация"), {
      target: { value: "Обновленное описание" },
    });
    const saveButtons = await screen.findAllByRole("button", { name: /Сохранить изменения/i });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(updateDocumentMock).toHaveBeenCalledTimes(1);
    });
    const submittedForm = updateDocumentMock.mock.calls[0][2];
    expect(submittedForm.get("titleTranslations")).toBe(
      JSON.stringify({ English: "Catalog document" })
    );
    expect(submittedForm.get("isLocal")).toBe("false");
    await waitFor(() => {
      expect(screen.queryByText("Редактировать документ")).not.toBeInTheDocument();
    });
  });

  it("passes advanced catalog filters to admin documents request", async () => {
    renderPage("/admin/documents");

    await screen.findByText("Документ каталога");
    fireEvent.change(screen.getByPlaceholderText("Поиск по названию"), {
      target: { value: "каталог" },
    });
    await selectMuiOption(screen.getAllByLabelText("Тип документа")[0], 2);
    fireEvent.change(screen.getByLabelText("Автор"), {
      target: { value: "Иванов" },
    });
    fireEvent.change(screen.getByLabelText("Год с"), {
      target: { value: "2020" },
    });
    fireEvent.change(screen.getByLabelText("Год по"), {
      target: { value: "2026" },
    });
    fireEvent.change(screen.getByLabelText("Ключевые слова"), {
      target: { value: "tag pdf" },
    });

    await waitFor(() => {
      expect(getAdminDocumentsMock).toHaveBeenLastCalledWith(
        "token",
        expect.objectContaining({
          q: "каталог",
          type: "Методичка",
          author: "Иванов",
          yearFrom: "2020",
          yearTo: "2026",
          tags: "tag pdf",
          sort: "date_desc",
          pageSize: 20,
        })
      );
    });
  });

  it("requires PDF for manual create and then creates successfully", async () => {
    renderPage("/admin/documents");

    await screen.findByText("Панель администратора");
    fireEvent.click(screen.getByRole("button", { name: "Добавить новый" }));

    expect(await screen.findByText("Создать документ")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Название"), {
      target: { value: "Новая методичка" },
    });
    const authorInputs = screen.getAllByLabelText("Автор");
    fireEvent.change(authorInputs[authorInputs.length - 1], {
      target: { value: "Иванов" },
    });
    fireEvent.change(screen.getByLabelText("Год"), {
      target: { value: "2026" },
    });
    const comboboxes = screen.getAllByRole("combobox");
    await selectMuiOption(comboboxes[0], 1);

    fireEvent.change(screen.getByLabelText("Аннотация"), {
      target: { value: "Описание документа" },
    });

    const createButtons = screen.getAllByRole("button", { name: "Создать" });
    fireEvent.click(createButtons[createButtons.length - 1]);
    expect(await screen.findByRole("alert")).toHaveTextContent("PDF-файл");
    expect(createDocumentMock).not.toHaveBeenCalled();

    const file = new File(["%PDF-1.4"], "manual.pdf", {
      type: "application/pdf",
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [file] },
    });
    const createButtonsFinal = screen.getAllByRole("button", { name: "Создать" });
    fireEvent.click(createButtonsFinal[createButtonsFinal.length - 1]);

    await waitFor(() => {
      expect(createDocumentMock).toHaveBeenCalledTimes(1);
    });
  }, 30000);

});
