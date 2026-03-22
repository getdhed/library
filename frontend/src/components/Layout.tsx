import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
};

type NavMode = "desktop" | "topbar-icons" | "topbar-compact" | "mobile";

const navItems: NavItem[] = [
  {
    to: "/",
    label: "Главная",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    to: "/search",
    label: "Поиск",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10.5 4a6.5 6.5 0 1 0 4.14 11.52l4.92 4.92 1.41-1.41-4.92-4.92A6.5 6.5 0 0 0 10.5 4m0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9" />
      </svg>
    ),
  },
  {
    to: "/catalog",
    label: "Каталог",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3zm3 2v13a4.98 4.98 0 0 1 2-.42H17V7a1 1 0 0 0-1-1z" />
      </svg>
    ),
  },
  {
    to: "/favorites",
    label: "Избранное",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 20.4-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.42 22 7.5c0 3.78-3.4 6.86-8.55 11.58z" />
      </svg>
    ),
  },
];

const adminItem: NavItem = {
  to: "/admin/documents",
  label: "Админка",
  icon: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11.07 4.93 6 7v5c0 3.55 2.42 6.85 6 7.74 3.58-.89 6-4.19 6-7.74V7zm.93 3.19 1.1 2.23 2.46.36-1.78 1.73.42 2.45L12 13.73l-2.2 1.16.42-2.45-1.78-1.73 2.46-.36z" />
    </svg>
  ),
};

function getNavMode(width: number): NavMode {
  if (width <= 700) {
    return "mobile";
  }

  if (width <= 1100) {
    return "topbar-compact";
  }

  if (width <= 1380) {
    return "topbar-icons";
  }

  return "desktop";
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [navMode, setNavMode] = useState<NavMode>(() => getNavMode(window.innerWidth));
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const items = user?.role === "admin" ? [...navItems, adminItem] : navItems;
  const usesTopbar = navMode === "topbar-icons" || navMode === "topbar-compact" || navMode === "mobile";
  const showsCompactMenu = navMode === "topbar-compact" || navMode === "mobile";

  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleResize() {
      const nextMode = getNavMode(window.innerWidth);
      setNavMode(nextMode);

      if (nextMode === "desktop" || nextMode === "topbar-icons") {
        setMobileMenuOpen(false);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function renderAccountMenu() {
    return (
      <div className="account-menu" aria-label="Меню аккаунта">
        <div className="account-menu-header">
          <div className="strong-text">{user?.fullName ?? "Гость"}</div>
          <div className="muted-text">{user?.email ?? "guest@library.local"}</div>
        </div>
        <Link to="/settings" className="account-menu-link">
          Настройки
        </Link>
        <button type="button" className="account-menu-link account-menu-button" onClick={logout}>
          Выйти
        </button>
      </div>
    );
  }

  return (
    <div className={`app-shell nav-mode-${navMode}`}>
      {navMode === "desktop" && (
        <aside className="sidebar desktop-sidebar">
          <Link to="/" className="brand" title="Библиотека ИПС">
            <span className="brand-mark">PL</span>
            <div className="brand-copy">
              <span className="brand-text">Библиотека ИПС</span>
              <span className="brand-subtitle">Институт пограничной службы</span>
            </div>
          </Link>

          <nav className="sidebar-nav" aria-label="Основная навигация">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                aria-label={item.label}
                className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer" ref={accountMenuRef}>
            <button
              type="button"
              className="avatar-tile avatar-button"
              onClick={() => setAccountMenuOpen((value) => !value)}
              aria-label="Открыть меню аккаунта"
            >
              <div className="avatar-circle">{user?.fullName?.slice(0, 1).toUpperCase() ?? "U"}</div>
              <div>
                <div className="muted-label">Аккаунт</div>
                <div className="strong-text">{user?.fullName ?? "Гость"}</div>
              </div>
            </button>

            {accountMenuOpen && <div className="account-menu-shell">{renderAccountMenu()}</div>}
          </div>
        </aside>
      )}

      <div className="mobile-nav-shell">
        {usesTopbar && (
          <header className={`topbar ${navMode}-mode`}>
            <Link to="/" className="brand topbar-brand" title="Библиотека ИПС">
              <span className="brand-mark">PL</span>
              <span className="brand-text">Библиотека ИПС</span>
            </Link>

            {navMode === "topbar-icons" && (
              <nav className="topbar-nav topbar-nav-icons" aria-label="Основная навигация">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    aria-label={item.label}
                    className={({ isActive }) => `topbar-link topbar-icon-link ${isActive ? "active" : ""}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                  </NavLink>
                ))}
              </nav>
            )}

            <div
              className={`topbar-actions ${
                navMode === "topbar-compact" ? "topbar-actions-compact" : ""
              }`}
              ref={accountMenuRef}
            >
              {navMode === "topbar-icons" && (
                <>
                  <button
                    type="button"
                    className="topbar-account-button"
                    onClick={() => setAccountMenuOpen((value) => !value)}
                    aria-label="Открыть меню аккаунта"
                    title="Аккаунт"
                  >
                    <span className="avatar-circle">{user?.fullName?.slice(0, 1).toUpperCase() ?? "U"}</span>
                  </button>

                  {accountMenuOpen && <div className="topbar-account-menu">{renderAccountMenu()}</div>}
                </>
              )}

              {showsCompactMenu && (
                <button
                  type="button"
                  className="burger-button"
                  onClick={() => setMobileMenuOpen((value) => !value)}
                  aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
                  title={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
                >
                  <span />
                  <span />
                  <span />
                </button>
              )}
            </div>
          </header>
        )}

        {showsCompactMenu && mobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={closeMobileMenu}>
            <div className="mobile-menu" onClick={(event) => event.stopPropagation()}>
              <div className="mobile-menu-header">
                <div>
                  <div className="muted-label">Навигация</div>
                  <div className="strong-text">{user?.fullName ?? "Гость"}</div>
                </div>
                <button type="button" className="text-button" onClick={closeMobileMenu}>
                  Закрыть
                </button>
              </div>

              <nav className="mobile-menu-nav" aria-label="Меню навигации">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    aria-label={item.label}
                    onClick={closeMobileMenu}
                    className={({ isActive }) => `mobile-menu-link ${isActive ? "active" : ""}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="mobile-account-block" ref={accountMenuRef}>
                <button
                  type="button"
                  className="avatar-tile avatar-button mobile-account-trigger"
                  onClick={() => setAccountMenuOpen((value) => !value)}
                  aria-label="Открыть меню аккаунта"
                >
                  <div className="avatar-circle">{user?.fullName?.slice(0, 1).toUpperCase() ?? "U"}</div>
                  <div>
                    <div className="muted-label">Аккаунт</div>
                    <div className="strong-text">{user?.fullName ?? "Гость"}</div>
                  </div>
                </button>

                {accountMenuOpen && renderAccountMenu()}
              </div>
            </div>
          </div>
        )}

        <div className="content-shell">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
