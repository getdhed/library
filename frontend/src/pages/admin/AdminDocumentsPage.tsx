import React, { useMemo, useState } from "react";
import { mockDocuments } from "../../mockData";
import type { Document } from "../../types";

const AdminDocumentsPage: React.FC = () => {
  const [docs, setDocs] = useState<Document[]>(mockDocuments);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [sort, setSort] = useState("created-desc");

  const visibleDocs = useMemo(() => {
    let items = [...docs];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((d) => d.title.toLowerCase().includes(q));
    }

    if (typeFilter) {
      items = items.filter((d) => d.type === typeFilter);
    }

    if (visibilityFilter === "visible") {
      items = items.filter((d) => d.visible);
    } else if (visibilityFilter === "hidden") {
      items = items.filter((d) => !d.visible);
    }

    items.sort((a, b) => {
      if (sort === "created-desc") {
        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      }
      if (sort === "created-asc") {
        return (
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
        );
      }
      if (sort === "year-desc") return b.year - a.year;
      if (sort === "year-asc") return a.year - b.year;
      return 0;
    });

    return items;
  }, [docs, search, typeFilter, visibilityFilter, sort]);

  const uniqueTypes = Array.from(new Set(docs.map((d) => d.type)));

  function toggleVisibility(id: string) {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, visible: !d.visible } : d
      )
    );
  }

  function deleteDoc(id: string) {
    if (!window.confirm("Удалить документ?")) return;
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="page admin-page">
      <header className="admin-header">
        <h1>Документы</h1>
        <button className="primary-btn">+ Добавить документ</button>
      </header>

      <section className="admin-filters">
        <div className="filter-group">
          <label>Поиск по названию</label>
          <input
            type="text"
            placeholder="Введите название..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Тип</label>
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
          <label>Видимость</label>
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
          >
            <option value="">Все</option>
            <option value="visible">Только видимые</option>
            <option value="hidden">Только скрытые</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Сортировка</label>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="created-desc">По дате (новые)</option>
            <option value="created-asc">По дате (старые)</option>
            <option value="year-desc">По году (новые)</option>
            <option value="year-asc">По году (старые)</option>
          </select>
        </div>
      </section>

      <section className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Тип</th>
              <th>Категория</th>
              <th>Год</th>
              <th>Видимость</th>
              <th>Дата</th>
              <th style={{ width: 140 }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {visibleDocs.map((d) => (
              <tr key={d.id}>
                <td>{d.title}</td>
                <td>{d.type}</td>
                <td>{d.category}</td>
                <td>{d.year}</td>
                <td>
                  <button
                    className={
                      "tag " + (d.visible ? "tag-green" : "tag-gray")
                    }
                    onClick={() => toggleVisibility(d.id)}
                  >
                    {d.visible ? "Видим" : "Скрыт"}
                  </button>
                </td>
                <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="ghost-btn-sm">✏</button>
                  <button
                    className="ghost-btn-sm danger"
                    onClick={() => deleteDoc(d.id)}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
            {visibleDocs.length === 0 && (
              <tr>
                <td colSpan={7}>Документов не найдено.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default AdminDocumentsPage;

