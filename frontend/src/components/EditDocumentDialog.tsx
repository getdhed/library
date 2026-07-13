import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import {
  getDocumentTypes,
  updateDocument,
} from "../api/library";
import type { DocumentItem } from "../types";

// ─── types ────────────────────────────────────────────────────────────────────

type EditForm = {
  title: string;
  author: string;
  executor: string;
  scientificAdvisor: string;
  year: number;
  type: string;
  placeOfPublication: string;
  publisher: string;
  periodicalName: string;
  volume: string;
  description: string;
  tags: string;
  isLocal: boolean;
  file: File | null;
};

type Props = {
  token: string;
  document: DocumentItem;
  onSaved: (updated: DocumentItem) => void;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function fromDocument(item: DocumentItem): EditForm {
  return {
    title: item.title,
    author: item.author,
    executor: item.executor ?? "",
    scientificAdvisor: item.scientificAdvisor ?? "",
    year: item.year,
    type: item.type,
    placeOfPublication: item.placeOfPublication ?? "",
    publisher: item.publisher ?? "",
    periodicalName: item.periodicalName ?? "",
    volume: item.volume ?? "",
    description: item.description,
    tags: item.tags.join("; "),
    isLocal: item.isLocal ?? true,
    file: null,
  };
}

function validate(form: EditForm) {
  const missing: string[] = [];
  if (!form.title.trim()) missing.push("название");
  if (!form.type.trim()) missing.push("тип документа");
  if (!Number.isInteger(form.year) || form.year < 1 || form.year > 2100) missing.push("корректный год");
  if (form.file && form.file.size > 100 * 1024 * 1024) missing.push("размер файла не более 100 МБ");
  return missing;
}

function buildFormData(form: EditForm) {
  const fd = new FormData();
  fd.set("title", form.title.trim());
  fd.set("author", form.author.trim());
  fd.set("executor", form.executor.trim());
  fd.set("scientificAdvisor", form.scientificAdvisor.trim());
  fd.set("year", String(form.year));
  fd.set("type", form.type.trim());
  fd.set("placeOfPublication", form.placeOfPublication.trim());
  fd.set("publisher", form.publisher.trim());
  fd.set("periodicalName", form.periodicalName.trim());
  fd.set("volume", form.volume.trim());
  fd.set("description", form.description.trim());
  fd.set("tags", form.tags);
  fd.set("isLocal", String(form.isLocal));
  if (form.file) fd.set("file", form.file);
  return fd;
}

// ─── component ────────────────────────────────────────────────────────────────

const EditDocumentDialog: React.FC<Props> = ({ token, document, onSaved }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EditForm>(() => fromDocument(document));
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Load reference data on first open
  useEffect(() => {
    if (!open) return;
    setForm(fromDocument(document));
    setError("");
    getDocumentTypes()
      .then((r) => setDocumentTypes(r.items))
      .catch(console.error);
  }, [open, token, document]);

  const availableTypes = useMemo(
    () =>
      form.type && !documentTypes.includes(form.type)
        ? [form.type, ...documentTypes]
        : documentTypes,
    [documentTypes, form.type],
  );

  function set<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const missing = validate(form);
    if (missing.length > 0) {
      setError(`Заполните обязательные поля: ${missing.join(", ")}.`);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateDocument(token, document.id, buildFormData(form));
      onSaved(updated);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить изменения.");
    } finally {
      setSaving(false);
    }
  }

  const yearInvalid = !Number.isInteger(form.year) || form.year < 1 || form.year > 2100;
  const titleInvalid = !String(form.title || "").trim();
  const typeInvalid = !String(form.type || "").trim();

  return (
    <>
      <Button
        id="edit-document-btn"
        type="button"
        fullWidth
        variant="outlined"
        startIcon={<EditRoundedIcon />}
        onClick={() => setOpen(true)}
        sx={{ borderRadius: 0 }}
      >
        Редактировать
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullScreen={fullScreen}
        maxWidth="md"
        fullWidth
        aria-labelledby="edit-doc-dialog-title"
        scroll="paper"
      >
        <DialogTitle id="edit-doc-dialog-title">
          <Typography variant="caption" color="text.secondary" display="block">
            Редактирование документа
          </Typography>
          <Typography component="div" variant="h6" fontWeight={700} sx={{ wordBreak: "break-word" }}>
            {document.title}
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Box
            component="form"
            id="edit-doc-form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
              "& > .full": { gridColumn: "1 / -1" },
              "& .MuiInputBase-inputMultiline": { wordBreak: "break-word" },
            }}
          >
            {/* Основные поля */}
            <TextField
              className="full"
              label="Заглавие *"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
              fullWidth
              inputProps={{ "aria-label": "Заглавие", maxLength: 400 }}
              error={titleInvalid}
              helperText={titleInvalid ? "Укажите название документа" : undefined}
            />

            <TextField
              label="Автор"
              value={form.author}
              onChange={(e) => set("author", e.target.value)}
              fullWidth
              inputProps={{ "aria-label": "Автор" }}
            />

            <TextField
              label="Составитель"
              value={form.executor}
              onChange={(e) => set("executor", e.target.value)}
              fullWidth
              inputProps={{ "aria-label": "Составитель" }}
            />

            <TextField
              label="Научный руководитель"
              value={form.scientificAdvisor}
              onChange={(e) => set("scientificAdvisor", e.target.value)}
              fullWidth
              inputProps={{ "aria-label": "Научный руководитель" }}
            />

            <TextField
              select
              label="Тип документа *"
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              required
              fullWidth
              inputProps={{ "aria-label": "Тип документа" }}
              error={typeInvalid}
              helperText={typeInvalid ? "Выберите тип документа" : undefined}
            >
              {availableTypes.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Год издания *"
              type="number"
              value={String(form.year || "")}
              onChange={(e) => set("year", Number(e.target.value))}
              required
              fullWidth
              inputProps={{ "aria-label": "Год издания", min: 1, max: 2100 }}
              error={yearInvalid}
              helperText={yearInvalid ? "Введите корректный год" : undefined}
            />

            <FormControlLabel
              className="full"
              control={
                <Switch
                  checked={form.isLocal}
                  onChange={(e) => set("isLocal", e.target.checked)}
                  name="isLocal"
                  color="primary"
                />
              }
              label="Локальный файл (Собственность библиотеки)"
            />

            <TextField
              label="Место издания"
              value={form.placeOfPublication}
              onChange={(e) => set("placeOfPublication", e.target.value)}
              fullWidth
              inputProps={{ "aria-label": "Место издания" }}
            />

            <TextField
              label="Издательство"
              value={form.publisher}
              onChange={(e) => set("publisher", e.target.value)}
              fullWidth
              inputProps={{ "aria-label": "Издательство" }}
            />

            <TextField
              label="Количество страниц"
              value={form.volume}
              onChange={(e) => set("volume", e.target.value)}
              placeholder="Например: 208"
              fullWidth
              inputProps={{ "aria-label": "Количество страниц" }}
            />

            <TextField
              className="full"
              label="Название периодического издания"
              value={form.periodicalName}
              onChange={(e) => set("periodicalName", e.target.value)}
              fullWidth
              inputProps={{ "aria-label": "Название периодического издания" }}
            />

            {/* Теги и аннотация */}
            <TextField
              className="full"
              label="Ключевые слова"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="Через ;"
              fullWidth
              inputProps={{ "aria-label": "Ключевые слова" }}
            />

            <TextField
              className="full"
              label="Аннотация"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              multiline
              minRows={3}
              fullWidth
              inputProps={{ "aria-label": "Аннотация", maxLength: 600 }}
            />

            {/* PDF замена */}
            <Box className="full">
              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
                <Button component="label" variant="outlined" size="small">
                  {form.file ? "Заменить PDF" : "Заменить файл PDF"}
                  <Box
                    component="input"
                    type="file"
                    accept=".pdf,application/pdf"
                    aria-label="Заменить PDF"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      set("file", e.target.files?.[0] ?? null)
                    }
                    sx={{
                      position: "absolute",
                      width: 1,
                      height: 1,
                      p: 0,
                      m: -1,
                      overflow: "hidden",
                      clip: "rect(0 0 0 0)",
                      whiteSpace: "nowrap",
                      border: 0,
                    }}
                  />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {form.file ? form.file.name : "Файл не выбран (оставить текущий)"}
                </Typography>
              </Stack>
            </Box>

            {error && (
              <Alert className="full" severity="error">
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Отмена
          </Button>
          <Button
            type="submit"
            form="edit-doc-form"
            variant="contained"
            disabled={saving}
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditDocumentDialog;
