export type SortOption = {
  value: string;
  label: string;
};

export const catalogSortOptions: SortOption[] = [
  { value: "date_desc", label: "Сначала новые" },
  { value: "date_asc", label: "Сначала старые" },

  { value: "title_asc", label: "По названию" },
  { value: "type_asc", label: "Тип: А-Я" },
  { value: "type_desc", label: "Тип: Я-А" },
  { value: "views_desc", label: "По просмотрам" },
];

export const searchSortOptions: SortOption[] = [
  { value: "relevance", label: "По совпадению" },
  ...catalogSortOptions,
];
