import { alpha, createTheme, type CSSObject, type PaletteMode } from "@mui/material/styles";

const tokens = {
  light: {
    bg: "#f2efe8",
    panel: "#fbf8f2",
    surface: "#fffdf8",
    surfaceMuted: "#f6f1e7",
    ink: "#1c2430",
    muted: "#62707d",
    line: "#d4cfc3",
    accent: "#0a6c74",
    accentStrong: "#07444a",
    warm: "#c7824c",
    danger: "#b54c37",
    bodyRadial: "rgba(199, 130, 76, 0.22)",
    bodyStart: "#f6f2ea",
    bodyEnd: "#ece7dd",
    sidebarStart: "#17363c",
    sidebarEnd: "#0f2227",
    sidebarInk: "#f8f5f0",
  },
  dark: {
    bg: "#10161d",
    panel: "#161e27",
    surface: "#17212b",
    surfaceMuted: "#1d2732",
    ink: "#eef3f7",
    muted: "#9caab7",
    line: "#2e3a48",
    accent: "#3db6bf",
    accentStrong: "#7ad8e0",
    warm: "#e3a36d",
    danger: "#ff8d72",
    bodyRadial: "rgba(61, 182, 191, 0.12)",
    bodyStart: "#0f151d",
    bodyEnd: "#18222d",
    sidebarStart: "#0a1118",
    sidebarEnd: "#121d27",
    sidebarInk: "#f0f5f7",
  },
} as const;

export function createAppTheme(mode: PaletteMode) {
  const t = tokens[mode];

  return createTheme({
    palette: {
      mode,
      primary: {
        main: t.accent,
        dark: t.accentStrong,
        light: alpha(t.accent, 0.82),
        contrastText: mode === "light" ? "#ffffff" : "#081318",
      },
      secondary: {
        main: t.warm,
        dark: alpha(t.warm, 0.8),
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
      borderRadius: 16,
    },
    typography: {
      fontFamily: '"Segoe UI", "Trebuchet MS", sans-serif',
      h1: { fontWeight: 700, letterSpacing: "-0.03em" },
      h2: { fontWeight: 700, letterSpacing: "-0.02em" },
      h3: { fontWeight: 700 },
      overline: {
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      },
      button: { fontWeight: 700, textTransform: "none" },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background:
              `radial-gradient(circle at top left, ${t.bodyRadial}, transparent 30%), ` +
              `linear-gradient(135deg, ${t.bodyStart}, ${t.bodyEnd})`,
            color: t.ink,
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
          variant: "outlined",
        },
        styleOverrides: {
          root: {
            borderColor: alpha(t.line, 0.8),
            backgroundColor: t.panel,
            boxShadow:
              mode === "light"
                ? "0 18px 40px rgba(28, 36, 48, 0.12)"
                : "0 20px 44px rgba(0, 0, 0, 0.34)",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderColor: alpha(t.line, 0.84),
            backgroundColor: t.surface,
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 14,
            minHeight: 42,
          },
          containedPrimary: {
            background: `linear-gradient(180deg, ${alpha(t.accent, 0.82)}, ${t.accent})`,
            "&:hover": {
              background: `linear-gradient(180deg, ${alpha(t.accentStrong, 0.84)}, ${t.accentStrong})`,
            },
          },
          outlined: {
            borderColor: alpha(t.accent, 0.3),
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundColor: t.surface,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(t.line, 0.95),
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 44,
            borderRadius: 10,
            textTransform: "none",
            fontWeight: 700,
            "&.Mui-selected": {
              backgroundColor: alpha(t.accent, 0.12),
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            border: `1px solid ${alpha(t.accent, 0.2)}`,
            backgroundColor: alpha(t.accent, 0.1),
            color: t.accentStrong,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: 12,
            borderRadius: 10,
            backgroundColor: alpha(mode === "light" ? "#243238" : "#0c141a", 0.92),
          },
          arrow: {
            color: alpha(mode === "light" ? "#243238" : "#0c141a", 0.92),
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderColor: alpha(t.line, 0.85),
            backgroundColor: alpha(t.panel, 0.98),
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            border: `1px solid ${alpha(t.line, 0.75)}`,
            backgroundColor: alpha(t.panel, 0.9),
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: alpha(t.line, 0.6),
          },
          head: {
            fontWeight: 700,
            color: t.ink,
            backgroundColor: alpha(t.surfaceMuted, 0.9),
          },
        },
      },
    },
  });
}

export function getGlobalStyles(mode: PaletteMode): CSSObject {
  const t = tokens[mode];
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
    },
    "::-webkit-scrollbar": {
      width: 12,
      height: 12,
    },
    "::-webkit-scrollbar-thumb": {
      backgroundColor: alpha(t.accent, 0.28),
      borderRadius: 999,
      border: `3px solid ${t.bg}`,
    },
    "::-webkit-scrollbar-track": {
      backgroundColor: alpha(t.bg, 0.9),
    },
  };
}

export type ThemeTokens = (typeof tokens)["light"];

export function getThemeTokens(mode: PaletteMode): ThemeTokens {
  return tokens[mode];
}

