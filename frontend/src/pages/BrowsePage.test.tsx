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
const getDepartmentsMock = vi.fn(() =>
  Promise.resolve({
    items: [
      {
        id: 10,
        facultyId: 1,
        name: "Information Systems",
        slug: "information-systems",
        faculty: "FKTI",
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
        type: "Textbook",
        description: "Generated demo PDF set",
        fileName: "playbook.pdf",
        fileSizeBytes: 1024,
        mimeType: "application/pdf",
        coverPath: "covers/playbook.png",
        isVisible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        departmentId: 10,
        department: "Information Systems",
        facultyId: 1,
        faculty: "FKTI",
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
    items: [{ id: 1, name: "FKTI", slug: "fkti" }],
  })
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
  getDepartments: (...args: unknown[]) => getDepartmentsMock(...args),
  getDocuments: (...args: unknown[]) => getDocumentsMock(...args),
  getFaculties: (...args: unknown[]) => getFacultiesMock(...args),
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
        facultyId: 0,
        departmentId: 0,
        type: "",
      })
    );
  });

  it("applies and resets filters via MUI dialog", async () => {
    renderPage();

    expect(await screen.findByText("DevOps Playbook")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Фильтры/ }));

    const dialog = screen.getByRole("dialog");
    const selects = within(dialog).getAllByRole("combobox");
    expect(selects).toHaveLength(4);

    await selectMUIOption(selects[0], 1);

    await waitFor(() => {
      expect(getDepartmentsMock).toHaveBeenCalledWith(1);
    });

    const selectsAfterFaculty = within(dialog).getAllByRole("combobox");
    await selectMUIOption(selectsAfterFaculty[1], 1);
    await selectMUIOption(selectsAfterFaculty[2], 1);
    await selectMUIOption(selectsAfterFaculty[3], 4);

    const dialogButtons = within(dialog).getAllByRole("button");
    fireEvent.click(dialogButtons[dialogButtons.length - 1]);

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith(
        "token",
        expect.objectContaining({
          sort: "title_asc",
          page: 1,
          facultyId: 1,
          departmentId: 10,
          type: "Textbook",
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
          facultyId: 0,
          departmentId: 0,
          type: "",
        })
      );
    });
  });

  it("uses icon actions and keeps open plus favorite behavior", async () => {
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
