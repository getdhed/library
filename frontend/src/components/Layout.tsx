import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Divider,
  Menu,
  Stack,
  Typography,
  alpha,
  useTheme as useMuiTheme,
} from "@mui/material";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { prefetchPath, useSmartRoutePrefetch } from "../routing/routePrefetch";
import { getThemeTokens } from "../theme/muiTheme";

type NavItem = {
  to: string;
  label: string;
};

const navItems: NavItem[] = [
  { to: "/", label: "Главная" },
  { to: "/search", label: "Поиск" },
  { to: "/favorites", label: "Избранное" },
];

const adminItem: NavItem = {
  to: "/admin/documents",
  label: "Админка",
};

const linkReset = {
  color: "inherit",
  textDecoration: "none",
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const muiTheme = useMuiTheme();
  const location = useLocation();
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);

  const tokens = getThemeTokens(muiTheme.palette.mode);
  const items = useMemo(
    () => (user?.role === "admin" ? [...navItems, adminItem] : navItems),
    [user?.role]
  );
  const accountMenuOpen = Boolean(accountAnchor);

  useSmartRoutePrefetch(location.pathname, user?.role);

  useEffect(() => {
    setAccountAnchor(null);
  }, [location.pathname]);

  function openAccountMenu(event: React.MouseEvent<HTMLElement>) {
    setAccountAnchor(event.currentTarget);
  }

  function closeAccountMenu() {
    setAccountAnchor(null);
  }

  function handleLogout() {
    closeAccountMenu();
    logout();
  }

  function handleNavIntent(path: string) {
    void prefetchPath(path);
  }

  function renderAccountMenu() {
    return (
      <Menu
        anchorEl={accountAnchor}
        open={accountMenuOpen}
        onClose={closeAccountMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        MenuListProps={{ "aria-label": "Меню аккаунта" }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 280,
              borderRadius: 0,
              borderColor: (theme) => alpha(theme.palette.divider, 0.95),
              p: 0,
              mt: 0.5,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.4 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {user?.fullName ?? "Гость"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.username ?? "guest"}
          </Typography>
        </Box>

        <Divider />

        {user?.role === "user" && (
          <Button
            component={Link}
            to="/account/pdfs"
            onClick={closeAccountMenu}
            onMouseEnter={() => handleNavIntent("/account/pdfs")}
            onFocus={() => handleNavIntent("/account/pdfs")}
            color="inherit"
            sx={{
              justifyContent: "flex-start",
              width: "100%",
              px: 2,
              minHeight: 42,
              borderRadius: 0,
            }}
          >
            Мои PDF
          </Button>
        )}

        <Button
          component={Link}
          to="/settings"
          onClick={closeAccountMenu}
          onMouseEnter={() => handleNavIntent("/settings")}
          onFocus={() => handleNavIntent("/settings")}
          color="inherit"
          sx={{
            justifyContent: "flex-start",
            width: "100%",
            px: 2,
            minHeight: 42,
            borderRadius: 0,
          }}
        >
          Настройки
        </Button>

        <Divider />

        <Box sx={{ p: 1 }}>
          <Button
            fullWidth
            color="inherit"
            onClick={handleLogout}
            sx={{
              minHeight: 40,
              borderRadius: 0,
            }}
          >
            Выйти
          </Button>
        </Box>
      </Menu>
    );
  }

  function renderNavLink(item: NavItem) {
    const isSearchAccent = item.to === "/search";

    return (
      <Box
        key={item.to}
        component={NavLink}
        to={item.to}
        title={item.label}
        aria-label={item.label}
        data-header-accent={isSearchAccent ? "danger" : undefined}
        onMouseEnter={() => handleNavIntent(item.to)}
        onFocus={() => handleNavIntent(item.to)}
        sx={{
          ...linkReset,
          fontSize: "0.7rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: isSearchAccent ? tokens.headerInk : alpha(tokens.headerInk, 0.84),
          px: 2.2,
          height: 64,
          display: "flex",
          alignItems: "center",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
          backgroundColor: isSearchAccent ? tokens.danger : "transparent",
          transition: "background-color 0.2s ease, color 0.2s ease",
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: tokens.warm,
            transform: "scaleX(0)",
            transition: "transform 0.2s ease",
            display: isSearchAccent ? "none" : "block",
          },
          "&.active": {
            color: tokens.headerInk,
            backgroundColor: isSearchAccent ? "#a02525" : "rgba(255,255,255,0.06)",
            "&::after": {
              transform: "scaleX(1)",
            },
          },
          "&:hover": {
            backgroundColor: isSearchAccent ? "#a02525" : "rgba(255,255,255,0.04)",
            color: tokens.headerInk,
            "&::after": {
              transform: "scaleX(1)",
            },
          },
        }}
      >
        {item.label}
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1600,
          px: 1.5,
          py: 1,
          borderRadius: 0,
          color: "text.primary",
          backgroundColor: "background.paper",
          border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.44)}`,
          transform: "translateY(-220%)",
          transition: "transform 0.2s ease",
          "&:focus-visible": {
            transform: "translateY(0)",
            outline: (theme) => `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
            outlineOffset: 2,
          },
        }}
      >
        Перейти к содержимому
      </Box>

      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          bgcolor: tokens.headerBg,
          borderBottom: `3px solid ${tokens.headerBorder}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
            px: 3,
            maxWidth: 1700,
            mx: "auto",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              component={Link}
              to="/"
              title="Библиотека ИПС"
              sx={{
                ...linkReset,
                display: "flex",
                alignItems: "center",
                gap: 1.2,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: tokens.warm,
                  color: tokens.accentStrong,
                  clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 18,
                  letterSpacing: "0.06em",
                  flexShrink: 0,
                }}
              >
                ПС
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: "1.24rem",
                    lineHeight: 1,
                    letterSpacing: "0.08em",
                    color: tokens.headerInk,
                  }}
                >
                  Библиотека ИПС
                </Typography>
                <Typography
                  sx={{
                    mt: 0.2,
                    fontSize: "0.6rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: alpha(tokens.headerInk, 0.6),
                  }}
                >
                  Электронный архив документов
                </Typography>
              </Box>
            </Box>
          </Stack>

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box
              component="nav"
              aria-label="Основная навигация"
              sx={{ display: "flex", alignItems: "center" }}
            >
              {items.map(renderNavLink)}
            </Box>

            <Button
              color="inherit"
              onClick={openAccountMenu}
              aria-label="Открыть меню аккаунта"
              sx={{
                ml: 2,
                minHeight: 52,
                px: 1.4,
                borderRadius: 0,
                border: "1px solid rgba(255,255,255,0.22)",
                backgroundColor: "rgba(255,255,255,0.04)",
                color: alpha(tokens.headerInk, 0.94),
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderColor: "rgba(255,255,255,0.35)",
                },
              }}
            >
              <Avatar
                sx={{
                  mr: 1.1,
                  width: 30,
                  height: 30,
                  bgcolor: "rgba(255,255,255,0.14)",
                  color: tokens.headerInk,
                  border: "1px solid rgba(255,255,255,0.22)",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {user?.fullName?.slice(0, 1).toUpperCase() ?? "U"}
              </Avatar>
              <Box sx={{ textAlign: "left", minWidth: 0 }}>
                <Typography
                  sx={{
                    display: "block",
                    fontSize: "0.6rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: alpha(tokens.headerInk, 0.58),
                  }}
                >
                  Аккаунт
                </Typography>
                <Typography fontWeight={600} noWrap sx={{ maxWidth: 170 }}>
                  {user?.fullName ?? "Гость"}
                </Typography>
              </Box>
            </Button>
          </Box>
        </Box>
      </Box>

      {renderAccountMenu()}

      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flex: 1,
          width: "100%",
          maxWidth: 1700,
          mx: "auto",
          px: 3,
          py: 3.5,
        }}
      >
        {children}
      </Box>

      <Box
        component="footer"
        sx={{
          mt: "auto",
          bgcolor: tokens.footerBg,
          borderTop: `3px solid ${tokens.accent}`,
          color: alpha(tokens.headerInk, 0.84),
          px: 3,
          py: 4,
        }}
      >
        <Box
          sx={{
            maxWidth: 1700,
            mx: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography
            sx={{
              fontSize: "1.1rem",
              letterSpacing: "0.08em",
              color: alpha(tokens.headerInk, 0.86),
            }}
          >
            ИПС РБ · Библиотека
          </Typography>

          <Typography
            sx={{
              fontSize: "0.62rem",
              letterSpacing: "0.08em",
              textAlign: "center",
              color: alpha(tokens.headerInk, 0.58),
              lineHeight: 1.8,
            }}
          >
            Институт пограничной службы Республики Беларусь
            <br />
            Электронная библиотека учебных и методических материалов
            <br />
            v1.0 · 2026
          </Typography>

          <Typography
            sx={{
              fontSize: "0.64rem",
              letterSpacing: "0.08em",
              textAlign: "right",
              color: alpha(tokens.headerInk, 0.58),
              lineHeight: 1.8,
            }}
          >
            Администратор библиотеки
            <br />
            admin@library.local
            <br />
            Пн–Пт, 08:00–17:00
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
