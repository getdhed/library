import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchDocumentsLocal } from "../mockData";
import type { Document } from "../types";

const sortOptions = [
  { value: "relevance", label: "По совпадению" },
  { value: "year-desc", label: "По году (новые)" },
  { value: "year-asc", label: "По году (старые)" },
  { value: "size-desc", label: "По размеру (больше)" },
  { value: "size-asc", label: "По размеру (меньше)" },
];

function sortDocs(docs: Document[], sort: string): Document[] {
  const items = [...docs];
  switch (sort) {
    case "year-desc":
      return items.sort((a, b) => b.year - a.year);
    case "year-asc":
      return items.sort((a, b) => a.year - b.year);
    case "size-desc":
      return items.sort((a, b) => b.sizeMb - a.sizeMb);
    case "size-asc":
      return items.sort((a, b) => a.sizeMb - b.sizeMb);
    default:
      return items;
  }
}

const SearchResultsPage: React.FC = () => {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const [sort, setSort] = useState("relevance");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const rawResults = useMemo(() => searchDocumentsLocal(q), [q]);

  const results = useMemo(() => {
    let items = rawResults;
    if (typeFilter) {
      items = items.filter((d) => d.type === typeFilter);
    }
    return sortDocs(items, sort);
  }, [rawResults, sort, typeFilter]);

  const uniqueTypes = Array.from(new Set(rawResults.map((d) => d.type)));

  return (
    <div className="page">
      <section className="search-summary">
        <h1>Результаты поиска</h1>
        <p>
          Запрос: <strong>{q || "—"}</strong> · Найдено:{" "}
          <strong>{results.length}</strong>
        </p>
      </section>

      <section className="filters-row">
        <div className="filter-group">
          <label>Тип документа</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Все</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Сортировка</label>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="results-list">
        {results.map((doc) => (
          <div key={doc.id} className="doc-row">
            <div className="doc-main">
              <div className="doc-icon">PDF</div>
              <div>
                <Link to={`/book/${doc.id}`} className="doc-title-link">
                  {doc.title}
                </Link>
                <div className="doc-meta">
                  <span>{doc.type}</span> · <span>{doc.faculty}</span> ·{" "}
                  <span>{doc.year}</span> ·{" "}
                  <span>{doc.sizeMb.toFixed(1)} МБ</span>
                </div>
                <div className="doc-meta-secondary">
                  <span>{doc.category}</span>
                </div>
              </div>
            </div>
            <div className="doc-row-actions">
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="primary-link"
              >
                Быстро открыть
              </a>
              <button className="ghost-btn-sm">Скачать</button>
              <button className="ghost-btn-sm">В избранное</button>
            </div>
          </div>
        ))}
        {results.length === 0 && <p>Ничего не найдено.</p>}
      </section>
    </div>
  );
};

export default SearchResultsPage;

