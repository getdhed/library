import React from "react";
import { Chip, Paper, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import DocumentCover from "./DocumentCover";
import type { DocumentItem } from "../types";

type Props = {
  item: DocumentItem;
  token?: string | null;
  actions?: React.ReactNode;
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
}) => {
  return (
    <Paper
      component="article"
      sx={{
        p: 2.25,
        borderRadius: 3,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "minmax(132px, 164px) minmax(0, 1fr)" },
        gap: 2.25,
        background: (theme) =>
          theme.palette.mode === "light"
            ? "linear-gradient(180deg, rgba(255,253,248,0.98), rgba(246,241,231,0.74))"
            : "linear-gradient(180deg, rgba(23,33,43,0.96), rgba(29,39,50,0.88))",
      }}
    >
      <Link
        to={`/documents/${item.id}`}
        style={linkSx}
        aria-label={`Открыть карточку ${item.title}`}
      >
        <DocumentCover item={item} token={token} />
      </Link>

      <Stack
        direction={{ xs: "column", md: actions ? "row" : "column" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Stack spacing={0.75} minWidth={0}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip size="small" label={item.type} />
            <Typography variant="body2" color="text.secondary">
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

          <Typography color="text.secondary">
            {item.department}
          </Typography>

          {item.faculty && (
            <Typography variant="body2" color="text.secondary">
              {item.faculty}
            </Typography>
          )}
        </Stack>

        {actions && (
          <Stack justifyContent="center" alignItems={{ xs: "flex-start", md: "flex-end" }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

export default DocumentListItem;

