import React from "react";
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Box,
} from "@mui/material";
import { catalogSortOptions } from "../constants/documentFilters";

type CatalogFiltersProps = {
  onApply: () => void;
  onReset: () => void;
  idPrefix: string;
  documentTypes: string[];
  typeValue: string;
  onTypeChange: (value: string) => void;
  authorValue?: string;
  onAuthorChange?: (value: string) => void;
  tagsValue?: string;
  onTagsChange?: (value: string) => void;
  includeSort?: boolean;
  sortValue?: string;
  onSortChange?: (value: string) => void;
  yearFromValue?: string;
  yearToValue?: string;
  onYearFromChange?: (value: string) => void;
  onYearToChange?: (value: string) => void;
};

const CatalogFilters: React.FC<CatalogFiltersProps> = ({
  onApply,
  onReset,
  idPrefix,
  documentTypes,
  typeValue,
  onTypeChange,
  authorValue = "",
  onAuthorChange,
  tagsValue = "",
  onTagsChange,
  includeSort = false,
  sortValue = "date_desc",
  onSortChange,
  yearFromValue = "",
  yearToValue = "",
  onYearFromChange,
  onYearToChange,
}) => {
  const isDateError =
    yearFromValue &&
    yearToValue &&
    Number(yearFromValue) > Number(yearToValue);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <FormControl fullWidth>
        <InputLabel id={`${idPrefix}-type-label`}>Тип документа</InputLabel>
        <Select
          labelId={`${idPrefix}-type-label`}
          value={typeValue}
          label="Тип документа"
          onChange={(event) => onTypeChange(event.target.value)}
        >
          <MenuItem value="">Все типы</MenuItem>
          {documentTypes.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Автор"
        value={authorValue}
        onChange={(event) => onAuthorChange?.(event.target.value)}
        placeholder="Введите автора"
        fullWidth
        inputProps={{ "aria-label": "Автор" }}
      />

      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <TextField
          label="Год с"
          value={yearFromValue}
          onChange={(event) => onYearFromChange?.(event.target.value)}
          type="number"
          placeholder="например, 2010"
          fullWidth
          error={!!isDateError}
          inputProps={{ "aria-label": "Год с", min: 1900, max: 2100 }}
        />
        <TextField
          label="Год по"
          value={yearToValue}
          onChange={(event) => onYearToChange?.(event.target.value)}
          type="number"
          placeholder="например, 2025"
          fullWidth
          error={!!isDateError}
          helperText={isDateError ? "Неверный диапазон" : undefined}
          inputProps={{ "aria-label": "Год по", min: 1900, max: 2100 }}
        />
      </Stack>

      <TextField
        label="Ключевые слова"
        value={tagsValue}
        onChange={(event) => onTagsChange?.(event.target.value)}
        placeholder="Теги через пробел или запятую"
        fullWidth
        inputProps={{ "aria-label": "Ключевые слова" }}
      />

      {includeSort && (
        <FormControl fullWidth>
          <InputLabel id={`${idPrefix}-sort-label`}>Сортировка</InputLabel>
          <Select
            labelId={`${idPrefix}-sort-label`}
            value={sortValue}
            label="Сортировка"
            onChange={(event) => onSortChange?.(event.target.value)}
          >
            {catalogSortOptions.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
        <Button type="button" variant="outlined" onClick={onReset} fullWidth>
          Сбросить
        </Button>
        <Button type="button" variant="contained" onClick={onApply} fullWidth disabled={!!isDateError}>
          Поиск
        </Button>
      </Stack>
    </Box>
  );
};

export default CatalogFilters;
