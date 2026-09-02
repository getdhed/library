import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ThemeProvider } from "../theme/ThemeContext";
import { AuthContext } from "../auth/AuthContext";
import SettingsPage from "./SettingsPage";

vi.mock("../api/library", () => ({
  changeMyPassword: vi.fn(),
}));

import { changeMyPassword } from "../api/library";

describe("SettingsPage", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithContext = (token: string | null = "fake-token") => {
    return render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{ token, user: null, login: vi.fn(), logout: vi.fn(), register: vi.fn(), ready: true }}
        >
          <MemoryRouter>
            <SettingsPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    );
  };

  it("validates password form fields correctly", async () => {
    renderWithContext();

    const submitBtn = screen.getByRole("button", { name: "Сохранить" });
    await userEvent.click(submitBtn);

    expect(await screen.findByText("Текущий пароль обязателен для заполнения")).toBeInTheDocument();
    expect(screen.getByText("Новый пароль обязателен для заполнения")).toBeInTheDocument();
    expect(screen.getByText("Подтверждение пароля обязательно для заполнения")).toBeInTheDocument();

    const oldPasswordInput = screen.getByLabelText(/Текущий пароль/i);
    const newPasswordInput = screen.getByLabelText(/^Новый пароль/i);
    const confirmPasswordInput = screen.getByLabelText(/Подтверждение пароля/i);

    // type too short password
    await userEvent.type(oldPasswordInput, "123");
    await userEvent.type(newPasswordInput, "123");
    await userEvent.click(submitBtn);
    expect(await screen.findByText("Пароль должен содержать минимум 6 символов")).toBeInTheDocument();

    // type mismatched confirm password
    await userEvent.type(newPasswordInput, "456"); // makes it 123456
    await userEvent.type(confirmPasswordInput, "654321");
    await userEvent.click(submitBtn);
    expect(await screen.findByText("Пароли не совпадают")).toBeInTheDocument();

    expect(changeMyPassword).not.toHaveBeenCalled();
  });

  it("calls changeMyPassword API on valid form submission", async () => {
    (changeMyPassword as any).mockResolvedValue({ status: "ok" });
    renderWithContext();

    const oldPasswordInput = screen.getByLabelText(/Текущий пароль/i);
    const newPasswordInput = screen.getByLabelText(/^Новый пароль/i);
    const confirmPasswordInput = screen.getByLabelText(/Подтверждение пароля/i);
    const submitBtn = screen.getByRole("button", { name: "Сохранить" });

    await userEvent.type(oldPasswordInput, "old123");
    await userEvent.type(newPasswordInput, "new12345");
    await userEvent.type(confirmPasswordInput, "new12345");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(changeMyPassword).toHaveBeenCalledWith("fake-token", {
        oldPassword: "old123",
        newPassword: "new12345"
      });
      expect(screen.getByText("Пароль изменён")).toBeInTheDocument();
    });
  });

  it("shows error when API call fails", async () => {
    (changeMyPassword as any).mockRejectedValue(new Error("Неверный текущий пароль"));
    renderWithContext();

    const oldPasswordInput = screen.getByLabelText(/Текущий пароль/i);
    const newPasswordInput = screen.getByLabelText(/^Новый пароль/i);
    const confirmPasswordInput = screen.getByLabelText(/Подтверждение пароля/i);
    const submitBtn = screen.getByRole("button", { name: "Сохранить" });

    await userEvent.type(oldPasswordInput, "wrong");
    await userEvent.type(newPasswordInput, "new12345");
    await userEvent.type(confirmPasswordInput, "new12345");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Неверный текущий пароль")).toBeInTheDocument();
    });
  });
});
