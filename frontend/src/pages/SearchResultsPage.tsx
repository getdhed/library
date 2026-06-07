import React, { useCallback, useEffect, useRef, useState } from "react";
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
  getDocuments,
  getDocumentTypes,
  getSuggestions,
  markOpened,
  toggleDocumentFavorite,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import DocumentCardActions from "../components/DocumentCardActions";
import DocumentListItem from "../components/DocumentListItem";
import { searchSortOptions } from "../constants/documentFilters";
import {
  ContentCard,
  PageHeader,
  PageShell,
} from "../components/mui-primitives";
import type { DocumentItem, PagedDocuments } from "../types";

type FilterDraft = {
  type: string;
  author: string;
  yearFrom: string;
  yearTo: string;
  tags: string;
};

const emptyDraft: FilterDraft = {
  type: "",
  author: "",
  yearFrom: "",
  yearTo: "",
  tags: "",
};

const SearchResultsPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [payload, setPayload] = useState<PagedDocuments | null>(null);
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");
  const [suggestions, setSuggestions] = useState<DocumentItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const blurTimeoutRef = useRef<number | null>(null);

  const query = params.get("q") ?? "";
  const sort = params.get("sort") ?? "relevance";
  const type = params.get("type") ?? "";
  const author = params.get("author") ?? "";
  const yearFrom = params.get("yearFrom") ?? "";
  const yearTo = params.get("yearTo") ?? "";
  const tags = params.get("tags") ?? "";
  const page = Number(params.get("page") ?? 1);

  const [draftFilters, setDraftFilters] = useState<FilterDraft>({
    type,
    author,
    yearFrom,
    yearTo,
    tags,
  });

  const [draftSort, setDraftSort] = useState(sort);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    setDraftFilters({
      type,
      author,
      yearFrom,
      yearTo,
      tags,
    });
    setDraftSort(sort);
  }, [author, sort, tags, type, yearFrom, yearTo]);

  useEffect(() => {
    getDocumentTypes()
      .then((response) => setDocumentTypes(response.items))
      .catch(console.error);
  }, []);

  const loadDocuments = useCallback(async () => {
    if (!token) {
      return;
    }

    const response = await getDocuments(token, {
      q: query,
      sort,
      type,
      author,
      yearFrom,
      yearTo,
      tags,
      page,
    });
    setPayload(response);
  }, [author, page, query, sort, tags, token, type, yearFrom, yearTo]);

  useEffect(() => {
    loadDocuments().catch(console.error);
  }, [loadDocuments]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (!token || trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      getSuggestions(token, trimmed)
        .then((response) => setSuggestions(response.items.slice(0, 5)))
        .catch(console.error);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput, token]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

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
    if (showDropdown && suggestions.length > 0) {
      void openSuggestedDocument(suggestions[0]);
    } else {
      updateParam({ q: searchInput.trim(), page: "1" });
      setShowSuggestions(false);
    }
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
      type: draftFilters.type,
      author: draftFilters.author.trim(),
      yearFrom: draftFilters.yearFrom,
      yearTo: draftFilters.yearTo,
      tags: draftFilters.tags.trim(),
      sort: draftSort,
    });
  }

  function resetFilters() {
    setDraftFilters(emptyDraft);
    setDraftSort("relevance");
    updateParam({
      type: "",
      author: "",
      yearFrom: "",
      yearTo: "",
      tags: "",
      sort: "relevance",
    });
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Поиск"
        title={query ? `Результаты по запросу "${query}"` : "Все документы"}
        side={<Typography fontWeight={700}>{payload?.total ?? 0} документов</Typography>}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(260px, 1fr) 2fr" },
          gap: 1.5,
          alignItems: "start",
        }}
      >
        {/* Фильтры */}
        <ContentCard sx={{ position: "sticky", top: 75 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6">Фильтры</Typography>

            <FormControl fullWidth>
              <InputLabel id="filter-type-label">Тип документа</InputLabel>
              <Select
                labelId="filter-type-label"
                value={draftFilters.type}
                label="Тип документа"
                onChange={(e) =>
                  setDraftFilters((current) => ({
                    ...current,
                    type: e.target.value,
                  }))
                }
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
              value={draftFilters.author}
              onChange={(e) =>
                setDraftFilters((current) => ({
                  ...current,
                  author: e.target.value,
                }))
              }
              placeholder="Введите автора"
              fullWidth
              inputProps={{ "aria-label": "Автор" }}
            />

            <Stack direction="row" spacing={1.2}>
              <TextField
                label="Год с"
                value={draftFilters.yearFrom}
                onChange={(e) =>
                  setDraftFilters((current) => ({
                    ...current,
                    yearFrom: e.target.value,
                  }))
                }
                type="number"
                placeholder="2010"
                fullWidth
                inputProps={{ "aria-label": "Год с", min: 1900, max: 2100 }}
              />
              <TextField
                label="Год по"
                value={draftFilters.yearTo}
                onChange={(e) =>
                  setDraftFilters((current) => ({
                    ...current,
                    yearTo: e.target.value,
                  }))
                }
                type="number"
                placeholder="2025"
                fullWidth
                inputProps={{ "aria-label": "Год по", min: 1900, max: 2100 }}
              />
            </Stack>

            <TextField
              label="Ключевые слова"
              value={draftFilters.tags}
              onChange={(e) =>
                setDraftFilters((current) => ({
                  ...current,
                  tags: e.target.value,
                }))
              }
              placeholder="Теги через пробел или запятую"
              fullWidth
              inputProps={{ "aria-label": "Ключевые слова" }}
            />

            <FormControl fullWidth>
              <InputLabel id="filter-sort-label">Сортировка</InputLabel>
              <Select
                labelId="filter-sort-label"
                value={draftSort}
                label="Сортировка"
                onChange={(e) => setDraftSort(e.target.value)}
              >
                {searchSortOptions.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={1.2}>
              <Button variant="contained" onClick={applyFilters} fullWidth sx={{ borderRadius: 0 }}>
                Применить
              </Button>
              <Button variant="outlined" onClick={resetFilters} fullWidth sx={{ borderRadius: 0 }}>
                Сбросить
              </Button>
            </Stack>
          </Stack>
        </ContentCard>

        {/* Результаты */}
        <Box>
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
                    maxHeight: 320,
                    overflowY: "auto",
                  }}
                >
                  {suggestions.map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      color="inherit"
                      fullWidth
                      sx={{
                        justifyContent: "flex-start",
                        borderRadius: 0,
                        px: 1.6,
                        py: 1.1,
                        textAlign: "left",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                        "&:last-child": { borderBottom: "none" },
                      }}
                      onClick={() => void openSuggestedDocument(item)}
                    >
                      <Typography
                        component="span"
                        sx={{
                          fontSize: 14,
                          fontWeight: 500,
                          lineHeight: 1.3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: "100%",
                        }}
                      >
                        {item.title}
                      </Typography>
                      {item.type && (
                        <Typography
                          component="span"
                          sx={{
                            fontSize: 11,
                            color: "text.secondary",
                            lineHeight: 1.2,
                            mt: 0.2,
                          }}
                        >
                          {item.type}
                        </Typography>
                      )}
                    </Button>
                  ))}
                </Paper>
              )}
            </Box>

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
        </Box>
      </Box>
    </PageShell>
  );
};

export default SearchResultsPage;
