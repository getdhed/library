import React from "react";
import { Alert, Box, Paper, Stack, Typography } from "@mui/material";
import { ContentCard, PageHeader, PageShell } from "../components/mui-primitives";
import { useTheme } from "../theme/ThemeContext";

const SettingsPage: React.FC = () => {
  const { theme } = useTheme();

  return (
    <PageShell>
      <PageHeader
        eyebrow="Профиль"
        title="Настройки"
        description="Управление пользовательскими параметрами интерфейса."
      />

      <ContentCard>
        <Stack spacing={2}>
          <Paper sx={{ p: 2, borderRadius: 0 }}>
            <Stack spacing={1.2}>
              <Typography variant="overline">Оформление</Typography>
              <Typography variant="h5">Единый режим интерфейса</Typography>
              <Typography color="text.secondary">
                Для текущей итерации используется единый визуальный стиль
                библиотеки. Переключение темы временно отключено.
              </Typography>
              <Box sx={{ pt: 0.3 }}>
                <Typography variant="body2" color="text.secondary">
                  Активный режим:{" "}
                  <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                    {theme === "dark" ? "Тёмный" : "Светлый"}
                  </Box>
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <Alert severity="info" variant="outlined">
            Блок с расширенными настройками будет возвращён в следующих итерациях.
          </Alert>
        </Stack>
      </ContentCard>
    </PageShell>
  );
};

export default SettingsPage;
