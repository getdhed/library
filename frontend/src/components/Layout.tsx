import React, { useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  Stack,
  Toolbar,
  Typography,
  alpha,
  useTheme as useMuiTheme,
} from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { prefetchPath, useSmartRoutePrefetch } from "../routing/routePrefetch";
import { getThemeTokens } from "../theme/muiTheme";

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
};

type NavMode = "desktop" | "topbar-icons" | "topbar-compact" | "mobile";

const navItems: NavItem[] = [
  { to: "/", label: "Главная", icon: <HomeRoundedIcon /> },
  { to: "/search", label: "Поиск", icon: <SearchRoundedIcon /> },
  { to: "/catalog", label: "Каталог", icon: <MenuBookRoundedIcon /> },
  { to: "/favorites", label: "Избранное", icon: <FavoriteRoundedIcon /> },
];

const adminItem: NavItem = {
  to: "/admin/documents",
  label: "Админка",
  icon: <AdminPanelSettingsRoundedIcon />,
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

const linkReset = {
  color: "inherit",
  textDecoration: "none",
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const muiTheme = useMuiTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);
  const [navMode, setNavMode] = useState<NavMode>(() => getNavMode(window.innerWidth));

  const paletteTokens = getThemeTokens(muiTheme.palette.mode);
  const items = useMemo(
    () => (user?.role === "admin" ? [...navItems, adminItem] : navItems),
    [user?.role]
  );

  const accountMenuOpen = Boolean(accountAnchor);
  const usesTopbar = navMode === "topbar-icons" || navMode === "topbar-compact" || navMode === "mobile";
  const showsCompactMenu = navMode === "topbar-compact" || navMode === "mobile";

  useSmartRoutePrefetch(location.pathname, user?.role);

  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountAnchor(null);
  }, [location.pathname]);

  useEffect(() => {
    function handleResize() {
      const nextMode = getNavMode(window.innerWidth);
      setNavMode(nextMode);

      if (nextMode === "desktop" || nextMode === "topbar-icons") {
        setMobileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountAnchor(null);
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

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
              minWidth: 260,
              borderRadius: 2,
              p: 1,
            },
          },
        }}
      >
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {user?.fullName ?? "Гость"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email ?? "guest@library.local"}
          </Typography>
        </Box>

        <Divider sx={{ my: 0.5 }} />

        {user?.role === "user" && (
          <Button
            component={Link}
            to="/account/pdfs"
            onClick={closeAccountMenu}
            onMouseEnter={() => handleNavIntent("/account/pdfs")}
            onFocus={() => handleNavIntent("/account/pdfs")}
            color="inherit"
            startIcon={<DescriptionRoundedIcon fontSize="small" />}
            sx={{
              justifyContent: "flex-start",
              width: "100%",
              px: 1.5,
              py: 1.1,
              borderRadius: 1.5,
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
          startIcon={<SettingsRoundedIcon fontSize="small" />}
          sx={{
            justifyContent: "flex-start",
            width: "100%",
            px: 1.5,
            py: 1.1,
            borderRadius: 1.5,
          }}
        >
          Настройки
        </Button>

        <Box sx={{ px: 1, pt: 0.5, pb: 0.75 }}>
          <Button
            fullWidth
            color="inherit"
            startIcon={<LogoutRoundedIcon />}
            onClick={handleLogout}
          >
            Выйти
          </Button>
        </Box>
      </Menu>
    );
  }

  function renderNavList(isCompact = false) {
    return (
      <List component="nav" aria-label="Основная навигация" sx={{ py: 0.5, px: isCompact ? 0 : 0.5 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            onClick={isCompact ? closeMobileMenu : undefined}
            onMouseEnter={() => handleNavIntent(item.to)}
            onFocus={() => handleNavIntent(item.to)}
            sx={{
              minHeight: 48,
              px: 1.5,
              borderRadius: 2,
              mb: 0.5,
              color: isCompact ? "text.primary" : alpha(paletteTokens.sidebarInk, 0.86),
              "&.active": {
                color: isCompact ? "primary.contrastText" : paletteTokens.sidebarInk,
                background: isCompact
                  ? "linear-gradient(180deg, rgba(10, 108, 116, 0.82), #0a6c74)"
                  : alpha("#ffffff", 0.14),
              },
              "&:hover": {
                background: isCompact
                  ? alpha(paletteTokens.accent, 0.12)
                  : alpha("#ffffff", 0.1),
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: "inherit" }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: 600,
                noWrap: true,
              }}
            />
          </ListItemButton>
        ))}
      </List>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", position: "relative" }}>
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1600,
          px: 1.5,
          py: 1,
          borderRadius: 1.5,
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

      {navMode === "desktop" && (
        <Box
          component="aside"
          sx={{
            width: 292,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            background: `linear-gradient(180deg, ${paletteTokens.sidebarStart}, ${paletteTokens.sidebarEnd})`,
            color: paletteTokens.sidebarInk,
            borderRight: (muiTheme) => `1px solid ${alpha(muiTheme.palette.divider, 0.5)}`,
            px: 2.25,
            py: 2.5,
            gap: 2,
          }}
        >
          <Box
            component={Link}
            to="/"
            title="Библиотека ИПС"
            sx={{
              ...linkReset,
              display: "grid",
              gap: 0.75,
              p: 2,
              borderRadius: 3,
              backgroundColor: alpha("#ffffff", 0.08),
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 1.75,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  fontSize: 13,
                  backgroundColor: alpha("#ffffff", 0.18),
                }}
              >
                PL
              </Box>
              <Typography fontWeight={700} fontSize={20} lineHeight={1.1} noWrap>
                Библиотека ИПС
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: alpha(paletteTokens.sidebarInk, 0.78) }}>
              Институт пограничной службы
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, overflowY: "auto" }}>{renderNavList()}</Box>

          <Button
            color="inherit"
            onClick={openAccountMenu}
            aria-label="Открыть меню аккаунта"
            sx={{
              justifyContent: "flex-start",
              p: 1.25,
              borderRadius: 2,
              backgroundColor: alpha("#ffffff", 0.12),
              border: "1px solid rgba(255,255,255,0.08)",
              "&:hover": {
                backgroundColor: alpha("#ffffff", 0.18),
              },
            }}
          >
            <Avatar sx={{ mr: 1.25, bgcolor: "secondary.main", color: "#17363c", fontWeight: 700 }}>
              {user?.fullName?.slice(0, 1).toUpperCase() ?? "U"}
            </Avatar>
            <Box sx={{ textAlign: "left", minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: alpha(paletteTokens.sidebarInk, 0.72) }}>
                Аккаунт
              </Typography>
              <Typography fontWeight={700} noWrap>
                {user?.fullName ?? "Гость"}
              </Typography>
            </Box>
          </Button>
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {usesTopbar && (
          <AppBar
            position="sticky"
            color="transparent"
            elevation={0}
            sx={{
              top: 0,
              px: { xs: 1.5, sm: 2.25 },
              pt: 1.75,
              background: "transparent",
            }}
          >
            <Toolbar
              disableGutters
              sx={{
                minHeight: "52px !important",
                gap: 1.5,
              }}
            >
              <Box
                component={Link}
                to="/"
                title="Библиотека ИПС"
                sx={{
                  ...linkReset,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 1.5,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    letterSpacing: "0.11em",
                    fontSize: 12,
                    backgroundColor: alpha(paletteTokens.accent, 0.14),
                    color: "primary.dark",
                  }}
                >
                  PL
                </Box>
                <Typography
                  fontWeight={700}
                  variant="h6"
                  sx={{
                    fontSize: { xs: 16, sm: 18 },
                    lineHeight: 1.1,
                    whiteSpace: "nowrap",
                  }}
                >
                  Библиотека ИПС
                </Typography>
              </Box>

              {navMode === "topbar-icons" && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flex: 1, justifyContent: "center" }}
                  aria-label="Основная навигация"
                >
                  {items.map((item) => (
                    <IconButton
                      key={item.to}
                      component={NavLink}
                      to={item.to}
                      title={item.label}
                      aria-label={item.label}
                      onMouseEnter={() => handleNavIntent(item.to)}
                      onFocus={() => handleNavIntent(item.to)}
                      sx={{
                        width: 46,
                        height: 46,
                        borderRadius: 2,
                        border: (muiTheme) => `1px solid ${alpha(muiTheme.palette.divider, 0.9)}`,
                        backgroundColor: alpha(paletteTokens.surface, 0.85),
                        color: "text.primary",
                        "&.active": {
                          background: "linear-gradient(180deg, rgba(10, 108, 116, 0.82), #0a6c74)",
                          color: "primary.contrastText",
                        },
                      }}
                    >
                      {item.icon}
                    </IconButton>
                  ))}
                </Stack>
              )}

              <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
                {navMode === "topbar-icons" && (
                  <IconButton
                    onClick={openAccountMenu}
                    aria-label="Открыть меню аккаунта"
                    title="Аккаунт"
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: 2,
                      border: (muiTheme) => `1px solid ${alpha(muiTheme.palette.divider, 0.9)}`,
                      backgroundColor: alpha(paletteTokens.surface, 0.9),
                    }}
                  >
                    <Avatar sx={{ width: 32, height: 32, fontSize: 14, fontWeight: 700 }}>
                      {user?.fullName?.slice(0, 1).toUpperCase() ?? "U"}
                    </Avatar>
                  </IconButton>
                )}

                {showsCompactMenu && (
                  <IconButton
                    onClick={() => setMobileMenuOpen((value) => !value)}
                    aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
                    title={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: 2,
                      border: (muiTheme) => `1px solid ${alpha(muiTheme.palette.primary.main, 0.22)}`,
                      backgroundColor: alpha(paletteTokens.surface, 0.92),
                    }}
                  >
                    {mobileMenuOpen ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
                  </IconButton>
                )}
              </Box>
            </Toolbar>
          </AppBar>
        )}

        {showsCompactMenu && mobileMenuOpen && (
          <Drawer
            anchor="right"
            open
            onClose={closeMobileMenu}
            sx={{
              "& .MuiDrawer-paper": {
                width: "min(88vw, 340px)",
                p: 2,
                gap: 1.25,
              },
            }}
          >
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Навигация
                </Typography>
                <Typography fontWeight={700}>{user?.fullName ?? "Гость"}</Typography>
              </Box>
              <Button onClick={closeMobileMenu}>Закрыть</Button>
            </Stack>

            <Divider />

            <Box component="nav" aria-label="Меню навигации">
              {renderNavList(true)}
            </Box>

            <Divider />

            <Button
              onClick={openAccountMenu}
              aria-label="Открыть меню аккаунта"
              sx={{ justifyContent: "flex-start", borderRadius: 2 }}
              color="inherit"
            >
              <Avatar sx={{ mr: 1.25, width: 32, height: 32 }}>
                {user?.fullName?.slice(0, 1).toUpperCase() ?? "U"}
              </Avatar>
              <Box sx={{ textAlign: "left", minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">
                  Аккаунт
                </Typography>
                <Typography fontWeight={700} noWrap>
                  {user?.fullName ?? "Гость"}
                </Typography>
              </Box>
            </Button>
          </Drawer>
        )}

        {renderAccountMenu()}

        <Box
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{ px: { xs: 2, sm: 2.5, md: 3.5 }, pb: { xs: 2, md: 3 }, pt: usesTopbar ? 1.5 : 3, flex: 1 }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;

