import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import SearchResultsPage from "./SearchResultsPage";

const documentFileUrlMock = vi.fn((..._args: unknown[]) => "/api/documents/1/file");
const favoriteDocumentMock = vi.fn((..._args: unknown[]) => Promise.resolve());
const getDocumentsMock = vi.fn((..._args: unknown[]) =>
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
const getDocumentTypesMock = vi.fn((..._args: unknown[]) =>
  Promise.resolve({ items: ["Учебник", "Методическое пособие"] })
);
const getSuggestionsMock = vi.fn((..._args: unknown[]) => Promise.resolve({ items: [] }));
const markOpenedMock = vi.fn((..._args: unknown[]) => Promise.resolve());
const unfavoriteDocumentMock = vi.fn((..._args: unknown[]) => Promise.resolve());
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
  getDocuments: (...args: unknown[]) => getDocumentsMock(...args),
  getDocumentTypes: (...args: unknown[]) => getDocumentTypesMock(...args),
  getSuggestions: (...args: unknown[]) => getSuggestionsMock(...args),
  markOpened: (...args: unknown[]) => markOpenedMock(...args),
  toggleDocumentFavorite: (...args: [string, number, boolean]) =>
    toggleDocumentFavoriteMock(...args),
  unfavoriteDocument: (...args: unknown[]) => unfavoriteDocumentMock(...args),
}));

vi.mock("../api/protectedFiles", () => ({
  fetchProtectedBlob: vi.fn(() => Promise.resolve(new Blob(["cover"]))),
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
    expect(await screen.findByAltText("Обложка DevOps Playbook")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Открыть документ").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Добавить в избранное").length).toBeGreaterThan(0);
  });

  it("handles open and favorite actions from icon buttons", async () => {
    renderPage();

    await screen.findByText("DevOps Playbook");

    fireEvent.click(screen.getAllByLabelText("Добавить в избранное")[0]);
    await waitFor(() => {
      expect(favoriteDocumentMock).toHaveBeenCalledWith("token", 1);
    });

    fireEvent.click(screen.getAllByLabelText("Открыть документ")[0]);
    expect(markOpenedMock).not.toHaveBeenCalled();
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
    fireEvent.click(screen.getByRole("checkbox", { name: "С переводом" }));

    fireEvent.click(screen.getByRole("button", { name: "Поиск" }));

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith(
        "token",
        expect.objectContaining({
          q: "devops",
          sort: "date_desc",
          page: 1,
          type: "Учебник",
          author: "Demo Author",
          yearFrom: "2020",
          yearTo: "2026",
          tags: "devops pdf",
          hasTranslation: "true",
        })
      );
    });
  });

  it("submits search query from the search bar", async () => {
    renderPage();

    const searchInput = await screen.findByLabelText("Поиск документов");
    fireEvent.change(searchInput, { target: { value: "New Search" } });

    const searchForm = searchInput.closest("form");
    fireEvent.submit(searchForm!);

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith(
        "token",
        expect.objectContaining({
          q: "New Search",
          page: 1,
        })
      );
    });
  });
});
