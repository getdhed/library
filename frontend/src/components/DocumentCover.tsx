import React, { useEffect, useState } from "react";
import { Box, Chip } from "@mui/material";
import { documentCoverUrl } from "../api/library";
import type { DocumentItem } from "../types";

type Props = {
  item: DocumentItem;
  token?: string | null;
  variant?: "card" | "details";
  priority?: boolean;
};

const DocumentCover: React.FC<Props> = ({
  item,
  token,
  variant = "card",
  priority = false,
}) => {
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setCoverFailed(false);
  }, [item.id, item.coverPath, item.fileName, item.updatedAt]);

  const isPdf = item.mimeType.toLowerCase().includes("pdf");
  const coverUrl =
    token && isPdf ? documentCoverUrl(item.id, token, item.updatedAt) : "";
  const isCard = variant === "card";

  return (
    <Box
      sx={{
        borderRadius: 0,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        p: isCard ? 0.9 : 1.1,
        position: "relative",
        backgroundColor: "background.paper",
      }}
    >
      <Box
        sx={{
          borderRadius: 0,
          overflow: "hidden",
          border: (theme) => `1px solid ${theme.palette.divider}`,
          backgroundColor: (theme) => theme.palette.background.default,
          aspectRatio: "1 / 1.4142",
          width: "100%",
          maxWidth: isCard ? 172 : "none",
          mx: isCard ? "auto" : 0,
        }}
      >
        {coverUrl && !coverFailed ? (
          <Box
            component="img"
            src={coverUrl}
            alt={`Обложка ${item.title}`}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            onError={() => setCoverFailed(true)}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <Box
            aria-hidden="true"
            sx={{
              height: "100%",
              display: "grid",
              placeItems: "center",
              alignContent: "center",
              gap: 1,
              p: 2,
              textAlign: "center",
              backgroundColor: (theme) => `rgba(74,92,58,${theme.palette.mode === "light" ? 0.12 : 0.2})`,
            }}
          >
            <Chip size="small" label="PDF" />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DocumentCover;
