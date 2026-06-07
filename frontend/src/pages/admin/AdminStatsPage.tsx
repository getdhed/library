import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Grid, Paper, Stack, Typography } from "@mui/material";
import { getAdminStats } from "../../api/library";
import { useAuth } from "../../auth/AuthContext";
import AdminFrame from "../../components/AdminFrame";
import { ContentCard } from "../../components/mui-primitives";
import type { AdminStats } from "../../types";

type MetricCardProps = {
  value: number;
  label: string;
};

const MetricCard: React.FC<MetricCardProps> = ({ value, label }) => (
  <Paper sx={{ p: 2, borderRadius: 0, display: "grid", gap: 0.5 }}>
    <Typography variant="h4" fontWeight={800} lineHeight={1.05}>
      {value}
    </Typography>
    <Typography fontWeight={700}>{label}</Typography>
  </Paper>
);

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDate(date);
}

const AdminStatsPage: React.FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    const response = await getAdminStats(token, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    setStats(response);
  }, [token, dateFrom, dateTo]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  function setPeriod(days: number) {
    setDateFrom(daysAgo(days));
    setDateTo(formatDate(new Date()));
  }

  if (!stats) {
    return (
      <AdminFrame title="Статистика">
        <ContentCard>
          <Typography>Загрузка...</Typography>
        </ContentCard>
      </AdminFrame>
    );
  }

  return (
    <AdminFrame
      title="Статистика"
      chips={[
        { label: `Документы: ${stats.documentsCount}` },
        { label: `Типы: ${stats.documentsByType.length}` },
        { label: `Открытия: ${stats.viewsToday}` },
        { label: `Скачивания: ${stats.downloadsToday}` },
      ]}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 1.5,
        }}
      >
        <MetricCard
          value={stats.documentsCount}
          label="Всего документов"
        />
        <MetricCard
          value={stats.viewsToday}
          label="Открытий сегодня"
        />
        <MetricCard
          value={stats.downloadsToday}
          label="Скачиваний сегодня"
        />
        <MetricCard
          value={stats.searchesToday}
          label="Поисков сегодня"
        />
      </Box>

      <ContentCard>
        <Typography variant="h6" sx={{ mb: 1.2 }}>
          Загрузки за период
        </Typography>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.2}
          alignItems={{ xs: "stretch", md: "center" }}
          sx={{ mb: 1.5 }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={() => setPeriod(7)}
            sx={{ borderRadius: 0 }}
          >
            Неделя
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setPeriod(30)}
            sx={{ borderRadius: 0 }}
          >
            Месяц
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setPeriod(365)}
            sx={{ borderRadius: 0 }}
          >
            Год
          </Button>

          <Box
            component="input"
            type="date"
            value={dateFrom}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
            sx={{
              px: 1,
              py: 0.75,
              border: (theme: any) => `1px solid ${theme.palette.divider}`,
              borderRadius: 0,
              fontSize: 14,
            }}
          />
          <Typography color="text.secondary">—</Typography>
          <Box
            component="input"
            type="date"
            value={dateTo}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
            sx={{
              px: 1,
              py: 0.75,
              border: (theme: any) => `1px solid ${theme.palette.divider}`,
              borderRadius: 0,
              fontSize: 14,
            }}
          />
        </Stack>

        <MetricCard
          value={stats.uploadedInPeriod ?? 0}
          label="Загружено за период"
        />

        {(stats.documentsUploadedByDay ?? []).length > 0 && (
          <Stack spacing={0.8} sx={{ mt: 1.5 }}>
            <Typography fontWeight={700}>По дням</Typography>
            {stats.documentsUploadedByDay.map((item) => (
              <Stack key={item.name} direction="row" justifyContent="space-between">
                <Typography>{item.name}</Typography>
                <Typography fontWeight={700}>{item.count}</Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </ContentCard>

      <Grid container spacing={1.5}>
        <Grid size={4}>
          <ContentCard>
            <Typography variant="h6" sx={{ mb: 1.2 }}>
              Популярные запросы
            </Typography>
            <Stack spacing={1}>
              {stats.topQueries.map((item) => (
                <Stack key={item.name} direction="row" justifyContent="space-between">
                  <Typography>{item.name}</Typography>
                  <Typography fontWeight={700}>{item.count}</Typography>
                </Stack>
              ))}
            </Stack>
          </ContentCard>
        </Grid>

        <Grid size={4}>
          <ContentCard>
            <Typography variant="h6" sx={{ mb: 1.2 }}>
              Популярные документы
            </Typography>
            <Stack spacing={1}>
              {stats.topDocuments.map((item) => (
                <Stack key={item.name} direction="row" justifyContent="space-between">
                  <Typography>{item.name}</Typography>
                  <Typography fontWeight={700}>{item.count}</Typography>
                </Stack>
              ))}
            </Stack>
          </ContentCard>
        </Grid>

        <Grid size={4}>
          <ContentCard>
            <Typography variant="h6" sx={{ mb: 1.2 }}>
              Документы по типам
            </Typography>
            <Stack spacing={1}>
              {stats.documentsByType.map((item) => (
                <Stack key={item.name} direction="row" justifyContent="space-between">
                  <Typography>{item.name}</Typography>
                  <Typography fontWeight={700}>{item.count}</Typography>
                </Stack>
              ))}
            </Stack>
          </ContentCard>
        </Grid>
      </Grid>
    </AdminFrame>
  );
};

export default AdminStatsPage;
