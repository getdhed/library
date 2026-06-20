import React, { useCallback, useEffect, useState } from "react";
import { Box, Grid, Paper, Stack, Typography, ToggleButton, ToggleButtonGroup, TextField } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";
import { getAdminStats } from "../../api/library";
import { useAuth } from "../../auth/AuthContext";
import AdminFrame from "../../components/AdminFrame";
import { ContentCard } from "../../components/mui-primitives";
import type { AdminStats, NamedStat } from "../../types";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CF2', '#F56565'];

type MetricCardProps = {
  value: number;
  label: string;
  icon: React.ReactNode;
  color?: string;
};

const MetricCard: React.FC<MetricCardProps> = ({ value, label, icon, color }) => (
  <Paper sx={{ p: 2.5, borderRadius: 2, display: "flex", gap: 2, alignItems: "center", boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
    <Box sx={{ 
      p: 1.5, 
      borderRadius: '50%', 
      display: 'flex', 
      bgcolor: color ? `${color}15` : 'primary.main', 
      color: color || 'primary.main' 
    }}>
      {icon}
    </Box>
    <Box>
      <Typography variant="h4" fontWeight={800} lineHeight={1.05}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mt: 0.5 }}>{label}</Typography>
    </Box>
  </Paper>
);

const SimpleList: React.FC<{ items: NamedStat[], labelCount?: string }> = ({ items, labelCount = "Количество" }) => (
  <Stack spacing={1} sx={{ mt: 1 }}>
    {items.length === 0 && <Typography color="text.secondary">Нет данных за этот период</Typography>}
    {items.map((item, i) => (
      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #eee' }}>
        <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }} title={item.name}>
          {item.name}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {item.count}
        </Typography>
      </Box>
    ))}
  </Stack>
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
  const [periodType, setPeriodType] = useState("day");
  const [dateFrom, setDateFrom] = useState(() => formatDate(new Date()));
  const [dateTo, setDateTo] = useState(() => formatDate(new Date()));

  const load = useCallback(async () => {
    if (!token) return;
    const response = await getAdminStats(token, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    setStats(response);
  }, [token, dateFrom, dateTo]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const handlePeriodChange = (
    event: React.MouseEvent<HTMLElement>,
    newPeriod: string | null
  ) => {
    if (!newPeriod) return;
    setPeriodType(newPeriod);
    
    if (newPeriod === "all") {
      setDateFrom("");
      setDateTo("");
    } else if (newPeriod === "year") {
      setDateFrom(daysAgo(365));
      setDateTo(formatDate(new Date()));
    } else if (newPeriod === "month") {
      setDateFrom(daysAgo(30));
      setDateTo(formatDate(new Date()));
    } else if (newPeriod === "week") {
      setDateFrom(daysAgo(7));
      setDateTo(formatDate(new Date()));
    } else if (newPeriod === "day") {
      setDateFrom(formatDate(new Date()));
      setDateTo(formatDate(new Date()));
    }
  };

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
    <AdminFrame title="Статистика">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mt: 2 }}>
        <Typography variant="h5" fontWeight={700}>Дашборд</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          {periodType === "custom" && (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                type="date"
                size="small"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                inputProps={{ style: { fontSize: 14 } }}
              />
              <Typography color="text.secondary">—</Typography>
              <TextField
                type="date"
                size="small"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                inputProps={{ style: { fontSize: 14 } }}
              />
            </Stack>
          )}
          <ToggleButtonGroup
            color="primary"
            value={periodType}
            exclusive
            onChange={handlePeriodChange}
            size="small"
            sx={{ bgcolor: 'background.paper' }}
          >
            <ToggleButton value="all">За все время</ToggleButton>
            <ToggleButton value="year">За год</ToggleButton>
            <ToggleButton value="month">За месяц</ToggleButton>
            <ToggleButton value="week">За неделю</ToggleButton>
            <ToggleButton value="day">За сегодня</ToggleButton>
            <ToggleButton value="custom">Свой промежуток</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(5, 1fr)" },
          gap: 2,
          mb: 3
        }}
      >
        <MetricCard
          value={stats.documentsCount}
          label="ВСЕГО ДОКУМЕНТОВ"
          icon={<DescriptionIcon fontSize="large" />}
          color="#1976d2"
        />
        <MetricCard
          value={stats.viewsToday}
          label="ОТКРЫТИЙ ЗА ПЕРИОД"
          icon={<VisibilityIcon fontSize="large" />}
          color="#2e7d32"
        />
        <MetricCard
          value={stats.downloadsToday}
          label="СКАЧИВАНИЙ ЗА ПЕРИОД"
          icon={<DownloadIcon fontSize="large" />}
          color="#ed6c02"
        />
        <MetricCard
          value={stats.searchesToday}
          label="ПОИСКОВ ЗА ПЕРИОД"
          icon={<SearchIcon fontSize="large" />}
          color="#9c27b0"
        />
        <MetricCard
          value={stats.visitsInPeriod}
          label="ПОСЕТИТЕЛЕЙ ЗА ПЕРИОД"
          icon={<PersonIcon fontSize="large" />}
          color="#0288d1"
        />
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <ContentCard sx={{ height: 400, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={700}>
                Нагрузка на приложение (API RPS)
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Всего за период
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(stats.appLoadByHour || []).map(item => {
                  let dString = item.name;
                  if (item.name.length === 16) { // YYYY-MM-DD HH:00
                    const d = new Date(item.name.replace(' ', 'T') + ':00Z');
                    if (!Number.isNaN(d.getTime())) {
                      if (dateFrom === dateTo) {
                        dString = `${String(d.getHours()).padStart(2, '0')}:00`;
                      } else {
                        dString = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:00`;
                      }
                    }
                  } else if (item.name.length === 10) { // YYYY-MM-DD
                    const parts = item.name.split('-');
                    if (parts.length === 3) dString = `${parts[2]}.${parts[1]}.${parts[0]}`;
                  } else if (item.name.length === 7) { // YYYY-MM
                    const parts = item.name.split('-');
                    if (parts.length === 2) dString = `${parts[1]}.${parts[0]}`;
                  }
                  return { ...item, name: dString };
                })}>
                  <defs>
                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d32f2f" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#d32f2f" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#666' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#666' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="count" name="Запросов" stroke="#d32f2f" strokeWidth={2} fillOpacity={1} fill="url(#colorLoad)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </ContentCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <ContentCard sx={{ height: 400, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Документы по типам
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
              <SimpleList items={stats.documentsByType || []} />
            </Box>
          </ContentCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ContentCard sx={{ height: 350, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Популярные запросы
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
              <SimpleList items={stats.topQueries || []} />
            </Box>
          </ContentCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ContentCard sx={{ height: 350, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Популярные документы
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
              <SimpleList items={stats.topDocuments || []} labelCount="Открытий" />
            </Box>
          </ContentCard>
        </Grid>
      </Grid>
    </AdminFrame>
  );
};

export default AdminStatsPage;
