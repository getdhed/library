import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { catalogSortOptions } from "../constants/documentFilters";

type CatalogFiltersDialogProps = {
  open: boolean;
  onClose: () => void;
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

const CatalogFiltersDialog: React.FC<CatalogFiltersDialogProps> = ({
  open,
  onClose,
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
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth={false}
      maxWidth={false}
      PaperProps={{ sx: { width: 560, maxWidth: "none" } }}
    >
      <DialogTitle>Фильтры</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
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

        <Stack direction="row" spacing={1.5}>
          <TextField
            label="Год с"
            value={yearFromValue}
            onChange={(event) => onYearFromChange?.(event.target.value)}
            type="number"
            placeholder="например, 2010"
            fullWidth
            inputProps={{ "aria-label": "Год с", min: 1900, max: 2100 }}
          />
          <TextField
            label="Год по"
            value={yearToValue}
            onChange={(event) => onYearToChange?.(event.target.value)}
            type="number"
            placeholder="например, 2025"
            fullWidth
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
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.2 }}>
        <Button type="button" variant="outlined" onClick={onReset}>
          Сбросить
        </Button>
        <Button type="button" variant="contained" onClick={onApply}>
          Применить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CatalogFiltersDialog;
