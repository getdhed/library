import React from "react";
import { Box, Chip, Paper, Stack, Typography, alpha } from "@mui/material";
import { Link } from "react-router-dom";
import DocumentCover from "./DocumentCover";
import type { DocumentItem } from "../types";

type Props = {
  item: DocumentItem;
  token?: string | null;
  actions?: React.ReactNode;
  priorityCover?: boolean;
};

const linkSx = {
  color: "inherit",
  textDecoration: "none",
  display: "block",
};

const DocumentListItem: React.FC<Props> = ({
  item,
  token,
  actions,
  priorityCover = false,
}) => {
  return (
    <Paper
      component="article"
      sx={{
        position: "relative",
        p: 1.8,
        borderRadius: 0,
        borderBottom: (theme: any) => `2px solid ${alpha(theme.palette.divider, 1)}`,
        display: "grid",
        gridTemplateColumns: "minmax(132px, 164px) minmax(0, 1fr)",
        gap: 1.6,
        backgroundColor: "transparent",
        transition: "background-color 0.15s ease",
        cursor: "pointer",
        "&:hover": {
          backgroundColor: (theme: any) => alpha(theme.palette.primary.main, 0.1),
        },
      }}
    >
      <Box
        component={Link}
        to={`/documents/${item.id}`}
        aria-label={`Открыть карточку ${item.title}`}
        sx={{
          display: "block",
          textDecoration: "none",
          color: "inherit",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            zIndex: 1,
          },
        }}
      >
        <DocumentCover item={item} token={token} variant="card" priority={priorityCover} />
      </Box>

      <Stack direction={actions ? "row" : "column"} justifyContent="space-between" spacing={1.5}>
        <Stack spacing={0.75} minWidth={0}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip size="small" label={item.type} />
            <Typography variant="caption" color="text.secondary">
              {item.year}
            </Typography>
          </Stack>

          <Typography
            variant="h6"
            fontWeight={700}
            sx={{
              lineHeight: 1.2,
              letterSpacing: "0.01em",
            }}
          >
            {item.title}
          </Typography>

          {item.author && (
            <Typography
              component={Link}
              to={`/search?author=${encodeURIComponent(item.author)}`}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              fontWeight={600}
              sx={{
                color: "success.main",
                textDecoration: "none",
                position: "relative",
                zIndex: 2,
                display: "inline-block",
                width: "fit-content",
                "&:hover": {
                  color: "success.dark",
                  textDecoration: "underline",
                },
              }}
            >
              {item.author}
            </Typography>
          )}

        </Stack>

        {actions && (
          <Stack justifyContent="center" alignItems="flex-end" sx={{ position: "relative", zIndex: 2 }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

export default DocumentListItem;
