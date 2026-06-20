import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AuthPageFrame from "../components/AuthPageFrame";

const LoginPage: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin12345");
  const [error, setError] = useState<React.ReactNode>("");

  if (auth.token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await auth.login({ username, password });
      navigate("/");
    } catch (err: any) {
      if (err instanceof Error) {
        if (err.message.startsWith("account_deactivated_reason:")) {
          const reason = err.message.split("account_deactivated_reason:")[1] || "неизвестно";
          setError(
            <>
              <strong>Аккаунт деактивирован.</strong>
              <br />
              Причина: {reason}
            </>
          );
        } else if (err.message.startsWith("account_deactivated:")) {
          const reason = err.message.split("account_deactivated:")[1] || "неизвестно";
          setError(
            <>
              <strong>Аккаунт деактивирован.</strong>
              <br />
              Причина: {reason}
            </>
          );
        } else if (err.message === "unauthorized" || err.message === "invalid credentials" || err.message === "user not found" || err.message === "crypto/bcrypt: hashedPassword is not the hash of the given password") {
          setError("Неверный логин или пароль");
        } else if (err.message === "invalid payload" || err.message.includes("validation")) {
          setError("Пожалуйста, заполните все поля корректно");
        } else if (err.message === "Failed to fetch") {
          setError("Сервер недоступен. Проверьте подключение к сети");
        } else {
          setError(`Ошибка сервера: ${err.message}`);
        }
      } else {
        setError("Не удалось войти. Проверьте логин и пароль.");
      }
    }
  }

  return (
    <AuthPageFrame
      title="Вход"
      formContent={
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <TextField
            label="Логин"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin"
            inputProps={{ maxLength: 30 }}
            fullWidth
          />

          <TextField
            label="Пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Введите пароль"
            type="password"
            inputProps={{ maxLength: 30 }}
            fullWidth
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Button type="submit" variant="contained" size="large">
            Войти
          </Button>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography color="text.secondary">
              Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
            </Typography>

            <Tooltip
              title={
                <Box sx={{ p: 1, maxWidth: 220, textAlign: "center" }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Нужна помощь?
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>
                    По вопросам доступа к документам и восстановления учетной записи обращайтесь в ИТ-отдел:
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    Внутренний тел. 123
                  </Typography>
                </Box>
              }
              arrow
              placement="top"
            >
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      }
    />
  );
};

export default LoginPage;
