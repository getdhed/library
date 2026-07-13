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
import PdfViewer from "../components/PdfViewer";

const SubmitPage: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== "user") {
      navigate("/");
    }
  }, [user, navigate]);
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
      const blob = new Blob([form.file], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfPreviewUrl("");
    }
  }, [form.file]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setForm((current) => {
      const updates: Partial<AdminForm> = { file };
      if (file && !current.title.trim()) {
        updates.title = file.name.replace(/\.[^/.]+$/, "");
      }
      return { ...current, ...updates };
    });
  };

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
    if (!Number.isInteger(form.year) || form.year < 1 || form.year > 2100) {
      setError("Введите корректный год.");
      return;
    }
    const maxSizeMB = user?.role === "superadmin" ? 250 : 100;
    if (form.file && form.file.size > maxSizeMB * 1024 * 1024) {
      setError(`Размер файла не должен превышать ${maxSizeMB} МБ.`);
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
              noValidate
              sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}
            >
              {!form.file ? (
                <Box sx={{ p: 4, textAlign: "center", bgcolor: "background.default", borderRadius: 3, border: "1px dashed", borderColor: "divider" }}>
                  <Typography variant="body1" color="text.secondary">
                    Сначала выберите PDF-файл справа, чтобы заполнить данные документа.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">Метаданные документа</Typography>
                    <Button component="label" size="small" variant="outlined" color="primary">
                      Заменить PDF
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        disabled={isSubmitting}
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                    </Button>
                  </Stack>

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
                      Отмена
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
            display: "flex",
            flexDirection: "column",
          }}
        >
          {pdfPreviewUrl ? (
            <PdfViewer url={pdfPreviewUrl} />
          ) : (
            <Box
              component="label"
              sx={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: { xs: 4, md: 6 },
                border: "2px dashed",
                borderColor: "primary.main",
                borderRadius: 4,
                bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.03),
                cursor: "pointer",
                transition: "all 0.2s",
                m: { xs: 2, md: 4 },
                "&:hover": {
                  bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
                  borderColor: "primary.dark",
                },
              }}
            >
              <input
                type="file"
                accept=".pdf,application/pdf"
                disabled={isSubmitting}
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <CloudUploadIcon sx={{ fontSize: 80, color: "primary.main", mb: 3 }} />
              <Typography variant="h5" fontWeight={700} color="primary.main" textAlign="center" gutterBottom>
                Загрузить PDF-файл
              </Typography>
              <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
                Нажмите сюда, чтобы выбрать файл с компьютера
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
                Максимальный размер: не ограничен
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </PageShell>
  );
};

export default SubmitPage;
