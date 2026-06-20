import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Pagination,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import { useSearchParams, Link } from "react-router-dom";
import {
  getDocuments,
  getDocumentTypes,
  markOpened,
  toggleDocumentFavorite,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import CatalogFilters from "../components/CatalogFilters";
import DocumentCardActions from "../components/DocumentCardActions";
import DocumentListItem from "../components/DocumentListItem";
import SearchBar from "../components/SearchBar";
import { ContentCard, PageShell } from "../components/mui-primitives";
import type { PagedDocuments } from "../types";

type FilterDraft = {
  type: string;
  author: string;
  yearFrom: string;
  yearTo: string;
  tags: string;
  sort: string;
  isLocal: string;
};

const emptyDraft: FilterDraft = {
  type: "",
  author: "",
  yearFrom: "",
  yearTo: "",
  tags: "",
  sort: "date_desc",
  isLocal: "",
};

const BrowsePage: React.FC = () => {
  const { token, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [payload, setPayload] = useState<PagedDocuments | null>(null);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);

  const q = params.get("q") ?? "";
  const type = params.get("type") ?? "";
  const author = params.get("author") ?? "";
  const yearFrom = params.get("yearFrom") ?? "";
  const yearTo = params.get("yearTo") ?? "";
  const tags = params.get("tags") ?? "";
  const sort = params.get("sort") ?? "date_desc";
  const isLocal = params.get("isLocal") ?? "";
  const page = Number(params.get("page") ?? 1);

  const [searchQuery, setSearchQuery] = useState(q);

  const [draftFilters, setDraftFilters] = useState<FilterDraft>({
    type,
    author,
    yearFrom,
    yearTo,
    tags,
    sort,
    isLocal,
  });

  useEffect(() => {
    setSearchQuery(q);
  }, [q]);

  useEffect(() => {
    setDraftFilters({
      type,
      author,
      yearFrom,
      yearTo,
      tags,
      sort,
      isLocal,
    });
  }, [author, sort, tags, type, yearFrom, yearTo, isLocal]);

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
      q,
      sort,
      type,
      author,
      yearFrom,
      yearTo,
      tags,
      isLocal,
      page,
    });
    setPayload(response);
  }, [q, author, page, sort, tags, token, type, yearFrom, yearTo, isLocal]);

  useEffect(() => {
    loadDocuments().catch(console.error);
  }, [loadDocuments]);

  function updateParam(next: Record<string, string>) {
    const copy = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => {
      if (!value) {
        copy.delete(key);
      } else {
        copy.set(key, value);
      }
    });

    if (!copy.get("sort")) {
      copy.set("sort", "date_desc");
    }
    if (!copy.get("page")) {
      copy.set("page", "1");
    }

    setParams(copy);
  }

  function handleQuickOpen(id: number) {
    if (!token) return;
    void markOpened(token, id).catch(console.error);
  }

  async function toggleFavorite(id: number, isFavorite: boolean) {
    if (!token) return;
    await toggleDocumentFavorite(token, id, isFavorite);
    await loadDocuments();
  }

  function applyFilters() {
    updateParam({
      q: searchQuery.trim(),
      type: draftFilters.type,
      author: draftFilters.author.trim(),
      yearFrom: draftFilters.yearFrom,
      yearTo: draftFilters.yearTo,
      tags: draftFilters.tags.trim(),
      sort: draftFilters.sort,
      isLocal: draftFilters.isLocal,
      page: "1",
    });
  }

  function applySearch() {
    applyFilters();
  }

  function resetFilters() {
    setSearchQuery("");
    setDraftFilters(emptyDraft);
    updateParam({
      q: "",
      type: "",
      author: "",
      yearFrom: "",
      yearTo: "",
      tags: "",
      sort: "date_desc",
      isLocal: "",
      page: "1",
    });
  }

  const getSearchTitle = () => {
    const parts = [];
    if (searchQuery) parts.push(`"${searchQuery}"`);
    if (draftFilters.author) parts.push(`автору "${draftFilters.author}"`);
    if (draftFilters.type) parts.push(`типу "${draftFilters.type}"`);
    if (draftFilters.yearFrom || draftFilters.yearTo) {
      if (draftFilters.yearFrom && draftFilters.yearTo) parts.push(`годам ${draftFilters.yearFrom}-${draftFilters.yearTo}`);
      else if (draftFilters.yearFrom) parts.push(`годам от ${draftFilters.yearFrom}`);
      else parts.push(`годам до ${draftFilters.yearTo}`);
    }
    if (draftFilters.tags) parts.push(`тегам "${draftFilters.tags}"`);

    if (parts.length === 0) return "Все документы";
    return `Результаты по ${parts.join(", ")}`;
  };

  return (
    <PageShell>
      <Box sx={{ display: "flex", gap: { xs: 3, md: 5 }, alignItems: "flex-start", flexDirection: { xs: "column", md: "row" } }}>
        <Box
          sx={{
            width: { xs: "100%", md: "33.333%" },
            minWidth: { md: 320 },
            maxWidth: { md: 400 },
            position: { md: "sticky" },
            top: { md: 90 },
            maxHeight: { md: "calc(100vh - 110px)" },
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            flexShrink: 0,
            bgcolor: "action.hover",
            p: 3,
            borderRadius: 2,
            border: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h4" fontWeight={700}>
            Каталог <Typography component="span" variant="h5" color="text.secondary">({payload?.total ?? 0})</Typography>
          </Typography>

          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={applySearch}
            placeholder="Искать в каталоге..."
            hideButton
          />

          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Фильтры</Typography>
            <CatalogFilters
              onApply={applyFilters}
              onReset={resetFilters}
              idPrefix="browse"
              documentTypes={documentTypes}
              typeValue={draftFilters.type}
              onTypeChange={(value) =>
                setDraftFilters((current) => ({ ...current, type: value }))
              }
              authorValue={draftFilters.author}
              onAuthorChange={(value) =>
                setDraftFilters((current) => ({ ...current, author: value }))
              }
              yearFromValue={draftFilters.yearFrom}
              onYearFromChange={(value) =>
                setDraftFilters((current) => ({ ...current, yearFrom: value }))
              }
              yearToValue={draftFilters.yearTo}
              onYearToChange={(value) =>
                setDraftFilters((current) => ({ ...current, yearTo: value }))
              }
              tagsValue={draftFilters.tags}
              onTagsChange={(value) =>
                setDraftFilters((current) => ({ ...current, tags: value }))
              }
              isLocalValue={draftFilters.isLocal}
              onIsLocalChange={(value) =>
                setDraftFilters((current) => ({ ...current, isLocal: value }))
              }
              includeSort
              sortValue={draftFilters.sort}
              onSortChange={(value) =>
                setDraftFilters((current) => ({ ...current, sort: value }))
              }
            />
          </Box>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          <ContentCard sx={{ minHeight: "100%", p: { xs: 0 }, bgcolor: "transparent", border: "none", boxShadow: "none" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, px: { xs: 2, md: 0 }, pt: { xs: 2, md: 0 } }}>
              <Typography variant="h5">
                {getSearchTitle()}
              </Typography>
              {user?.role === "user" && (
                <Button component={Link} to="/submit" variant="outlined" size="small">
                  Предложить документ
                </Button>
              )}
            </Stack>
            <Stack spacing={0}>
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

              {payload && payload.items.length === 0 && (
                <Box sx={{ p: 4, textAlign: "center", bgcolor: "action.hover", borderRadius: 2, mt: 2 }}>
                  <Typography variant="h6" gutterBottom>Ничего не найдено</Typography>
                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    По вашему запросу не найдено ни одного документа. Не нашли нужный материал? Вы можете предложить свой!
                  </Typography>
                  {user?.role === "user" && (
                    <Button component={Link} to="/submit" variant="contained">
                      Предложить документ
                    </Button>
                  )}
                </Box>
              )}
            </Stack>

            {payload && payload.total > payload.pageSize && (
              <Stack spacing={1} alignItems="center" sx={{ mt: 4, mb: 2 }}>
                <Pagination
                  count={Math.max(1, Math.ceil(payload.total / payload.pageSize))}
                  page={page}
                  shape="rounded"
                  color="primary"
                  onChange={(_, nextPage) => {
                    updateParam({ page: String(nextPage) });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  Страница {page} из {Math.max(1, Math.ceil(payload.total / payload.pageSize))}
                </Typography>
              </Stack>
            )}
          </ContentCard>
        </Box>
      </Box>
    </PageShell>
  );
};

export default BrowsePage;
