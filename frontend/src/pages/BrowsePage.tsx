import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  getDepartments,
  getDocuments,
  getFaculties,
  markOpened,
  toggleDocumentFavorite,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import CatalogFiltersDialog from "../components/CatalogFiltersDialog";
import DocumentCardActions from "../components/DocumentCardActions";
import DocumentListItem from "../components/DocumentListItem";
import { ContentCard, PageHeader, PageShell } from "../components/mui-primitives";
import type { Department, Faculty, PagedDocuments } from "../types";

type FilterDraft = {
  facultyId: string;
  departmentId: string;
  type: string;
  sort: string;
};

const emptyDraft: FilterDraft = {
  facultyId: "",
  departmentId: "",
  type: "",
  sort: "date_desc",
};

const BrowsePage: React.FC = () => {
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [payload, setPayload] = useState<PagedDocuments | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const facultyId = Number(params.get("facultyId") ?? 0);
  const departmentId = Number(params.get("departmentId") ?? 0);
  const type = params.get("type") ?? "";
  const sort = params.get("sort") ?? "date_desc";
  const page = Number(params.get("page") ?? 1);

  const [draftFilters, setDraftFilters] = useState<FilterDraft>({
    facultyId: facultyId ? String(facultyId) : "",
    departmentId: departmentId ? String(departmentId) : "",
    type,
    sort,
  });

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
      sort,
    });
  }, [departmentId, facultyId, sort, type]);

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
      sort,
      facultyId,
      departmentId,
      type,
      page,
    });
    setPayload(response);
  }, [departmentId, facultyId, page, sort, token, type]);

  useEffect(() => {
    loadDocuments().catch(console.error);
  }, [loadDocuments]);

  const documentTypes = useMemo(() => {
    const items = payload?.items ?? [];
    return Array.from(new Set(items.map((item) => item.type)));
  }, [payload?.items]);

  const activeFiltersCount = [
    facultyId,
    departmentId,
    type,
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
      facultyId: draftFilters.facultyId,
      departmentId: draftFilters.departmentId,
      type: draftFilters.type,
      sort: draftFilters.sort,
      page: "1",
    });
  }

  function resetFilters() {
    setFiltersOpen(false);
    setDraftFilters(emptyDraft);
    updateParam({
      facultyId: "",
      departmentId: "",
      type: "",
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
