import React, { useEffect, useState } from "react";
import { Box, Chip, Typography } from "@mui/material";
import { ImageNotSupported } from "@mui/icons-material";
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
        overflow: "hidden",
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
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              p: 2,
              textAlign: "center",
              backgroundColor: (theme) =>
                theme.palette.mode === "light" ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
              color: "text.disabled",
            }}
          >
            <ImageNotSupported sx={{ fontSize: 40, opacity: 0.5 }} />
            <Typography variant="caption" sx={{ fontWeight: 500, opacity: 0.7 }}>
              Нет превью
            </Typography>
          </Box>
        )}
      </Box>
  );
};

export default DocumentCover;
