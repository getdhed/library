import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  documentFileUrl,
  favoriteDocument,
  getDepartments,
  getDocuments,
  getFaculties,
  getSuggestions,
  markOpened,
  unfavoriteDocument,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import DocumentListItem from "../components/DocumentListItem";
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

  useEffect(() => {
    if (!token) return;
    getDocuments(token, { q: query, sort, facultyId, departmentId, type, page })
      .then(setPayload)
      .catch(console.error);
  }, [departmentId, facultyId, page, query, sort, token, type]);

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

  const documentTypes = useMemo(() => {
    const items = payload?.items ?? [];
    return Array.from(new Set(items.map((item) => item.type)));
  }, [payload?.items]);

  const activeFiltersCount = [facultyId, departmentId, type].filter(Boolean)
    .length;
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
    if (!token) return;
    await markOpened(token, item.id);
    navigate(`/documents/${item.id}`);
  }

  function buildFreshFileUrl(item: DocumentItem) {
    return documentFileUrl(
      item.id,
      token ?? "",
      false,
      `${item.updatedAt}-${Date.now()}`
    );
  }

  function handleQuickOpen(
    event: React.MouseEvent<HTMLAnchorElement>,
    item: DocumentItem
  ) {
    event.preventDefault();
    if (!token) return;

    void markOpened(token, item.id).catch(console.error);
    window.open(buildFreshFileUrl(item), "_blank", "noopener,noreferrer");
  }

  async function toggleFavorite(id: number, isFavorite: boolean) {
    if (!token) return;
    if (isFavorite) {
      await unfavoriteDocument(token, id);
    } else {
      await favoriteDocument(token, id);
    }

    const refreshed = await getDocuments(token, {
      q: query,
      sort,
      facultyId,
      departmentId,
      type,
      page,
    });
    setPayload(refreshed);
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
    <div className="page-shell page-shell-clean">
      <div className="page-header page-header-search">
        <div>
          <p className="eyebrow">Поиск</p>
          <h1>
            {query ? `Результаты по запросу "${query}"` : "Все документы"}
          </h1>
        </div>
        <div className="search-header-meta">
          {payload?.total ?? 0} документов
        </div>
      </div>

      <div
        className={`content-card content-card-flat search-results-shell ${
          showDropdown ? "search-results-shell-open" : ""
        }`}
      >
        <form
          className={`search-box search-box-results ${
            showDropdown ? "search-box-expanded" : ""
          }`}
          onSubmit={submitSearch}
        >
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Название, автор, кафедра"
          />
          <button
            className="primary-button search-submit-button"
            type="submit"
            aria-label="Поиск"
            title="Поиск"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10.5 4a6.5 6.5 0 1 0 4.14 11.52l4.92 4.92 1.41-1.41-4.92-4.92A6.5 6.5 0 0 0 10.5 4m0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9" />
            </svg>
          </button>

          {showDropdown && (
            <div className="search-dropdown">
              <div className="dropdown-caption">Подходящие документы</div>
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="dropdown-row"
                  onClick={() => void openSuggestedDocument(item)}
                >
                  {item.title}
                </button>
              ))}
            </div>
          )}
        </form>

        <div className="search-toolbar search-toolbar-clean">
          <button
            type="button"
            className="secondary-button filter-trigger"
            onClick={() => setFiltersOpen(true)}
          >
            <span>Фильтры</span>
            {activeFiltersCount > 0 && <span className="pill">{activeFiltersCount}</span>}
          </button>

          <div className="toolbar-group toolbar-sort">
            <label className="sort-label" htmlFor="search-sort">
              Сортировка
            </label>
            <select
              id="search-sort"
              value={sort}
              onChange={(e) => updateParam({ sort: e.target.value })}
            >
              <option value="relevance">По совпадению</option>
              <option value="date_desc">Сначала новые</option>
              <option value="date_asc">Сначала старые</option>
              <option value="size_desc">Сначала крупные</option>
              <option value="size_asc">Сначала компактные</option>
              <option value="title_asc">По названию</option>
            </select>
          </div>
        </div>

        {filtersOpen && (
          <div className="filter-overlay" onClick={() => setFiltersOpen(false)}>
            <aside
              className="filter-panel"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="filter-panel-header">
                <div>
                  <p className="eyebrow">Поиск</p>
                  <h2>Фильтры</h2>
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setFiltersOpen(false)}
                >
                  Закрыть
                </button>
              </div>

              <div className="filter-form">
                <label className="filter-field">
                  <span>Факультет</span>
                  <select
                    value={draftFilters.facultyId}
                    onChange={(e) =>
                      setDraftFilters((current) => ({
                        ...current,
                        facultyId: e.target.value,
                        departmentId: "",
                      }))
                    }
                  >
                    <option value="">Все факультеты</option>
                    {faculties.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="filter-field">
                  <span>Кафедра</span>
                  <select
                    value={draftFilters.departmentId}
                    disabled={!draftFilters.facultyId}
                    onChange={(e) =>
                      setDraftFilters((current) => ({
                        ...current,
                        departmentId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Все кафедры</option>
                    {departments.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="filter-field">
                  <span>Тип документа</span>
                  <select
                    value={draftFilters.type}
                    onChange={(e) =>
                      setDraftFilters((current) => ({
                        ...current,
                        type: e.target.value,
                      }))
                    }
                  >
                    <option value="">Все типы</option>
                    {documentTypes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="filter-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetFilters}
                >
                  Сбросить
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={applyFilters}
                >
                  Применить
                </button>
              </div>
            </aside>
          </div>
        )}

        <div className="document-list">
          {(payload?.items ?? []).map((item) => (
            <DocumentListItem
              key={item.id}
              item={item}
              token={token}
              actions={
                <div className="document-card-action-set">
                  <a
                    className="document-action-button document-action-button-with-label"
                    href={buildFreshFileUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => handleQuickOpen(event, item)}
                    aria-label="Открыть документ"
                    title="Открыть документ"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zm0 1.5L17.5 8H14zM12 11a1 1 0 0 1 1 1v2.59l1.3-1.29a1 1 0 1 1 1.4 1.41l-3 3a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.41L11 14.59V12a1 1 0 0 1 1-1" />
                    </svg>
                    <span>Открыть</span>
                  </a>
                  <button
                    type="button"
                    className={`document-action-button document-action-button-with-label ${
                      item.isFavorite ? "document-action-button-active" : ""
                    }`}
                    onClick={() => toggleFavorite(item.id, item.isFavorite)}
                    aria-label={
                      item.isFavorite
                        ? "Убрать из избранного"
                        : "Добавить в избранное"
                    }
                    title={
                      item.isFavorite
                        ? "Убрать из избранного"
                        : "Добавить в избранное"
                    }
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m12 20.4-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.42 22 7.5c0 3.78-3.4 6.86-8.55 11.58z" />
                    </svg>
                    <span>{item.isFavorite ? "В избранном" : "В избранное"}</span>
                  </button>
                </div>
              }
            />
          ))}
        </div>

        {payload && payload.total > payload.pageSize && (
          <div className="pagination-row pagination-row-clean">
            <button
              className="secondary-button"
              disabled={page <= 1}
              onClick={() => updateParam({ page: String(page - 1) })}
            >
              Назад
            </button>
            <span>Страница {page}</span>
            <button
              className="secondary-button"
              disabled={page * payload.pageSize >= payload.total}
              onClick={() => updateParam({ page: String(page + 1) })}
            >
              Вперёд
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPage;
