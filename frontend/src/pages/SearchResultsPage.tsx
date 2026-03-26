import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  getDepartments,
  getDocuments,
  getFaculties,
  getSuggestions,
  markOpened,
  toggleDocumentFavorite,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import CatalogFiltersDialog from "../components/CatalogFiltersDialog";
import DocumentCardActions from "../components/DocumentCardActions";
import DocumentListItem from "../components/DocumentListItem";
import { searchSortOptions } from "../constants/documentFilters";
import {
  ContentCard,
  PageHeader,
  PageShell,
} from "../components/mui-primitives";
import type { Department, DocumentItem, Faculty, PagedDocuments } from "../types";

type FilterDraft = {
  facultyId: string;
  departmentId: string;
  type: string;
};

const emptyDraft: FilterDraft = {
  facultyId: "",
  departmentId: "",
  type: "",
};

const SearchResultsPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [payload, setPayload] = useState<PagedDocuments | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");
  const [suggestions, setSuggestions] = useState<DocumentItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);

  const query = params.get("q") ?? "";
  const sort = params.get("sort") ?? "relevance";
  const facultyId = Number(params.get("facultyId") ?? 0);
  const departmentId = Number(params.get("departmentId") ?? 0);
  const type = params.get("type") ?? "";
  const page = Number(params.get("page") ?? 1);

  const [draftFilters, setDraftFilters] = useState<FilterDraft>({
    facultyId: facultyId ? String(facultyId) : "",
    departmentId: departmentId ? String(departmentId) : "",
    type,
  });

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    getFaculties()
      .then((response) => setFaculties(response.items))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setDraftFilters({
      facultyId: facultyId ? String(facultyId) : "",
      departmentId: departmentId ? String(departmentId) : "",
      type,
    });
  }, [departmentId, facultyId, type]);

  const effectiveFacultyId = Number(draftFilters.facultyId || 0);

  useEffect(() => {
    if (!effectiveFacultyId) {
      setDepartments([]);
      return;
    }

    getDepartments(effectiveFacultyId)
      .then((response) => setDepartments(response.items))
      .catch(console.error);
  }, [effectiveFacultyId]);

  const loadDocuments = useCallback(async () => {
    if (!token) {
      return;
    }

    const response = await getDocuments(token, {
      q: query,
      sort,
      facultyId,
      departmentId,
      type,
      page,
    });
    setPayload(response);
  }, [departmentId, facultyId, page, query, sort, token, type]);

  useEffect(() => {
    loadDocuments().catch(console.error);
  }, [loadDocuments]);

  useEffect(() => {
    if (!token || !searchInput.trim()) {
      setSuggestions([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      getSuggestions(token, searchInput.trim())
        .then((response) => setSuggestions(response.items))
        .catch(console.error);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchInput, token]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const documentTypes = useMemo(() => {
    const items = payload?.items ?? [];
    return Array.from(new Set(items.map((item) => item.type)));
  }, [payload?.items]);

  const activeFiltersCount = [facultyId, departmentId, type].filter(Boolean).length;
  const showDropdown = showSuggestions && suggestions.length > 0;

  function updateParam(next: Record<string, string>) {
    const copy = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => {
      if (!value) {
        copy.delete(key);
      } else {
        copy.set(key, value);
      }
    });

    if (!next.page) {
      copy.set("page", "1");
    }

    setParams(copy);
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    updateParam({ q: searchInput.trim(), page: "1" });
    setShowSuggestions(false);
  }

  async function openSuggestedDocument(item: DocumentItem) {
    if (!token) {
      return;
    }

    await markOpened(token, item.id);
    navigate(`/documents/${item.id}`);
  }

  async function toggleFavorite(id: number, isFavorite: boolean) {
    if (!token) {
      return;
    }

    await toggleDocumentFavorite(token, id, isFavorite);
    await loadDocuments();
  }

  function handleQuickOpen(id: number) {
    if (!token) {
      return;
    }

    void markOpened(token, id).catch(console.error);
  }

  function applyFilters() {
    updateParam({
      facultyId: draftFilters.facultyId,
      departmentId: draftFilters.departmentId,
      type: draftFilters.type,
    });
    setFiltersOpen(false);
  }

  function resetFilters() {
    setDraftFilters(emptyDraft);
    updateParam({
      facultyId: "",
      departmentId: "",
      type: "",
    });
    setFiltersOpen(false);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Поиск"
        title={query ? `Результаты по запросу "${query}"` : "Все документы"}
        side={<Typography fontWeight={700}>{payload?.total ?? 0} документов</Typography>}
      />

      <ContentCard>
        <Box component="form" onSubmit={submitSearch} sx={{ position: "relative", mb: 1.8 }}>
          <Stack direction="row" spacing={1.1}>
            <TextField
              label="Поиск документов"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                if (blurTimeoutRef.current) {
                  window.clearTimeout(blurTimeoutRef.current);
                }
                blurTimeoutRef.current = window.setTimeout(
                  () => setShowSuggestions(false),
                  150
                );
              }}
              placeholder="Название, автор, кафедра"
              fullWidth
            />
            <IconButton
              type="submit"
              aria-label="Поиск"
              title="Поиск"
              sx={{
                width: 54,
                height: 54,
                borderRadius: 2,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": {
                  bgcolor: "primary.dark",
                },
              }}
            >
              <SearchRoundedIcon />
            </IconButton>
          </Stack>

          {showDropdown && (
            <Paper
              sx={{
                position: "absolute",
                top: "calc(100% + 10px)",
                left: 0,
                right: 78,
                zIndex: 20,
                borderRadius: 2.25,
              }}
            >
              <Typography
                sx={{
                  px: 1.6,
                  py: 1,
                  borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                  color: "text.secondary",
                  fontSize: 12,
                }}
              >
                Подходящие документы
              </Typography>
              {suggestions.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  color="inherit"
                  fullWidth
                  sx={{ justifyContent: "flex-start", borderRadius: 0, px: 1.6, py: 1.1 }}
                  onClick={() => void openSuggestedDocument(item)}
                >
                  {item.title}
                </Button>
              ))}
            </Paper>
          )}
        </Box>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.2}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
          sx={{ mb: 1.8 }}
        >
          <Button type="button" variant="outlined" onClick={() => setFiltersOpen(true)}>
            Фильтры{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>

          <FormControl sx={{ minWidth: 230 }}>
            <InputLabel id="search-sort-label">Сортировка</InputLabel>
            <Select
              labelId="search-sort-label"
              id="search-sort"
              value={sort}
              label="Сортировка"
              onChange={(event) => updateParam({ sort: event.target.value })}
            >
              {searchSortOptions.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Paper sx={{ p: 2, borderRadius: 3, mb: 1.8 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.2}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography fontWeight={700}>Не нашли нужный PDF?</Typography>
              <Typography color="text.secondary">
                Отправьте файл на модерацию, и после проверки он появится в каталоге.
              </Typography>
            </Box>
            <Button component={Link} to="/submit" variant="contained">
              Предложить документ
            </Button>
          </Stack>
        </Paper>

        <Stack spacing={1.4}>
          {(payload?.items ?? []).map((item) => (
            <DocumentListItem
              key={item.id}
              item={item}
              token={token}
              actions={
                <DocumentCardActions
                  item={item}
                  token={token}
                  onOpen={handleQuickOpen}
                  onToggleFavorite={toggleFavorite}
                />
              }
            />
          ))}
        </Stack>

        {payload && payload.total > payload.pageSize && (
          <Stack
            direction="row"
            spacing={1.2}
            alignItems="center"
            justifyContent="center"
            sx={{ mt: 2.2 }}
          >
            <Button
              variant="outlined"
              disabled={page <= 1}
              onClick={() => updateParam({ page: String(page - 1) })}
            >
              Назад
            </Button>
            <Typography>Страница {page}</Typography>
            <Button
              variant="outlined"
              disabled={page * payload.pageSize >= payload.total}
              onClick={() => updateParam({ page: String(page + 1) })}
            >
              Вперёд
            </Button>
          </Stack>
        )}
      </ContentCard>

      <CatalogFiltersDialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={applyFilters}
        onReset={resetFilters}
        idPrefix="search"
        faculties={faculties}
        departments={departments}
        documentTypes={documentTypes}
        facultyValue={draftFilters.facultyId}
        departmentValue={draftFilters.departmentId}
        typeValue={draftFilters.type}
        onFacultyChange={(value) =>
          setDraftFilters((current) => ({
            ...current,
            facultyId: value,
            departmentId: "",
          }))
        }
        onDepartmentChange={(value) =>
          setDraftFilters((current) => ({
            ...current,
            departmentId: value,
          }))
        }
        onTypeChange={(value) =>
          setDraftFilters((current) => ({
            ...current,
            type: value,
          }))
        }
      />
    </PageShell>
  );
};

export default SearchResultsPage;
