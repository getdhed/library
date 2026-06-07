import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CssBaseline, GlobalStyles, ThemeProvider as MuiThemeProvider } from "@mui/material";
import { createAppTheme, getGlobalStyles } from "./muiTheme";

export type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "library-theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): ThemeMode {
  return "light";
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => getInitialTheme());
  const muiTheme = useMemo(() => createAppTheme(theme), [theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
    window.localStorage.setItem(STORAGE_KEY, "light");
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: () => setThemeState("light"),
      toggleTheme: () => setThemeState("light"),
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        <GlobalStyles styles={getGlobalStyles(theme)} />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
