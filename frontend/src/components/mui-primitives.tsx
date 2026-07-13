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
  gap: 1.5,
};

export const contentCardSx = {
  borderRadius: 0,
  p: 2.5,
  backgroundColor: (theme: any) => alpha(theme.palette.background.paper, 0.98),
};

export const headerCardSx = {
  borderRadius: 0,
  p: 2.5,
  position: "relative",
  overflow: "hidden",
  backgroundColor: (theme: any) => theme.palette.background.paper,
};

export const eyebrowSx: SxProps<Theme> = {
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "secondary.main",
  fontWeight: 500,
};

export const tableSurfaceSx: SxProps<Theme> = {
  borderRadius: 0,
  overflow: "hidden",
};

export const filterPanelSx: SxProps<Theme> = {
  p: 2,
  borderRadius: 0,
  border: (theme: any) => `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
  backgroundColor: (theme: any) => alpha(theme.palette.background.paper, 0.6),
};

export const cardActionIconButtonSx: SxProps<Theme> = {
  width: 42,
  height: 42,
  borderRadius: 0,
  border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.98)}`,
  backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.98),
  color: "text.primary",
  "&:hover": {
    borderColor: "primary.main",
    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
  },
  "&:focus-visible": {
    outline: (theme) => `2px solid ${alpha(theme.palette.primary.main, 0.52)}`,
    outlineOffset: 2,
  },
};

export const cardActionIconButtonActiveSx: SxProps<Theme> = {
  borderColor: "primary.dark",
  backgroundColor: "primary.main",
  color: "primary.contrastText",
  "&:hover": {
    backgroundColor: "primary.dark",
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
      color: "#f0ede4",
      backgroundColor: "#4a5c3a",
      borderColor: "#3d4d30",
    };
  }

  if (tone === "danger") {
    return {
      color: "#f0ede4",
      backgroundColor: "#8b2020",
      borderColor: "#6f1a1a",
    };
  }

  return {
    color: "#1a2e1a",
    backgroundColor: "#d9cfad",
    borderColor: "#b8972a",
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
        direction="row"
        spacing={1.5}
        alignItems="flex-end"
        justifyContent="space-between"
      >
        <Box>
          {eyebrow && (
            <Typography variant="caption" sx={eyebrowSx}>
              {eyebrow}
            </Typography>
          )}
          <Typography component="h1" variant="h4" fontWeight={700} sx={{ mt: eyebrow ? 0.8 : 0 }}>
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

