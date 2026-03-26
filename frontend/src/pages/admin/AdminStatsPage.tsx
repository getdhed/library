import React, { useEffect, useState } from "react";
import { Box, Grid, Paper, Stack, Typography } from "@mui/material";
import { getAdminStats } from "../../api/library";
import { useAuth } from "../../auth/AuthContext";
import AdminFrame from "../../components/AdminFrame";
import { ContentCard } from "../../components/mui-primitives";
import type { AdminStats } from "../../types";

type MetricCardProps = {
  value: number;
  label: string;
  hint: string;
};

const MetricCard: React.FC<MetricCardProps> = ({ value, label, hint }) => (
  <Paper sx={{ p: 2, borderRadius: 3, display: "grid", gap: 0.5 }}>
    <Typography variant="h4" fontWeight={800} lineHeight={1.05}>
      {value}
    </Typography>
    <Typography fontWeight={700}>{label}</Typography>
    <Typography color="text.secondary" variant="body2">
      {hint}
    </Typography>
  </Paper>
);

const AdminStatsPage: React.FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    getAdminStats(token).then(setStats).catch(console.error);
  }, [token]);

  if (!stats) {
    return (
      <AdminFrame
        title="Статистика"
        description="Сводка по каталогу, просмотрам, скачиваниям и поисковой активности."
      >
        <ContentCard>
          <Typography>Загрузка статистики...</Typography>
        </ContentCard>
      </AdminFrame>
    );
  }

  return (
    <AdminFrame
      title="Статистика"
      description="Сводка по каталогу, просмотрам, скачиваниям и поисковой активности."
      chips={[
        { label: `Документы: ${stats.documentsCount}` },
        { label: `Открытия: ${stats.viewsToday}` },
        { label: `Скачивания: ${stats.downloadsToday}` },
      ]}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        <MetricCard
          value={stats.documentsCount}
          label="Всего документов"
          hint="Общий размер каталога"
        />
        <MetricCard
          value={stats.viewsToday}
          label="Открытий сегодня"
          hint="Переходы к просмотру PDF"
        />
        <MetricCard
          value={stats.downloadsToday}
          label="Скачиваний сегодня"
          hint="Выгрузки файлов пользователями"
        />
        <MetricCard
          value={stats.searchesToday}
          label="Поисков сегодня"
          hint="Запросы по библиотеке"
        />
      </Box>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 6, xl: 4 }}>
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

        <Grid size={{ xs: 12, md: 6, xl: 4 }}>
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

        <Grid size={{ xs: 12, xl: 4 }}>
          <ContentCard>
            <Typography variant="h6" sx={{ mb: 1.2 }}>
              Документы по факультетам
            </Typography>
            <Stack spacing={1}>
              {stats.documentsByFaculty.map((item) => (
                <Stack key={item.faculty} direction="row" justifyContent="space-between">
                  <Typography>{item.faculty}</Typography>
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
