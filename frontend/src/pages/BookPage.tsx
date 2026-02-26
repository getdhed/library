import React from "react";
import { useParams } from "react-router-dom";
import { getDocumentById } from "../mockData";

const BookPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const doc = id ? getDocumentById(id) : undefined;

  if (!doc) {
    return (
      <div className="page">
        <h1>Документ не найден</h1>
        <p>Возможно, он был удалён или ID неверный.</p>
      </div>
    );
  }

  return (
    <div className="page book-page">
      <section className="book-main">
        <div className="book-cover-large">{doc.type[0] || "D"}</div>
        <div className="book-info">
          <h1>{doc.title}</h1>
          <div className="doc-meta">
            <span>{doc.type}</span> · <span>{doc.faculty}</span> ·{" "}
            <span>{doc.year}</span>
          </div>
          <div className="doc-meta-secondary">
            <span>{doc.category}</span>
          </div>
          <p className="book-description">
            Краткое описание документа (для прототипа можно оставить
            заглушку). Здесь будет аннотация к книге, методичке или конспекту.
          </p>
          <div className="book-actions">
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="primary-btn"
            >
              Читать
            </a>
            <a href={doc.url} className="secondary-btn">
              Скачать
            </a>
            <button className="ghost-btn">Добавить в избранное</button>
          </div>
        </div>
      </section>

      <section className="book-extra">
        <h2>Дополнительно</h2>
        <ul>
          <li>Размер: {doc.sizeMb.toFixed(1)} МБ</li>
          <li>Теги: {doc.tags.join(", ")}</li>
        </ul>
      </section>
    </div>
  );
};

export default BookPage;

