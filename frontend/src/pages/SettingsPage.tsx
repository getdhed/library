import React, { useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { ContentCard, PageHeader, PageShell } from "../components/mui-primitives";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../auth/AuthContext";
import { changeMyPassword } from "../api/library";

const SettingsPage: React.FC = () => {
  const { theme } = useTheme();
  const { token } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!token) {
      setError("Требуется авторизация");
      return;
    }
    const oldPw = oldPassword.trim();
    const newPw = newPassword.trim();
    const confirmPw = confirmPassword.trim();
    if (!oldPw || newPw.length < 6 || newPw !== confirmPw) {
      setError(newPw !== confirmPw ? "Пароли не совпадают" : "Укажите текущий пароль и новый (минимум 6 символов)");
      return;
    }
    try {
      setSaving(true);
      await changeMyPassword(token, { oldPassword: oldPw, newPassword: newPw });
      setSuccess("Пароль изменён");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить пароль");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
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

          <Paper sx={{ p: 2, borderRadius: 0 }}>
            <Stack spacing={1.2}>
              <Typography variant="overline">Безопасность</Typography>
              <Typography variant="h5">Сменить пароль</Typography>
              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>}
              <Box component="form" onSubmit={onChangePassword} noValidate>
                <Stack spacing={2}>
                  <TextField
                    label="Текущий пароль"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Новый пароль"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Подтверждение пароля"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth
                  />
                  <Box>
                    <Button variant="contained" type="submit" disabled={saving}>Сохранить</Button>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </ContentCard>
    </PageShell>
  );
};

export default SettingsPage;
