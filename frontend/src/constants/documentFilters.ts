export type SortOption = {
  value: string;
  label: string;
};

export const catalogSortOptions: SortOption[] = [
  { value: "date_desc", label: "Сначала новые" },
  { value: "date_asc", label: "Сначала старые" },
  { value: "size_desc", label: "Сначала крупные" },
  { value: "size_asc", label: "Сначала компактные" },
  { value: "title_asc", label: "По названию" },
];

export const searchSortOptions: SortOption[] = [
  { value: "relevance", label: "По совпадению" },
  ...catalogSortOptions,
];
