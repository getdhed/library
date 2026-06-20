import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Button,
  Divider,
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
  TableHead,
  TablePagination,
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
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

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
      <Box sx={{ display: "flex", gap: { xs: 3, md: 5 }, alignItems: "flex-start", flexDirection: { xs: "column", md: "row" }, mt: 2 }}>
        
        <Box
          sx={{
            width: { xs: "100%", md: "33.333%" },
            minWidth: { md: 320 },
            maxWidth: { md: 400 },
            position: { md: "sticky" },
            top: { md: 90 },
            maxHeight: { md: "calc(100vh - 110px)" },
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            flexShrink: 0,
            bgcolor: "action.hover",
            p: 3,
            borderRadius: 2,
            border: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Журнал действий <Typography component="span" variant="h6" color="text.secondary">({total})</Typography>
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Фильтры</Typography>
            <Stack spacing={2}>
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

              <FormControl fullWidth>
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
                fullWidth
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
                fullWidth
              />
            </Stack>
          </Box>
        </Box>

        <Stack spacing={3} sx={{ flexGrow: 1, minWidth: 0 }}>
          <ContentCard>
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
                        {event.actorName && event.actorUsername 
                          ? `${event.actorName} (@${event.actorUsername})` 
                          : event.actorUsername || event.actorName || "—"}
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
              <TablePagination
                component="div"
                count={total}
                page={page - 1}
                onPageChange={(_, newPage) => {
                  setPage(newPage + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                rowsPerPage={PAGE_SIZE}
                rowsPerPageOptions={[PAGE_SIZE]}
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `более чем ${to}`}`}
              />
            )}
          </ContentCard>
        </Stack>
      </Box>
    </AdminFrame>
  );
};

export default AdminAuditPage;
