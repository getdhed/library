import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHome, getSuggestions, markOpened } from "../api/library";
import { useAuth } from "../auth/AuthContext";
import DocumentListItem from "../components/DocumentListItem";
import type { DocumentItem } from "../types";

const HomePage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [recentItems, setRecentItems] = useState<DocumentItem[]>([]);
  const [historyItems, setHistoryItems] = useState<{ id: number; query: string }[]>(
    []
  );
  const [suggestions, setSuggestions] = useState<DocumentItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!token) return;
    getHome(token)
      .then((payload) => {
        setRecentItems(payload.recent);
        setHistoryItems(payload.searchHistory);
      })
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!token || !query.trim()) {
      setSuggestions([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      getSuggestions(token, query.trim())
        .then((payload) => setSuggestions(payload.items))
        .catch(console.error);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query, token]);

  const dropdownItems = useMemo(() => {
    if (query.trim()) {
      return suggestions.map((item) => ({
        key: `doc-${item.id}`,
        label: item.title,
        onClick: async () => {
          if (!token) return;
          await markOpened(token, item.id);
          navigate(`/documents/${item.id}`);
        },
      }));
    }

    return historyItems.map((item) => ({
      key: `history-${item.id}`,
      label: item.query,
      onClick: () => navigate(`/search?q=${encodeURIComponent(item.query)}`),
    }));
  }, [historyItems, navigate, query, suggestions, token]);

  const showDropdown = showHistory && dropdownItems.length > 0;

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="page-shell page-shell-clean">
      <section
        className={`hero-panel hero-panel-clean ${
          showDropdown ? "hero-panel-search-open" : ""
        }`}
      >
        <div className="hero-copy">
          <h1>Поиск по библиотеке</h1>
        </div>

        <form
          className={`search-box search-box-hero ${
            showDropdown ? "search-box-expanded" : ""
          }`}
          onSubmit={submitSearch}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setShowHistory(true)}
            onBlur={() => window.setTimeout(() => setShowHistory(false), 150)}
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
              <div className="dropdown-caption">
                {query.trim() ? "Подходящие документы" : "Последние запросы"}
              </div>
              {dropdownItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="dropdown-row"
                  onClick={item.onClick}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </form>
      </section>

      <section className="content-card content-card-flat recent-section">
        <div className="section-heading section-heading-tight">
          <div>
            <h2>Недавние документы</h2>
          </div>
        </div>

        <div className="document-list recent-document-list">
          {recentItems.map((item) => (
            <DocumentListItem key={item.id} item={item} token={token} />
          ))}

          {recentItems.length === 0 && (
            <div className="empty-inline-state">
              <h3>Нет недавних документов</h3>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
