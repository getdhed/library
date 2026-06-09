import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { createSubmission, getDocumentTypes } from "../api/library";
import { useAuth } from "../auth/AuthContext";
import { PageShell } from "../components/mui-primitives";
import { DocumentFormFields, type AdminForm, createEmptyForm } from "../components/DocumentFormFields";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const SubmitPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<AdminForm>(() => createEmptyForm());
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>("");

  useEffect(() => {
    getDocumentTypes()
      .then((res) => setDocumentTypes(res.items))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (form.file) {
      const url = URL.createObjectURL(form.file);
      setPdfPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfPreviewUrl("");
    }
  }, [form.file]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setError("");

    if (!form.title.trim()) {
      setError("Заполните название документа.");
      return;
    }
    if (!form.type.trim()) {
      setError("Выберите тип документа.");
      return;
    }
    if (!form.file) {
      setError("Выберите PDF-файл.");
      return;
    }

    const formData = new FormData();
    formData.set("title", form.title.trim());
    formData.set("file", form.file);
    if (form.author.trim()) formData.set("author", form.author.trim());
    if (form.executor.trim()) formData.set("executor", form.executor.trim());
    if (form.scientificAdvisor.trim()) formData.set("scientificAdvisor", form.scientificAdvisor.trim());
    formData.set("year", String(form.year));
    formData.set("type", form.type.trim());
    if (form.placeOfPublication.trim()) formData.set("placeOfPublication", form.placeOfPublication.trim());
    if (form.publisher.trim()) formData.set("publisher", form.publisher.trim());
    if (form.periodicalName.trim()) formData.set("periodicalName", form.periodicalName.trim());
    if (form.volume.trim()) formData.set("volume", form.volume.trim());
    if (form.description.trim()) formData.set("description", form.description.trim());
    if (form.tags.trim()) formData.set("tags", form.tags.trim());

    if (comment.trim()) {
      formData.set("comment", comment.trim());
    }

    setIsSubmitting(true);
    try {
      await createSubmission(token, formData);
      setForm(createEmptyForm(documentTypes.length > 0 ? documentTypes[0] : "Учебник"));
      setComment("");
      navigate("/account/pdfs", {
        state: { submissionCreated: true },
      });
    } catch (submitError) {
      console.error(submitError);
      setError("Не удалось отправить PDF. Попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          minHeight: "calc(100vh - 120px)",
          bgcolor: "background.paper",
          borderRadius: 0,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        {/* Left: Form */}
        <Box
          sx={{
            p: { xs: 3, md: 5 },
            overflowY: "auto",
            borderRight: { lg: "1px solid" },
            borderColor: "divider",
          }}
        >
          <Stack spacing={4}>
            <Box>
              <Typography variant="h4" fontWeight={800} gutterBottom sx={{ lineHeight: 1.1 }}>
                Предложить документ
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Отправьте PDF-файл и укажите метаданные документа на основе предпросмотра справа. После проверки администратором документ появится в каталоге.
              </Typography>
            </Box>

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}
            >
              {/* Файл */}
              <Box
                component="label"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  p: { xs: 4, md: 5 },
                  border: "2px dashed",
                  borderColor: form.file ? "primary.main" : "divider",
                  borderRadius: 3,
                  bgcolor: form.file
                    ? (theme: any) => alpha(theme.palette.primary.main, 0.08)
                    : "background.default",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: (theme: any) =>
                      alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={isSubmitting}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    const file = event.target.files?.[0] ?? null;
                    setForm((current) => {
                      const updates: Partial<AdminForm> = { file };
                      if (file && !current.title.trim()) {
                        updates.title = file.name.replace(/\.[^/.]+$/, "");
                      }
                      return { ...current, ...updates };
                    });
                  }}
                  style={{ display: "none" }}
                />
                <CloudUploadIcon
                  sx={{
                    fontSize: 48,
                    color: form.file ? "primary.main" : "text.secondary",
                    mb: 1.5,
                  }}
                />
                <Typography
                  variant="h6"
                  fontWeight={600}
                  color={form.file ? "primary.main" : "text.primary"}
                  textAlign="center"
                >
                  {form.file ? form.file.name : "Нажмите, чтобы выбрать PDF-файл"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Максимальный размер: не ограничен
                </Typography>
              </Box>

              {form.file && (
                <>
                  <DocumentFormFields
                    form={form}
                    setForm={setForm}
                    documentTypes={documentTypes}
                    idPrefix="user-submit"
                  />

                  <TextField
                    label="Комментарий для модератора"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Укажите любую дополнительную информацию, которая может помочь при проверке (опционально)..."
                    disabled={isSubmitting}
                    multiline
                    minRows={3}
                    fullWidth
                    inputProps={{ maxLength: 500 }}
                  />

                  {error && <Alert severity="error">{error}</Alert>}

                  <Stack
                    direction={{ xs: "column-reverse", sm: "row" }}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ pt: 1 }}
                  >
                    <Button component={Link} to="/account/pdfs" color="inherit">
                      К моим загрузкам
                    </Button>
                    <Button
                      variant="contained"
                      type="submit"
                      size="large"
                      disabled={isSubmitting}
                      sx={{
                        minWidth: { xs: "100%", sm: 220 },
                        py: 1.2,
                        fontWeight: 600,
                      }}
                    >
                      {isSubmitting ? "Отправка..." : "Отправить на проверку"}
                    </Button>
                  </Stack>
                </>
              )}
            </Box>
          </Stack>
        </Box>

        {/* Right: PDF Preview */}
        <Box
          sx={{
            bgcolor: "grey.100",
            minHeight: { xs: 500, lg: 0 },
            position: "relative",
          }}
        >
          {pdfPreviewUrl ? (
            <Box
              component="iframe"
              src={pdfPreviewUrl}
              title="Предпросмотр PDF"
              sx={{ width: "100%", height: "100%", border: 0, bgcolor: "common.white" }}
            />
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              height="100%"
              color="text.secondary"
              spacing={2}
              p={4}
              textAlign="center"
            >
              <PictureAsPdfRoundedIcon sx={{ fontSize: 64, opacity: 0.3 }} />
              <Typography variant="body1">
                Выберите PDF-файл в форме слева, чтобы увидеть предпросмотр
              </Typography>
            </Stack>
          )}
        </Box>
      </Box>
    </PageShell>
  );
};

export default SubmitPage;
