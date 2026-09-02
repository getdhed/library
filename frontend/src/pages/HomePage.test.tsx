import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import HomePage from "./HomePage";

const getHomeMock = vi.fn<(...args: unknown[]) => Promise<any>>();
const getSuggestionsMock = vi.fn<(...args: unknown[]) => Promise<any>>();
const markOpenedMock = vi.fn<(...args: unknown[]) => Promise<any>>();
const toggleDocumentFavoriteMock = vi.fn<(...args: unknown[]) => Promise<any>>();
const documentFileUrlMock = vi.fn<(...args: unknown[]) => string>(
  () => "/api/documents/1/file"
);

vi.mock("../api/library", () => ({
  getHome: (...args: unknown[]) => getHomeMock(...args),
  getSuggestions: (...args: unknown[]) => getSuggestionsMock(...args),
  markOpened: (...args: unknown[]) => markOpenedMock(...args),
  toggleDocumentFavorite: (...args: unknown[]) =>
    toggleDocumentFavoriteMock(...args),
  documentFileUrl: (...args: unknown[]) => documentFileUrlMock(...args),
  documentCoverUrl: vi.fn(() => "/api/documents/1/cover"),
  getBackgroundUrl: vi.fn(() => "/api/public/background"),
}));

function makeDocument(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

function renderHomePage() {
  cleanup();
  render(
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
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/documents/:id" element={<div>Document page</div>} />
          <Route path="/documents/:id/read" element={<div>Reader page</div>} />
          <Route path="/search" element={<div>Search page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHomeMock.mockResolvedValue({
      recent: [makeDocument()],
      favorites: [],
      searchHistory: [],
    });
    getSuggestionsMock.mockResolvedValue({ items: [] });
    markOpenedMock.mockResolvedValue(undefined);
    toggleDocumentFavoriteMock.mockResolvedValue(undefined);
  });

  it("renders simplified hero with a single inline search form", async () => {
    renderHomePage();

    const searchButton = screen.getByRole("button", { name: "Поиск" });
    const searchInput = screen.getByLabelText("Поиск документов");
    const heading = screen.getByRole("heading", {
      level: 1,
      name: /ИНСТИТУТ ПОГРАНИЧНОЙ СЛУЖБЫ/,
    });

    expect(heading).toBeInTheDocument();
    expect(searchButton).toBeInTheDocument();
    expect(searchInput.closest("form")).not.toBeNull();
    expect(searchInput.closest("form")).toContainElement(searchButton);
    expect(screen.queryByRole("button", { name: "Учебник" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Методичка" })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Недавние документы")).toBeInTheDocument();
    });
  });

  it("shows the new empty state for users without recent documents", async () => {
    getHomeMock.mockResolvedValueOnce({
      recent: [],
      favorites: [],
      searchHistory: [],
    });
    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("Недавние документы")).toBeInTheDocument();
    });

    expect(screen.getByText("Вы пока не просматривали документы")).toBeInTheDocument();
  });

  it("submits the typed query on Enter", async () => {
    getHomeMock.mockResolvedValueOnce({
      recent: [],
      favorites: [],
      searchHistory: [],
    });
    getSuggestionsMock.mockResolvedValueOnce({
      items: [makeDocument()],
    });
    renderHomePage();

    const searchInput = screen.getByLabelText("Поиск документов");
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: "DevOps" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /DevOps Playbook/ })).toBeInTheDocument();
    });

    const searchForm = searchInput.closest("form");
    expect(searchForm).not.toBeNull();
    fireEvent.submit(searchForm!);

    await waitFor(() => {
      expect(screen.getByText("Search page")).toBeInTheDocument();
    });
    expect(markOpenedMock).not.toHaveBeenCalled();
  });

  it("handles open and favorite actions from recent cards", async () => {
    renderHomePage();

    await screen.findAllByText("DevOps Playbook");

    fireEvent.click(screen.getAllByLabelText("Добавить в избранное")[0]);
    await waitFor(() => {
      expect(toggleDocumentFavoriteMock).toHaveBeenCalledWith("token", 1, false);
    });

    fireEvent.click(screen.getAllByLabelText("Открыть документ")[0]);
    expect(markOpenedMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("Document page")).toBeInTheDocument();
    });
  });
});
