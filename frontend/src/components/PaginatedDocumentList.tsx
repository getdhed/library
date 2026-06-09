import React from "react";
import { Stack, Button, Typography, Box } from "@mui/material";
import DocumentListItem from "./DocumentListItem";
import type { DocumentItem } from "../types";

type Props = {
  items: DocumentItem[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  token?: string | null;
  actionsRenderer?: (item: DocumentItem) => React.ReactNode;
  limit?: number;
  emptyMessage?: string;
};

const PaginatedDocumentList: React.FC<Props> = ({
  items,
  total,
  page,
  pageSize,
  onPageChange,
  token,
  actionsRenderer,
  limit,
  emptyMessage = "Ничего не найдено.",
}) => {
  const displayedItems = limit ? items.slice(0, limit) : items;

  return (
    <Box>
      <Stack spacing={0}>
        {displayedItems.map((item) => (
          <DocumentListItem
            key={item.id}
            item={item}
            token={token}
            actions={actionsRenderer ? actionsRenderer(item) : undefined}
          />
        ))}
        {items.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 1, px: 1 }}>
            {emptyMessage}
          </Typography>
        )}
      </Stack>

      {!limit && total > pageSize && (
        <Stack
          direction="row"
          spacing={1.2}
          alignItems="center"
          justifyContent="center"
          sx={{ mt: 2.2 }}
        >
          <Button
            variant="outlined"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Назад
          </Button>
          <Typography>Страница {page}</Typography>
          <Button
            variant="outlined"
            disabled={page * pageSize >= total}
            onClick={() => onPageChange(page + 1)}
          >
            Вперёд
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default PaginatedDocumentList;
