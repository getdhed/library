import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import { useParams } from "react-router-dom";
import {
  documentFileUrl,
  getDocument,
  markOpened,
  toggleDocumentFavorite,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import { ContentCard, PageShell } from "../components/mui-primitives";
import DocumentCover from "../components/DocumentCover";
import type { DocumentItem } from "../types";

const BookPage: React.FC = () => {
  const [document, setDocument] = useState<DocumentItem | null>(null);
  const { token } = useAuth();
  const { id } = useParams();

  useEffect(() => {
    if (!token || !id) return;
    getDocument(token, Number(id)).then(setDocument).catch(console.error);
  }, [id, token]);

  if (!document || !token) {
    return (
      <PageShell>
        <ContentCard>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <CircularProgress size={22} />
            <Typography>Загрузка документа...</Typography>
          </Stack>
        </ContentCard>
      </PageShell>
    );
  }

  const fileUrl = documentFileUrl(document.id, token, false, document.updatedAt);
  const downloadUrl = documentFileUrl(
    document.id,
    token,
    true,
    document.updatedAt
  );

  async function toggleFavorite() {
    await toggleDocumentFavorite(token, document.id, document.isFavorite);

    const refreshed = await getDocument(token, document.id);
    setDocument(refreshed);
  }

  function handleOpen() {
    void markOpened(token, document.id).catch(console.error);
  }

  return (
    <PageShell>
      <ContentCard>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box
              component="a"
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              onClick={handleOpen}
              aria-label="Открыть PDF в новой вкладке"
              sx={{ display: "block" }}
            >
              <DocumentCover
                item={document}
                token={token}
              />
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={1.2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={document.type} />
                <Typography color="text.secondary">{document.year}</Typography>
              </Stack>
              <Typography component="h1" variant="h4">
                {document.title}
              </Typography>
              <Typography color="text.secondary">{document.department}</Typography>

              <Stack spacing={0.6} sx={{ mt: 1 }}>
                <Typography fontWeight={700}>Действия с файлом</Typography>
                <Typography color="text.secondary">
                  Открывайте PDF в браузере или скачивайте его как обычный файл.
                </Typography>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.1} sx={{ mt: 1 }}>
                <Button
                  component="a"
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleOpen}
                  aria-label="Открыть документ"
                  title="Открыть документ"
                  variant="contained"
                  startIcon={<OpenInNewRoundedIcon />}
                >
                  Открыть PDF
                </Button>

                <Button
                  component="a"
                  href={downloadUrl}
                  aria-label="Скачать документ"
                  title="Скачать документ"
                  variant="outlined"
                  startIcon={<DownloadRoundedIcon />}
                >
                  Скачать
                </Button>

                <Button
                  type="button"
                  onClick={toggleFavorite}
                  aria-label={
                    document.isFavorite
                      ? "Убрать из избранного"
                      : "Добавить в избранное"
                  }
                  title={
                    document.isFavorite
                      ? "Убрать из избранного"
                      : "Добавить в избранное"
                  }
                  variant={document.isFavorite ? "contained" : "outlined"}
                  startIcon={
                    document.isFavorite ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />
                  }
                >
                  {document.isFavorite ? "В избранном" : "В избранное"}
                </Button>
              </Stack>

              {document.tags.length > 0 && (
                <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  {document.tags.map((tag) => (
                    <Chip key={tag} label={tag} />
                  ))}
                </Stack>
              )}
            </Stack>
          </Grid>
        </Grid>
      </ContentCard>
    </PageShell>
  );
};

export default BookPage;
