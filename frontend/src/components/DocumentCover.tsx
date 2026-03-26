import React, { useEffect, useState } from "react";
import { Box, Chip, Typography } from "@mui/material";
import { documentCoverUrl } from "../api/library";
import type { DocumentItem } from "../types";

type Props = {
  item: DocumentItem;
  token?: string | null;
};

const DocumentCover: React.FC<Props> = ({
  item,
  token,
}) => {
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setCoverFailed(false);
  }, [item.id, item.coverPath, item.fileName, item.updatedAt]);

  const isPdf = item.mimeType.toLowerCase().includes("pdf");
  const coverUrl =
    token && isPdf ? documentCoverUrl(item.id, token, item.updatedAt) : "";

  return (
    <Box
      sx={{
        borderRadius: 2.5,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        p: 1.25,
        minHeight: 186,
        background: (theme) =>
          theme.palette.mode === "light"
            ? "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(240,247,240,0.95))"
            : "linear-gradient(180deg, rgba(245,251,245,0.98), rgba(221,238,224,0.94))",
      }}
    >
      {coverUrl && !coverFailed ? (
        <Box
          component="img"
          src={coverUrl}
          alt={`Обложка ${item.title}`}
          loading="lazy"
          decoding="async"
          onError={() => setCoverFailed(true)}
          sx={{
            width: "100%",
            height: 156,
            objectFit: "cover",
            borderRadius: 2,
            display: "block",
          }}
        />
      ) : (
        <Box
          aria-hidden="true"
          sx={{
            borderRadius: 2,
            minHeight: 156,
            display: "grid",
            placeItems: "center",
            alignContent: "center",
            gap: 1,
            p: 2,
            textAlign: "center",
            backgroundColor: (theme) =>
              theme.palette.mode === "light" ? "rgba(10,108,116,0.08)" : "rgba(61,182,191,0.15)",
          }}
        >
          <Chip size="small" label="PDF" />
          <Typography variant="subtitle2" fontWeight={700}>
            {item.type}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DocumentCover;

