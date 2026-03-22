import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import FavoritesPage from "./FavoritesPage";

vi.mock("../api/library", () => ({
  getFavorites: vi.fn(),
  setFavoriteAlias: vi.fn(),
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
});
