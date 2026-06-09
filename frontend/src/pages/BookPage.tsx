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
import DownloadIcon from "@mui/icons-material/Download";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { useParams, Link } from "react-router-dom";
import {
  documentFileUrl,
  getDocument,
  markOpened,
  toggleDocumentFavorite,
  getDocumentTypes,
  updateDocument,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import { ContentCard, PageShell } from "../components/mui-primitives";
import { AdminDocumentFullView } from "../components/AdminDocumentFullView";
import type { AdminForm } from "../components/DocumentFormFields";
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
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<AdminForm>({
    title: "", author: "", executor: "", scientificAdvisor: "", year: new Date().getFullYear(),
    type: "", placeOfPublication: "", publisher: "", periodicalName: "", volume: "", description: "", tags: "", file: null
  });
  const [editFormError, setEditFormError] = useState("");
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const extraDetails = [
    { label: "Исполнитель", value: document.executor },
    { label: "Научный руководитель", value: document.scientificAdvisor },
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

  function startEdit() {
    if (!document) return;
    setEditForm({
      title: document.title, author: document.author, executor: document.executor ?? "",
      scientificAdvisor: document.scientificAdvisor ?? "", year: document.year,
      type: document.type, placeOfPublication: document.placeOfPublication ?? "",
      publisher: document.publisher ?? "", periodicalName: document.periodicalName ?? "",
      volume: document.volume ?? "", description: document.description,
      tags: document.tags.join(", "), file: null
    });
    setEditFormError("");
    setIsEditing(true);
    getDocumentTypes().then(r => setDocumentTypes(r.items)).catch(console.error);
  }

  function validate(form: AdminForm) {
    const missing: string[] = [];
    if (!form.title.trim()) missing.push("название");
    if (!Number.isFinite(form.year) || form.year <= 0) missing.push("год");
    return missing;
  }

  async function handleUpdateDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !document) return;
    const missing = validate(editForm);
    if (missing.length > 0) {
      setEditFormError(`Заполните обязательные поля: ${missing.join(", ")}.`);
      return;
    }
    const fd = new FormData();
    fd.set("title", editForm.title.trim());
    fd.set("author", editForm.author.trim());
    fd.set("executor", editForm.executor.trim());
    fd.set("scientificAdvisor", editForm.scientificAdvisor.trim());
    fd.set("year", String(editForm.year));
    fd.set("type", editForm.type.trim());
    fd.set("placeOfPublication", editForm.placeOfPublication.trim());
    fd.set("publisher", editForm.publisher.trim());
    fd.set("periodicalName", editForm.periodicalName.trim());
    fd.set("volume", editForm.volume.trim());
    fd.set("description", editForm.description.trim());
    fd.set("tags", editForm.tags);
    if (editForm.file) fd.set("file", editForm.file);

    setIsSubmitting(true);
    try {
      const updated = await updateDocument(token, document.id, fd);
      setDocument(updated);
      setIsEditing(false);
    } catch (err) {
      setEditFormError(err instanceof Error ? err.message : "Ошибка при сохранении");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell>
      <Grid container spacing={{ xs: 1.5, lg: 0 }} alignItems="stretch">
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
                    {document.author && (
                      <Typography
                        component={Link}
                        to={`/search?author=${encodeURIComponent(document.author)}`}
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        variant="h6"
                        sx={{
                          mt: 1,
                          fontWeight: 500,
                          color: "success.main",
                          textDecoration: "none",
                          display: "inline-block",
                          width: "fit-content",
                          "&:hover": {
                            color: "success.dark",
                            textDecoration: "underline",
                          },
                        }}
                      >
                        {document.author}
                      </Typography>
                    )}
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, maxWidth: "70ch" }}>
                      {document.description || "Описание документа пока не добавлено."}
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      component="a"
                      href={downloadUrl}
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      sx={{ borderRadius: 0 }}
                    >
                      Скачать
                    </Button>

                    <Button
                      type="button"
                      onClick={toggleFavorite}
                      variant={document.isFavorite ? "contained" : "outlined"}
                      startIcon={
                        document.isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />
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



                  {isAdmin && (
                    <Box sx={{ maxWidth: 260 }}>
                      <Button
                        type="button"
                        fullWidth
                        variant="outlined"
                        startIcon={<EditRoundedIcon />}
                        onClick={startEdit}
                        sx={{ borderRadius: 0 }}
                      >
                        Редактировать
                      </Button>
                    </Box>
                  )}
                </Stack>

              <Collapse in={detailsOpen} timeout="auto" unmountOnExit>
                <Stack spacing={1.5}>
                  <Divider />
                  <Grid container spacing={1.5}>
                    {extraDetails.map((item) => (
                      <Grid key={item.label} size={{ xs: 12, sm: 6, xl: 4 }}>
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {item.label}
                          </Typography>
                          <Typography fontWeight={500}>{item.value}</Typography>
                        </Box>
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

      {document && token && (
        <AdminDocumentFullView
          open={isEditing}
          title="Редактировать документ"
          subtitle={document.title}
          pdfUrl={documentFileUrl(document.id, token, false, document.updatedAt)}
          onClose={() => setIsEditing(false)}
          form={editForm}
          setForm={setEditForm}
          error={editFormError}
          onSubmit={handleUpdateDocument}
          submitLabel="Сохранить изменения"
          isSubmitting={isSubmitting}
          fileLabel="Заменить PDF (необязательно)"
          idPrefix="book-edit"
          documentTypes={documentTypes}
        />
      )}
    </PageShell>
  );
};

export default BookPage;
