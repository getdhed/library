import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import DownloadIcon from "@mui/icons-material/Download";
import { useNavigate, useParams } from "react-router-dom";
import {
  documentFileUrl,
  getDocument,
  getSubmission,
  markOpened,
  submissionFileUrl,
  updateDocument,
  getDocumentTypes,
  deleteDocument,
} from "../api/library";
import { downloadProtectedFile } from "../api/protectedFiles";
import { useAuth } from "../auth/AuthContext";
import { type AdminForm, createEmptyForm } from "../components/DocumentFormFields";
import { AdminDocumentFullView } from "../components/AdminDocumentFullView";
import PdfViewer from "../components/PdfViewer";

type PdfReaderPageProps = {
  kind: "document" | "submission";
};

const PdfReaderPage: React.FC<PdfReaderPageProps> = ({ kind }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const [version, setVersion] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<AdminForm>(createEmptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);

  const [editPreviewUrl, setEditPreviewUrl] = useState("");
  useEffect(() => {
    if (editForm.file) {
      const url = URL.createObjectURL(editForm.file);
      setEditPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setEditPreviewUrl("");
    }
  }, [editForm.file]);

  const numericId = Number(id ?? 0);

  useEffect(() => {
    if (!token || !numericId) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError("");

    const load = async () => {
      if (kind === "document") {
        const document = await getDocument(token, numericId);
        if (cancelled) return;
        setTitle(document.title);
        setFileName(document.fileName);
        setVersion(document.updatedAt);
        // Initialize edit form with current document metadata for immediate edit/preview
        setEditForm({
          title: document.title || "",
          titleTranslations: document.titleTranslations || {},
          author: document.author || "",
          executor: document.executor || "",
          scientificAdvisor: document.scientificAdvisor || "",
          year: document.year ?? new Date().getFullYear(),
          type: document.type || "Учебник",
          placeOfPublication: document.placeOfPublication || "",
          publisher: document.publisher || "",
          periodicalName: document.periodicalName || "",
          volume: document.volume || "",
          description: document.description || "",
          tags: (document.tags || []).join(", "),
          isLocal: document.isLocal ?? true,
          file: null,
        });
        void markOpened(token, numericId).catch(console.error);
        return;
      }

      const submission = await getSubmission(token, numericId);
      if (cancelled) return;
      setTitle(submission.title);
      setFileName(submission.fileName);
      setVersion(submission.updatedAt);
      // For submissions мы не редактируем файл здесь (модерация в админке)
    };

    load()
      .catch(() => {
        if (!cancelled) {
          setError("Не удалось открыть PDF.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    getDocumentTypes()
      .then((res) => {
        if (!cancelled) {
          setDocumentTypes(res.items);
        }
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [kind, numericId, token]);

  const fileUrl = useMemo(() => {
    if (!token || !numericId || !version) {
      return "";
    }
    return kind === "document"
      ? documentFileUrl(numericId, false, version)
      : submissionFileUrl(numericId, false, version);
  }, [kind, numericId, token, version]);

  const downloadUrl = useMemo(() => {
    if (!token || !numericId || !version) {
      return "";
    }
    return kind === "document"
      ? documentFileUrl(numericId, true, version)
      : submissionFileUrl(numericId, true, version);
  }, [kind, numericId, token, version]);

  function requestFullscreen() {
    void shellRef.current?.requestFullscreen?.();
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !numericId) return;

    setIsSaving(true);
    setSaveError("");
    try {
      const formData = new FormData();
      formData.append("title", editForm.title);
      formData.append("titleTranslations", JSON.stringify(editForm.titleTranslations || {}));
      formData.append("author", editForm.author);
      formData.append("executor", editForm.executor);
      formData.append("scientificAdvisor", editForm.scientificAdvisor);
      formData.append("year", String(editForm.year));
      formData.append("type", editForm.type);
      formData.append("placeOfPublication", editForm.placeOfPublication);
      formData.append("publisher", editForm.publisher);
      formData.append("periodicalName", editForm.periodicalName);
      formData.append("volume", editForm.volume);
      formData.append("description", editForm.description);
      formData.append("tags", editForm.tags);
      formData.append("isLocal", String(editForm.isLocal));
      if (editForm.file) {
        formData.append("file", editForm.file);
      }

      await updateDocument(token, numericId, formData);
      setIsEditing(false);
      // Refresh version to reload PDF if changed
      setVersion(new Date().toISOString());
      setTitle(editForm.title);
      // Clear local file selection and preview
      setEditForm((curr) => ({ ...curr, file: null }));
    } catch (err: any) {
      setSaveError(err.message || "Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive() {
    if (!token || !numericId) return;
    if (!window.confirm("Поместить документ в архив?")) return;
    try {
      setIsSaving(true);
      await deleteDocument(token, numericId);
      setIsEditing(false);
      navigate(-1);
    } catch (err: any) {
      setSaveError(err.message || "Не удалось архивировать документ");
    } finally {
      setIsSaving(false);
    }
  }

  const closeEdit = () => {
    setIsEditing(false);
    setEditForm((curr) => ({ ...curr, file: null }));
  };

  const modalPdfUrl = editPreviewUrl || fileUrl;

  return (
    <Box
      ref={shellRef}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal + 2,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        bgcolor: "#111827",
        color: "common.white",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 2,
          py: 1.2,
          borderBottom: "1px solid",
          borderColor: (theme) => alpha(theme.palette.common.white, 0.18),
          bgcolor: (theme) => alpha(theme.palette.common.black, 0.86),
          color: "common.white",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
          <IconButton onClick={() => isEditing ? setIsEditing(false) : navigate(-1)} edge="start" color="inherit">
            <ArrowBackIcon />
          </IconButton>
          <Box minWidth={0}>
            <Typography variant="h6" noWrap>
              {title || "PDF"}
            </Typography>
            {fileName && (
              <Typography variant="body2" color="grey.400" noWrap>
                {fileName}
              </Typography>
            )}
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {(user?.role === "admin" || user?.role === "superadmin") && kind === "document" && (
            <Button
              type="button"
              variant="outlined"
              color="inherit"
              onClick={() => setIsEditing(true)}
            >
              Изменить
            </Button>
          )}
          <Button
            type="button"
            onClick={() => {
              if (token && downloadUrl) {
                void downloadProtectedFile(downloadUrl, token, fileName).catch(console.error);
              }
            }}
            variant="outlined"
            color="inherit"
            startIcon={<DownloadIcon />}
            disabled={!downloadUrl}
          >
            Скачать
          </Button>
          <Button
            type="button"
            variant="outlined"
            color="inherit"
            startIcon={<FullscreenIcon />}
            onClick={requestFullscreen}
          >
            Полный экран
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr", minHeight: 0 }}>
        <Box sx={{ minHeight: 0, bgcolor: "grey.900", position: "relative" }}>
          {isLoading && (
            <Stack height="100%" alignItems="center" justifyContent="center" spacing={1.2}>
              <CircularProgress color="inherit" size={28} />
              <Typography>Загружаем PDF...</Typography>
            </Stack>
          )}
          {!isLoading && error && (
            <Box sx={{ p: 2 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}
          {!isLoading && !error && fileUrl && (
            <PdfViewer url={fileUrl} token={token} />
          )}
        </Box>
      </Box>

      {(user?.role === "admin" || user?.role === "superadmin") && kind === "document" && (
        <AdminDocumentFullView
          open={isEditing}
          title="Редактировать документ"
          subtitle={title}
          pdfUrl={modalPdfUrl}
          token={token}
          onClose={closeEdit}
          form={editForm}
          setForm={setEditForm}
          error={saveError}
          onSubmit={handleSaveEdit}
          submitLabel={isSaving ? "Сохраняем..." : "Сохранить изменения"}
          isSubmitting={isSaving}
          idPrefix="reader-edit"
          documentTypes={documentTypes}
          secondaryActions={
            <Button
              variant="contained"
              color="error"
              onClick={() => void handleArchive()}
              disabled={isSaving}
            >
              Архивировать документ
            </Button>
          }
        />
      )}
    </Box>
  );
};

export default PdfReaderPage;
