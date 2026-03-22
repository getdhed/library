import React, { useEffect, useState } from "react";
import { getFavorites } from "../api/library";
import { useAuth } from "../auth/AuthContext";
import DocumentListItem from "../components/DocumentListItem";
import type { DocumentItem } from "../types";

const FavoritesPage: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<DocumentItem[]>([]);

  useEffect(() => {
    if (!token) return;
    getFavorites(token)
      .then((payload) => setItems(payload.items))
      .catch(console.error);
  }, [token]);

  return (
    <div className="page-shell page-shell-clean">
      <div className="page-header">
        <div>
          <p className="eyebrow">Профиль</p>
          <h1>Избранные документы</h1>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="content-card content-card-flat empty-state-card">
          <h2>Пока ничего не добавлено</h2>
          <p className="muted-text">
            Сохраняйте нужные документы в избранное, чтобы быстро к ним
            возвращаться.
          </p>
        </div>
      ) : (
        <div className="document-list favorites-document-list">
          {items.map((item) => (
            <DocumentListItem key={item.id} item={item} token={token} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
