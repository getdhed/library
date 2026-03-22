import React, { useEffect, useState } from "react";
import { getFavorites, setFavoriteAlias } from "../api/library";
import { useAuth } from "../auth/AuthContext";
import DocumentListItem from "../components/DocumentListItem";
import type { DocumentItem } from "../types";

const FavoritesPage: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [aliases, setAliases] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    getFavorites(token)
      .then((payload) => {
        setItems(payload.items);
        setAliases(
          payload.items.reduce<Record<number, string>>((acc, item) => {
            acc[item.id] = item.favoriteAlias ?? "";
            return acc;
          }, {})
        );
      })
      .catch(console.error);
  }, [token]);

  async function saveAlias(documentId: number) {
    if (!token) return;
    setSavingId(documentId);
    try {
      const updated = await setFavoriteAlias(token, documentId, aliases[documentId] ?? "");
      setItems((current) =>
        current.map((item) => (item.id === documentId ? updated : item))
      );
      setAliases((current) => ({
        ...current,
        [documentId]: updated.favoriteAlias ?? "",
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setSavingId(null);
    }
  }

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
        <div className="document-list">
          {items.map((item) => (
            <DocumentListItem
              key={item.id}
              item={item}
              token={token}
              actions={
                <div className="favorite-alias-editor">
                  <label className="favorite-alias-label" htmlFor={`favorite-alias-${item.id}`}>
                    Свой alias для поиска
                  </label>
                  <div className="favorite-alias-row">
                    <input
                      id={`favorite-alias-${item.id}`}
                      className="inline-input"
                      value={aliases[item.id] ?? ""}
                      onChange={(event) =>
                        setAliases((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="Например: сурп практика"
                    />
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void saveAlias(item.id)}
                      disabled={savingId === item.id}
                    >
                      {savingId === item.id ? "Сохранение..." : "Сохранить alias"}
                    </button>
                  </div>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
