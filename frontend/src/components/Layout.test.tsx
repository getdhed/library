import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import Layout from "./Layout";

function renderLayout(
  options: {
    logout?: ReturnType<typeof vi.fn>;
    role?: "user" | "admin";
    fullName?: string;
    username?: string;
  } = {}
) {
  const {
    logout = vi.fn(),
    role = "admin",
    fullName = "Admin User",
    username = "admin",
  } = options;

  render(
    <AuthContext.Provider
      value={{
        token: "token",
        user: {
          id: 1,
          username,
          fullName,
          role,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ready: true,
        login: async () => undefined,
        register: async () => undefined,
        logout,
      }}
    >
      <MemoryRouter>
        <Layout>
          <div>content</div>
        </Layout>
      </MemoryRouter>
    </AuthContext.Provider>
  );

  return { logout };
}

afterEach(() => {
  cleanup();
});

describe("Layout", () => {
  it("renders desktop header navigation with accent search item and footer", () => {
    renderLayout();

    const mainNavigation = screen.getByLabelText("Основная навигация");
    const searchLink = within(mainNavigation).getByRole("link", { name: "Поиск" });

    expect(
      within(mainNavigation).getByRole("link", { name: "Главная" })
    ).toBeInTheDocument();
    expect(
      within(mainNavigation).getByRole("link", { name: "Админка" })
    ).toBeInTheDocument();
    expect(searchLink).toHaveAttribute("href", "/search");
    expect(searchLink).toHaveAttribute("data-header-accent", "danger");
    expect(
      within(mainNavigation).queryByRole("link", { name: "Предложить материал" })
    ).not.toBeInTheDocument();

    expect(screen.getByLabelText("Открыть меню аккаунта")).toBeInTheDocument();
    expect(screen.getByText("ИПС РБ · Библиотека")).toBeInTheDocument();
    expect(screen.queryByLabelText("Открыть меню")).not.toBeInTheDocument();
  });

  it("opens account menu and triggers logout action", () => {
    const { logout } = renderLayout();

    fireEvent.click(screen.getByLabelText("Открыть меню аккаунта"));

    const accountMenu = screen.getByLabelText("Меню аккаунта");
    expect(within(accountMenu).getByRole("button", { name: "Выйти" })).toBeInTheDocument();

    fireEvent.click(within(accountMenu).getByRole("button", { name: "Выйти" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("shows My PDF only in user account menu and hides admin link", () => {
    renderLayout({
      role: "user",
      fullName: "Regular User",
      username: "regular",
    });

    const mainNavigation = screen.getByLabelText("Основная навигация");
    expect(
      within(mainNavigation).getByRole("link", { name: "Мои PDF" })
    ).toBeInTheDocument();
    expect(
      within(mainNavigation).queryByRole("link", { name: "Админка" })
    ).not.toBeInTheDocument();
  });
});
