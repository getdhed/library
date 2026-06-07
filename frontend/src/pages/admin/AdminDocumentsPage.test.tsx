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
    Promise.resolve({ items: ["Учебник", "Методичка"] })
  ),
  updateDocumentMock: vi.fn(() => Promise.resolve({ id: 5 })),
  documentFileUrlMock: vi.fn((id: number) => `/api/documents/${id}/file`),
}));

vi.mock("../../api/library", () => ({
  approveSubmission: mocks.approveSubmissionMock,
  createDocument: mocks.createDocumentMock,
  deleteDocument: mocks.deleteDocumentMock,
  getAdminDocumentAudit: (...args: any[]) =>
    mocks.getAdminDocumentAuditMock(...args),
  getAdminDocuments: mocks.getAdminDocumentsMock,
  getAdminSubmissions: mocks.getAdminSubmissionsMock,
  getDocumentTypes: mocks.getDocumentTypesMock,
  rejectSubmission: mocks.rejectSubmissionMock,
  submissionFileUrl: mocks.submissionFileUrlMock,
  documentFileUrl: mocks.documentFileUrlMock,
  updateDocument: mocks.updateDocumentMock,
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

  it("opens moderation by default and syncs tab query param", async () => {
    renderPage();

    const tabs = await screen.findAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText("Одобрить заявку")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/admin/documents?tab=moderation"
    );
  });

  it("switches tabs and closes opened moderation drawer", async () => {
    renderPage();

    await screen.findByText("Legacy Notes");
    fireEvent.click(screen.getAllByRole("button", { name: "Оформить" })[0]);
    expect(await screen.findByText("Одобрить заявку")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("tab")[1]);

    expect(screen.queryByText("Одобрить заявку")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/admin/documents?tab=catalog"
    );
  });

  it("blocks approve submit when required fields are missing", async () => {
    renderPage();

    await screen.findByText("Legacy Notes");
    fireEvent.click(screen.getAllByRole("button", { name: "Оформить" })[0]);
    expect(await screen.findByText("Одобрить заявку")).toBeInTheDocument();

    const titleInputs = screen.getAllByLabelText("Название *");
    fireEvent.change(titleInputs[titleInputs.length - 1], {
      target: { value: "" },
    });
    const submitButtons = screen.getAllByRole("button", { name: "Одобрить и опубликовать" });
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    expect(await screen.findByRole("alert")).toHaveTextContent("название");
    expect(approveSubmissionMock).not.toHaveBeenCalled();
  });

  it("opens catalog drawer and saves edited document", async () => {
    renderPage("/admin/documents?tab=catalog");

    await screen.findByRole("button", { name: "Редактировать" });
    fireEvent.click(screen.getByRole("button", { name: "Редактировать" }));
    expect(await screen.findByText("Редактировать документ")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Аннотация"), {
      target: { value: "Обновленное описание" },
    });
    const saveButtons = screen.getAllByRole("button", { name: "Сохранить изменения" });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(updateDocumentMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.queryByText("Редактировать документ")).not.toBeInTheDocument();
    });
  });

  it("passes advanced catalog filters to admin documents request", async () => {
    renderPage("/admin/documents?tab=catalog");

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
    renderPage("/admin/documents?tab=upload");

    await screen.findByRole("heading", { name: "Добавить документ вручную" });

    fireEvent.change(screen.getByLabelText("Название *"), {
      target: { value: "Новая методичка" },
    });
    fireEvent.change(screen.getByLabelText("Автор"), {
      target: { value: "Иванов" },
    });
    fireEvent.change(screen.getByLabelText("Год *"), {
      target: { value: "2026" },
    });
    const comboboxes = screen.getAllByRole("combobox");
    await selectMuiOption(comboboxes[0], 1);

    fireEvent.change(screen.getByLabelText("Аннотация"), {
      target: { value: "Описание документа" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Создать документ" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("PDF-файл");
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


});
