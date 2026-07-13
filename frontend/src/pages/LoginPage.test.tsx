import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage";
import { AuthContext } from "../auth/AuthContext";
import { ThemeProvider } from "../theme/ThemeContext";

describe("LoginPage", () => {
  afterEach(cleanup);

  it("submits the login form and redirects on success", async () => {
    const loginMock = vi.fn().mockResolvedValue(undefined);

    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{ token: null, user: null, login: loginMock, logout: vi.fn(), register: vi.fn(), me: vi.fn(), initialized: true }}
        >
          <MemoryRouter initialEntries={["/login"]}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<div data-testid="home-page" />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    );

    expect(screen.getByText("Вход")).toBeInTheDocument();

    const usernameInput = screen.getByLabelText("Логин");
    const passwordInput = screen.getByLabelText("Пароль");
    const submitBtn = screen.getByRole("button", { name: "Войти" });

    // Inputs should be empty by default
    expect(usernameInput).toHaveValue("");
    expect(passwordInput).toHaveValue("");

    await userEvent.clear(usernameInput);
    await userEvent.type(usernameInput, "testuser");
    
    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, "testpass");

    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({ username: "testuser", password: "testpass" });
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
    });
  });

  it("shows an error message on login failure", async () => {
    const loginMock = vi.fn().mockRejectedValue(new Error("Login failed"));

    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{ token: null, user: null, login: loginMock, logout: vi.fn(), register: vi.fn(), me: vi.fn(), initialized: true }}
        >
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    );

    const usernameInput = screen.getByLabelText("Логин");
    const passwordInput = screen.getByLabelText("Пароль");
    const submitBtn = screen.getByRole("button", { name: "Войти" });

    await userEvent.type(usernameInput, "wronguser");
    await userEvent.type(passwordInput, "wrongpass");

    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Login failed")).toBeInTheDocument();
    });
  });

  it("redirects to home if already logged in", () => {
    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{ token: "fake-token", user: null, login: vi.fn(), logout: vi.fn(), register: vi.fn(), me: vi.fn(), initialized: true }}
        >
          <MemoryRouter initialEntries={["/login"]}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<div data-testid="home-page" />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    );

    expect(screen.getByTestId("home-page")).toBeInTheDocument();
  });
});
