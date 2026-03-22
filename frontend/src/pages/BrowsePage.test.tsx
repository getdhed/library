import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import BrowsePage from "./BrowsePage";

const documentFileUrlMock = vi.fn(() => "/api/documents/1/file");
const favoriteDocumentMock = vi.fn();
const getDepartmentsMock = vi.fn(() =>
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
const getDocumentsMock = vi.fn(() =>
  Promise.resolve({
    items: [
      {
        id: 1,
        title: "DevOps Playbook",
        author: "Demo Author",
        year: 2026,
        type: "Учебник",
        description: "Generated demo PDF set",
        fileName: "playbook.pdf",
        fileSizeBytes: 1024,
        mimeType: "application/pdf",
        coverPath: "covers/playbook.png",
        isVisible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        departmentId: 10,
        department: "Кафедра информационных систем",
        facultyId: 1,
        faculty: "ФКТИ",
        tags: [],
        isFavorite: false,
      },
    ],
    page: 1,
    pageSize: 12,
    total: 1,
  })
);
const getFacultiesMock = vi.fn(() =>
  Promise.resolve({
    items: [{ id: 1, name: "ФКТИ", slug: "fkti" }],
  })
);
const markOpenedMock = vi.fn();
const unfavoriteDocumentMock = vi.fn();

vi.mock("../api/library", () => ({
  documentCoverUrl: vi.fn(() => "/api/documents/1/cover"),
  documentFileUrl: (...args: unknown[]) => documentFileUrlMock(...args),
  favoriteDocument: (...args: unknown[]) => favoriteDocumentMock(...args),
  getDepartments: (...args: unknown[]) => getDepartmentsMock(...args),
  getDocuments: (...args: unknown[]) => getDocumentsMock(...args),
  getFaculties: (...args: unknown[]) => getFacultiesMock(...args),
  markOpened: (...args: unknown[]) => markOpenedMock(...args),
  unfavoriteDocument: (...args: unknown[]) => unfavoriteDocumentMock(...args),
}));

function renderPage(initialEntry = "/catalog") {
  return render(
    <AuthContext.Provider
      value={{
        token: "token",
        user: null,
        ready: true,
        login: async () => undefined,
        register: async () => undefined,
        logout: () => undefined,
      }}
    >
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/catalog" element={<BrowsePage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("BrowsePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all documents immediately without a search field", async () => {
    renderPage();

    expect(await screen.findByText("DevOps Playbook")).toBeInTheDocument();
    expect(screen.getByText("Все документы")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Название, автор, кафедра")
    ).not.toBeInTheDocument();

    expect(getDocumentsMock).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({
        sort: "date_desc",
        page: 1,
        facultyId: 0,
        departmentId: 0,
        type: "",
      })
    );
  });

  it("applies and resets popup filters", async () => {
    renderPage();

    expect(await screen.findByText("DevOps Playbook")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Фильтры/ }));

    expect(screen.getByLabelText("Сортировка")).toHaveValue("date_desc");
    expect(screen.getByText("Тип документа")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Факультет"), {
      target: { value: "1" },
    });

    await waitFor(() => {
      expect(getDepartmentsMock).toHaveBeenCalledWith(1);
    });

    fireEvent.change(screen.getByLabelText("Кафедра"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Тип документа"), {
      target: { value: "Учебник" },
    });
    fireEvent.change(screen.getByLabelText("Сортировка"), {
      target: { value: "title_asc" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Применить" }));

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith(
        "token",
        expect.objectContaining({
          sort: "title_asc",
          page: 1,
          facultyId: 1,
          departmentId: 10,
          type: "Учебник",
        })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /Фильтры/ }));
    fireEvent.click(screen.getByRole("button", { name: "Сбросить" }));

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith(
        "token",
        expect.objectContaining({
          sort: "date_desc",
          page: 1,
          facultyId: 0,
          departmentId: 0,
          type: "",
        })
      );
    });
  });
});
