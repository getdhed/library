import React from "react";
import { Link } from "react-router-dom";
import DocumentCover from "./DocumentCover";
import type { DocumentItem } from "../types";

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

type Props = {
  item: DocumentItem;
  token?: string | null;
  actions?: React.ReactNode;
  className?: string;
};

const DocumentListItem: React.FC<Props> = ({
  item,
  token,
  actions,
  className = "",
}) => {
  const cardClassName = ["document-list-card", className]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={cardClassName}>
      <Link
        to={`/documents/${item.id}`}
        className="document-preview-link"
        aria-label={`Открыть карточку ${item.title}`}
      >
        <DocumentCover item={item} token={token} />
      </Link>

      <div className="document-list-content">
        <div className="document-list-copy">
          <div className="document-list-topline">
            <span className="document-badge">{item.type}</span>
            <span className="result-meta-inline">{item.year}</span>
          </div>

          <Link to={`/documents/${item.id}`} className="document-list-title">
            {item.title}
          </Link>

          <p className="document-list-meta">
            {item.faculty} • {item.department}
          </p>
          {item.favoriteAlias && (
            <p className="document-list-alias">Alias: {item.favoriteAlias}</p>
          )}
          <p className="document-list-author">{item.author}</p>
          <p className="document-list-description">
            {truncate(item.description, 180)}
          </p>
        </div>

        {actions && <div className="document-list-actions">{actions}</div>}
      </div>
    </article>
  );
};

export default DocumentListItem;
