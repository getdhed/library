import React from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export type AdminForm = {
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
  file: File | null;
};

export type DocumentFormFieldsProps = {
  form: AdminForm;
  setForm: React.Dispatch<React.SetStateAction<AdminForm>>;
  fileLabel?: string;
  idPrefix: string;
  documentTypes: string[];
};

export const createEmptyForm = (defaultType = "Учебник"): AdminForm => {
  return {
    title: "",
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
    file: null,
  };
};

export const DocumentFormFields: React.FC<DocumentFormFieldsProps> = ({
  form,
  setForm,
  fileLabel,
  idPrefix,
  documentTypes,
}) => {
  const handleChange = (field: keyof AdminForm, value: any) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <Stack spacing={1.4}>
      <TextField
        label="Название *"
        value={form.title}
        onChange={(e) => handleChange("title", e.target.value)}
        placeholder="Название документа"
        required
        fullWidth
        inputProps={{ "aria-label": "Название *" }}
      />

      <TextField
        label="Автор"
        value={form.author}
        onChange={(e) => handleChange("author", e.target.value)}
        placeholder="ФИО автора"
        fullWidth
        inputProps={{ "aria-label": "Автор" }}
      />

      <TextField
        label="Исполнитель"
        value={form.executor}
        onChange={(e) => handleChange("executor", e.target.value)}
        placeholder="ФИО исполнителя"
        fullWidth
      />

      <TextField
        label="Научный руководитель"
        value={form.scientificAdvisor}
        onChange={(e) => handleChange("scientificAdvisor", e.target.value)}
        placeholder="ФИО научного руководителя"
        fullWidth
      />

      <Stack direction="row" spacing={2}>
        <TextField
          label="Год *"
          value={String(form.year || "")}
          onChange={(e) => handleChange("year", Number(e.target.value))}
          placeholder="Год"
          type="number"
          required
          sx={{ width: "120px" }}
          inputProps={{ "aria-label": "Год *" }}
        />

        <FormControl fullWidth required>
          <InputLabel id={`${idPrefix}-type-label`}>Тип документа</InputLabel>
          <Select
            labelId={`${idPrefix}-type-label`}
            id={`${idPrefix}-type`}
            value={form.type}
            label="Тип документа"
            onChange={(e) => handleChange("type", e.target.value)}
          >
            {documentTypes.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
            {!documentTypes.includes(form.type) && form.type && (
              <MenuItem value={form.type}>{form.type}</MenuItem>
            )}
          </Select>
        </FormControl>
      </Stack>

      <TextField
        label="Место издания"
        value={form.placeOfPublication}
        onChange={(e) => handleChange("placeOfPublication", e.target.value)}
        placeholder="Город"
        fullWidth
      />

      <TextField
        label="Издательство"
        value={form.publisher}
        onChange={(e) => handleChange("publisher", e.target.value)}
        placeholder="Наименование издательства"
        fullWidth
      />

      <Stack direction="row" spacing={2}>
        <TextField
          label="Периодическое издание"
          value={form.periodicalName}
          onChange={(e) => handleChange("periodicalName", e.target.value)}
          placeholder="Название журнала/сборника"
          fullWidth
        />
        <TextField
          label="Том/Выпуск"
          value={form.volume}
          onChange={(e) => handleChange("volume", e.target.value)}
          placeholder="№"
          sx={{ width: "180px" }}
        />
      </Stack>

      <TextField
        label="Ключевые слова"
        value={form.tags}
        onChange={(e) => handleChange("tags", e.target.value)}
        placeholder="Введите через запятую"
        fullWidth
      />

      {fileLabel && (
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("file", e.target.files?.[0] ?? null)
                }
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
      )}

      <TextField
        label="Аннотация"
        value={form.description}
        onChange={(e) => handleChange("description", e.target.value)}
        placeholder="Краткое описание"
        multiline
        minRows={4}
        fullWidth
      />

    </Stack>
  );
};
