import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { getAdminAudit } from "../../api/library";
import { useAuth } from "../../auth/AuthContext";
import AdminFrame from "../../components/AdminFrame";
import { ContentCard } from "../../components/mui-primitives";
import type { DocumentAuditEvent } from "../../types";

const actionOptions = [
  { value: "", label: "Все действия" },
  { value: "create", label: "Добавление" },
  { value: "submit", label: "Отправка на модерацию" },
  { value: "approve", label: "Одобрение" },
  { value: "reject", label: "Отклонение" },
  { value: "update", label: "Обновление" },
  { value: "file_replace", label: "Замена файла" },
  { value: "delete", label: "Удаление" },
] as const;

const actionLabels: Record<string, string> = Object.fromEntries(
  actionOptions.filter((o) => o.value).map((o) => [o.value, o.label])
);

function formatActionLabel(action: string) {
  return actionLabels[action] ?? action;
}

const PAGE_SIZE = 20;

const AdminAuditPage: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<DocumentAuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    const response = await getAdminAudit(token, {
      q: q.trim() || undefined,
      action: action || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    });
    setItems(response.items);
    setTotal(response.total);
  }, [token, q, action, dateFrom, dateTo, page]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  function resetPage() {
    setPage(1);
  }

  return (
    <AdminFrame title="Журнал действий">
      <ContentCard>
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.2}
            alignItems={{ xs: "stretch", md: "flex-end" }}
          >
            <TextField
              label="Поиск"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                resetPage();
              }}
              placeholder="Документ, пользователь..."
              fullWidth
            />

            <FormControl sx={{ minWidth: 220 }}>
              <InputLabel id="audit-action-label">Действие</InputLabel>
              <Select
                labelId="audit-action-label"
                value={action}
                label="Действие"
                onChange={(e) => {
                  setAction(e.target.value);
                  resetPage();
                }}
              >
                {actionOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Дата с"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                resetPage();
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 170 }}
            />

            <TextField
              label="Дата по"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                resetPage();
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 170 }}
            />
          </Stack>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Действие</TableCell>
                <TableCell>Документ</TableCell>
                <TableCell>Пользователь</TableCell>
                <TableCell>Дата</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{formatActionLabel(event.action)}</TableCell>
                  <TableCell>{event.documentTitle || event.fileName}</TableCell>
                  <TableCell>
                    {event.actorName || event.actorUsername || "—"}
                  </TableCell>
                  <TableCell>
                    {new Date(event.createdAt).toLocaleString("ru-RU")}
                  </TableCell>
                </TableRow>
              ))}

              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      Нет записей
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {total > PAGE_SIZE && (
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
              onClick={() => setPage((p) => p - 1)}
              sx={{ borderRadius: 0 }}
            >
              Назад
            </Button>
            <Typography>Страница {page}</Typography>
            <Button
              variant="outlined"
              disabled={page * PAGE_SIZE >= total}
              onClick={() => setPage((p) => p + 1)}
              sx={{ borderRadius: 0 }}
            >
              Вперёд
            </Button>
          </Stack>
        )}
      </ContentCard>
    </AdminFrame>
  );
};

export default AdminAuditPage;
