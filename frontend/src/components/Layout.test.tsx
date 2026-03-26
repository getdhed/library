import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import Layout from "./Layout";

function setWindowWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
}

function renderLayout(
  options: {
    logout?: ReturnType<typeof vi.fn>;
    role?: "user" | "admin";
    fullName?: string;
    email?: string;
  } = {}
) {
  const {
    logout = vi.fn(),
    role = "admin",
    fullName = "Admin User",
    email = "admin@library.local",
  } = options;

  render(
    <AuthContext.Provider
      value={{
        token: "token",
        user: {
          id: 1,
          email,
          fullName,
          role,
          createdAt: new Date().toISOString(),
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
  setWindowWidth(1024);
});

describe("Layout", () => {
  it("opens and closes the mobile burger menu", () => {
    setWindowWidth(640);
    renderLayout();

    expect(screen.queryByLabelText("Меню навигации")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Открыть меню"));
    expect(screen.getByLabelText("Меню навигации")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Закрыть"));
    expect(screen.queryByLabelText("Меню навигации")).not.toBeInTheDocument();
  });

  it("opens account popup on desktop and shows settings plus logout actions", () => {
    setWindowWidth(1500);
    renderLayout();

    fireEvent.click(screen.getByLabelText("Открыть меню аккаунта"));
    const accountMenu = screen.getByLabelText("Меню аккаунта");
    expect(accountMenu).toBeInTheDocument();
    expect(within(accountMenu).getByText("Настройки")).toBeInTheDocument();
    expect(within(accountMenu).getByRole("button", { name: "Выйти" })).toBeInTheDocument();
  });

  it("shows My PDF link only inside the user account menu", () => {
    setWindowWidth(1500);
    renderLayout({
      role: "user",
      fullName: "Regular User",
      email: "user@library.local",
    });

    const mainNavigation = screen.getByLabelText("Основная навигация");
    expect(
      within(mainNavigation).queryByRole("link", { name: "Мои PDF" })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Открыть меню аккаунта"));
    const accountMenu = screen.getByLabelText("Меню аккаунта");
    expect(
      within(accountMenu).getByRole("link", { name: "Мои PDF" })
    ).toHaveAttribute("href", "/account/pdfs");
  });

  it("renders icon topbar navigation on medium desktop widths", () => {
    setWindowWidth(1280);
    renderLayout();

    expect(screen.getByLabelText("Основная навигация")).toBeInTheDocument();
    expect(screen.getByLabelText("Избранное")).toBeInTheDocument();
    expect(screen.getByLabelText("Открыть меню аккаунта")).toBeInTheDocument();
    expect(screen.queryByLabelText("Открыть меню")).not.toBeInTheDocument();
  });

  it("renders compact topbar with burger only on half-screen widths", () => {
    setWindowWidth(1000);
    renderLayout();

    expect(screen.queryByLabelText("Основная навигация")).not.toBeInTheDocument();
    expect(screen.getByText("Библиотека ИПС")).toBeInTheDocument();
    expect(screen.queryByLabelText("Открыть меню аккаунта")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Открыть меню")).toBeInTheDocument();
  });
});
