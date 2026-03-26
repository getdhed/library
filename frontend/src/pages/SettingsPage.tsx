import React from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Stack,
  Typography,
} from "@mui/material";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import { ContentCard, PageHeader, PageShell } from "../components/mui-primitives";
import { useTheme } from "../theme/ThemeContext";

const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <PageShell>
      <PageHeader eyebrow="Профиль" title="Настройки" />

      <ContentCard>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Box>
            <Typography variant="h5">Тема интерфейса</Typography>
            <Typography color="text.secondary" sx={{ mt: 1, maxWidth: "70ch" }}>
              Светлая тема использует спокойную институтскую палитру, а тёмная
              версия остаётся приглушённой и удобной для долгой работы с
              документами.
            </Typography>
          </Box>

          <ButtonGroup role="group" aria-label="Переключение темы" variant="outlined" color="primary">
            <Button
              type="button"
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
              variant={theme === "light" ? "contained" : "outlined"}
              startIcon={<LightModeRoundedIcon />}
            >
              Светлая тема
            </Button>
            <Button
              type="button"
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
              variant={theme === "dark" ? "contained" : "outlined"}
              startIcon={<DarkModeRoundedIcon />}
            >
              Тёмная тема
            </Button>
          </ButtonGroup>
        </Stack>
      </ContentCard>

      <ContentCard>
        <Typography variant="h5">Что можно развивать дальше</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.2 }}>
          Здесь можно расширить профиль пользователя, чтение PDF, персональные
          настройки поиска и поведение карточек документов.
        </Typography>
      </ContentCard>
    </PageShell>
  );
};

export default SettingsPage;
