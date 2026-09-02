import { alpha, createTheme, type CSSObject, type PaletteMode } from "@mui/material/styles";

const tokens = {
  bg: "#f0ede4",
  panel: "#f3efe3",
  surface: "#e8e3d5",
  surfaceMuted: "#d9cfad",
  ink: "#1a2e1a",
  muted: "#4a5c3a",
  line: "#c8bf9e",
  accent: "#4a5c3a",
  accentStrong: "#1a2e1a",
  accentGlow: "#6b7c52",
  warm: "#b8972a",
  danger: "#8b2020",
  headerBg: "#1a2e1a",
  headerInk: "#f0ede4",
  headerBorder: "#b8972a",
  footerBg: "#0f1a0f",
} as const;

export function createAppTheme() {
  const t = tokens;

  return createTheme({
    palette: {
      mode: "light",
      primary: {
        main: t.accent,
        dark: t.accentStrong,
        light: t.accentGlow,
        contrastText: t.headerInk,
      },
      secondary: {
        main: t.warm,
      },
      error: {
        main: t.danger,
      },
      background: {
        default: t.bg,
        paper: t.panel,
      },
      text: {
        primary: t.ink,
        secondary: t.muted,
      },
      divider: t.line,
    },
    shape: {
      borderRadius: 0,
    },
    typography: {
      fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
      h1: {
        fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
        fontWeight: 700,
        letterSpacing: "0.01em",
        lineHeight: 1.06,
      },
      h2: {
        fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
        fontWeight: 400,
        letterSpacing: "0.04em",
      },
      h3: {
        fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
        fontWeight: 400,
        letterSpacing: "0.035em",
      },
      h4: {
        fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
        fontWeight: 400,
        letterSpacing: "0.03em",
      },
      h5: {
        fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
        fontWeight: 400,
        letterSpacing: "0.03em",
      },
      h6: {
        fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
        fontWeight: 600,
      },
      caption: {
        fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
        letterSpacing: "0.08em",
      },
      overline: {
        fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        fontWeight: 500,
      },
      button: {
        fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: t.bg,
            color: t.ink,
            position: "relative",
          },
          a: {
            color: "inherit",
            textDecoration: "none",
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 0,
            backgroundColor: t.panel,
            boxShadow: "none",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            backgroundColor: t.surface,
            boxShadow: "none",
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 0,
            minHeight: 40,
            paddingInline: 16,
          },
          containedPrimary: {
            border: `1px solid ${alpha(t.warm, 0.8)}`,
            backgroundColor: t.warm,
            color: t.accentStrong,
            "&:hover": {
              backgroundColor: "#cba830",
            },
          },
          outlined: {
            borderColor: alpha(t.line, 0.95),
            color: t.ink,
            backgroundColor: alpha(t.panel, 0.9),
            "&:hover": {
              borderColor: t.accent,
              backgroundColor: alpha(t.accent, 0.08),
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            backgroundColor: alpha(t.panel, 0.95),
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(t.line, 0.96),
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: t.accent,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: t.accentStrong,
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            borderRadius: 0,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 40,
            borderRadius: 0,
            "&.Mui-selected": {
              color: t.accentStrong,
              backgroundColor: alpha(t.warm, 0.14),
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 2,
            backgroundColor: t.warm,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            border: `1px solid ${alpha(t.accent, 0.3)}`,
            backgroundColor: alpha(t.accent, 0.08),
            color: t.accent,
            fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: 12,
            borderRadius: 0,
            fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
            backgroundColor: alpha(t.accentStrong, 0.97),
            border: `1px solid ${alpha(t.line, 0.9)}`,
          },
          arrow: {
            color: alpha(t.accentStrong, 0.97),
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
            borderColor: alpha(t.line, 0.95),
            backgroundColor: t.panel,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            borderRadius: 0,
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            border: `1px solid ${alpha(t.line, 0.95)}`,
            backgroundColor: t.panel,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: alpha(t.line, 0.8),
          },
          head: {
            fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 500,
            color: t.ink,
            backgroundColor: alpha(t.surface, 0.8),
          },
        },
      },
    },
  });
}

export function getGlobalStyles(): CSSObject {
  const t = tokens;
  return {
    "*": {
      boxSizing: "border-box",
    },
    body: {
      margin: 0,
      minHeight: "100vh",
    },
    "#root": {
      minHeight: "100vh",
      position: "relative",
      zIndex: 1,
    },
    "::selection": {
      backgroundColor: alpha(t.warm, 0.35),
      color: t.accentStrong,
    },
    "::-webkit-scrollbar": {
      width: 6,
      height: 6,
    },
    "::-webkit-scrollbar-track": {
      backgroundColor: t.surface,
    },
    "::-webkit-scrollbar-thumb": {
      backgroundColor: t.line,
      borderRadius: 0,
    },
    "::-webkit-scrollbar-thumb:hover": {
      backgroundColor: t.accentGlow,
    },
  };
}

export type ThemeTokens = typeof tokens;

export function getThemeTokens(): ThemeTokens {
  return tokens;
}
