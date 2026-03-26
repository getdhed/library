import React from "react";
import {
  Box,
  Button,
  ButtonProps,
  Paper,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

export const pageShellSx = {
  display: "grid",
  gap: 2.25,
};

export const contentCardSx = {
  borderRadius: 3,
  p: { xs: 2, md: 2.75 },
  background: (theme: any) =>
    theme.palette.mode === "light"
      ? "linear-gradient(180deg, rgba(255,253,248,0.98), rgba(246,241,231,0.74))"
      : "linear-gradient(180deg, rgba(23,33,43,0.96), rgba(29,39,50,0.88))",
};

export const headerCardSx = {
  borderRadius: 3.5,
  p: { xs: 2.25, md: 3 },
  background: (theme: any) =>
    `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(
      theme.palette.background.paper,
      0.95
    )} 62%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
};

export const eyebrowSx: SxProps<Theme> = {
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "secondary.main",
  fontWeight: 700,
};

export const tableSurfaceSx: SxProps<Theme> = {
  borderRadius: 2.5,
  overflow: "hidden",
};

export const filterPanelSx: SxProps<Theme> = {
  p: 1.5,
  borderRadius: 2.5,
};

export const cardActionIconButtonSx: SxProps<Theme> = {
  width: 42,
  height: 42,
  borderRadius: 2,
  border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.95)}`,
  backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.82),
  color: "text.primary",
  "&:hover": {
    borderColor: "primary.main",
    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
  },
  "&:focus-visible": {
    outline: (theme) => `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
    outlineOffset: 2,
  },
};

export const cardActionIconButtonActiveSx: SxProps<Theme> = {
  borderColor: "primary.main",
  background: (theme) =>
    `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.86)}, ${theme.palette.primary.main})`,
  color: "primary.contrastText",
  "&:hover": {
    background: (theme) =>
      `linear-gradient(180deg, ${alpha(theme.palette.primary.dark, 0.88)}, ${theme.palette.primary.dark})`,
    borderColor: "primary.dark",
  },
};

export const cardActionIconButtonPrimarySx: SxProps<Theme> = {
  color: "primary.main",
  borderColor: (theme) => alpha(theme.palette.primary.main, 0.28),
  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
  "&:hover": {
    borderColor: "primary.main",
    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.18),
  },
};

export const cardActionIconButtonDangerSx: SxProps<Theme> = {
  color: "error.main",
  borderColor: (theme) => alpha(theme.palette.error.main, 0.32),
  backgroundColor: (theme) => alpha(theme.palette.error.main, 0.1),
  "&:hover": {
    borderColor: "error.main",
    backgroundColor: (theme) => alpha(theme.palette.error.main, 0.2),
  },
};

export type StatusTone = "success" | "warning" | "danger";

export function statusToneChipSx(tone: StatusTone): SxProps<Theme> {
  if (tone === "success") {
    return {
      color: "#1b5e20",
      backgroundColor: "#dbf2dc",
      borderColor: "#aed7b2",
    };
  }

  if (tone === "danger") {
    return {
      color: "#8d1f1f",
      backgroundColor: "#fde3e3",
      borderColor: "#efb7b7",
    };
  }

  return {
    color: "#8a5a00",
    backgroundColor: "#fff1cc",
    borderColor: "#f0d58a",
  };
}

export const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <Box sx={pageShellSx}>{children}</Box>;
};

export const ContentCard: React.FC<{ children: React.ReactNode; sx?: object }> = ({
  children,
  sx,
}) => {
  return (
    <Paper sx={{ ...contentCardSx, ...(sx ?? {}) }}>
      {children}
    </Paper>
  );
};

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  side?: React.ReactNode;
};

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  side,
}) => {
  return (
    <Paper sx={headerCardSx}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.75}
        alignItems={{ xs: "flex-start", sm: "flex-end" }}
        justifyContent="space-between"
      >
        <Box>
          {eyebrow && (
            <Typography variant="caption" sx={eyebrowSx}>
              {eyebrow}
            </Typography>
          )}
          <Typography component="h1" variant="h4" sx={{ mt: eyebrow ? 0.8 : 0 }}>
            {title}
          </Typography>
          {description && (
            <Typography color="text.secondary" sx={{ mt: 0.8, maxWidth: "62ch" }}>
              {description}
            </Typography>
          )}
        </Box>
        {side && <Box>{side}</Box>}
      </Stack>
    </Paper>
  );
};

export function PrimaryButton(props: ButtonProps) {
  return <Button variant="contained" color="primary" {...props} />;
}

export function SecondaryButton(props: ButtonProps) {
  return <Button variant="outlined" color="primary" {...props} />;
}

