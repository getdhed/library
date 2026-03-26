import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import SearchResultsPage from "./SearchResultsPage";

const documentFileUrlMock = vi.fn(() => "/api/documents/1/file");
const favoriteDocumentMock = vi.fn(() => Promise.resolve());
const getDepartmentsMock = vi.fn(() => Promise.resolve({ items: [] }));
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
        departmentId: 1,
        department: "Кафедра программной инженерии",
        facultyId: 1,
        faculty: "ФКТИ",
        tags: [],
        isFavorite: false,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
  })
);
const getFacultiesMock = vi.fn(() => Promise.resolve({ items: [] }));
const getSuggestionsMock = vi.fn(() => Promise.resolve({ items: [] }));
const markOpenedMock = vi.fn(() => Promise.resolve());
const unfavoriteDocumentMock = vi.fn(() => Promise.resolve());
const toggleDocumentFavoriteMock = vi.fn(
  (token: string, id: number, isFavorite: boolean) =>
    isFavorite
      ? unfavoriteDocumentMock(token, id)
      : favoriteDocumentMock(token, id)
);

vi.mock("../api/library", () => ({
  documentCoverUrl: vi.fn(() => "/api/documents/1/cover"),
  documentFileUrl: (...args: unknown[]) => documentFileUrlMock(...args),
  favoriteDocument: (...args: unknown[]) => favoriteDocumentMock(...args),
  getDepartments: (...args: unknown[]) => getDepartmentsMock(...args),
  getDocuments: (...args: unknown[]) => getDocumentsMock(...args),
  getFaculties: (...args: unknown[]) => getFacultiesMock(...args),
  getSuggestions: (...args: unknown[]) => getSuggestionsMock(...args),
  markOpened: (...args: unknown[]) => markOpenedMock(...args),
  toggleDocumentFavorite: (...args: unknown[]) =>
    toggleDocumentFavoriteMock(...args),
  unfavoriteDocument: (...args: unknown[]) => unfavoriteDocumentMock(...args),
}));

function renderPage(initialEntry = "/search?q=devops") {
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
          <Route path="/search" element={<SearchResultsPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("SearchResultsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders document card and icon-only actions", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("DevOps Playbook")).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("devops")).toBeInTheDocument();
    expect(screen.getByAltText("Обложка DevOps Playbook")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Открыть документ").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Добавить в избранное").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Предложить документ" })
    ).toBeInTheDocument();
  });

  it("handles open and favorite actions from icon buttons", async () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderPage();

    await screen.findByText("DevOps Playbook");

    fireEvent.click(screen.getAllByLabelText("Открыть документ")[0]);
    await waitFor(() => {
      expect(markOpenedMock).toHaveBeenCalledWith("token", 1);
    });
    expect(windowOpenSpy).toHaveBeenCalledWith(
      "/api/documents/1/file",
      "_blank",
      "noopener,noreferrer"
    );

    fireEvent.click(screen.getAllByLabelText("Добавить в избранное")[0]);
    await waitFor(() => {
      expect(favoriteDocumentMock).toHaveBeenCalledWith("token", 1);
    });

    windowOpenSpy.mockRestore();
  });
});
