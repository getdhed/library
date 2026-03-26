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
} from "@mui/material";
import { catalogSortOptions } from "../constants/documentFilters";
import type { Department, Faculty } from "../types";

type CatalogFiltersDialogProps = {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  idPrefix: string;
  faculties: Faculty[];
  departments: Department[];
  documentTypes: string[];
  facultyValue: string;
  departmentValue: string;
  typeValue: string;
  onFacultyChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  includeSort?: boolean;
  sortValue?: string;
  onSortChange?: (value: string) => void;
};

const CatalogFiltersDialog: React.FC<CatalogFiltersDialogProps> = ({
  open,
  onClose,
  onApply,
  onReset,
  idPrefix,
  faculties,
  departments,
  documentTypes,
  facultyValue,
  departmentValue,
  typeValue,
  onFacultyChange,
  onDepartmentChange,
  onTypeChange,
  includeSort = false,
  sortValue = "date_desc",
  onSortChange,
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Фильтры</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
        <FormControl fullWidth>
          <InputLabel id={`${idPrefix}-faculty-label`}>Факультет</InputLabel>
          <Select
            labelId={`${idPrefix}-faculty-label`}
            value={facultyValue}
            label="Факультет"
            onChange={(event) => onFacultyChange(event.target.value)}
          >
            <MenuItem value="">Все факультеты</MenuItem>
            {faculties.map((item) => (
              <MenuItem key={item.id} value={String(item.id)}>
                {item.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id={`${idPrefix}-department-label`}>Кафедра</InputLabel>
          <Select
            labelId={`${idPrefix}-department-label`}
            value={departmentValue}
            disabled={!facultyValue}
            label="Кафедра"
            onChange={(event) => onDepartmentChange(event.target.value)}
          >
            <MenuItem value="">Все кафедры</MenuItem>
            {departments.map((item) => (
              <MenuItem key={item.id} value={String(item.id)}>
                {item.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

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
