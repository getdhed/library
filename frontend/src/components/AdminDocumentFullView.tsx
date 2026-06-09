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
import { DocumentFormFields, type AdminForm } from "./DocumentFormFields";

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
          <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
            <IconButton onClick={onClose} edge="start" aria-label="Закрыть">
              <ArrowBackRoundedIcon />
            </IconButton>
            <Box minWidth={0}>
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

          <Stack direction="row" spacing={1}>
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
            xs: "1fr",
            lg: "1fr 1fr",
          },
          minHeight: 0,
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
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Метаданные документа
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Проверьте и заполните данные на основе содержимого PDF справа.
              </Typography>

              <DocumentFormFields
                form={form}
                setForm={setForm}
                fileLabel={fileLabel}
                idPrefix={idPrefix}
                documentTypes={documentTypes}
              />
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Stack spacing={1}>
              <Button variant="contained" size="large" type="submit" fullWidth disabled={isSubmitting}>
                {submitLabel}
              </Button>
              {secondaryActions}
            </Stack>
          </Stack>
        </Box>

        {/* Right: PDF Reader */}
        <Box sx={{ bgcolor: "grey.100", minHeight: 0, minWidth: 0, position: "relative" }}>
          <Box
            component="iframe"
            src={pdfUrl}
            title="PDF Preview"
            sx={{
              width: "100%",
              height: "100%",
              border: 0,
              bgcolor: "common.white",
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};
