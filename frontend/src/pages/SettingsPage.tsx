import React from "react";
import { useTheme } from "../theme/ThemeContext";

const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="page-shell page-shell-clean">
      <div className="page-header">
        <div>
          <p className="eyebrow">Профиль</p>
          <h1>Настройки</h1>
        </div>
      </div>

      <div className="content-card content-card-flat settings-card">
        <div className="settings-row">
          <div>
            <h2>Тема интерфейса</h2>
            <p className="muted-text">
              Светлая тема использует спокойную институтскую палитру, а тёмная
              версия остаётся приглушённой и удобной для долгой работы с
              документами.
            </p>
          </div>

          <div className="theme-switcher" role="group" aria-label="Переключение темы">
            <button
              type="button"
              className={`theme-option ${theme === "light" ? "active" : ""}`}
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
            >
              <span className="theme-option-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 3.5a1 1 0 0 1 1 1V6a1 1 0 1 1-2 0V4.5a1 1 0 0 1 1-1m0 13a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9m7.5-5.5H18a1 1 0 1 0 0 2h1.5a1 1 0 1 0 0-2M7 12a1 1 0 0 0-1-1H4.5a1 1 0 1 0 0 2H6a1 1 0 0 0 1-1m9.6-5.6 1.06-1.06a1 1 0 1 1 1.42 1.42L18.02 7.8a1 1 0 0 1-1.42-1.42M5.92 17.02l1.06-1.06A1 1 0 1 1 8.4 17.38l-1.06 1.06a1 1 0 1 1-1.42-1.42m12.16 1.42a1 1 0 0 1-1.42 0L15.6 17.38a1 1 0 1 1 1.42-1.42l1.06 1.06a1 1 0 0 1 0 1.42M8.4 6.62A1 1 0 0 1 6.98 8.04L5.92 6.98A1 1 0 1 1 7.34 5.56z" />
                </svg>
              </span>
              <span>Светлая тема</span>
            </button>

            <button
              type="button"
              className={`theme-option ${theme === "dark" ? "active" : ""}`}
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
            >
              <span className="theme-option-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M14.8 2.6a1 1 0 0 1 .78 1.6A8 8 0 1 0 19.8 16.9a1 1 0 0 1 1.6.78A10 10 0 1 1 14.8 2.6" />
                </svg>
              </span>
              <span>Тёмная тема</span>
            </button>
          </div>
        </div>
      </div>

      <div className="content-card content-card-flat settings-card settings-note-card">
        <h2>Что можно развивать дальше</h2>
        <p className="muted-text">
          Здесь можно расширить профиль пользователя, чтение PDF, персональные
          настройки поиска и поведение карточек документов.
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
