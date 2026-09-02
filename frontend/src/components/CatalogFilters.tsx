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
  Checkbox,
  FormControlLabel,
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
  isLocalValue?: string;
  onIsLocalChange?: (value: string) => void;
  includeSort?: boolean;
  sortValue?: string;
  onSortChange?: (value: string) => void;
  yearFromValue?: string;
  yearToValue?: string;
  onYearFromChange?: (value: string) => void;
  onYearToChange?: (value: string) => void;
  hasTranslationValue?: boolean;
  onHasTranslationChange?: (value: boolean) => void;
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
  isLocalValue = "",
  onIsLocalChange,
  includeSort = false,
  sortValue = "date_desc",
  onSortChange,
  yearFromValue = "",
  yearToValue = "",
  onYearFromChange,
  onYearToChange,
  hasTranslationValue = false,
  onHasTranslationChange,
}) => {
  const isDateError =
    yearFromValue &&
    yearToValue &&
    Number(yearFromValue) > Number(yearToValue);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <FormControl fullWidth size="small">
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

      <FormControl fullWidth size="small">
        <InputLabel id={`${idPrefix}-local-label`}>Источник</InputLabel>
        <Select
          labelId={`${idPrefix}-local-label`}
          value={isLocalValue}
          label="Источник"
          onChange={(event) => onIsLocalChange?.(event.target.value)}
        >
          <MenuItem value="">Все источники</MenuItem>
          <MenuItem value="true">Источники Института</MenuItem>
          <MenuItem value="false">Прочие источники</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Автор"
        value={authorValue}
        onChange={(event) => onAuthorChange?.(event.target.value)}
        placeholder="Введите автора"
        fullWidth
        size="small"
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
          size="small"
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
          size="small"
          error={!!isDateError}
          helperText={isDateError ? "Неверный диапазон" : undefined}
          inputProps={{ "aria-label": "Год по", min: 1900, max: 2100 }}
        />
      </Stack>

      <TextField
        label="Ключевые слова"
        value={tagsValue}
        onChange={(event) => onTagsChange?.(event.target.value)}
        placeholder="Теги через пробел, запятую или ;"
        fullWidth
        size="small"
        inputProps={{ "aria-label": "Ключевые слова" }}
      />

      {onHasTranslationChange && (
        <FormControlLabel
          control={
            <Checkbox
              checked={hasTranslationValue}
              onChange={(e) => onHasTranslationChange(e.target.checked)}
              color="primary"
              size="small"
            />
          }
          label="С переводом"
        />
      )}

      {includeSort && (
        <FormControl fullWidth size="small">
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
