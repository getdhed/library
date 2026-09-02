import React, { useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { ContentCard, PageHeader, PageShell } from "../components/mui-primitives";
import { useAuth } from "../auth/AuthContext";
import { changeMyPassword } from "../api/library";

const SettingsPage: React.FC = () => {
  const { token } = useAuth();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const newFieldErrors = { oldPassword: "", newPassword: "", confirmPassword: "" };
    let hasError = false;

    if (!token) {
      setError("Требуется авторизация");
      return;
    }

    const oldPw = oldPassword;
    const newPw = newPassword;
    const confirmPw = confirmPassword;

    if (!oldPw) {
      newFieldErrors.oldPassword = "Текущий пароль обязателен для заполнения";
      hasError = true;
    }

    if (!newPw) {
      newFieldErrors.newPassword = "Новый пароль обязателен для заполнения";
      hasError = true;
    } else if (newPw.length < 6) {
      newFieldErrors.newPassword = "Пароль должен содержать минимум 6 символов";
      hasError = true;
    } else if (oldPw === newPw) {
      newFieldErrors.newPassword = "Старый и новый пароль совпадают";
      hasError = true;
    }

    if (!confirmPw) {
      newFieldErrors.confirmPassword = "Подтверждение пароля обязательно для заполнения";
      hasError = true;
    } else if (newPw !== confirmPw) {
      newFieldErrors.confirmPassword = "Пароли не совпадают";
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setFieldErrors({ oldPassword: "", newPassword: "", confirmPassword: "" });

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
      <Box sx={{ maxWidth: 500, width: "100%", mx: "auto" }}>
        <PageHeader
          title="Настройки"
        />

        <Box sx={{ mt: 2 }}>
          <ContentCard>
            <Stack spacing={1.2}>
              <Typography variant="overline">Безопасность</Typography>
              <Typography variant="h5">Сменить пароль</Typography>

              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>}

              <Box component="form" onSubmit={onChangePassword} noValidate sx={{ mt: 1 }}>
                <Stack spacing={2}>
                  <TextField
                    label="Текущий пароль"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    inputProps={{ maxLength: 30 }}
                    error={!!fieldErrors.oldPassword}
                    helperText={fieldErrors.oldPassword}
                    fullWidth
                  />
                  <TextField
                    label="Новый пароль"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    inputProps={{ maxLength: 30 }}
                    error={!!fieldErrors.newPassword}
                    helperText={fieldErrors.newPassword}
                    fullWidth
                  />
                  <TextField
                    label="Подтверждение пароля"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    inputProps={{ maxLength: 30 }}
                    error={!!fieldErrors.confirmPassword}
                    helperText={fieldErrors.confirmPassword}
                    fullWidth
                  />
                  <Box sx={{ pt: 1 }}>
                    <Button variant="contained" type="submit" disabled={saving}>
                      Сохранить
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </ContentCard>
        </Box>
      </Box>
    </PageShell>
  );
};

export default SettingsPage;
