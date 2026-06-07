import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Pagination,
  Stack,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import {
  getDocuments,
  getDocumentTypes,
  markOpened,
  toggleDocumentFavorite,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import CatalogFiltersDialog from "../components/CatalogFiltersDialog";
import DocumentCardActions from "../components/DocumentCardActions";
import DocumentListItem from "../components/DocumentListItem";
import { ContentCard, PageHeader, PageShell } from "../components/mui-primitives";
import type { PagedDocuments } from "../types";

type FilterDraft = {
  type: string;
  author: string;
  yearFrom: string;
  yearTo: string;
  tags: string;
  sort: string;
};

const emptyDraft: FilterDraft = {
  type: "",
  author: "",
  yearFrom: "",
  yearTo: "",
  tags: "",
  sort: "date_desc",
};

const BrowsePage: React.FC = () => {
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const [payload, setPayload] = useState<PagedDocuments | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);

  const type = params.get("type") ?? "";
  const author = params.get("author") ?? "";
  const yearFrom = params.get("yearFrom") ?? "";
  const yearTo = params.get("yearTo") ?? "";
  const tags = params.get("tags") ?? "";
  const sort = params.get("sort") ?? "date_desc";
  const page = Number(params.get("page") ?? 1);

  const [draftFilters, setDraftFilters] = useState<FilterDraft>({
    type,
    author,
    yearFrom,
    yearTo,
    tags,
    sort,
  });

  useEffect(() => {
    setDraftFilters({
      type,
      author,
      yearFrom,
      yearTo,
      tags,
      sort,
    });
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
      sort,
      type,
      author,
      yearFrom,
      yearTo,
      tags,
      page,
    });
    setPayload(response);
  }, [author, page, sort, tags, token, type, yearFrom, yearTo]);

  useEffect(() => {
    loadDocuments().catch(console.error);
  }, [loadDocuments]);

  const activeFiltersCount = [
    type,
    author,
    yearFrom,
    yearTo,
    tags,
    sort !== "date_desc" ? sort : "",
  ].filter(Boolean).length;

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
    if (!token) {
      return;
    }

    void markOpened(token, id).catch(console.error);
  }

  async function toggleFavorite(id: number, isFavorite: boolean) {
    if (!token) {
      return;
    }

    await toggleDocumentFavorite(token, id, isFavorite);
    await loadDocuments();
  }

  function applyFilters() {
    setFiltersOpen(false);
    updateParam({
      type: draftFilters.type,
      author: draftFilters.author.trim(),
      yearFrom: draftFilters.yearFrom,
      yearTo: draftFilters.yearTo,
      tags: draftFilters.tags.trim(),
      sort: draftFilters.sort,
      page: "1",
    });
  }

  function resetFilters() {
    setFiltersOpen(false);
    setDraftFilters(emptyDraft);
    updateParam({
      type: "",
      author: "",
      yearFrom: "",
      yearTo: "",
      tags: "",
      sort: "date_desc",
      page: "1",
    });
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Каталог"
        title="Все документы"
        description="Полный список материалов библиотеки."
        side={<Typography fontWeight={700}>{payload?.total ?? 0} документов</Typography>}
      />

      <ContentCard>
        <Box sx={{ mb: 1.8 }}>
          <Button
            type="button"
            variant="outlined"
            onClick={() => setFiltersOpen(true)}
            startIcon={
              <Badge
                color="primary"
                badgeContent={activeFiltersCount > 0 ? activeFiltersCount : undefined}
              >
                <Box sx={{ width: 12 }} />
              </Badge>
            }
          >
            Фильтры
          </Button>
        </Box>

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

          {payload && payload.items.length === 0 && (
            <Typography color="text.secondary">Документы не найдены</Typography>
          )}
        </Stack>

        {payload && payload.total > payload.pageSize && (
          <Stack spacing={1} alignItems="center" sx={{ mt: 2.2 }}>
            <Pagination
              count={Math.max(1, Math.ceil(payload.total / payload.pageSize))}
              page={page}
              shape="rounded"
              color="primary"
              onChange={(_, nextPage) => updateParam({ page: String(nextPage) })}
            />
            <Typography variant="body2" color="text.secondary">
              Страница {page} из {Math.max(1, Math.ceil(payload.total / payload.pageSize))}
            </Typography>
          </Stack>
        )}
      </ContentCard>

      <CatalogFiltersDialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={applyFilters}
        onReset={resetFilters}
        idPrefix="browse"
        documentTypes={documentTypes}
        typeValue={draftFilters.type}
        onTypeChange={(value) =>
          setDraftFilters((current) => ({
            ...current,
            type: value,
          }))
        }
        authorValue={draftFilters.author}
        onAuthorChange={(value) =>
          setDraftFilters((current) => ({
            ...current,
            author: value,
          }))
        }
        yearFromValue={draftFilters.yearFrom}
        onYearFromChange={(value) =>
          setDraftFilters((current) => ({
            ...current,
            yearFrom: value,
          }))
        }
        yearToValue={draftFilters.yearTo}
        onYearToChange={(value) =>
          setDraftFilters((current) => ({
            ...current,
            yearTo: value,
          }))
        }
        tagsValue={draftFilters.tags}
        onTagsChange={(value) =>
          setDraftFilters((current) => ({
            ...current,
            tags: value,
          }))
        }
        includeSort
        sortValue={draftFilters.sort}
        onSortChange={(value) =>
          setDraftFilters((current) => ({
            ...current,
            sort: value,
          }))
        }
      />
    </PageShell>
  );
};

export default BrowsePage;
