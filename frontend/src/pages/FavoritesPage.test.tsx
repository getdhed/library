import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import FavoritesPage from "./FavoritesPage";

vi.mock("../api/library", () => ({
  getFavorites: vi.fn(),
  documentCoverUrl: vi.fn(() => "/api/documents/1/cover"),
}));

import { getFavorites } from "../api/library";

describe("FavoritesPage", () => {
  it("renders empty state when there are no favorites", async () => {
    vi.mocked(getFavorites).mockResolvedValueOnce({ items: [] });

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
        <MemoryRouter>
          <FavoritesPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("Пока ничего не добавлено")).toBeInTheDocument();
    });
  });

  it("renders favorites without alias controls", async () => {
    vi.mocked(getFavorites).mockResolvedValueOnce({
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
          isFavorite: true,
        },
      ],
    });

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
        <MemoryRouter>
          <FavoritesPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("DevOps Playbook")).toBeInTheDocument();
    });

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/alias/i)).not.toBeInTheDocument();
  });
});
