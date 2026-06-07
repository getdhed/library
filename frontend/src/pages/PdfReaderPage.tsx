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
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import { useNavigate, useParams } from "react-router-dom";
import {
  documentFileUrl,
  getDocument,
  getSubmission,
  markOpened,
  submissionFileUrl,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import {
  DocumentFormFields,
  type AdminForm,
  createEmptyForm,
} from "../components/DocumentFormFields";
import { updateDocument, getDocumentTypes } from "../api/library";

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
        if (cancelled) {
          return;
        }
        setTitle(document.title);
        setFileName(document.fileName);
        setVersion(document.updatedAt);
        void markOpened(token, numericId).catch(console.error);
        return;
      }

      const submission = await getSubmission(token, numericId);
      if (cancelled) {
        return;
      }
      setTitle(submission.title);
      setFileName(submission.fileName);
      setVersion(submission.updatedAt);

      // Initialize edit form if it's a document (submissions are moderated in AdminDocumentsPage)
      if (kind === "document") {
        setEditForm({
          title: submission.title || "",
          author: submission.author || "",
          executor: submission.executor || "",
          scientificAdvisor: submission.scientificAdvisor || "",
          year: submission.year || new Date().getFullYear(),
          type: submission.type || "Учебник",
          placeOfPublication: submission.placeOfPublication || "",
          publisher: submission.publisher || "",
          periodicalName: submission.periodicalName || "",
          volume: submission.volume || "",
          description: submission.description || "",
          tags: (submission.tags || []).join(", "),
          file: null,
        });
      }
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
      ? documentFileUrl(numericId, token, false, version)
      : submissionFileUrl(numericId, token, false, version);
  }, [kind, numericId, token, version]);

  const downloadUrl = useMemo(() => {
    if (!token || !numericId || !version) {
      return "";
    }
    return kind === "document"
      ? documentFileUrl(numericId, token, true, version)
      : submissionFileUrl(numericId, token, true, version);
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
      if (editForm.file) {
        formData.append("file", editForm.file);
      }

      await updateDocument(token, numericId, formData);
      setIsEditing(false);
      // Refresh version to reload PDF if changed
      setVersion(new Date().toISOString());
      setTitle(editForm.title);
    } catch (err: any) {
      setSaveError(err.message || "Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  }

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
          borderColor: isEditing ? "divider" : (theme) => alpha(theme.palette.common.white, 0.18),
          bgcolor: isEditing ? "background.paper" : (theme) => alpha(theme.palette.common.black, 0.86),
          color: isEditing ? "text.primary" : "common.white",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
          <IconButton onClick={() => isEditing ? setIsEditing(false) : navigate(-1)} edge="start" color="inherit">
            <ArrowBackRoundedIcon />
          </IconButton>
          <Box minWidth={0}>
            <Typography variant="h6" noWrap>
              {isEditing ? "Редактирование документа" : (title || "PDF")}
            </Typography>
            {isEditing ? (
              <Typography variant="body2" color="text.secondary" noWrap>
                {title}
              </Typography>
            ) : (
              fileName && (
                <Typography variant="body2" color={isEditing ? "text.secondary" : "grey.400"} noWrap>
                  {fileName}
                </Typography>
              )
            )}
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {isEditing ? (
            <>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => setIsEditing(false)}
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                onClick={(e) => handleSaveEdit(e as any)}
                disabled={isSaving}
              >
                {isSaving ? "Сохраняем..." : "Сохранить изменения"}
              </Button>
            </>
          ) : (
            <>
              {user?.role === "admin" && kind === "document" && (
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
                component="a"
                href={downloadUrl}
                variant="outlined"
                color="inherit"
                startIcon={<DownloadRoundedIcon />}
                disabled={!downloadUrl}
              >
                Скачать
              </Button>
              <Button
                type="button"
                variant="outlined"
                color="inherit"
                startIcon={<FullscreenRoundedIcon />}
                onClick={requestFullscreen}
              >
                Полный экран
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: isEditing ? "480px 1fr" : "1fr", minHeight: 0 }}>
        {isEditing && (
          <Box
            sx={{
              bgcolor: "background.paper",
              color: "text.primary",
              borderRight: "1px solid",
              borderColor: "divider",
              overflowY: "auto",
              p: 2.5,
            }}
          >
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Метаданные документа
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Внесите необходимые изменения в карточку документа.
            </Typography>

            <Stack spacing={3} component="form" onSubmit={handleSaveEdit} noValidate>
              <DocumentFormFields
                form={editForm}
                setForm={setEditForm}
                idPrefix="reader-edit"
                fileLabel="Заменить PDF (необязательно)"
                documentTypes={documentTypes}
              />
              
              {saveError && <Alert severity="error">{saveError}</Alert>}
              
              <Button
                variant="contained"
                type="submit"
                size="large"
                disabled={isSaving}
                fullWidth
              >
                {isSaving ? "Сохраняем..." : "Сохранить изменения"}
              </Button>
            </Stack>
          </Box>
        )}

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
            <Box
              component="iframe"
              title={title || "PDF"}
              src={fileUrl}
              sx={{
                display: "block",
                width: "100%",
                height: "100%",
                border: 0,
                bgcolor: "common.white",
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PdfReaderPage;
