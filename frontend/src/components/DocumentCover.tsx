import React, { useEffect, useState } from "react";
import { documentCoverUrl } from "../api/library";
import type { DocumentItem } from "../types";

type Props = {
  item: DocumentItem;
  token?: string | null;
  frameClassName?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

const DocumentCover: React.FC<Props> = ({
  item,
  token,
  frameClassName = "",
  imageClassName = "",
  fallbackClassName = "",
}) => {
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setCoverFailed(false);
  }, [item.id, item.coverPath, item.fileName, item.updatedAt]);

  const isPdf = item.mimeType.toLowerCase().includes("pdf");
  const coverUrl =
    token && isPdf ? documentCoverUrl(item.id, token, item.updatedAt) : "";
  const frameClasses = ["document-preview-frame", frameClassName]
    .filter(Boolean)
    .join(" ");
  const imageClasses = ["document-preview-image", imageClassName]
    .filter(Boolean)
    .join(" ");
  const fallbackClasses = ["document-preview-fallback", fallbackClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={frameClasses}>
      {coverUrl && !coverFailed ? (
        <img
          src={coverUrl}
          alt={`Обложка ${item.title}`}
          className={imageClasses}
          onError={() => setCoverFailed(true)}
        />
      ) : (
        <div className={fallbackClasses} aria-hidden="true">
          <span className="document-preview-badge">PDF</span>
          <span className="document-preview-title">{item.type}</span>
        </div>
      )}
    </div>
  );
};

export default DocumentCover;
