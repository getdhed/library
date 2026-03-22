import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../theme/ThemeContext";
import SettingsPage from "./SettingsPage";

describe("SettingsPage", () => {
  it("switches between light and dark themes", () => {
    window.localStorage.clear();

    render(
      <ThemeProvider>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(document.documentElement.dataset.theme).toBe("light");

    fireEvent.click(screen.getByRole("button", { name: "Тёмная тема" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("library-theme")).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: "Светлая тема" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem("library-theme")).toBe("light");
  });
});
