import React from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { alpha } from "@mui/material/styles";
import { DocumentFormFields, type AdminForm } from "./DocumentFormFields";
import PdfViewer from "./PdfViewer";

export type AdminDocumentFullViewProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  pdfUrl: string;
  onClose: () => void;
  form: AdminForm;
  setForm: React.Dispatch<React.SetStateAction<AdminForm>>;
  error?: string;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  isSubmitting?: boolean;
  secondaryActions?: React.ReactNode;
  idPrefix: string;
  fileLabel?: string;
  documentTypes: string[];
};

export const AdminDocumentFullView: React.FC<AdminDocumentFullViewProps> = ({
  open,
  title,
  subtitle,
  pdfUrl,
  onClose,
  form,
  setForm,
  error,
  onSubmit,
  submitLabel,
  isSubmitting = false,
  secondaryActions,
  idPrefix,
  fileLabel,
  documentTypes,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setForm((current) => {
      const updates: Partial<AdminForm> = { file };
      if (file && !current.title.trim()) {
        updates.title = file.name.replace(/\.[^/.]+$/, "");
      }
      return { ...current, ...updates };
    });
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal + 100,
        bgcolor: "background.default",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gridTemplateColumns: "minmax(0, 1fr)",
        width: "100vw",
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      {/* Header */}
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", gap: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0} sx={{ flex: 1 }}>
            <IconButton onClick={onClose} edge="start" aria-label="Закрыть">
              <ArrowBackRoundedIcon />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary" noWrap>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {secondaryActions}
            <Button variant="outlined" onClick={onClose}>
              Отмена
            </Button>
            <Button variant="contained" onClick={(e) => onSubmit(e as any)} disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "minmax(0, 1fr) minmax(0, 1fr)",
          },
          minHeight: 0,
          width: "100%",
          overflowX: "hidden",
        }}
      >
        {/* Left: Form */}
        <Box
          sx={{
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            overflowY: "auto",
            p: 3,
          }}
        >
          <Stack spacing={3} component="form" onSubmit={onSubmit} noValidate>
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="h6">Метаданные документа</Typography>
                {pdfUrl && (
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
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Проверьте и заполните данные на основе содержимого PDF справа.
              </Typography>

              <DocumentFormFields
                form={form}
                setForm={setForm}
                idPrefix={idPrefix}
                documentTypes={documentTypes}
              />
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </Box>

        {/* Right: PDF Reader */}
        <Box sx={{ bgcolor: "grey.100", minHeight: 0, minWidth: 0, position: "relative", display: "flex", flexDirection: "column" }}>
          {pdfUrl ? (
            <PdfViewer url={pdfUrl} />
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
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
