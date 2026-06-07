import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
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
import EditDocumentDialog from "../components/EditDocumentDialog";
import type { DocumentItem } from "../types";

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Не указан";
  }

  const units = ["Б", "КБ", "МБ", "ГБ"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

const BookPage: React.FC = () => {
  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { token, user } = useAuth();
  const { id } = useParams();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!token || !id) return;
    getDocument(token, Number(id)).then((doc) => {
      setDocument(doc);
      void markOpened(token, doc.id).catch(console.error);
    }).catch(console.error);
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

  const downloadUrl = documentFileUrl(
    document.id,
    token,
    true,
    document.updatedAt
  );

  const fileUrl = documentFileUrl(
    document.id,
    token,
    false,
    document.updatedAt
  );

  const primaryDetails = [
    { label: "Автор", value: document.author },
    { label: "Исполнитель", value: document.executor },
    { label: "Научный руководитель", value: document.scientificAdvisor },
  ].filter((item) => item.value);

  const extraDetails = [
    { label: "Место издания", value: document.placeOfPublication },
    { label: "Издательство", value: document.publisher },
    { label: "Периодическое издание", value: document.periodicalName },
    { label: "Объём", value: document.volume },
    { label: "Имя файла", value: document.fileName },
    { label: "Размер файла", value: formatFileSize(document.fileSizeBytes) },
    { label: "Тип файла", value: document.mimeType },
    { label: "Обновлено", value: new Date(document.updatedAt).toLocaleDateString("ru-RU") },
  ].filter((item) => item.value);

  async function toggleFavorite() {
    if (!token || !document) return;

    await toggleDocumentFavorite(token, document.id, document.isFavorite);
    const refreshed = await getDocument(token, document.id);
    setDocument(refreshed);
  }

  return (
    <PageShell>
      <Grid container spacing={{ xs: 1.5, lg: 0 }} alignItems="stretch">
        {/* Информация о документе */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <ContentCard
            sx={{
              minHeight: { lg: "calc(100vh - 120px)" },
              p: { xs: 1.5, md: 2.25 },
              position: "relative",
              overflow: "hidden",
              background: (theme: any) =>
                `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, transparent 42%), ${theme.palette.background.paper}`,
            }}
          >
            <Stack spacing={2.4}>
              <Stack spacing={1.7}>
                  <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip label={document.type} size="small" color="primary" />
                    <Chip label={`${document.year}`} size="small" variant="outlined" />
                    {document.tags.slice(0, 3).map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Stack>

                  <Box>
                    <Typography component="h1" variant="h3" fontWeight={800} sx={{ lineHeight: 1.08 }}>
                      {document.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: "70ch" }}>
                      {document.description || "Описание документа пока не добавлено."}
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      component="a"
                      href={downloadUrl}
                      variant="contained"
                      startIcon={<DownloadRoundedIcon />}
                      sx={{ borderRadius: 0 }}
                    >
                      Скачать
                    </Button>

                    <Button
                      type="button"
                      onClick={toggleFavorite}
                      variant={document.isFavorite ? "contained" : "outlined"}
                      startIcon={
                        document.isFavorite ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />
                      }
                      sx={{ borderRadius: 0 }}
                    >
                      {document.isFavorite ? "В избранном" : "В избранное"}
                    </Button>

                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setDetailsOpen((current) => !current)}
                      sx={{ borderRadius: 0 }}
                    >
                      {detailsOpen ? "Скрыть подробности" : "Подробнее"}
                    </Button>
                  </Stack>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    useFlexGap
                    flexWrap="wrap"
                  >
                    {primaryDetails.map((item) => (
                      <Paper
                        key={item.label}
                        variant="outlined"
                        sx={{
                          p: 1.35,
                          borderRadius: 0,
                          minWidth: { xs: "100%", sm: 160 },
                          flex: "1 1 0",
                          bgcolor: (theme: any) => alpha(theme.palette.background.paper, 0.78),
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {item.label}
                        </Typography>
                        <Typography fontWeight={700}>{item.value}</Typography>
                      </Paper>
                    ))}
                  </Stack>

                  {isAdmin && (
                    <Box sx={{ maxWidth: 260 }}>
                      <EditDocumentDialog
                        token={token}
                        document={document}
                        onSaved={(updated) => setDocument(updated)}
                      />
                    </Box>
                  )}
                </Stack>

              <Collapse in={detailsOpen} timeout="auto" unmountOnExit>
                <Stack spacing={1.5}>
                  <Divider />
                  <Grid container spacing={1}>
                    {extraDetails.map((item) => (
                      <Grid key={item.label} size={{ xs: 12, sm: 6, xl: 4 }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.35,
                            height: "100%",
                            borderRadius: 0,
                            bgcolor: (theme: any) => alpha(theme.palette.background.default, 0.52),
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {item.label}
                          </Typography>
                          <Typography fontWeight={650}>{item.value}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>

                  {document.tags.length > 3 && (
                    <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                      {document.tags.slice(3).map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Collapse>
            </Stack>
          </ContentCard>
        </Grid>

        {/* Ридер */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <ContentCard
            sx={{
              p: 0,
              height: { xs: 600, lg: "calc(100vh - 120px)" },
              position: "sticky",
              top: 75,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Box
              component="iframe"
              title={document.title}
              src={fileUrl}
              sx={{
                flex: 1,
                width: "100%",
                height: "100%",
                border: 0,
                bgcolor: "common.white",
              }}
            />
          </ContentCard>
        </Grid>
      </Grid>
    </PageShell>
  );
};

export default BookPage;
