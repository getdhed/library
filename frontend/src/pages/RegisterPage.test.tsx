import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./RegisterPage";
import { AuthContext } from "../auth/AuthContext";
import { ThemeProvider } from "../theme/ThemeContext";

describe("RegisterPage", () => {
  afterEach(cleanup);

  it("submits the register form and redirects on success", async () => {
    const registerMock = vi.fn().mockResolvedValue(undefined);

    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{ token: null, user: null, login: vi.fn(), logout: vi.fn(), register: registerMock, me: vi.fn(), initialized: true }}
        >
          <MemoryRouter initialEntries={["/register"]}>
            <Routes>
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<div data-testid="home-page" />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    );

    expect(screen.getByText("Регистрация")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText("Ваше имя");
    const usernameInput = screen.getByPlaceholderText("Придумайте логин");
    const passwordInput = screen.getByPlaceholderText("Создайте пароль");
    const submitBtn = screen.getByRole("button", { name: "Зарегистрироваться" });

    await userEvent.type(nameInput, "Test User");
    await userEvent.type(usernameInput, "testuser");
    await userEvent.type(passwordInput, "testpass");

    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith({ fullName: "Test User", username: "testuser", password: "testpass" });
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
    });
  });

  it("shows an error message on registration failure", async () => {
    const registerMock = vi.fn().mockRejectedValue(new Error("Registration failed"));

    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{ token: null, user: null, login: vi.fn(), logout: vi.fn(), register: registerMock, me: vi.fn(), initialized: true }}
        >
          <MemoryRouter>
            <RegisterPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    );

    const nameInput = screen.getByPlaceholderText("Ваше имя");
    const usernameInput = screen.getByPlaceholderText("Придумайте логин");
    const passwordInput = screen.getByPlaceholderText("Создайте пароль");
    const submitBtn = screen.getByRole("button", { name: "Зарегистрироваться" });

    await userEvent.type(nameInput, "Test User");
    await userEvent.type(usernameInput, "testuser");
    await userEvent.type(passwordInput, "testpass");

    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Не удалось зарегистрироваться. Возможно, логин уже занят.")).toBeInTheDocument();
    });
  });

  it("redirects to home if already logged in", () => {
    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{ token: "fake-token", user: null, login: vi.fn(), logout: vi.fn(), register: vi.fn(), me: vi.fn(), initialized: true }}
        >
          <MemoryRouter initialEntries={["/register"]}>
            <Routes>
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<div data-testid="home-page" />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    );

    expect(screen.getByTestId("home-page")).toBeInTheDocument();
  });
});
