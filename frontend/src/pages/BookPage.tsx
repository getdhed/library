import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  documentFileUrl,
  favoriteDocument,
  getDocument,
  markOpened,
  unfavoriteDocument,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import DocumentCover from "../components/DocumentCover";
import type { DocumentItem } from "../types";

const BookPage: React.FC = () => {
  const [document, setDocument] = useState<DocumentItem | null>(null);
  const { token } = useAuth();
  const { id } = useParams();

  useEffect(() => {
    if (!token || !id) return;
    getDocument(token, Number(id)).then(setDocument).catch(console.error);
  }, [id, token]);

  if (!document || !token) {
    return (
      <div className="page-shell page-shell-clean">Загрузка документа...</div>
    );
  }

  const fileUrl = documentFileUrl(document.id, token, false, document.updatedAt);
  const downloadUrl = documentFileUrl(
    document.id,
    token,
    true,
    document.updatedAt
  );

  async function toggleFavorite() {
    if (document.isFavorite) {
      await unfavoriteDocument(token, document.id);
    } else {
      await favoriteDocument(token, document.id);
    }

    const refreshed = await getDocument(token, document.id);
    setDocument(refreshed);
  }

  function handleOpen() {
    void markOpened(token, document.id).catch(console.error);
  }

  return (
    <div className="page-shell page-shell-clean">
      <div className="content-card content-card-flat document-detail-shell">
        <div className="document-detail-layout">
          <div className="document-detail-preview">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="document-detail-preview-link"
              onClick={handleOpen}
              aria-label="Открыть PDF в новой вкладке"
            >
              <DocumentCover
                item={document}
                token={token}
                frameClassName="document-detail-cover-frame"
                imageClassName="document-detail-cover-image"
                fallbackClassName="document-detail-cover-fallback"
              />
            </a>
          </div>

          <div className="document-detail-panel">
            <div className="document-detail-main">
              <div className="document-detail-topline">
                <span className="document-badge">{document.type}</span>
                <span className="result-meta-inline">{document.year}</span>
              </div>
              <h1>{document.title}</h1>
              <p className="result-meta">
                {document.author} • {document.faculty} • {document.department}
              </p>
              <p className="document-detail-description">
                {document.description}
              </p>
            </div>

            <div className="document-detail-action-block">
              <div className="document-detail-action-copy">
                <strong>Действия с файлом</strong>
                <span className="muted-text">
                  Открывайте PDF в браузере или скачивайте его как обычный файл.
                </span>
              </div>

              <div className="document-card-action-set document-card-action-set-detail">
                <a
                  className="document-primary-action"
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleOpen}
                  aria-label="Открыть документ"
                  title="Открыть документ"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5.14v14l11-7zM4 4h2v16H4z" />
                  </svg>
                  <span>Открыть PDF</span>
                </a>

                <a
                  className="document-action-button document-action-button-with-label"
                  href={downloadUrl}
                  aria-label="Скачать документ"
                  title="Скачать документ"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 0 1 1.4 1.41l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1m-7 14h14a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2" />
                  </svg>
                  <span>Скачать</span>
                </a>

                <button
                  type="button"
                  className={`document-action-button document-action-button-with-label ${
                    document.isFavorite ? "document-action-button-active" : ""
                  }`}
                  onClick={toggleFavorite}
                  aria-label={
                    document.isFavorite
                      ? "Убрать из избранного"
                      : "Добавить в избранное"
                  }
                  title={
                    document.isFavorite
                      ? "Убрать из избранного"
                      : "Добавить в избранное"
                  }
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m12 20.4-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.42 22 7.5c0 3.78-3.4 6.86-8.55 11.58z" />
                  </svg>
                  <span>
                    {document.isFavorite ? "В избранном" : "В избранное"}
                  </span>
                </button>
              </div>
            </div>

            {document.tags.length > 0 && (
              <div className="tag-row document-detail-tags">
                {document.tags.map((tag) => (
                  <span key={tag} className="pill">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookPage;
