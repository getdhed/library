import React, { useState } from "react";
import { Link } from "react-router-dom";
import { mockDocuments } from "../mockData";
import type { Document } from "../types";

interface GroupedByFaculty {
  [faculty: string]: {
    [department: string]: Document[];
  };
}

function groupByFacultyAndDept(docs: Document[]): GroupedByFaculty {
  const result: GroupedByFaculty = {};
  docs.forEach((doc) => {
    if (!result[doc.faculty]) result[doc.faculty] = {};
    if (!result[doc.faculty][doc.department]) {
      result[doc.faculty][doc.department] = [];
    }
    result[doc.faculty][doc.department].push(doc);
  });
  return result;
}

const BrowsePage: React.FC = () => {
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [localQuery, setLocalQuery] = useState("");

  const grouped = groupByFacultyAndDept(mockDocuments);
  const faculties = Object.keys(grouped).sort();

  const departments =
    selectedFaculty && grouped[selectedFaculty]
      ? Object.keys(grouped[selectedFaculty]).sort()
      : [];

  let visibleDocs: Document[] = [];
  if (selectedFaculty && selectedDept) {
    visibleDocs = grouped[selectedFaculty][selectedDept] || [];
  }

  if (localQuery.trim()) {
    const q = localQuery.trim().toLowerCase();
    visibleDocs = visibleDocs.filter((d) =>
      d.title.toLowerCase().includes(q)
    );
  }

  return (
    <div className="page browse-page">
      <section className="browse-layout">
        <aside className="browse-sidebar">
          <h2>Факультеты</h2>
          <ul className="sidebar-list">
            {faculties.map((f) => (
              <li key={f}>
                <button
                  className={
                    "sidebar-item" + (selectedFaculty === f ? " active" : "")
                  }
                  onClick={() => {
                    setSelectedFaculty(f);
                    setSelectedDept(null);
                  }}
                >
                  {f}
                </button>
              </li>
            ))}
          </ul>

          {selectedFaculty && (
            <>
              <h3>Кафедры</h3>
              <ul className="sidebar-list">
                {departments.map((d) => (
                  <li key={d}>
                    <button
                      className={
                        "sidebar-item" +
                        (selectedDept === d ? " active" : "")
                      }
                      onClick={() => setSelectedDept(d)}
                    >
                      {d}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>

        <section className="browse-content">
          <div className="browse-header">
            <h1>Каталог документов</h1>
            <div className="filter-group">
              <label>Поиск внутри выбранной кафедры</label>
              <input
                type="text"
                placeholder="Введите часть названия..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
              />
            </div>
          </div>

          {!selectedFaculty && (
            <p>Выберите факультет слева, затем кафедру.</p>
          )}
          {selectedFaculty && !selectedDept && (
            <p>Выберите кафедру, чтобы увидеть документы.</p>
          )}

          {selectedFaculty && selectedDept && (
            <div className="results-list">
              {visibleDocs.map((doc) => (
                <div key={doc.id} className="doc-row">
                  <div className="doc-main">
                    <div className="doc-icon">PDF</div>
                    <div>
                      <Link
                        to={`/book/${doc.id}`}
                        className="doc-title-link"
                      >
                        {doc.title}
                      </Link>
                      <div className="doc-meta">
                        <span>{doc.type}</span> ·{" "}
                        <span>{doc.year}</span> ·{" "}
                        <span>{doc.sizeMb.toFixed(1)} МБ</span>
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
                      Открыть
                    </a>
                  </div>
                </div>
              ))}
              {visibleDocs.length === 0 && (
                <p>В этой кафедре пока нет документов.</p>
              )}
            </div>
          )}
        </section>
      </section>
    </div>
  );
};

export default BrowsePage;

