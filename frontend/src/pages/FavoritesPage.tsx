import React, { useEffect, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { getFavorites } from "../api/library";
import { useAuth } from "../auth/AuthContext";
import { ContentCard, PageHeader, PageShell } from "../components/mui-primitives";
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
    <PageShell>
      <PageHeader eyebrow="Профиль" title="Избранные документы" />

      {items.length === 0 ? (
        <ContentCard>
          <Typography variant="h5">Пока ничего не добавлено</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Сохраняйте нужные документы в избранное, чтобы быстро к ним
            возвращаться.
          </Typography>
        </ContentCard>
      ) : (
        <Stack spacing={1.5}>
          {items.map((item) => (
            <DocumentListItem key={item.id} item={item} token={token} />
          ))}
        </Stack>
      )}

      <Box sx={{ display: "none" }} />
    </PageShell>
  );
};

export default FavoritesPage;
