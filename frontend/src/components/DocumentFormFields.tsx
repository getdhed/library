import React, { useState, useEffect } from "react";
import { getLanguages } from "../api/library";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  FormControlLabel,
  FormHelperText,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

export type AdminForm = {
  title: string;
  titleTranslations: Record<string, string>;
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

export type DocumentFormFieldsProps = {
  form: AdminForm;
  setForm: React.Dispatch<React.SetStateAction<AdminForm>>;
  fileLabel?: string;
  idPrefix: string;
  documentTypes: string[];
};

export const createEmptyForm = (defaultType = "Другое"): AdminForm => {
  return {
    title: "",
    titleTranslations: {},
    author: "",
    executor: "",
    scientificAdvisor: "",
    year: new Date().getFullYear(),
    type: defaultType,
    placeOfPublication: "",
    publisher: "",
    periodicalName: "",
    volume: "",
    description: "",
    tags: "",
    isLocal: true,
    file: null,
  };
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper" }}>
    <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>
      {title}
    </Typography>
    <Stack spacing={2.5}>
      {children}
    </Stack>
  </Paper>
);

export const DocumentFormFields: React.FC<DocumentFormFieldsProps> = ({
  form,
  setForm,
  fileLabel,
  idPrefix,
  documentTypes,
}) => {
  const [availableLangs, setAvailableLangs] = useState<string[]>([]);

  useEffect(() => {
    getLanguages().then(res => {
      setAvailableLangs(res.items || []);
    }).catch(err => {
      console.error("Failed to fetch languages:", err);
    });
  }, []);
  const handleChange = (field: keyof AdminForm, value: any) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleTranslationChange = (lang: string, newValue: string) => {
    setForm((current) => ({
      ...current,
      titleTranslations: {
        ...current.titleTranslations,
        [lang]: newValue,
      },
    }));
  };

  const addTranslation = () => {
    const existing = form.titleTranslations || {};
    const nextLang = availableLangs.find(l => existing[l] === undefined);
    if (nextLang) {
      handleTranslationChange(nextLang, "");
    }
  };

  const removeTranslation = (lang: string) => {
    setForm((current) => {
      const newTranslations = { ...current.titleTranslations };
      delete newTranslations[lang];
      return { ...current, titleTranslations: newTranslations };
    });
  };

  const updateTranslationKey = (oldLang: string, newLang: string) => {
    if (oldLang === newLang) return;
    setForm((current) => {
      const newTranslations = { ...current.titleTranslations };
      newTranslations[newLang] = newTranslations[oldLang];
      delete newTranslations[oldLang];
      return { ...current, titleTranslations: newTranslations };
    });
  };

  const isWithoutYear = form.year === 0;
  const yearInvalid = !isWithoutYear && (!Number.isInteger(form.year) || form.year < 1 || form.year > 2100);
  const titleInvalid = !String(form.title || "").trim();
  const typeInvalid = !String(form.type || "").trim();

  return (
    <Stack spacing={2.5} sx={{ "& .MuiInputBase-inputMultiline": { wordBreak: "break-word" } }}>
      <Section title="Основная информация">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <TextField
            label="Название"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Название документа"
            required
            fullWidth
            multiline
            maxRows={7}
            inputProps={{ "aria-label": "Название", maxLength: 1000 }}
            error={titleInvalid}
            helperText={titleInvalid ? "Укажите название документа" : undefined}
          />

          {Object.keys(form.titleTranslations || {}).length > 0 ? (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, bgcolor: "background.default", mt: 1, mb: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Переводы названия</Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addTranslation}
                  variant="outlined"
                  color="secondary"
                  disabled={Object.keys(form.titleTranslations || {}).length >= availableLangs.length}
                >
                  Добавить перевод
                </Button>
              </Stack>

              <Stack spacing={2}>
                {Object.entries(form.titleTranslations || {}).map(([lang, val], index) => (
                  <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start" sx={{ position: "relative" }}>
                    <FormControl sx={{ width: { xs: "100%", sm: 200 } }}>
                      <InputLabel id={`lang-select-label-${index}`}>Язык</InputLabel>
                      <Select
                        labelId={`lang-select-label-${index}`}
                        value={lang}
                        label="Язык"
                        onChange={(e) => updateTranslationKey(lang, e.target.value)}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 250,
                            },
                          },
                        }}
                      >
                        {(availableLangs.includes(lang) ? availableLangs : [...availableLangs, lang])
                          .filter(l => l === lang || !Object.keys(form.titleTranslations || {}).includes(l))
                          .map(l => (
                          <MenuItem key={l} value={l}>{l}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      multiline
                      maxRows={7}
                      label="Перевод"
                      value={val}
                      onChange={(e) => handleTranslationChange(lang, e.target.value)}
                    />
                    <Tooltip title="Удалить перевод">
                      <IconButton color="error" onClick={() => removeTranslation(lang)} sx={{ mt: { xs: 0, sm: 1 } }}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addTranslation}
                variant="text"
                color="primary"
                sx={{ ml: -1 }}
              >
                Добавить перевод
              </Button>
            </Box>
          )}
        </Box>

        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Box sx={{ width: "50%" }}>
            <TextField
              label="Год"
              value={isWithoutYear ? "" : String(form.year || "")}
              onChange={(e) => handleChange("year", Number(e.target.value))}
              placeholder="Год"
              type="number"
              fullWidth
              inputProps={{ "aria-label": "Год", min: 1, max: 2100 }}
              error={yearInvalid}
              helperText={yearInvalid ? "Введите корректный год" : undefined}
              disabled={isWithoutYear}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={isWithoutYear}
                  onChange={(e) => handleChange("year", e.target.checked ? 0 : new Date().getFullYear())}
                  size="small"
                />
              }
              label={<Typography variant="body2" color="text.secondary">Без года</Typography>}
              sx={{ mt: 0.5, ml: 0 }}
            />
          </Box>

          <FormControl sx={{ width: "50%" }} required error={typeInvalid}>
            <InputLabel id={`${idPrefix}-type-label`}>Тип</InputLabel>
            <Select
              labelId={`${idPrefix}-type-label`}
              id={`${idPrefix}-type`}
              value={form.type}
              label="Тип"
              onChange={(e) => handleChange("type", e.target.value)}
              inputProps={{ "aria-label": "Тип документа" }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: 250,
                  },
                },
              }}
            >
              {(documentTypes.length > 0 ? documentTypes : [form.type]).map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
            {typeInvalid && <FormHelperText>Выберите тип документа</FormHelperText>}
          </FormControl>
        </Stack>

        <FormControlLabel
          control={
            <Switch
              checked={form.isLocal}
              onChange={(e) => handleChange("isLocal", e.target.checked)}
              name="isLocal"
              color="primary"
            />
          }
          label={form.isLocal ? "Источник: Институт" : "Источник: Прочие"}
        />

        <TextField
          label="Ключевые слова"
          value={form.tags}
          onChange={(e) => handleChange("tags", e.target.value)}
          placeholder="Введите через ;"
          fullWidth
          multiline
          maxRows={5}
          inputProps={{ maxLength: 1000 }}
        />

        <TextField
          label="Аннотация"
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Краткая аннотация"
          multiline
          minRows={4}
          fullWidth
          inputProps={{ maxLength: 600 }}
        />
      </Section>

      <Section title="Авторы и составители">
        <TextField
          label="Автор"
          value={form.author}
          onChange={(e) => handleChange("author", e.target.value)}
          placeholder="ФИО автора (если несколько, укажите через запятую)"
          fullWidth
          multiline
          maxRows={2}
          inputProps={{ "aria-label": "Автор", maxLength: 250 }}
        />

        <TextField
          label="Составитель"
          value={form.executor}
          onChange={(e) => handleChange("executor", e.target.value)}
          placeholder="ФИО составителя"
          fullWidth
          multiline
          maxRows={2}
          inputProps={{ maxLength: 250 }}
        />

        <TextField
          label="Научный руководитель"
          value={form.scientificAdvisor}
          onChange={(e) => handleChange("scientificAdvisor", e.target.value)}
          placeholder="ФИО научного руководителя"
          fullWidth
          multiline
          maxRows={2}
          inputProps={{ maxLength: 250 }}
        />
      </Section>

      <Section title="Выходные данные">
        <TextField
          label="Место издания"
          value={form.placeOfPublication}
          onChange={(e) => handleChange("placeOfPublication", e.target.value)}
          placeholder="Город"
          fullWidth
          multiline
          maxRows={2}
          inputProps={{ maxLength: 200 }}
        />

        <TextField
          label="Издательство"
          value={form.publisher}
          onChange={(e) => handleChange("publisher", e.target.value)}
          placeholder="Наименование издательства"
          fullWidth
          multiline
          maxRows={3}
          inputProps={{ maxLength: 250 }}
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Периодическое издание"
            value={form.periodicalName}
            onChange={(e) => handleChange("periodicalName", e.target.value)}
            placeholder="Название журнала/сборника"
            fullWidth
            multiline
            maxRows={3}
            inputProps={{ maxLength: 250 }}
          />
          <TextField
            label="Количество страниц"
            value={form.volume}
            onChange={(e) => handleChange("volume", e.target.value)}
            placeholder="Например: 120"
            sx={{ minWidth: "120px" }}
            inputProps={{ maxLength: 50 }}
          />
        </Stack>
      </Section>

      {fileLabel && (
        <Section title="Файл документа">
          <Box sx={{ display: "grid", gap: 0.8 }}>
            <Typography fontWeight={600}>{fileLabel}</Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Button component="label" variant="outlined" sx={{ position: "relative" }}>
                {form.file ? "Заменить PDF" : "Выбрать PDF"}
                <Box
                  component="input"
                  type="file"
                  aria-label={fileLabel}
                  accept=".pdf,application/pdf"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0] ?? null;
                    setForm((current) => {
                      const updates: Partial<AdminForm> = { file };
                      if (file && !current.title.trim()) {
                        updates.title = file.name.replace(/\.[^/.]+$/, "");
                      }
                      return { ...current, ...updates };
                    });
                  }}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                  }}
                />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {form.file ? form.file.name : "Файл не выбран"}
              </Typography>
            </Stack>
          </Box>
        </Section>
      )}
    </Stack>
  );
};

