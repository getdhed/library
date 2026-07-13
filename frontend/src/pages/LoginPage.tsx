import React, { useState, useRef } from "react";
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<React.ReactNode>("");
  const [fieldErrors, setFieldErrors] = useState({ username: "", password: "" });
  const passwordRef = useRef<HTMLInputElement>(null);

  if (auth.token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    
    const newFieldErrors = { username: "", password: "" };
    let hasError = false;

    if (!username.trim()) {
      newFieldErrors.username = "Логин обязателен для заполнения";
      hasError = true;
    }
    if (!password) {
      newFieldErrors.password = "Пароль обязателен для заполнения";
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setFieldErrors({ username: "", password: "" });

    try {
      await auth.login({ username, password });
      navigate("/");
    } catch (err: any) {
      if (err instanceof Error) {
        if (err.message === "unauthorized" || err.message === "invalid credentials" || err.message === "user not found" || err.message === "crypto/bcrypt: hashedPassword is not the hash of the given password") {
          setError("Неверный логин или пароль");
        } else if (err.message === "invalid payload" || err.message.includes("validation")) {
          setError("Пожалуйста, заполните все поля корректно");
        } else if (err.message === "Failed to fetch") {
          setError("Сервер недоступен. Проверьте подключение к сети");
        } else {
          setError(err.message);
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
        <Stack component="form" spacing={2} onSubmit={handleSubmit} noValidate>
          <TextField
            label="Логин"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: "" }));
            }}
            placeholder="Введите логин"
            autoComplete="username"
            inputProps={{ maxLength: 30 }}
            error={!!fieldErrors.username}
            helperText={fieldErrors.username}
            fullWidth
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                passwordRef.current?.focus();
              }
            }}
          />

          <TextField
            label="Пароль"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
            }}
            placeholder="Введите пароль"
            type="password"
            autoComplete="current-password"
            inputProps={{ maxLength: 30 }}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password}
            fullWidth
            inputRef={passwordRef}
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
                    Если возникли какие-то неполадки, обратитесь к администратору или библиотекарю по телефону:
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    4736
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
