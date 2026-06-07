import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../theme/ThemeContext";
import SettingsPage from "./SettingsPage";

describe("SettingsPage", () => {
  it("shows fixed single-style mode without theme toggles", async () => {
    window.localStorage.clear();

    render(
      <ThemeProvider>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
      expect(window.localStorage.getItem("library-theme")).toBe("light");
    });

    expect(screen.getByText("Единый режим интерфейса")).toBeInTheDocument();
    expect(
      screen.getByText(/переключение темы временно отключено/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Тёмная тема" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Светлая тема" })
    ).not.toBeInTheDocument();
  });
});
