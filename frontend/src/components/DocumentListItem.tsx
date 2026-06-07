import React from "react";
import { Chip, Paper, Stack, Typography, alpha } from "@mui/material";
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
        p: 1.8,
        borderRadius: 0,
        borderColor: (theme) => alpha(theme.palette.divider, 0.95),
        display: "grid",
        gridTemplateColumns: "minmax(132px, 164px) minmax(0, 1fr)",
        gap: 1.6,
        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.98),
      }}
    >
      <Link
        to={`/documents/${item.id}`}
        style={linkSx}
        aria-label={`Открыть карточку ${item.title}`}
      >
        <DocumentCover item={item} token={token} variant="card" priority={priorityCover} />
      </Link>

      <Stack direction={actions ? "row" : "column"} justifyContent="space-between" spacing={1.5}>
        <Stack spacing={0.75} minWidth={0}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip size="small" label={item.type} />
            <Typography variant="caption" color="text.secondary">
              {item.year}
            </Typography>
          </Stack>

          <Typography
            component={Link}
            to={`/documents/${item.id}`}
            variant="h6"
            fontWeight={700}
            sx={{
              ...linkSx,
              lineHeight: 1.2,
              letterSpacing: "0.01em",
              "&:hover": {
                color: "primary.main",
              },
            }}
          >
            {item.title}
          </Typography>

          {actions && item.author && (
            <Typography fontWeight={600}>
              {item.author}
            </Typography>
          )}


        </Stack>

        {actions && (
          <Stack justifyContent="center" alignItems="flex-end">
            {actions}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

export default DocumentListItem;
