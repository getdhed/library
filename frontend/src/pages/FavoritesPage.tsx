import React, { useEffect, useState } from "react";
import { Box, Stack, Typography, Paper, InputBase, IconButton, Tooltip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { getFavorites, toggleDocumentFavorite, documentFileUrl } from "../api/library";
import { useAuth } from "../auth/AuthContext";
import { ContentCard, PageShell, cardActionIconButtonSx, cardActionIconButtonActiveSx } from "../components/mui-primitives";
import PaginatedDocumentList from "../components/PaginatedDocumentList";
import SearchBar from "../components/SearchBar";
import type { DocumentItem } from "../types";

const FavoritesPage: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!token) return;
    getFavorites(token)
      .then((payload) => setItems(payload.items))
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  async function handleToggleFavorite(id: number) {
    if (!token) return;
    try {
      await toggleDocumentFavorite(token, id, false);
      setItems((prev) => prev.filter((item) => item.id !== id));
      // Optionally adjust page if it's now empty, but PaginatedDocumentList handles total nicely.
    } catch (err) {
      console.error("Failed to unfavorite", err);
    }
  }

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.author && item.author.toLowerCase().includes(search.toLowerCase()))
  );

  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  return (
    <PageShell>
      <Box sx={{ mb: 1, px: 0.5, mt: 1, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
        <Typography variant="h4">
          Избранные документы <Typography component="span" variant="h5" color="text.secondary">({items.length})</Typography>
        </Typography>

        {items.length > 0 && (
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Введите название или автора..."
            sx={{ width: { xs: "100%", sm: 320 } }}
          />
        )}
      </Box>

      {items.length === 0 ? (
        <ContentCard>
          <Typography variant="h5">Пока ничего не добавлено</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Сохраняйте нужные документы в избранное, чтобы быстро к ним
            возвращаться.
          </Typography>
        </ContentCard>
      ) : (
        <PaginatedDocumentList
          items={paginatedItems}
          total={filteredItems.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          token={token}
          actionsRenderer={(item) => (
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Tooltip title="Скачать PDF" arrow>
                <IconButton
                  component="a"
                  href={documentFileUrl(item.id, token!, true)}
                  aria-label="Скачать"
                  sx={cardActionIconButtonSx}
                >
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Убрать из избранного" arrow>
                <IconButton
                  onClick={() => void handleToggleFavorite(item.id)}
                  aria-label="Убрать из избранного"
                  sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonActiveSx } as any}
                >
                  <FavoriteIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        />
      )}

      <Box sx={{ display: "none" }} />
    </PageShell>
  );
};

export default FavoritesPage;
