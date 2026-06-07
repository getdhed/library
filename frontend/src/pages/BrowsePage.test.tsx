import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import BrowsePage from "./BrowsePage";

const documentFileUrlMock = vi.fn(() => "/api/documents/1/file");
const favoriteDocumentMock = vi.fn();
const getDocumentsMock = vi.fn(() =>
  Promise.resolve({
    items: [
      {
        id: 1,
        title: "DevOps Playbook",
        author: "Demo Author",
        year: 2026,
        type: "Textbook",
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
    pageSize: 12,
    total: 1,
  })
);
const getDocumentTypesMock = vi.fn(() =>
  Promise.resolve({ items: ["Textbook", "Manual"] })
);
const markOpenedMock = vi.fn(() => Promise.resolve());
const unfavoriteDocumentMock = vi.fn();
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
  markOpened: (...args: unknown[]) => markOpenedMock(...args),
  toggleDocumentFavorite: (...args: unknown[]) =>
    toggleDocumentFavoriteMock(...args),
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

describe("BrowsePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders catalog list without search input", async () => {
    renderPage();

    expect(await screen.findByText("DevOps Playbook")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    expect(getDocumentsMock).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({
        sort: "date_desc",
        page: 1,
        type: "",
        author: "",
        yearFrom: "",
        yearTo: "",
        tags: "",
      })
    );
  });

  it("applies and resets filters via MUI dialog", async () => {
    renderPage();

    expect(await screen.findByText("DevOps Playbook")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Фильтры/ }));

    const dialog = screen.getByRole("dialog");
    const selects = within(dialog).getAllByRole("combobox");
    expect(selects).toHaveLength(2);

    await selectMUIOption(selects[0], 1);
    await selectMUIOption(selects[1], 4);
    fireEvent.change(within(dialog).getByLabelText("Автор"), {
      target: { value: "Demo Author" },
    });
    fireEvent.change(within(dialog).getByLabelText("Год с"), {
      target: { value: "2020" },
    });
    fireEvent.change(within(dialog).getByLabelText("Год по"), {
      target: { value: "2026" },
    });
    fireEvent.change(within(dialog).getByLabelText("Ключевые слова"), {
      target: { value: "devops, pdf" },
    });

    const dialogButtons = within(dialog).getAllByRole("button");
    fireEvent.click(dialogButtons[dialogButtons.length - 1]);

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith(
        "token",
        expect.objectContaining({
          sort: "title_asc",
          page: 1,
          type: "Textbook",
          author: "Demo Author",
          yearFrom: "2020",
          yearTo: "2026",
          tags: "devops, pdf",
        })
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Фильтры/ }));
    const resetDialog = screen.getByRole("dialog");
    const resetButtons = within(resetDialog).getAllByRole("button");
    fireEvent.click(resetButtons[resetButtons.length - 2]);

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith(
        "token",
        expect.objectContaining({
          sort: "date_desc",
          page: 1,
          type: "",
          author: "",
          yearFrom: "",
          yearTo: "",
          tags: "",
        })
      );
    });
  });

  it("uses icon actions and keeps open plus favorite behavior", async () => {
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
});
