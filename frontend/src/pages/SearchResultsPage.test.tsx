import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import SearchResultsPage from "./SearchResultsPage";

const documentFileUrlMock = vi.fn(() => "/api/documents/1/file");
const favoriteDocumentMock = vi.fn(() => Promise.resolve());
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        isFavorite: false,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
  })
);
const getDocumentTypesMock = vi.fn(() =>
  Promise.resolve({ items: ["Учебник", "Методическое пособие"] })
);
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
  documentFileUrl: (...args: any[]) => documentFileUrlMock(...args),
  favoriteDocument: (...args: any[]) => favoriteDocumentMock(...args),
  getDocuments: (...args: any[]) => getDocumentsMock(...args),
  getDocumentTypes: (...args: any[]) => getDocumentTypesMock(...args),
  getSuggestions: (...args: any[]) => getSuggestionsMock(...args),
  markOpened: (...args: any[]) => markOpenedMock(...args),
  toggleDocumentFavorite: (...args: any[]) =>
    toggleDocumentFavoriteMock(...args),
  unfavoriteDocument: (...args: any[]) => unfavoriteDocumentMock(...args),
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
          <Route path="/documents/:id" element={<div>Document page</div>} />
          <Route path="/documents/:id/read" element={<div>Reader page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

async function selectMUIOption(element: HTMLElement, optionIndex: number) {
  fireEvent.mouseDown(element);
  const listbox = await screen.findByRole("listbox");
  const options = within(listbox).getAllByRole("option");
  fireEvent.click(options[optionIndex]);
}

describe("SearchResultsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
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
    renderPage();

    await screen.findByText("DevOps Playbook");

    fireEvent.click(screen.getAllByLabelText("Добавить в избранное")[0]);
    await waitFor(() => {
      expect(favoriteDocumentMock).toHaveBeenCalledWith("token", 1);
    });

    fireEvent.click(screen.getAllByLabelText("Открыть документ")[0]);
    await waitFor(() => {
      expect(markOpenedMock).toHaveBeenCalledWith("token", 1);
    });
    await waitFor(() => {
      expect(screen.getByText("Document page")).toBeInTheDocument();
    });
  });

  it("applies advanced filters from sidebar", async () => {
    renderPage();

    await screen.findByText("DevOps Playbook");

    await selectMUIOption(screen.getByLabelText("Тип документа"), 1);
    fireEvent.change(screen.getByLabelText("Автор"), {
      target: { value: "Demo Author" },
    });
    fireEvent.change(screen.getByLabelText("Год с"), {
      target: { value: "2020" },
    });
    fireEvent.change(screen.getByLabelText("Год по"), {
      target: { value: "2026" },
    });
    fireEvent.change(screen.getByLabelText("Ключевые слова"), {
      target: { value: "devops pdf" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Применить" }));

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith(
        "token",
        expect.objectContaining({
          q: "devops",
          sort: "relevance",
          page: 1,
          type: "Учебник",
          author: "Demo Author",
          yearFrom: "2020",
          yearTo: "2026",
          tags: "devops pdf",
        })
      );
    });
  });

  it("opens the first suggestion on Enter without click", async () => {
    getSuggestionsMock.mockResolvedValue({
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          isFavorite: false,
        },
      ],
    });

    renderPage();

    const searchInput = await screen.findByLabelText("Поиск документов");
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: "DevOps" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "DevOps Playbook" })).toBeInTheDocument();
    });

    const searchForm = searchInput.closest("form");
    expect(searchForm).not.toBeNull();
    fireEvent.submit(searchForm!);

    await waitFor(() => {
      expect(markOpenedMock).toHaveBeenCalledWith("token", 1);
    });
    await waitFor(() => {
      expect(screen.getByText("Document page")).toBeInTheDocument();
    });
  });
});
