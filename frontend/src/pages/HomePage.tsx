import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRecentDocuments, mockSearchHistory } from "../mockData";

const HomePage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();

  const recent = getRecentDocuments();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  function handleSelectHistory(q: string) {
    setQuery(q);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="page">
      <section className="search-section">
        <h1>Найди нужный документ</h1>
        <form className="search-form" onSubmit={handleSubmit}>
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Введите название книги, методички, конспекта..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 150)}
            />
            <button type="submit">Поиск</button>
          </div>

          {showHistory && mockSearchHistory.length > 0 && (
            <div className="search-history-dropdown">
              <div className="dropdown-title">Последние запросы</div>
              {mockSearchHistory.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="dropdown-item"
                  onClick={() => handleSelectHistory(item.query)}
                >
                  {item.query}
                </button>
              ))}
            </div>
          )}
        </form>
      </section>

      <section className="recent-section">
        <div className="section-header">
          <h2>Недавние документы</h2>
        </div>
        <div className="cards-row">
          {recent.map((doc) => (
            <div key={doc.id} className="doc-card">
              <div className="doc-cover">{doc.type[0] || "D"}</div>
              <div className="doc-info">
                <div className="doc-title">{doc.title}</div>
                <div className="doc-meta">
                  <span>{doc.faculty}</span> · <span>{doc.year}</span>
                </div>
              </div>
              <div className="doc-actions">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="primary-link"
                >
                  Открыть
                </a>
                <button className="ghost-btn-sm">В избранное</button>
              </div>
            </div>
          ))}
          {recent.length === 0 && <p>Пока нет недавних документов.</p>}
        </div>
      </section>
    </div>
  );
};

export default HomePage;

